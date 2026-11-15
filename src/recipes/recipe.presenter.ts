import { RecipeEntity } from '../domain/entities';
import {
  calculateIngredientNutrition,
  calculateRecipeCostPerServing,
  calculateRecipeNutritionPerServing,
  calculateRecipeTotalCost,
} from '../domain/nutrition';
import {
  RecipeDetailView,
  RecipeIngredientView,
  RecipeSummaryView,
} from './types';

export function toRecipeSummary(
  recipe: RecipeEntity,
  isHealthy: boolean,
): RecipeSummaryView {
  return {
    id: recipe.id,
    title: recipe.title,
    imageUrl: recipe.imageUrl,
    cookMinutes: recipe.cookMinutes,
    difficulty: recipe.difficulty,
    tools: recipe.tools,
    servings: recipe.servings,
    costEstimate: recipe.costEstimate,
    kcal: recipe.kcal,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    mealTypes: recipe.mealTypes,
    dietTypes: recipe.dietTypes,
    spiceLevel: recipe.spiceLevel,
    isHealthy,
  };
}

export function toRecipeDetail(
  recipe: RecipeEntity,
  isHealthy: boolean,
): RecipeDetailView {
  const nutrition = calculateRecipeNutritionPerServing(
    recipe.ingredients,
    recipe.servings,
  );

  return {
    ...toRecipeSummary(recipe, isHealthy),
    steps: recipe.steps,
    estimatedTotalCost: calculateRecipeTotalCost(recipe.ingredients),
    nutrition,
    ingredients: recipe.ingredients.map((item) => mapIngredient(item)),
  };
}

function mapIngredient(
  item: RecipeEntity['ingredients'][number],
): RecipeIngredientView {
  return {
    id: item.id,
    ingredientId: item.ingredientId,
    name: item.ingredient.name,
    category: item.ingredient.category,
    unit: item.ingredient.unit,
    quantity: item.quantity,
    isMain: item.isMain,
    grams: item.quantity * item.ingredient.gramsPerUnit,
    estimatedCost: Math.round(item.quantity * item.ingredient.pricePerUnit),
    nutrition: calculateIngredientNutrition(item),
  };
}

export function recalculateRecipeValues(
  recipe: RecipeEntity,
): {
  costEstimate: number;
  nutrition: ReturnType<typeof calculateRecipeNutritionPerServing>;
} {
  return {
    costEstimate: calculateRecipeCostPerServing(
      recipe.ingredients,
      recipe.servings,
    ),
    nutrition: calculateRecipeNutritionPerServing(
      recipe.ingredients,
      recipe.servings,
    ),
  };
}
