import { AppConfig } from '../config/app-config';
import {
  FavoriteRecipeEntity,
  FridgeItemEntity,
  FunMessageEntity,
  IngredientEntity,
  MealLogEntity,
  RecipeEntity,
  RecipeIngredientEntity,
  ReminderEntity,
  ShoppingItemEntity,
  ShoppingListEntity,
  StreakEntity,
  UserEntity,
  UserPreferenceEntity,
} from '../domain/entities';

export const TEST_CONFIG: AppConfig = {
  port: 3000,
  quickRecipeMaxMinutes: 20,
  healthyMaxKcal: 600,
  healthyMinProtein: 15,
  fridgeMatchThreshold: 0.6,
  reminderSecondDelayMinutes: 30,
  reminderSecondWindowMinutes: 60,
  defaultUserId: 'demo-user',
  googleCallbackUrl: 'http://localhost:3000/api/v1/auth/google/callback',
  jwtSecret: 'test-jwt-secret',
  jwtExpiresIn: '7d',
  frontendUrl: 'http://localhost:5173',
};

let sequence = 0;

const nextId = (prefix: string): string => `${prefix}-${(sequence += 1)}`;

export function makeIngredient(
  input: Partial<IngredientEntity> & Pick<IngredientEntity, 'id' | 'name'>,
): IngredientEntity {
  return {
    aliases: [],
    category: 'Khác',
    unit: 'g',
    pricePerUnit: 0,
    gramsPerUnit: 1,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    ...input,
  };
}

export function makeRecipeIngredient(
  recipeId: string,
  ingredient: IngredientEntity,
  overrides: Partial<RecipeIngredientEntity> = {},
): RecipeIngredientEntity {
  return {
    id: nextId('recipe-ingredient'),
    recipeId,
    ingredientId: ingredient.id,
    quantity: 1,
    isMain: true,
    ingredient,
    ...overrides,
  };
}

export function makeRecipe(
  input: Partial<RecipeEntity> & Pick<RecipeEntity, 'id' | 'title'>,
): RecipeEntity {
  return {
    imageUrl: null,
    cookMinutes: 10,
    difficulty: 'easy',
    tools: ['nồi'],
    steps: ['Bước 1'],
    servings: 1,
    costEstimate: 0,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    mealTypes: ['lunch'],
    dietTypes: ['omnivore'],
    spiceLevel: 1,
    isHealthy: false,
    ingredients: [],
    ...input,
  };
}

export function makePreference(
  overrides: Partial<UserPreferenceEntity> = {},
): UserPreferenceEntity {
  return {
    userId: 'demo-user',
    dietType: 'omnivore',
    spiceLevel: 1,
    dislikedIngredientIds: [],
    calorieGoal: 2000,
    proteinGoal: 60,
    defaultBudget: null,
    healthyMaxKcal: 600,
    healthyMinProtein: 15,
    ...overrides,
  };
}

export function makeFridgeItem(
  ingredient: IngredientEntity,
  quantity = 1,
  overrides: Partial<FridgeItemEntity> = {},
): FridgeItemEntity {
  return {
    id: nextId('fridge-item'),
    userId: 'demo-user',
    ingredientId: ingredient.id,
    quantity,
    addedAt: new Date('2026-01-01T00:00:00.000Z'),
    ingredient,
    ...overrides,
  };
}

export function makeUser(
  input: Partial<UserEntity> & Pick<UserEntity, 'id' | 'email'>,
): UserEntity {
  return {
    name: 'Sinh viên demo',
    avatarUrl: null,
    googleId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...input,
  };
}

export function makeMealLog(
  input: Partial<MealLogEntity> & Pick<MealLogEntity, 'mealType' | 'eatenAt'>,
): MealLogEntity {
  return {
    id: nextId('meal-log'),
    userId: 'demo-user',
    recipeId: 'recipe-a',
    recipeTitle: 'Cơm trứng cà chua',
    cost: 15_000,
    kcal: 480,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    recipe: null,
    ...input,
  };
}

export function makeReminder(
  input: Partial<ReminderEntity> & Pick<ReminderEntity, 'mealType'>,
): ReminderEntity {
  return {
    id: nextId('reminder'),
    userId: 'demo-user',
    timeOfDay: '07:00',
    channel: 'push',
    enabled: true,
    lastSentAt: null,
    secondSentAt: null,
    ...input,
  };
}

export function makeStreak(
  input: Partial<StreakEntity> = {},
): StreakEntity {
  return {
    userId: 'demo-user',
    currentStreak: 0,
    longestStreak: 0,
    lastDate: null,
    ...input,
  };
}

export function makeFunMessage(
  input: Partial<FunMessageEntity> &
    Pick<FunMessageEntity, 'context' | 'text'>,
): FunMessageEntity {
  return {
    id: nextId('fun-message'),
    author: 'BếpSV',
    ...input,
  };
}

export function makeShoppingItem(
  ingredient: IngredientEntity,
  input: Partial<ShoppingItemEntity> = {},
): ShoppingItemEntity {
  return {
    id: nextId('shopping-item'),
    listId: 'shopping-list-1',
    ingredientId: ingredient.id,
    quantity: 1,
    estPrice: ingredient.pricePerUnit,
    isBought: false,
    ingredient,
    ...input,
  };
}

export function makeShoppingList(
  input: Partial<ShoppingListEntity> = {},
): ShoppingListEntity {
  return {
    id: nextId('shopping-list'),
    userId: 'demo-user',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    totalCost: 0,
    budget: null,
    items: [],
    ...input,
  };
}

export function makeFavorite(
  recipe: RecipeEntity,
  input: Partial<FavoriteRecipeEntity> = {},
): FavoriteRecipeEntity {
  return {
    userId: 'demo-user',
    recipeId: recipe.id,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    recipe: {
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
      cookMinutes: recipe.cookMinutes,
      costEstimate: recipe.costEstimate,
      kcal: recipe.kcal,
    },
    ...input,
  };
}
