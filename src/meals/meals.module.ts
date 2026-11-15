import { Module } from '@nestjs/common';
import {
  MEAL_LOG_REPOSITORY,
  STREAK_REPOSITORY,
} from '../domain/repositories';
import { PrismaMealLogRepository } from '../infrastructure/prisma/prisma-meal-log.repository';
import { PrismaStreakRepository } from '../infrastructure/prisma/prisma-streak.repository';
import { RecipesModule } from '../recipes/recipes.module';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';

@Module({
  imports: [RecipesModule],
  controllers: [MealsController],
  providers: [
    MealsService,
    {
      provide: MEAL_LOG_REPOSITORY,
      useClass: PrismaMealLogRepository,
    },
    {
      provide: STREAK_REPOSITORY,
      useClass: PrismaStreakRepository,
    },
  ],
  exports: [MEAL_LOG_REPOSITORY, STREAK_REPOSITORY, MealsService],
})
export class MealsModule {}
