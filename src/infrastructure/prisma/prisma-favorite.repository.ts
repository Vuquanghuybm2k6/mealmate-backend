import { Injectable } from '@nestjs/common';
import { FavoriteRecipe } from '@prisma/client';
import { FavoriteRecipeEntity } from '../../domain/entities';
import { FavoriteRepository } from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecipeRefRow,
  mapRecipeRef,
  recipeRefSelect,
} from './prisma.mappers';

type FavoriteWithRecipe = FavoriteRecipe & { recipe: RecipeRefRow };

@Injectable()
export class PrismaFavoriteRepository implements FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string): Promise<FavoriteRecipeEntity[]> {
    const favorites = await this.prisma.favoriteRecipe.findMany({
      where: { userId },
      include: { recipe: { select: recipeRefSelect } },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((favorite) => this.mapFavorite(favorite));
  }

  async add(
    userId: string,
    recipeId: string,
  ): Promise<FavoriteRecipeEntity> {
    const favorite = await this.prisma.favoriteRecipe.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: {},
      create: { userId, recipeId },
      include: { recipe: { select: recipeRefSelect } },
    });

    return this.mapFavorite(favorite);
  }

  async remove(userId: string, recipeId: string): Promise<number> {
    const result = await this.prisma.favoriteRecipe.deleteMany({
      where: { userId, recipeId },
    });

    return result.count;
  }

  private mapFavorite(favorite: FavoriteWithRecipe): FavoriteRecipeEntity {
    return {
      userId: favorite.userId,
      recipeId: favorite.recipeId,
      createdAt: favorite.createdAt,
      recipe: mapRecipeRef(favorite.recipe)!,
    };
  }
}
