import { Ingredient } from '@prisma/client';
import { IngredientEntity, RecipeRefEntity } from '../../domain/entities';

export const recipeRefSelect = {
  id: true,
  title: true,
  imageUrl: true,
  cookMinutes: true,
  costEstimate: true,
  kcal: true,
} as const;

export interface RecipeRefRow {
  id: string;
  title: string;
  imageUrl: string | null;
  cookMinutes: number;
  costEstimate: number;
  kcal: number;
}

export function mapIngredient(ingredient: Ingredient): IngredientEntity {
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

export function mapRecipeRef(
  recipe: RecipeRefRow | null,
): RecipeRefEntity | null {
  if (!recipe) {
    return null;
  }

  return {
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl,
    cookMinutes: recipe.cookMinutes,
    costEstimate: recipe.costEstimate,
    kcal: recipe.kcal,
  };
}
