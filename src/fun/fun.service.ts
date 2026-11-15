import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { endOfDay, startOfDay, toDateKey } from '../domain/dates';
import { FunMessageEntity } from '../domain/entities';
import {
  FUN_MESSAGE_CONTEXTS,
  FunMessageContextValue,
  MEAL_TYPES,
  MealTypeValue,
} from '../domain/enums';
import {
  FRIDGE_REPOSITORY,
  FridgeRepository,
  FUN_MESSAGE_REPOSITORY,
  FunMessageRepository,
  MEAL_LOG_REPOSITORY,
  MealLogRepository,
  STREAK_REPOSITORY,
  StreakRepository,
} from '../domain/repositories';
import { emptyStreak, toStreakView } from '../domain/streak';
import { RecipesService } from '../recipes/recipes.service';
import { RecipeSuggestionView, RecipeSummaryView } from '../recipes/types';
import { FunMessageQueryDto } from './dto/fun-message-query.dto';
import { RandomRecipeQueryDto } from './dto/random-recipe-query.dto';
import {
  FunMessageView,
  FunStreakView,
  RandomRecipeView,
} from './types';

const FALLBACK_MESSAGES: Record<FunMessageContextValue, string> = {
  wheel: 'Vòng quay đã chọn! Nấu ngay kẻo đói nhé.',
  budget_cheap: 'Ví nhẹ mà vẫn ăn ngon, quá đỉnh!',
  budget_good: 'Vẫn trong ngân sách, yên tâm ăn no!',
  streak: 'Ghi nhận đủ bữa để nuôi chuỗi ngày ăn ngoan nhé!',
  healthy: 'Món này vừa nhanh vừa lành, chọn chuẩn rồi!',
};

@Injectable()
export class FunService {
  constructor(
    @Inject(FUN_MESSAGE_REPOSITORY)
    private readonly funMessageRepository: FunMessageRepository,
    @Inject(FRIDGE_REPOSITORY)
    private readonly fridgeRepository: FridgeRepository,
    @Inject(MEAL_LOG_REPOSITORY)
    private readonly mealLogRepository: MealLogRepository,
    @Inject(STREAK_REPOSITORY)
    private readonly streakRepository: StreakRepository,
    private readonly recipesService: RecipesService,
  ) {}

  async randomRecipe(
    userId: string,
    query: RandomRecipeQueryDto,
  ): Promise<RandomRecipeView> {
    const source = query.source ?? 'budget';
    const pool: Array<{
      recipe: RecipeSummaryView;
      matchScore: number | null;
      missingIngredients: RecipeSuggestionView['missingIngredients'];
    }> =
      source === 'fridge'
        ? await this.fridgePool(userId, query)
        : await this.budgetPool(userId, query);

    if (pool.length === 0) {
      throw new NotFoundException(
        source === 'fridge'
          ? 'Tủ lạnh chưa đủ nguyên liệu để gợi ý món. Thêm nguyên liệu hoặc thử nguồn ngân sách nhé.'
          : 'Không tìm thấy món phù hợp với bộ lọc. Thử tăng ngân sách hoặc bỏ bớt điều kiện.',
      );
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const messageContext: FunMessageContextValue = query.healthy
      ? 'healthy'
      : 'wheel';
    const message = await this.pickMessage(messageContext);
    const extraMessage =
      query.budget !== undefined
        ? await this.pickMessage(
            picked.recipe.costEstimate <= query.budget / 2
              ? 'budget_cheap'
              : 'budget_good',
          )
        : null;

    return {
      recipe: picked.recipe,
      matchScore: picked.matchScore,
      missingIngredients: picked.missingIngredients,
      message,
      extraMessage,
      poolSize: pool.length,
      source,
    };
  }

  async message(query: FunMessageQueryDto): Promise<FunMessageView> {
    const context = query.context ?? 'wheel';
    const message = await this.pickMessage(context);

    if (!message) {
      throw new NotFoundException('Chưa có thông điệp vui cho ngữ cảnh này');
    }

    return message;
  }

  async streak(userId: string): Promise<FunStreakView> {
    const [stored, logs] = await Promise.all([
      this.streakRepository.findByUserId(userId),
      this.mealLogRepository.listByUser(userId, {
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
      }),
    ]);
    const mealsToday = [
      ...new Set(logs.map((log) => log.mealType)),
    ] as MealTypeValue[];
    const remainingMeals = MEAL_TYPES.filter(
      (mealType) => !mealsToday.includes(mealType),
    );

    return {
      ...toStreakView(stored ?? emptyStreak(userId), userId),
      mealsToday,
      remainingMeals,
    };
  }

  async allMessages(): Promise<FunMessageView[]> {
    const messages = await this.funMessageRepository.findAll();

    return messages.map((message) => this.toView(message));
  }

  private async budgetPool(
    userId: string,
    query: RandomRecipeQueryDto,
  ): Promise<
    Array<{
      recipe: RecipeSummaryView;
      matchScore: null;
      missingIngredients: [];
    }>
  > {
    const recipes = await this.recipesService.list(userId, {
      budget: query.budget,
      meal: query.meal,
      healthy: query.healthy,
      maxTime: query.maxTime,
      limit: 50,
    });

    return recipes.map((recipe) => ({
      recipe,
      matchScore: null,
      missingIngredients: [],
    }));
  }

  private async fridgePool(
    userId: string,
    query: RandomRecipeQueryDto,
  ): Promise<RecipeSuggestionView[]> {
    const items = await this.fridgeRepository.listByUser(userId);
    const available = new Map(
      items.map((item) => [item.ingredientId, item.quantity]),
    );

    return this.recipesService.suggestForFridge(available, {
      threshold: query.threshold,
      budget: query.budget,
      meal: query.meal,
      maxTime: query.maxTime,
      limit: 50,
    });
  }

  private async pickMessage(
    context: FunMessageContextValue,
  ): Promise<FunMessageView | null> {
    const [specific, all] = await Promise.all([
      this.funMessageRepository.findByContext(context),
      this.funMessageRepository.findAll(),
    ]);
    const pool = specific.length > 0 ? specific : all;

    if (pool.length === 0) {
      return {
        id: `fallback-${context}`,
        context,
        text: FALLBACK_MESSAGES[context],
        author: 'BếpSV',
      };
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];

    return this.toView(picked);
  }

  private toView(message: FunMessageEntity): FunMessageView {
    return {
      id: message.id,
      context: message.context,
      text: message.text,
      author: message.author,
    };
  }
}

// Giữ danh sách context luôn đồng bộ với enum khi thêm ngữ cảnh mới.
void FUN_MESSAGE_CONTEXTS;
