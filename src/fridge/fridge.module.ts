import { Module } from '@nestjs/common';
import { FRIDGE_REPOSITORY } from '../domain/repositories';
import { PrismaFridgeRepository } from '../infrastructure/prisma/prisma-fridge.repository';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { RecipesModule } from '../recipes/recipes.module';
import { FridgeController } from './fridge.controller';
import { FridgeParserService } from './fridge-parser.service';
import { FridgeService } from './fridge.service';

@Module({
  imports: [IngredientsModule, RecipesModule],
  controllers: [FridgeController],
  providers: [
    FridgeService,
    FridgeParserService,
    {
      provide: FRIDGE_REPOSITORY,
      useClass: PrismaFridgeRepository,
    },
  ],
  exports: [FridgeService, FridgeParserService, FRIDGE_REPOSITORY],
})
export class FridgeModule {}
