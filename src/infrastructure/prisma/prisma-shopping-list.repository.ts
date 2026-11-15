import { Injectable } from '@nestjs/common';
import {
  Ingredient,
  ShoppingItem,
  ShoppingList,
} from '@prisma/client';
import {
  ShoppingItemEntity,
  ShoppingListEntity,
} from '../../domain/entities';
import {
  CreateShoppingListInput,
  ShoppingListRepository,
} from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';
import { mapIngredient } from './prisma.mappers';

type ShoppingListWithItems = ShoppingList & {
  items: Array<ShoppingItem & { ingredient: Ingredient }>;
};

type ShoppingItemWithIngredient = ShoppingItem & { ingredient: Ingredient };

@Injectable()
export class PrismaShoppingListRepository
  implements ShoppingListRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    input: CreateShoppingListInput,
  ): Promise<ShoppingListEntity> {
    const list = await this.prisma.shoppingList.create({
      data: {
        userId,
        budget: input.budget,
        totalCost: input.totalCost,
        items: {
          create: input.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            estPrice: item.estPrice,
          })),
        },
      },
      include: {
        items: { include: { ingredient: true } },
      },
    });

    return this.mapList(list);
  }

  async findLatestByUser(
    userId: string,
  ): Promise<ShoppingListEntity | null> {
    const list = await this.prisma.shoppingList.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { ingredient: true } },
      },
    });

    return list ? this.mapList(list) : null;
  }

  async findItemById(
    userId: string,
    itemId: string,
  ): Promise<ShoppingItemEntity | null> {
    const item = await this.prisma.shoppingItem.findFirst({
      where: { id: itemId, list: { userId } },
      include: { ingredient: true },
    });

    return item ? this.mapItem(item) : null;
  }

  async setItemBought(
    userId: string,
    itemId: string,
    isBought: boolean,
  ): Promise<ShoppingItemEntity | null> {
    await this.prisma.shoppingItem.updateMany({
      where: { id: itemId, list: { userId } },
      data: { isBought },
    });

    return this.findItemById(userId, itemId);
  }

  private mapList(list: ShoppingListWithItems): ShoppingListEntity {
    return {
      id: list.id,
      userId: list.userId,
      createdAt: list.createdAt,
      totalCost: list.totalCost,
      budget: list.budget,
      items: [...list.items]
        .sort((first, second) =>
          first.ingredient.name.localeCompare(second.ingredient.name, 'vi'),
        )
        .map((item) => this.mapItem(item)),
    };
  }

  private mapItem(item: ShoppingItemWithIngredient): ShoppingItemEntity {
    return {
      id: item.id,
      listId: item.listId,
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      estPrice: item.estPrice,
      isBought: item.isBought,
      ingredient: mapIngredient(item.ingredient),
    };
  }
}
