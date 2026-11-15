import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import {
  endOfDay,
  parseTimeOfDay,
  startOfDay,
  toDateKey,
} from '../domain/dates';
import { ReminderEntity } from '../domain/entities';
import {
  MEAL_TYPES,
  MealTypeValue,
  ReminderDueKind,
} from '../domain/enums';
import {
  MEAL_LOG_REPOSITORY,
  MealLogRepository,
  PUSH_SUBSCRIPTION_REPOSITORY,
  PushSubscriptionRepository,
  REMINDER_REPOSITORY,
  ReminderRepository,
} from '../domain/repositories';
import { RecipesService } from '../recipes/recipes.service';
import { PushSubscribeDto, UpdateRemindersDto } from './dto/reminders.dto';
import { ReminderNotifier } from './reminder-notifier.service';
import {
  DueReminderView,
  PushSubscriptionView,
  ReminderDispatchResult,
  ReminderView,
} from './types';

const DEFAULT_REMINDER_TIMES: Record<MealTypeValue, string> = {
  breakfast: '07:00',
  lunch: '12:00',
  dinner: '18:30',
};

const MEAL_LABELS: Record<MealTypeValue, string> = {
  breakfast: 'bữa sáng',
  lunch: 'bữa trưa',
  dinner: 'bữa tối',
};

interface DueReminderInternal {
  reminder: ReminderEntity;
  kind: ReminderDueKind;
}

@Injectable()
export class RemindersService {
  constructor(
    @Inject(REMINDER_REPOSITORY)
    private readonly reminderRepository: ReminderRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
    @Inject(MEAL_LOG_REPOSITORY)
    private readonly mealLogRepository: MealLogRepository,
    @Inject(APP_CONFIG)
    private readonly config: AppConfig,
    private readonly recipesService: RecipesService,
    private readonly notifier: ReminderNotifier,
  ) {}

  async list(userId: string): Promise<ReminderView[]> {
    const reminders = await this.ensureDefaults(userId);

    return reminders.map((reminder) => this.toView(reminder));
  }

  async update(
    userId: string,
    dto: UpdateRemindersDto,
  ): Promise<ReminderView[]> {
    const mealTypes = new Set<MealTypeValue>();

    for (const item of dto.reminders) {
      if (mealTypes.has(item.mealType)) {
        throw new BadRequestException(
          `Mỗi bữa chỉ được cấu hình một giờ nhắc (${item.mealType})`,
        );
      }

      mealTypes.add(item.mealType);
    }

    for (const item of dto.reminders) {
      await this.reminderRepository.upsert(userId, item);
    }

    return this.list(userId);
  }

  async getDue(
    userId: string,
    now: Date = new Date(),
  ): Promise<DueReminderView[]> {
    const reminders = await this.ensureDefaults(userId);
    const internal = await this.findDue(userId, reminders, now);
    const result: DueReminderView[] = [];

    for (const item of internal) {
      result.push(await this.toDueView(userId, item, now));
    }

    return result;
  }

  async dispatchDue(now: Date = new Date()): Promise<ReminderDispatchResult> {
    const enabled = await this.reminderRepository.listAllEnabled();
    const userIds = [...new Set(enabled.map((reminder) => reminder.userId))];
    let sent = 0;
    let delivered = 0;

    for (const userId of userIds) {
      const reminders = await this.ensureDefaults(userId);
      const due = await this.findDue(userId, reminders, now);

      for (const item of due) {
        const sentAt =
          item.kind === 'primary'
            ? item.reminder.lastSentAt
            : item.reminder.secondSentAt;

        if (sentAt && toDateKey(sentAt) === toDateKey(now)) {
          continue;
        }

        const view = await this.toDueView(userId, item, now);
        const notifyResult = await this.notifier.notify(userId, view);

        await this.reminderRepository.markSent(
          item.reminder.id,
          item.kind,
          now,
        );
        sent += 1;
        delivered += notifyResult.delivered;
      }
    }

    return { checkedUsers: userIds.length, sent, delivered };
  }

