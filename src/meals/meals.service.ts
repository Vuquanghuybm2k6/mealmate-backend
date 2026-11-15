import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  addDays,
  addDaysToDateKey,
  dateRangeKeys,
  daysBetweenDateKeys,
  endOfDay,
  parseDateKey,
  startOfDay,
  toDateKey,
} from '../domain/dates';
import { MealLogEntity } from '../domain/entities';
import { MEAL_TYPES, MealTypeValue } from '../domain/enums';
import {
  MEAL_LOG_REPOSITORY,
  MealLogRepository,
  STREAK_REPOSITORY,
  StreakRepository,
} from '../domain/repositories';
import { toStreakView } from '../domain/streak';
import { RecipesService } from '../recipes/recipes.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { ListMealsQueryDto } from './dto/list-meals-query.dto';
import {
  DailyMealStatistics,
  MealLogView,
  MealStatisticsView,
  MealTypeStatistics,
} from './types';

const DEFAULT_STATISTICS_DAYS = 7;

@Injectable()
export class MealsService {
  constructor(
    @Inject(MEAL_LOG_REPOSITORY)
    private readonly mealLogRepository: MealLogRepository,
    @Inject(STREAK_REPOSITORY)
    private readonly streakRepository: StreakRepository,
    private readonly recipesService: RecipesService,
  ) {}

  async create(userId: string, dto: CreateMealDto): Promise<MealLogView> {
    const recipe = await this.recipesService.detail(userId, dto.recipeId);
    const eatenAt = dto.eatenAt ? new Date(dto.eatenAt) : new Date();

    if (Number.isNaN(eatenAt.getTime())) {
      throw new BadRequestException('Thời điểm ăn không hợp lệ');
    }

    const log = await this.mealLogRepository.create({
      userId,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      mealType: dto.mealType,
      eatenAt,
      cost: dto.cost ?? recipe.costEstimate,
      kcal: dto.kcal ?? recipe.kcal,
    });

    await this.recalculateStreak(userId);

    return this.toView({
      ...log,
      recipeTitle: log.recipeTitle ?? recipe.title,
      recipe: log.recipe ?? {
        id: recipe.id,
        title: recipe.title,
        imageUrl: recipe.imageUrl,
        cookMinutes: recipe.cookMinutes,
        costEstimate: recipe.costEstimate,
        kcal: recipe.kcal,
      },
    });
  }

  async list(
    userId: string,
    query: ListMealsQueryDto,
  ): Promise<MealLogView[]> {
    const range = this.parseRange(query.from, query.to);
    const logs = await this.mealLogRepository.listByUser(userId, range);

    return logs.map((log) => this.toView(log));
  }

  async statistics(
    userId: string,
    query: ListMealsQueryDto = {},
  ): Promise<MealStatisticsView> {
    const now = new Date();
    const defaultTo = endOfDay(now);
    const defaultFrom = startOfDay(
      addDays(now, -(DEFAULT_STATISTICS_DAYS - 1)),
    );
    const from = this.parseBoundary(query.from, 'from') ?? defaultFrom;
    const to = this.parseBoundary(query.to, 'to') ?? defaultTo;

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException(
        'Thời gian bắt đầu phải trước thời gian kết thúc',
      );
    }

    const logs = await this.mealLogRepository.listByUser(userId, { from, to });
    const dateKeys = dateRangeKeys(from, to);
    const todayKey = toDateKey(now);
    const logsByDate = new Map<string, MealLogEntity[]>();

    for (const log of logs) {
      const key = toDateKey(log.eatenAt);
      const bucket = logsByDate.get(key) ?? [];
      bucket.push(log);
      logsByDate.set(key, bucket);
    }

    const daily: DailyMealStatistics[] = dateKeys.map((date) => {
      const dayLogs = logsByDate.get(date) ?? [];
      const mealTypes = [
        ...new Set(dayLogs.map((log) => log.mealType)),
      ] as MealTypeValue[];

      return {
        date,
        meals: dayLogs.length,
        mealTypes,
        cost: dayLogs.reduce((total, log) => total + log.cost, 0),
        kcal: Math.round(
          dayLogs.reduce((total, log) => total + log.kcal, 0),
        ),
        complete: mealTypes.length >= MEAL_TYPES.length,
      };
    });

    const totalCost = logs.reduce((total, log) => total + log.cost, 0);
    const totalKcal = logs.reduce((total, log) => total + log.kcal, 0);
    const days = Math.max(1, dateKeys.length);
    const missedMeals = daily
      .filter((day) => day.date !== todayKey && day.date < todayKey)
      .reduce((total, day) => total + (MEAL_TYPES.length - day.mealTypes.length), 0);

