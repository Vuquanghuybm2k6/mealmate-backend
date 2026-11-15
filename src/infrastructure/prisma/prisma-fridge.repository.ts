import { Injectable } from '@nestjs/common';
import { FridgeItem, Ingredient } from '@prisma/client';
import { FridgeItemEntity, IngredientEntity } from '../../domain/entities';
import { FridgeRepository } from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

type FridgeItemWithIngredient = FridgeItem & { ingredient: Ingredient };

@Injectable()
export class PrismaFridgeRepository implements FridgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string): Promise<FridgeItemEntity[]> {
    const items = await this.prisma.fridgeItem.findMany({
      where: { userId },
      include: { ingredient: true },
      orderBy: { addedAt: 'desc' },
    });

    return items.map((item) => this.mapItem(item));
  }

  async upsert(
    userId: string,
    ingredientId: string,
    quantity: number,
  ): Promise<FridgeItemEntity> {
    const item = await this.prisma.fridgeItem.upsert({
      where: {
        userId_ingredientId: {
          userId,
          ingredientId,
        },
      },
      update: {
        quantity: { increment: quantity },
        addedAt: new Date(),
      },
      create: {
        userId,
        ingredientId,
        quantity,
      },
      include: { ingredient: true },
    });

    return this.mapItem(item);
  }

  async remove(userId: string, idOrIngredientId: string): Promise<number> {
    const result = await this.prisma.fridgeItem.deleteMany({
      where: {
        userId,
        OR: [{ id: idOrIngredientId }, { ingredientId: idOrIngredientId }],
      },
    });

    return result.count;
  }

  private mapItem(item: FridgeItemWithIngredient): FridgeItemEntity {
    return {
      id: item.id,
      userId: item.userId,
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      addedAt: item.addedAt,
      ingredient: this.mapIngredient(item.ingredient),
    };
  }

  private mapIngredient(ingredient: Ingredient): IngredientEntity {
    return {
      id: ingredient.id,
      name: ingredient.name,
      aliases: ingredient.aliases,
      category: ingredient.category,
      unit: ingredient.unit,
      pricePerUnit: ingredient.pricePerUnit,
      gramsPerUnit: ingredient.gramsPerUnit,
      kcal: ingredient.kcal,
      protein: ingredient.protein,
      carbs: ingredient.carbs,
      fat: ingredient.fat,
    };
  }
}
