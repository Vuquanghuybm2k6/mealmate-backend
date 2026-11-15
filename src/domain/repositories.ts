import {
  FavoriteRecipeEntity,
  FridgeItemEntity,
  FunMessageEntity,
  GoogleUserInput,
  IngredientEntity,
  MealLogEntity,
  PushSubscriptionEntity,
  RecipeEntity,
  ReminderEntity,
  ShoppingItemEntity,
  ShoppingListEntity,
  StreakEntity,
  UserEntity,
  UserPreferenceEntity,
} from './entities';
import {
  DietTypeValue,
  FunMessageContextValue,
  MealTypeValue,
  ReminderChannelValue,
  ReminderDueKind,
} from './enums';

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');
export const INGREDIENT_REPOSITORY = Symbol('INGREDIENT_REPOSITORY');
export const PREFERENCE_REPOSITORY = Symbol('PREFERENCE_REPOSITORY');
export const FRIDGE_REPOSITORY = Symbol('FRIDGE_REPOSITORY');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const MEAL_LOG_REPOSITORY = Symbol('MEAL_LOG_REPOSITORY');
export const STREAK_REPOSITORY = Symbol('STREAK_REPOSITORY');
export const REMINDER_REPOSITORY = Symbol('REMINDER_REPOSITORY');
export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol('PUSH_SUBSCRIPTION_REPOSITORY');
export const FUN_MESSAGE_REPOSITORY = Symbol('FUN_MESSAGE_REPOSITORY');
export const SHOPPING_LIST_REPOSITORY = Symbol('SHOPPING_LIST_REPOSITORY');
export const FAVORITE_REPOSITORY = Symbol('FAVORITE_REPOSITORY');

export interface RecipeMetricsUpdate {
  costEstimate: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  isHealthy: boolean;
}

export interface RecipeRepository {
  findAll(): Promise<RecipeEntity[]>;
  findById(id: string): Promise<RecipeEntity | null>;
  updateMetrics(id: string, metrics: RecipeMetricsUpdate): Promise<void>;
}

export interface IngredientRepository {
  findAll(): Promise<IngredientEntity[]>;
  findById(id: string): Promise<IngredientEntity | null>;
}

export interface PreferenceUpdate {
  dietType?: DietTypeValue;
  spiceLevel?: number;
  dislikedIngredientIds?: string[];
  calorieGoal?: number | null;
  proteinGoal?: number | null;
  defaultBudget?: number | null;
  healthyMaxKcal?: number;
  healthyMinProtein?: number;
}

export interface PreferenceRepository {
  findByUserId(userId: string): Promise<UserPreferenceEntity | null>;
  upsert(
    userId: string,
    data: PreferenceUpdate,
  ): Promise<UserPreferenceEntity>;
}

export interface FridgeRepository {
  listByUser(userId: string): Promise<FridgeItemEntity[]>;
  upsert(
    userId: string,
    ingredientId: string,
    quantity: number,
  ): Promise<FridgeItemEntity>;
  remove(userId: string, idOrIngredientId: string): Promise<number>;
}

export interface UserProfileUpdate {
  name?: string;
  avatarUrl?: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  upsertGoogleUser(input: GoogleUserInput): Promise<UserEntity>;
  updateProfile(
    id: string,
    data: UserProfileUpdate,
  ): Promise<UserEntity | null>;
}

export interface CreateMealLogInput {
  userId: string;
  recipeId: string;
  recipeTitle: string;
  mealType: MealTypeValue;
  eatenAt: Date;
  cost: number;
  kcal: number;
}

export interface MealLogRange {
  from?: Date;
  to?: Date;
}

export interface MealLogRepository {
  create(input: CreateMealLogInput): Promise<MealLogEntity>;
  listByUser(
    userId: string,
    range?: MealLogRange,
  ): Promise<MealLogEntity[]>;
}

export interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  lastDate: string | null;
}

export interface StreakRepository {
  findByUserId(userId: string): Promise<StreakEntity | null>;
  upsert(userId: string, data: StreakUpdate): Promise<StreakEntity>;
}

export interface ReminderInput {
  mealType: MealTypeValue;
  timeOfDay: string;
  channel?: ReminderChannelValue;
  enabled?: boolean;
}

export interface ReminderRepository {
  listByUser(userId: string): Promise<ReminderEntity[]>;
  listAllEnabled(): Promise<ReminderEntity[]>;
  upsert(userId: string, input: ReminderInput): Promise<ReminderEntity>;
  markSent(
    id: string,
    kind: ReminderDueKind,
    sentAt: Date,
  ): Promise<void>;
}

export interface PushSubscriptionRepository {
  listByUser(userId: string): Promise<PushSubscriptionEntity[]>;
  upsert(
    userId: string,
    endpoint: string,
    keys: Record<string, string>,
  ): Promise<PushSubscriptionEntity>;
  remove(userId: string, id: string): Promise<number>;
}

export interface FunMessageRepository {
  findAll(): Promise<FunMessageEntity[]>;
  findByContext(
    context: FunMessageContextValue,
  ): Promise<FunMessageEntity[]>;
}

export interface CreateShoppingListInput {
  budget: number | null;
  totalCost: number;
  items: Array<{
    ingredientId: string;
    quantity: number;
    estPrice: number;
  }>;
}

export interface ShoppingListRepository {
  create(
    userId: string,
    input: CreateShoppingListInput,
  ): Promise<ShoppingListEntity>;
  findLatestByUser(userId: string): Promise<ShoppingListEntity | null>;
  findItemById(
    userId: string,
    itemId: string,
  ): Promise<ShoppingItemEntity | null>;
  setItemBought(
    userId: string,
    itemId: string,
    isBought: boolean,
  ): Promise<ShoppingItemEntity | null>;
}

export interface FavoriteRepository {
  listByUser(userId: string): Promise<FavoriteRecipeEntity[]>;
  add(userId: string, recipeId: string): Promise<FavoriteRecipeEntity>;
  remove(userId: string, recipeId: string): Promise<number>;
}
