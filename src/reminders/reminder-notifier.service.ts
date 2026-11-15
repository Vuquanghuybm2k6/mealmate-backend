import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  PushSubscriptionRepository,
} from '../domain/repositories';
import { DueReminderView } from './types';

export interface NotifyResult {
  delivered: number;
  subscriptions: number;
}

/**
 * Lớp gửi thông báo được tách khỏi logic tính nhắc để sau này có thể thay
 * bằng web-push (VAPID) hoặc Nodemailer mà không đổi cron/service.
 * Hiện tại ghi log và đếm số thiết bị đã đăng ký push.
 */
@Injectable()
export class ReminderNotifier {
  private readonly logger = new Logger(ReminderNotifier.name);

  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
  ) {}

  async notify(
    userId: string,
    reminder: DueReminderView,
  ): Promise<NotifyResult> {
    const subscriptions =
      await this.pushSubscriptionRepository.listByUser(userId);

    this.logger.log(
      `Nhắc ${reminder.mealType} lần ${reminder.kind} cho user ${userId}: ${reminder.title}`,
    );

    return {
      delivered: subscriptions.length,
      subscriptions: subscriptions.length,
    };
  }
}
