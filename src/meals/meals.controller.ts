import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { CreateMealDto } from './dto/create-meal.dto';
import { ListMealsQueryDto } from './dto/list-meals-query.dto';
import { MealsService } from './meals.service';
import { MealLogView, MealStatisticsView } from './types';

@Controller(['meals', 'history'])
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateMealDto,
  ): Promise<MealLogView> {
    return this.mealsService.create(userId, dto);
  }

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query() query: ListMealsQueryDto,
  ): Promise<MealLogView[]> {
    return this.mealsService.list(userId, query);
  }

  @Get('statistics')
  statistics(
    @CurrentUserId() userId: string,
    @Query() query: ListMealsQueryDto,
  ): Promise<MealStatisticsView> {
    return this.mealsService.statistics(userId, query);
  }
}
