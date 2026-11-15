import { Module } from '@nestjs/common';
import {
  PREFERENCE_REPOSITORY,
  RECIPE_REPOSITORY,
} from '../domain/repositories';
import { PrismaPreferenceRepository } from '../infrastructure/prisma/prisma-preference.repository';
import { PrismaRecipeRepository } from '../infrastructure/prisma/prisma-recipe.repository';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  controllers: [RecipesController],
  providers: [
    RecipesService,
    {
      provide: RECIPE_REPOSITORY,
      useClass: PrismaRecipeRepository,
    },
    {
      provide: PREFERENCE_REPOSITORY,
      useClass: PrismaPreferenceRepository,
    },
  ],
  exports: [RecipesService],
})
export class RecipesModule {}
