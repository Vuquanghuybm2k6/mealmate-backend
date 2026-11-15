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
} from '../domain/entities';
import {
  CreateMealLogInput,
  CreateShoppingListInput,
  FavoriteRepository,
  FridgeRepository,
  FunMessageRepository,
  IngredientRepository,
  MealLogRange,
  MealLogRepository,
  PreferenceRepository,
  PreferenceUpdate,
  PushSubscriptionRepository,
  RecipeMetricsUpdate,
  RecipeRepository,
  ReminderInput,
  ReminderRepository,
  ShoppingListRepository,
  StreakRepository,
  StreakUpdate,
  UserProfileUpdate,
  UserRepository,
} from '../domain/repositories';
import { ReminderDueKind } from '../domain/enums';

export class InMemoryRecipeRepository implements RecipeRepository {
  constructor(private readonly recipes: RecipeEntity[] = []) {}

  async findAll(): Promise<RecipeEntity[]> {
    return this.recipes;
  }

  async findById(id: string): Promise<RecipeEntity | null> {
    return this.recipes.find((recipe) => recipe.id === id) ?? null;
  }

  async updateMetrics(
    id: string,
    metrics: RecipeMetricsUpdate,
  ): Promise<void> {
    const recipe = this.recipes.find((item) => item.id === id);

    if (recipe) {
      Object.assign(recipe, metrics);
    }
  }

  setRecipes(recipes: RecipeEntity[]): void {
    this.recipes.splice(0, this.recipes.length, ...recipes);
  }
}

export class InMemoryIngredientRepository implements IngredientRepository {
  constructor(private readonly ingredients: IngredientEntity[] = []) {}

  async findAll(): Promise<IngredientEntity[]> {
    return this.ingredients;
  }

  async findById(id: string): Promise<IngredientEntity | null> {
    return this.ingredients.find((ingredient) => ingredient.id === id) ?? null;
  }

  setIngredients(ingredients: IngredientEntity[]): void {
    this.ingredients.splice(0, this.ingredients.length, ...ingredients);
  }
}

export class InMemoryPreferenceRepository implements PreferenceRepository {
  private readonly preferences = new Map<string, UserPreferenceEntity>();

  constructor(initialPreferences: UserPreferenceEntity[] = []) {
    for (const preference of initialPreferences) {
      this.preferences.set(preference.userId, preference);
    }
  }

  async findByUserId(userId: string): Promise<UserPreferenceEntity | null> {
    return this.preferences.get(userId) ?? null;
  }

  async upsert(
    userId: string,
    data: PreferenceUpdate,
  ): Promise<UserPreferenceEntity> {
    const existing = this.preferences.get(userId) ?? {
      userId,
      dietType: 'omnivore' as const,
      spiceLevel: 1,
      dislikedIngredientIds: [],
      calorieGoal: null,
      proteinGoal: null,
      defaultBudget: null,
      healthyMaxKcal: 600,
      healthyMinProtein: 15,
    };

    const preference: UserPreferenceEntity = {
      ...existing,
      ...data,
    };

    this.preferences.set(userId, preference);

    return preference;
  }

  set(preference: UserPreferenceEntity): void {
    this.preferences.set(preference.userId, preference);
  }
}

export class InMemoryFridgeRepository implements FridgeRepository {
  constructor(
    private readonly ingredientRepository: InMemoryIngredientRepository,
    private readonly items: FridgeItemEntity[] = [],
  ) {}

  async listByUser(userId: string): Promise<FridgeItemEntity[]> {
    return this.items.filter((item) => item.userId === userId);
  }

  async upsert(
    userId: string,
    ingredientId: string,
    quantity: number,
  ): Promise<FridgeItemEntity> {
    const ingredient = await this.ingredientRepository.findById(ingredientId);

    if (!ingredient) {
      throw new Error(`Không tìm thấy nguyên liệu ${ingredientId}`);
    }

    const existing = this.items.find(
      (item) => item.userId === userId && item.ingredientId === ingredientId,
    );

    if (existing) {
      existing.quantity += quantity;
      existing.addedAt = new Date();
      return existing;
    }

    const item: FridgeItemEntity = {
      id: `fridge-${this.items.length + 1}`,
      userId,
      ingredientId,
      quantity,
      addedAt: new Date(),
      ingredient,
    };

    this.items.push(item);

    return item;
  }

  async remove(userId: string, idOrIngredientId: string): Promise<number> {
    const before = this.items.length;

    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];

      if (
        item.userId === userId &&
        (item.id === idOrIngredientId ||
          item.ingredientId === idOrIngredientId)
      ) {
        this.items.splice(index, 1);
      }
    }

    return before - this.items.length;
  }

  snapshot(): FridgeItemEntity[] {
    return [...this.items];
  }
}

