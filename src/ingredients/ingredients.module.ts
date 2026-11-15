import { Module } from '@nestjs/common';
import { INGREDIENT_REPOSITORY } from '../domain/repositories';
import { PrismaIngredientRepository } from '../infrastructure/prisma/prisma-ingredient.repository';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';

@Module({
  controllers: [IngredientsController],
  providers: [
    IngredientsService,
    {
      provide: INGREDIENT_REPOSITORY,
      useClass: PrismaIngredientRepository,
    },
  ],
  exports: [IngredientsService],
})
export class IngredientsModule {}