    const byMealType: MealTypeStatistics[] = MEAL_TYPES.map((mealType) => {
      const items = logs.filter((log) => log.mealType === mealType);

      return {
        mealType,
        count: items.length,
        cost: items.reduce((total, log) => total + log.cost, 0),
        kcal: Math.round(
          items.reduce((total, log) => total + log.kcal, 0),
        ),
      };
    });

    const recipeCounts = new Map<
      string,
      { recipeId: string | null; title: string; count: number }
    >();

    for (const log of logs) {
      const title = log.recipe?.title ?? log.recipeTitle ?? 'Món chưa đặt tên';
      const key = log.recipeId ?? title;
      const current = recipeCounts.get(key) ?? {
        recipeId: log.recipeId,
        title,
        count: 0,
      };
      current.count += 1;
      recipeCounts.set(key, current);
    }

    const mostEatenRecipe =
      [...recipeCounts.values()].sort(
        (first, second) =>
          second.count - first.count ||
          first.title.localeCompare(second.title, 'vi'),
      )[0] ?? null;

    const streak = await this.streakRepository.findByUserId(userId);

    return {
      from: toDateKey(from),
      to: toDateKey(to),
      days: dateKeys.length,
      totalMeals: logs.length,
      totalCost,
      totalKcal: Math.round(totalKcal),
      averageCostPerDay: Math.round(totalCost / days),
      averageKcalPerDay: Math.round(totalKcal / days),
      missedMeals,
      mostEatenRecipe,
      byMealType,
      daily,
      streak: toStreakView(streak, userId),
    };
  }

  /**
   * Một ngày được tính vào streak khi ghi nhận đủ 3 loại bữa
   * (sáng, trưa, tối). Tính lại từ toàn bộ meal_logs để xử lý cả trường hợp
   * người dùng ghi bù bữa của ngày hôm trước.
   */
  async recalculateStreak(userId: string): Promise<void> {
    const logs = await this.mealLogRepository.listByUser(userId);
    const mealTypesByDate = new Map<string, Set<MealTypeValue>>();

    for (const log of logs) {
      const key = toDateKey(log.eatenAt);
      const mealTypes = mealTypesByDate.get(key) ?? new Set<MealTypeValue>();
      mealTypes.add(log.mealType);
      mealTypesByDate.set(key, mealTypes);
    }

    const completeDates = [...mealTypesByDate.entries()]
      .filter(([, mealTypes]) => mealTypes.size >= MEAL_TYPES.length)
      .map(([date]) => date)
      .sort();

    const runLengthByDate = new Map<string, number>();
    let longestStreak = 0;
    let previous: string | null = null;
    let run = 0;

    for (const date of completeDates) {
      run =
        previous && daysBetweenDateKeys(previous, date) === 1 ? run + 1 : 1;
      runLengthByDate.set(date, run);
      longestStreak = Math.max(longestStreak, run);
      previous = date;
    }

    const lastDate = completeDates.at(-1) ?? null;
    const todayKey = toDateKey(new Date());
    const yesterdayKey = addDaysToDateKey(todayKey, -1);
    const currentStreak =
      lastDate && (lastDate === todayKey || lastDate === yesterdayKey)
        ? (runLengthByDate.get(lastDate) ?? 0)
        : 0;

    await this.streakRepository.upsert(userId, {
      currentStreak,
      longestStreak,
      lastDate,
    });
  }

  private parseRange(
    fromValue?: string,
    toValue?: string,
  ): { from?: Date; to?: Date } {
    const from = this.parseBoundary(fromValue, 'from');
    const to = this.parseBoundary(toValue, 'to');

    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException(
        'Thời gian bắt đầu phải trước thời gian kết thúc',
      );
    }

    return { from, to };
  }

  private parseBoundary(
    value: string | undefined,
    boundary: 'from' | 'to',
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = parseDateKey(value);

      return boundary === 'from' ? startOfDay(date) : endOfDay(date);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Thời gian ${boundary} không hợp lệ`);
    }

    return date;
  }

  private toView(log: MealLogEntity): MealLogView {
    return {
      id: log.id,
      recipeId: log.recipeId,
      recipeTitle: log.recipe?.title ?? log.recipeTitle,
      imageUrl: log.recipe?.imageUrl ?? null,
      mealType: log.mealType,
      eatenAt: log.eatenAt,
      cost: log.cost,
      kcal: log.kcal,
    };
  }
}