export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly users: UserEntity[] = []) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async upsertGoogleUser(input: GoogleUserInput): Promise<UserEntity> {
    const existing =
      this.users.find((user) => user.googleId === input.googleId) ??
      this.users.find((user) => user.email === input.email);

    if (existing) {
      existing.googleId = input.googleId;
      existing.email = input.email;
      existing.name = input.name;
      existing.avatarUrl = input.avatarUrl;
      return existing;
    }

    const user: UserEntity = {
      id: `user-${this.users.length + 1}`,
      createdAt: new Date(),
      ...input,
    };

    this.users.push(user);

    return user;
  }

  async updateProfile(
    id: string,
    data: UserProfileUpdate,
  ): Promise<UserEntity | null> {
    const user = this.users.find((item) => item.id === id);

    if (!user) {
      return null;
    }

    if (data.name !== undefined) {
      user.name = data.name;
    }

    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl;
    }

    return user;
  }

  setUsers(users: UserEntity[]): void {
    this.users.splice(0, this.users.length, ...users);
  }

  snapshot(): UserEntity[] {
    return [...this.users];
  }
}

export class InMemoryMealLogRepository implements MealLogRepository {
  constructor(private readonly logs: MealLogEntity[] = []) {}

  async create(input: CreateMealLogInput): Promise<MealLogEntity> {
    const log: MealLogEntity = {
      id: `meal-log-${this.logs.length + 1}`,
      userId: input.userId,
      recipeId: input.recipeId,
      recipeTitle: input.recipeTitle,
      mealType: input.mealType,
      eatenAt: input.eatenAt,
      cost: input.cost,
      kcal: input.kcal,
      createdAt: new Date(),
      recipe: null,
    };

    this.logs.push(log);

    return log;
  }

  async listByUser(
    userId: string,
    range: MealLogRange = {},
  ): Promise<MealLogEntity[]> {
    return this.logs
      .filter(
        (log) =>
          log.userId === userId &&
          (!range.from || log.eatenAt.getTime() >= range.from.getTime()) &&
          (!range.to || log.eatenAt.getTime() <= range.to.getTime()),
      )
      .sort((first, second) => second.eatenAt.getTime() - first.eatenAt.getTime());
  }

  snapshot(): MealLogEntity[] {
    return [...this.logs];
  }
}

export class InMemoryStreakRepository implements StreakRepository {
  private readonly streaks = new Map<string, StreakEntity>();

  constructor(initialStreaks: StreakEntity[] = []) {
    for (const streak of initialStreaks) {
      this.streaks.set(streak.userId, streak);
    }
  }

  async findByUserId(userId: string): Promise<StreakEntity | null> {
    return this.streaks.get(userId) ?? null;
  }

  async upsert(
    userId: string,
    data: StreakUpdate,
  ): Promise<StreakEntity> {
    const streak: StreakEntity = { userId, ...data };
    this.streaks.set(userId, streak);

    return streak;
  }
}

export class InMemoryReminderRepository implements ReminderRepository {
  private readonly reminders: ReminderEntity[] = [];

  constructor(initialReminders: ReminderEntity[] = []) {
    this.reminders.push(...initialReminders);
  }

  async listByUser(userId: string): Promise<ReminderEntity[]> {
    return this.reminders
      .filter((reminder) => reminder.userId === userId)
      .sort((first, second) =>
        first.timeOfDay.localeCompare(second.timeOfDay),
      );
  }

  async listAllEnabled(): Promise<ReminderEntity[]> {
    return this.reminders.filter((reminder) => reminder.enabled);
  }

  async upsert(
    userId: string,
    input: ReminderInput,
  ): Promise<ReminderEntity> {
    const existing = this.reminders.find(
      (reminder) =>
        reminder.userId === userId && reminder.mealType === input.mealType,
    );

    if (existing) {
      existing.timeOfDay = input.timeOfDay;
      existing.channel = input.channel ?? existing.channel;
      existing.enabled = input.enabled ?? existing.enabled;

      return existing;
    }

    const reminder: ReminderEntity = {
      id: `reminder-${this.reminders.length + 1}`,
      userId,
      mealType: input.mealType,
      timeOfDay: input.timeOfDay,
      channel: input.channel ?? 'push',
      enabled: input.enabled ?? true,
      lastSentAt: null,
      secondSentAt: null,
    };

    this.reminders.push(reminder);

    return reminder;
  }

  async markSent(
    id: string,
    kind: ReminderDueKind,
    sentAt: Date,
  ): Promise<void> {
    const reminder = this.reminders.find((item) => item.id === id);

    if (!reminder) {
      return;
    }

    if (kind === 'primary') {
      reminder.lastSentAt = sentAt;
    } else {
      reminder.secondSentAt = sentAt;
    }
  }

  snapshot(): ReminderEntity[] {
    return [...this.reminders];
  }
}

