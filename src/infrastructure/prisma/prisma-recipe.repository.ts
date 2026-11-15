import { Injectable } from '@nestjs/common';
import { Ingredient, Recipe, RecipeIngredient } from '@prisma/client';
import { DietTypeValue, DifficultyValue, MealTypeValue } from '../../domain/enums';
import {
  IngredientEntity,
  RecipeEntity,
  RecipeIngredientEntity,
} from '../../domain/entities';
import {
  RecipeMetricsUpdate,
  RecipeRepository,
} from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaRecipeWithIngredients = Recipe & {
  ingredients: Array<RecipeIngredient & { ingredient: Ingredient }>;
};

@Injectable()
export class PrismaRecipeRepository implements RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RecipeEntity[]> {
    const recipes = await this.prisma.recipe.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { title: 'asc' },
    });

    return recipes.map((recipe) => this.mapRecipe(recipe));
  }

  async findById(id: string): Promise<RecipeEntity | null> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return recipe ? this.mapRecipe(recipe) : null;
  }

  async updateMetrics(
    id: string,
    metrics: RecipeMetricsUpdate,
  ): Promise<void> {
    await this.prisma.recipe.update({
      where: { id },
      data: metrics,
    });
  }

  private mapRecipe(recipe: PrismaRecipeWithIngredients): RecipeEntity {
    return {
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
      cookMinutes: recipe.cookMinutes,
      difficulty: recipe.difficulty as DifficultyValue,
      tools: recipe.tools,
      steps: Array.isArray(recipe.steps)
        ? recipe.steps.filter((step): step is string => typeof step === 'string')
        : [],
      servings: recipe.servings,
      costEstimate: recipe.costEstimate,
      kcal: recipe.kcal,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      mealTypes: recipe.mealTypes as MealTypeValue[],
      dietTypes: recipe.dietTypes as DietTypeValue[],
      spiceLevel: recipe.spiceLevel,
      isHealthy: recipe.isHealthy,
      ingredients: recipe.ingredients.map((item) =>
        this.mapRecipeIngredient(item),
      ),
    };
  }

  private mapRecipeIngredient(
    item: RecipeIngredient & { ingredient: Ingredient },
  ): RecipeIngredientEntity {
    return {
      id: item.id,
      recipeId: item.recipeId,
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      isMain: item.isMain,
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
