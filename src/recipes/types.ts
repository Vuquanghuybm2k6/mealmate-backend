import { DietTypeValue, DifficultyValue, MealTypeValue } from '../domain/enums';

export interface RecipeSummaryView {
  id: string;
  title: string;
  imageUrl: string | null;
  cookMinutes: number;
  difficulty: DifficultyValue;
  tools: string[];
  servings: number;
  costEstimate: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  mealTypes: MealTypeValue[];
  dietTypes: DietTypeValue[];
  spiceLevel: number;
  isHealthy: boolean;
}

export interface RecipeIngredientView {
  id: string;
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  isMain: boolean;
  grams: number;
  estimatedCost: number;
  nutrition: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface RecipeDetailView extends RecipeSummaryView {
  steps: string[];
  estimatedTotalCost: number;
  nutrition: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: RecipeIngredientView[];
}

export type IngredientMatchStatus = 'enough' | 'not_enough' | 'missing';

export interface IngredientMatchView {
  ingredientId: string;
  name: string;
  unit: string;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  isMain: boolean;
  status: IngredientMatchStatus;
}

export interface RecipeSuggestionView {
  recipe: RecipeSummaryView;
  matchScore: number;
  matchedIngredients: IngredientMatchView[];
  missingIngredients: IngredientMatchView[];
}

export interface RecipeFilterOptions {
  budget?: number;
  meal?: MealTypeValue;
  healthy?: boolean;
  maxTime?: number;
  limit?: number;
}

export interface SuggestionOptions {
  threshold?: number;
  budget?: number;
  meal?: MealTypeValue;
  maxTime?: number;
  limit?: number;
}
