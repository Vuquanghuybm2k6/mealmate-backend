import { FunMessageContextValue, MealTypeValue } from '../domain/enums';
import { StreakView } from '../domain/streak';
import {
  IngredientMatchView,
  RecipeSummaryView,
} from '../recipes/types';

export interface FunMessageView {
  id: string;
  context: FunMessageContextValue;
  text: string;
  author: string;
}

export interface RandomRecipeView {
  recipe: RecipeSummaryView;
  matchScore: number | null;
  missingIngredients: IngredientMatchView[];
  message: FunMessageView | null;
  extraMessage: FunMessageView | null;
  poolSize: number;
  source: 'budget' | 'fridge';
}

export interface FunStreakView extends StreakView {
  mealsToday: MealTypeValue[];
  remainingMeals: MealTypeValue[];
}
