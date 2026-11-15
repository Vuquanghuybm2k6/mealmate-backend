import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import { RecipesService } from './recipes.service';
import { RecipeDetailView, RecipeSummaryView } from './types';

@Controller(['recipes', 'recipe'])
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query() query: ListRecipesQueryDto,
  ): Promise<RecipeSummaryView[]> {
    return this.recipesService.list(userId, query);
  }

  @Get(':id')
  detail(
    @CurrentUserId() userId: string,
    @Param('id') recipeId: string,
  ): Promise<RecipeDetailView> {
    return this.recipesService.detail(userId, recipeId);
  }
}
