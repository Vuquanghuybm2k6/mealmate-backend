import { Module } from '@nestjs/common';
import {
  MEAL_LOG_REPOSITORY,
  PUSH_SUBSCRIPTION_REPOSITORY,
  REMINDER_REPOSITORY,
} from '../domain/repositories';
import { PrismaMealLogRepository } from '../infrastructure/prisma/prisma-meal-log.repository';
import { PrismaPushSubscriptionRepository } from '../infrastructure/prisma/prisma-push-subscription.repository';
import { PrismaReminderRepository } from '../infrastructure/prisma/prisma-reminder.repository';
import { MealsModule } from '../meals/meals.module';
import { RecipesModule } from '../recipes/recipes.module';
import { PushController } from './push.controller';
import { ReminderNotifier } from './reminder-notifier.service';
import { ReminderScheduler } from './reminder-scheduler.service';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [RecipesModule, MealsModule],
  controllers: [RemindersController, PushController],
  providers: [
    RemindersService,
    ReminderNotifier,
    ReminderScheduler,
    {
      provide: REMINDER_REPOSITORY,
      useClass: PrismaReminderRepository,
    },
    {
      provide: PUSH_SUBSCRIPTION_REPOSITORY,
      useClass: PrismaPushSubscriptionRepository,
    },
    {
      provide: MEAL_LOG_REPOSITORY,
      useClass: PrismaMealLogRepository,
    },
  ],
  exports: [RemindersService],
})
export class RemindersModule {}
