import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';

/**
 * Tác vụ định kỳ mỗi phút: tìm nhắc nhở đến giờ và gửi lần một / lần hai.
 * Việc gửi thật (Web Push, email) nằm trong ReminderNotifier.
 */
@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);
  private running = false;

  constructor(private readonly remindersService: RemindersService) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'bepsv-reminder-dispatch',
  })
  async handleCron(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const result = await this.remindersService.dispatchDue();

      if (result.sent > 0) {
        this.logger.log(
          `Đã gửi ${result.sent} nhắc nhở cho ${result.checkedUsers} người dùng`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Không gửi được nhắc nhở định kỳ',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
