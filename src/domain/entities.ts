import {
  DietTypeValue,
  DifficultyValue,
  FunMessageContextValue,
  MealTypeValue,
  ReminderChannelValue,
} from './enums';

export interface IngredientEntity {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  unit: string;
  pricePerUnit: number;
  gramsPerUnit: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeIngredientEntity {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  isMain: boolean;
  ingredient: IngredientEntity;
}

export interface RecipeEntity {
  id: string;
  title: string;
  imageUrl: string | null;
  cookMinutes: number;
  difficulty: DifficultyValue;
  tools: string[];
  steps: string[];
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
  ingredients: RecipeIngredientEntity[];
}

export interface UserPreferenceEntity {
  userId: string;
  dietType: DietTypeValue;
  spiceLevel: number;
  dislikedIngredientIds: string[];
  calorieGoal: number | null;
  proteinGoal: number | null;
  defaultBudget: number | null;
  healthyMaxKcal: number;
  healthyMinProtein: number;
}

export interface FridgeItemEntity {
  id: string;
  userId: string;
  ingredientId: string;
  quantity: number;
  addedAt: Date;
  ingredient: IngredientEntity;
}

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId: string | null;
  createdAt: Date;
}

export interface GoogleUserInput {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface RecipeRefEntity {
  id: string;
  title: string;
  imageUrl: string | null;
  cookMinutes: number;
  costEstimate: number;
  kcal: number;
}

export interface MealLogEntity {
  id: string;
  userId: string;
  recipeId: string | null;
  recipeTitle: string | null;
  mealType: MealTypeValue;
  eatenAt: Date;
  cost: number;
  kcal: number;
  createdAt: Date;
  recipe: RecipeRefEntity | null;
}

export interface ReminderEntity {
  id: string;
  userId: string;
  mealType: MealTypeValue;
  timeOfDay: string;
  channel: ReminderChannelValue;
  enabled: boolean;
  lastSentAt: Date | null;
  secondSentAt: Date | null;
}

export interface PushSubscriptionEntity {
  id: string;
  userId: string;
  endpoint: string;
  keys: Record<string, string>;
  createdAt: Date;
}

export interface StreakEntity {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastDate: string | null;
}

export interface FunMessageEntity {
  id: string;
  context: FunMessageContextValue;
  text: string;
  author: string;
}

export interface ShoppingItemEntity {
  id: string;
  listId: string;
  ingredientId: string;
  quantity: number;
  estPrice: number;
  isBought: boolean;
  ingredient: IngredientEntity;
}

export interface ShoppingListEntity {
  id: string;
  userId: string;
  createdAt: Date;
  totalCost: number;
  budget: number | null;
  items: ShoppingItemEntity[];
}

export interface FavoriteRecipeEntity {
  userId: string;
  recipeId: string;
  createdAt: Date;
  recipe: RecipeRefEntity;
}
