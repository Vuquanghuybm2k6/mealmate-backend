import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { RecipeEntity, UserPreferenceEntity } from '../domain/entities';
import {
  calculateRecipeCostPerServing,
  calculateRecipeNutritionPerServing,
  isHealthyNutrition,
  roundTo,
} from '../domain/nutrition';
import {
  PREFERENCE_REPOSITORY,
  RECIPE_REPOSITORY,
  PreferenceRepository,
  RecipeRepository,
} from '../domain/repositories';
import { toRecipeDetail, toRecipeSummary } from './recipe.presenter';
import {
  IngredientMatchStatus,
  IngredientMatchView,
  RecipeDetailView,
  RecipeFilterOptions,
  RecipeSuggestionView,
  RecipeSummaryView,
  SuggestionOptions,
} from './types';

const DEFAULT_LIST_LIMIT = 50;
const DEFAULT_SUGGESTION_LIMIT = 20;

@Injectable()
export class RecipesService {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipeRepository: RecipeRepository,
    @Inject(PREFERENCE_REPOSITORY)
    private readonly preferenceRepository: PreferenceRepository,
    @Inject(APP_CONFIG)
    private readonly config: AppConfig,
  ) {}

  /**
   * Tính năng 1: lọc theo ngân sách / bữa ăn / chế độ lành mạnh / thời gian,
   * đồng thời ưu tiên món hợp khẩu vị và gần sát ngân sách.
   */
  async list(
    userId: string,
    filters: RecipeFilterOptions,
  ): Promise<RecipeSummaryView[]> {
    const preferences = await this.preferenceRepository.findByUserId(userId);
    const effectiveBudget = filters.budget ?? preferences?.defaultBudget ?? undefined;
    const maxCookMinutes = Math.min(
      filters.maxTime ?? this.config.quickRecipeMaxMinutes,
      this.config.quickRecipeMaxMinutes,
    );

    let recipes = (await this.recipeRepository.findAll()).filter(
      (recipe) => recipe.cookMinutes <= maxCookMinutes,
    );

    if (filters.meal) {
      recipes = recipes.filter((recipe) =>
        recipe.mealTypes.includes(filters.meal!),
      );
    }

    recipes = this.applyPreferenceFilters(recipes, preferences);

    if (effectiveBudget !== undefined) {
      recipes = recipes.filter(
        (recipe) => recipe.costEstimate <= effectiveBudget,
      );
    }

    if (filters.healthy) {
      const thresholds = this.getHealthyThresholds(preferences);
      recipes = recipes.filter((recipe) =>
        isHealthyNutrition(
          { kcal: recipe.kcal, protein: recipe.protein },
          thresholds,
        ),
      );
    }

    recipes.sort((first, second) => {
      const preferenceDifference =
        this.preferenceScore(second, preferences) -
        this.preferenceScore(first, preferences);

      if (preferenceDifference !== 0) {
        return preferenceDifference;
      }

      if (effectiveBudget !== undefined) {
        const budgetDifference =
          (effectiveBudget - first.costEstimate) -
          (effectiveBudget - second.costEstimate);

        if (budgetDifference !== 0) {
          return budgetDifference;
        }
      }

      if (first.cookMinutes !== second.cookMinutes) {
        return first.cookMinutes - second.cookMinutes;
      }

      return first.title.localeCompare(second.title, 'vi');
    });

    return recipes
      .slice(0, filters.limit ?? DEFAULT_LIST_LIMIT)
      .map((recipe) =>
        toRecipeSummary(recipe, this.isRecipeHealthy(recipe, preferences)),
      );
  }

  async detail(userId: string, recipeId: string): Promise<RecipeDetailView> {
    const [recipe, preferences] = await Promise.all([
      this.recipeRepository.findById(recipeId),
      this.preferenceRepository.findByUserId(userId),
    ]);

    if (!recipe) {
      throw new NotFoundException('Không tìm thấy công thức');
    }

    return toRecipeDetail(
      recipe,
      this.isRecipeHealthy(recipe, preferences),
    );
  }

  /**
   * Tính năng 2: chấm điểm khớp nguyên liệu chính với tủ lạnh.
   * Điểm khớp = số nguyên liệu chính đang có / tổng nguyên liệu chính.
   */
  async suggestForFridge(
    availableIngredients: ReadonlyMap<string, number>,
    options: SuggestionOptions = {},
  ): Promise<RecipeSuggestionView[]> {
    const threshold = options.threshold ?? this.config.fridgeMatchThreshold;

    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new BadRequestException('Ngưỡng khớp phải nằm trong khoảng 0 đến 1');
    }

    const maxCookMinutes = Math.min(
      options.maxTime ?? this.config.quickRecipeMaxMinutes,
      this.config.quickRecipeMaxMinutes,
    );

    let recipes = (await this.recipeRepository.findAll()).filter(
      (recipe) => recipe.cookMinutes <= maxCookMinutes,
    );

    if (options.meal) {
      recipes = recipes.filter((recipe) =>
        recipe.mealTypes.includes(options.meal!),
      );
    }

    if (options.budget !== undefined) {
      recipes = recipes.filter(
        (recipe) => recipe.costEstimate <= options.budget!,
      );
    }

    const suggestions = recipes
      .map((recipe) =>
        this.buildSuggestion(recipe, availableIngredients, threshold),
      )
      .filter(
        (suggestion): suggestion is RecipeSuggestionView =>
          suggestion !== null,
      )
      .sort((first, second) => {
        if (second.matchScore !== first.matchScore) {
          return second.matchScore - first.matchScore;
        }

        if (first.recipe.cookMinutes !== second.recipe.cookMinutes) {
          return first.recipe.cookMinutes - second.recipe.cookMinutes;
        }

        if (first.recipe.costEstimate !== second.recipe.costEstimate) {
          return first.recipe.costEstimate - second.recipe.costEstimate;
        }

        return first.recipe.title.localeCompare(second.recipe.title, 'vi');
      });

    return suggestions.slice(0, options.limit ?? DEFAULT_SUGGESTION_LIMIT);
  }

  /**
   * Tính lại cost_estimate + dinh dưỡng đã cache. Gọi sau khi giá nguyên liệu
   * hoặc công thức thay đổi.
   */
  async recalculateMetrics(
    ingredientId?: string,
  ): Promise<{ updated: number }> {
    const recipes = await this.recipeRepository.findAll();
    const affected = ingredientId
      ? recipes.filter((recipe) =>
          recipe.ingredients.some(
            (item) => item.ingredientId === ingredientId,
          ),
        )
      : recipes;

    for (const recipe of affected) {
      const nutrition = calculateRecipeNutritionPerServing(
        recipe.ingredients,
        recipe.servings,
      );
      const costEstimate = calculateRecipeCostPerServing(
        recipe.ingredients,
        recipe.servings,
      );

      await this.recipeRepository.updateMetrics(recipe.id, {
        costEstimate,
        kcal: nutrition.kcal,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        isHealthy: isHealthyNutrition(nutrition, {
          maxKcal: this.config.healthyMaxKcal,
          minProtein: this.config.healthyMinProtein,
        }),
      });
    }

    return { updated: affected.length };
  }

  private buildSuggestion(
    recipe: RecipeEntity,
    availableIngredients: ReadonlyMap<string, number>,
    threshold: number,
  ): RecipeSuggestionView | null {
    const mainIngredients = recipe.ingredients.filter((item) => item.isMain);
    const ingredientsForScore =
      mainIngredients.length > 0 ? mainIngredients : recipe.ingredients;

    const matches = recipe.ingredients.map((item) =>
      this.buildIngredientMatch(item, availableIngredients),
    );

    const matchedMainCount = ingredientsForScore.filter(
      (item) => (availableIngredients.get(item.ingredientId) ?? 0) > 0,
    ).length;
    const matchScore =
      ingredientsForScore.length === 0
        ? 0
        : roundTo(matchedMainCount / ingredientsForScore.length, 2);

    if (matchScore < threshold) {
      return null;
    }

    return {
      recipe: toRecipeSummary(
        recipe,
        isHealthyNutrition(
          { kcal: recipe.kcal, protein: recipe.protein },
          {
            maxKcal: this.config.healthyMaxKcal,
            minProtein: this.config.healthyMinProtein,
          },
        ),
      ),
      matchScore,
      matchedIngredients: matches.filter(
        (match) => match.availableQuantity > 0,
      ),
      missingIngredients: matches.filter(
        (match) => match.status !== 'enough',
      ),
    };
  }

  private buildIngredientMatch(
    item: RecipeEntity['ingredients'][number],
    availableIngredients: ReadonlyMap<string, number>,
  ): IngredientMatchView {
    const requiredQuantity = item.quantity;
    const availableQuantity = availableIngredients.get(item.ingredientId) ?? 0;
    const missingQuantity = Math.max(
      0,
      roundTo(requiredQuantity - availableQuantity, 2),
    );

    let status: IngredientMatchStatus = 'enough';

    if (availableQuantity <= 0) {
      status = 'missing';
    } else if (availableQuantity < requiredQuantity) {
      status = 'not_enough';
    }

    return {
      ingredientId: item.ingredientId,
      name: item.ingredient.name,
      unit: item.ingredient.unit,
      requiredQuantity,
      availableQuantity,
      missingQuantity,
      isMain: item.isMain,
      status,
    };
  }

  private applyPreferenceFilters(
    recipes: RecipeEntity[],
    preferences: UserPreferenceEntity | null,
  ): RecipeEntity[] {
    if (!preferences) {
      return recipes;
    }

    return recipes
      .filter(
        (recipe) =>
          !recipe.ingredients.some((item) =>
            preferences.dislikedIngredientIds.includes(item.ingredientId),
          ),
      )
      .filter(
        (recipe) =>
          preferences.dietType === 'omnivore' ||
          recipe.dietTypes.includes(preferences.dietType),
      );
  }

  private preferenceScore(
    recipe: RecipeEntity,
    preferences: UserPreferenceEntity | null,
  ): number {
    if (!preferences) {
      return 0;
    }

    const dietScore =
      preferences.dietType === 'omnivore' ||
      recipe.dietTypes.includes(preferences.dietType)
        ? 2
        : 0;
    const spiceDistance = Math.min(
      3,
      Math.abs(recipe.spiceLevel - preferences.spiceLevel),
    );
    const spiceScore = 1 - spiceDistance / 3;

    return dietScore + spiceScore;
  }

  private isRecipeHealthy(
    recipe: RecipeEntity,
    preferences: UserPreferenceEntity | null,
  ): boolean {
    return isHealthyNutrition(
      { kcal: recipe.kcal, protein: recipe.protein },
      this.getHealthyThresholds(preferences),
    );
  }

  private getHealthyThresholds(
    preferences: UserPreferenceEntity | null,
  ): { maxKcal: number; minProtein: number } {
    return {
      maxKcal: preferences?.healthyMaxKcal ?? this.config.healthyMaxKcal,
      minProtein:
        preferences?.healthyMinProtein ?? this.config.healthyMinProtein,
    };
  }
}
