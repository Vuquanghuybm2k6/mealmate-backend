import { Injectable } from '@nestjs/common';
import { MealType, Reminder, ReminderChannel } from '@prisma/client';
import { ReminderEntity } from '../../domain/entities';
import {
  MealTypeValue,
  ReminderChannelValue,
  ReminderDueKind,
} from '../../domain/enums';
import {
  ReminderInput,
  ReminderRepository,
} from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaReminderRepository implements ReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string): Promise<ReminderEntity[]> {
    const reminders = await this.prisma.reminder.findMany({
      where: { userId },
      orderBy: { timeOfDay: 'asc' },
    });

    return reminders.map((reminder) => this.mapReminder(reminder));
  }

  async listAllEnabled(): Promise<ReminderEntity[]> {
    const reminders = await this.prisma.reminder.findMany({
      where: { enabled: true },
      orderBy: [{ userId: 'asc' }, { timeOfDay: 'asc' }],
    });

    return reminders.map((reminder) => this.mapReminder(reminder));
  }

  async upsert(
    userId: string,
    input: ReminderInput,
  ): Promise<ReminderEntity> {
    const reminder = await this.prisma.reminder.upsert({
      where: {
        userId_mealType: {
          userId,
          mealType: input.mealType as MealType,
        },
      },
      update: {
        timeOfDay: input.timeOfDay,
        ...(input.channel ? { channel: input.channel as ReminderChannel } : {}),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
      },
      create: {
        userId,
        mealType: input.mealType as MealType,
        timeOfDay: input.timeOfDay,
        channel: (input.channel ?? 'push') as ReminderChannel,
        enabled: input.enabled ?? true,
      },
    });

    return this.mapReminder(reminder);
  }

  async markSent(
    id: string,
    kind: ReminderDueKind,
    sentAt: Date,
  ): Promise<void> {
    await this.prisma.reminder.update({
      where: { id },
      data:
        kind === 'primary'
          ? { lastSentAt: sentAt }
          : { secondSentAt: sentAt },
    });
  }

  private mapReminder(reminder: Reminder): ReminderEntity {
    return {
      id: reminder.id,
      userId: reminder.userId,
      mealType: reminder.mealType as MealTypeValue,
      timeOfDay: reminder.timeOfDay,
      channel: reminder.channel as ReminderChannelValue,
      enabled: reminder.enabled,
      lastSentAt: reminder.lastSentAt,
      secondSentAt: reminder.secondSentAt,
    };
  }
}
