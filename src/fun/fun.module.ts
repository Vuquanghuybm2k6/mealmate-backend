import { Module } from '@nestjs/common';
import {
  FRIDGE_REPOSITORY,
  FUN_MESSAGE_REPOSITORY,
  MEAL_LOG_REPOSITORY,
  STREAK_REPOSITORY,
} from '../domain/repositories';
import { PrismaFridgeRepository } from '../infrastructure/prisma/prisma-fridge.repository';
import { PrismaFunMessageRepository } from '../infrastructure/prisma/prisma-fun-message.repository';
import { PrismaMealLogRepository } from '../infrastructure/prisma/prisma-meal-log.repository';
import { PrismaStreakRepository } from '../infrastructure/prisma/prisma-streak.repository';
import { RecipesModule } from '../recipes/recipes.module';
import { FunController } from './fun.controller';
import { FunService } from './fun.service';

@Module({
  imports: [RecipesModule],
  controllers: [FunController],
  providers: [
    FunService,
    {
      provide: FUN_MESSAGE_REPOSITORY,
      useClass: PrismaFunMessageRepository,
    },
    {
      provide: FRIDGE_REPOSITORY,
      useClass: PrismaFridgeRepository,
    },
    {
      provide: MEAL_LOG_REPOSITORY,
      useClass: PrismaMealLogRepository,
    },
    {
      provide: STREAK_REPOSITORY,
      useClass: PrismaStreakRepository,
    },
  ],
  exports: [FunService],
})
export class FunModule {}
