import { Injectable } from '@nestjs/common';
import { Ingredient } from '@prisma/client';
import { IngredientEntity } from '../../domain/entities';
import { IngredientRepository } from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaIngredientRepository implements IngredientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<IngredientEntity[]> {
    const ingredients = await this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });

    return ingredients.map((ingredient) => this.mapIngredient(ingredient));
  }

  async findById(id: string): Promise<IngredientEntity | null> {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
    });

    return ingredient ? this.mapIngredient(ingredient) : null;
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
