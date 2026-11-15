import { MealTypeValue } from '../domain/enums';
import { StreakView } from '../domain/streak';

export interface MealLogView {
  id: string;
  recipeId: string | null;
  recipeTitle: string | null;
  imageUrl: string | null;
  mealType: MealTypeValue;
  eatenAt: Date;
  cost: number;
  kcal: number;
}

export interface MealTypeStatistics {
  mealType: MealTypeValue;
  count: number;
  cost: number;
  kcal: number;
}

export interface DailyMealStatistics {
  date: string;
  meals: number;
  mealTypes: MealTypeValue[];
  cost: number;
  kcal: number;
  complete: boolean;
}

export interface MostEatenRecipe {
  recipeId: string | null;
  title: string;
  count: number;
}

export interface MealStatisticsView {
  from: string;
  to: string;
  days: number;
  totalMeals: number;
  totalCost: number;
  totalKcal: number;
  averageCostPerDay: number;
  averageKcalPerDay: number;
  missedMeals: number;
  mostEatenRecipe: MostEatenRecipe | null;
  byMealType: MealTypeStatistics[];
  daily: DailyMealStatistics[];
  streak: StreakView;
}