  async subscribe(
    userId: string,
    dto: PushSubscribeDto,
  ): Promise<PushSubscriptionView> {
    const subscription = await this.pushSubscriptionRepository.upsert(
      userId,
      dto.endpoint,
      {
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    );

    return this.toSubscriptionView(subscription);
  }

  async listSubscriptions(userId: string): Promise<PushSubscriptionView[]> {
    const subscriptions =
      await this.pushSubscriptionRepository.listByUser(userId);

    return subscriptions.map((subscription) =>
      this.toSubscriptionView(subscription),
    );
  }

  async unsubscribe(userId: string, id: string): Promise<void> {
    const deleted = await this.pushSubscriptionRepository.remove(userId, id);

    if (deleted === 0) {
      throw new NotFoundException('Không tìm thấy đăng ký push');
    }
  }

  private async ensureDefaults(userId: string): Promise<ReminderEntity[]> {
    const existing = await this.reminderRepository.listByUser(userId);
    const existingTypes = new Set(
      existing.map((reminder) => reminder.mealType),
    );

    for (const mealType of MEAL_TYPES) {
      if (existingTypes.has(mealType)) {
        continue;
      }

      await this.reminderRepository.upsert(userId, {
        mealType,
        timeOfDay: DEFAULT_REMINDER_TIMES[mealType],
        channel: 'push',
        enabled: true,
      });
    }

    return this.reminderRepository.listByUser(userId);
  }

  private async findDue(
    userId: string,
    reminders: ReminderEntity[],
    now: Date,
  ): Promise<DueReminderInternal[]> {
    const logs = await this.mealLogRepository.listByUser(userId, {
      from: startOfDay(now),
      to: endOfDay(now),
    });
    const loggedMealTypes = new Set(logs.map((log) => log.mealType));
    const due: DueReminderInternal[] = [];

    for (const reminder of reminders) {
      if (!reminder.enabled || loggedMealTypes.has(reminder.mealType)) {
        continue;
      }

      const scheduled = parseTimeOfDay(reminder.timeOfDay, now);

      if (!scheduled) {
        continue;
      }

      const elapsedMinutes = (now.getTime() - scheduled.getTime()) / 60_000;

      if (elapsedMinutes < 0) {
        continue;
      }

      if (elapsedMinutes < this.config.reminderSecondDelayMinutes) {
        due.push({ reminder, kind: 'primary' });
        continue;
      }

      if (
        elapsedMinutes <
        this.config.reminderSecondDelayMinutes +
          this.config.reminderSecondWindowMinutes
      ) {
        due.push({ reminder, kind: 'second' });
      }
    }

    return due.sort((first, second) =>
      first.reminder.timeOfDay.localeCompare(second.reminder.timeOfDay),
    );
  }

  private async toDueView(
    userId: string,
    item: DueReminderInternal,
    now: Date,
  ): Promise<DueReminderView> {
    const mealLabel = MEAL_LABELS[item.reminder.mealType];
    const isSecond = item.kind === 'second';

    return {
      reminderId: item.reminder.id,
      mealType: item.reminder.mealType,
      timeOfDay: item.reminder.timeOfDay,
      kind: item.kind,
      slotKey: `${toDateKey(now)}:${item.reminder.mealType}:${item.kind}`,
      title: isSecond
        ? `Bạn chưa ghi nhận ${mealLabel}`
        : `Đến giờ ${mealLabel} rồi!`,
      message: isSecond
        ? `Đã ${this.config.reminderSecondDelayMinutes} phút kể từ giờ nhắc. Chọn nhanh một món gợi ý bên dưới và ghi nhận bữa nhé!`
        : 'Dành vài phút ăn đúng bữa để giữ sức học cả ngày nhé.',
      quickRecipes: isSecond
        ? await this.recipesService.list(userId, {
            meal: item.reminder.mealType,
            limit: 3,
          })
        : [],
    };
  }

  private toView(reminder: ReminderEntity): ReminderView {
    return {
      id: reminder.id,
      mealType: reminder.mealType,
      timeOfDay: reminder.timeOfDay,
      channel: reminder.channel,
      enabled: reminder.enabled,
      lastSentAt: reminder.lastSentAt,
      secondSentAt: reminder.secondSentAt,
    };
  }

  private toSubscriptionView(
    subscription: {
      id: string;
      endpoint: string;
      createdAt: Date;
    },
  ): PushSubscriptionView {
    return {
      id: subscription.id,
      endpoint: subscription.endpoint,
      createdAt: subscription.createdAt,
    };
  }
}
