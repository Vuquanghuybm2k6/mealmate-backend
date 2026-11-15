import { Injectable } from '@nestjs/common';
import { MealLog, Prisma } from '@prisma/client';
import { MealLogEntity } from '../../domain/entities';
import { MealTypeValue } from '../../domain/enums';
import {
  CreateMealLogInput,
  MealLogRange,
  MealLogRepository,
} from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecipeRefRow,
  mapRecipeRef,
  recipeRefSelect,
} from './prisma.mappers';

type MealLogWithRecipe = MealLog & { recipe: RecipeRefRow | null };

@Injectable()
export class PrismaMealLogRepository implements MealLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMealLogInput): Promise<MealLogEntity> {
    const log = await this.prisma.mealLog.create({
      data: {
        userId: input.userId,
        recipeId: input.recipeId,
        recipeTitle: input.recipeTitle,
        mealType: input.mealType,
        eatenAt: input.eatenAt,
        cost: input.cost,
        kcal: input.kcal,
      },
      include: { recipe: { select: recipeRefSelect } },
    });

    return this.mapLog(log);
  }

  async listByUser(
    userId: string,
    range: MealLogRange = {},
  ): Promise<MealLogEntity[]> {
    const eatenAt: Prisma.DateTimeFilter = {};

    if (range.from) {
      eatenAt.gte = range.from;
    }

    if (range.to) {
      eatenAt.lte = range.to;
    }

    const logs = await this.prisma.mealLog.findMany({
      where: {
        userId,
        ...(range.from || range.to ? { eatenAt } : {}),
      },
      include: { recipe: { select: recipeRefSelect } },
      orderBy: { eatenAt: 'desc' },
    });

    return logs.map((log) => this.mapLog(log));
  }

  private mapLog(log: MealLogWithRecipe): MealLogEntity {
    return {
      id: log.id,
      userId: log.userId,
      recipeId: log.recipeId,
      recipeTitle: log.recipeTitle,
      mealType: log.mealType as MealTypeValue,
      eatenAt: log.eatenAt,
      cost: log.cost,
      kcal: log.kcal,
      createdAt: log.createdAt,
      recipe: mapRecipeRef(log.recipe),
    };
  }
}