export class InMemoryPushSubscriptionRepository
  implements PushSubscriptionRepository
{
  private readonly subscriptions: PushSubscriptionEntity[] = [];

  async listByUser(userId: string): Promise<PushSubscriptionEntity[]> {
    return this.subscriptions.filter(
      (subscription) => subscription.userId === userId,
    );
  }

  async upsert(
    userId: string,
    endpoint: string,
    keys: Record<string, string>,
  ): Promise<PushSubscriptionEntity> {
    const existing = this.subscriptions.find(
      (subscription) => subscription.endpoint === endpoint,
    );

    if (existing) {
      existing.userId = userId;
      existing.keys = keys;

      return existing;
    }

    const subscription: PushSubscriptionEntity = {
      id: `push-subscription-${this.subscriptions.length + 1}`,
      userId,
      endpoint,
      keys,
      createdAt: new Date(),
    };

    this.subscriptions.push(subscription);

    return subscription;
  }

  async remove(userId: string, id: string): Promise<number> {
    const index = this.subscriptions.findIndex(
      (subscription) =>
        subscription.id === id && subscription.userId === userId,
    );

    if (index === -1) {
      return 0;
    }

    this.subscriptions.splice(index, 1);

    return 1;
  }

  snapshot(): PushSubscriptionEntity[] {
    return [...this.subscriptions];
  }
}

export class InMemoryFunMessageRepository implements FunMessageRepository {
  constructor(private readonly messages: FunMessageEntity[] = []) {}

  async findAll(): Promise<FunMessageEntity[]> {
    return this.messages;
  }

  async findByContext(
    context: FunMessageEntity['context'],
  ): Promise<FunMessageEntity[]> {
    return this.messages.filter((message) => message.context === context);
  }

  snapshot(): FunMessageEntity[] {
    return [...this.messages];
  }
}

export class InMemoryShoppingListRepository
  implements ShoppingListRepository
{
  private readonly lists: ShoppingListEntity[] = [];

  constructor(
    private readonly ingredientRepository: InMemoryIngredientRepository,
    initialLists: ShoppingListEntity[] = [],
  ) {
    this.lists.push(...initialLists);
  }

  async create(
    userId: string,
    input: CreateShoppingListInput,
  ): Promise<ShoppingListEntity> {
    const listId = `shopping-list-${this.lists.length + 1}`;
    const items: ShoppingItemEntity[] = [];

    for (const [index, item] of input.items.entries()) {
      const ingredient = await this.ingredientRepository.findById(
        item.ingredientId,
      );

      if (!ingredient) {
        throw new Error(`Không tìm thấy nguyên liệu ${item.ingredientId}`);
      }

      items.push({
        id: `${listId}-item-${index + 1}`,
        listId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        estPrice: item.estPrice,
        isBought: false,
        ingredient,
      });
    }

    const list: ShoppingListEntity = {
      id: listId,
      userId,
      createdAt: new Date(),
      totalCost: input.totalCost,
      budget: input.budget,
      items,
    };

    this.lists.push(list);

    return list;
  }

  async findLatestByUser(
    userId: string,
  ): Promise<ShoppingListEntity | null> {
    const lists = this.lists.filter((list) => list.userId === userId);

    return lists.length > 0 ? lists[lists.length - 1] : null;
  }

  async findItemById(
    userId: string,
    itemId: string,
  ): Promise<ShoppingItemEntity | null> {
    for (const list of this.lists) {
      if (list.userId !== userId) {
        continue;
      }

      const item = list.items.find((candidate) => candidate.id === itemId);

      if (item) {
        return item;
      }
    }

    return null;
  }

  async setItemBought(
    userId: string,
    itemId: string,
    isBought: boolean,
  ): Promise<ShoppingItemEntity | null> {
    const item = await this.findItemById(userId, itemId);

    if (item) {
      item.isBought = isBought;
    }

    return item;
  }

  snapshot(): ShoppingListEntity[] {
    return [...this.lists];
  }
}

export class InMemoryFavoriteRepository implements FavoriteRepository {
  private readonly favorites: FavoriteRecipeEntity[] = [];

  constructor(
    private readonly recipeRepository: InMemoryRecipeRepository,
    initialFavorites: FavoriteRecipeEntity[] = [],
  ) {
    this.favorites.push(...initialFavorites);
  }

  async listByUser(userId: string): Promise<FavoriteRecipeEntity[]> {
    return this.favorites.filter((favorite) => favorite.userId === userId);
  }

  async add(
    userId: string,
    recipeId: string,
  ): Promise<FavoriteRecipeEntity> {
    const existing = this.favorites.find(
      (favorite) =>
        favorite.userId === userId && favorite.recipeId === recipeId,
    );

    if (existing) {
      return existing;
    }

    const recipe = await this.recipeRepository.findById(recipeId);

    if (!recipe) {
      throw new Error(`Không tìm thấy công thức ${recipeId}`);
    }

    const favorite: FavoriteRecipeEntity = {
      userId,
      recipeId,
      createdAt: new Date(),
      recipe: {
        id: recipe.id,
        title: recipe.title,
        imageUrl: recipe.imageUrl,
        cookMinutes: recipe.cookMinutes,
        costEstimate: recipe.costEstimate,
        kcal: recipe.kcal,
      },
    };

    this.favorites.push(favorite);

    return favorite;
  }

  async remove(userId: string, recipeId: string): Promise<number> {
    const index = this.favorites.findIndex(
      (favorite) =>
        favorite.userId === userId && favorite.recipeId === recipeId,
    );

    if (index === -1) {
      return 0;
    }

    this.favorites.splice(index, 1);

    return 1;
  }

  snapshot(): FavoriteRecipeEntity[] {
    return [...this.favorites];
  }
}

