import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { FunMessageQueryDto } from './dto/fun-message-query.dto';
import { RandomRecipeQueryDto } from './dto/random-recipe-query.dto';
import { FunService } from './fun.service';
import {
  FunMessageView,
  FunStreakView,
  RandomRecipeView,
} from './types';

@Controller('fun')
export class FunController {
  constructor(private readonly funService: FunService) {}

  @Get('random-recipe')
  randomRecipe(
    @CurrentUserId() userId: string,
    @Query() query: RandomRecipeQueryDto,
  ): Promise<RandomRecipeView> {
    return this.funService.randomRecipe(userId, query);
  }

  @Get('message')
  message(@Query() query: FunMessageQueryDto): Promise<FunMessageView> {
    return this.funService.message(query);
  }

  @Get('streak')
  streak(@CurrentUserId() userId: string): Promise<FunStreakView> {
    return this.funService.streak(userId);
  }

  @Get('messages')
  allMessages(): Promise<FunMessageView[]> {
    return this.funService.allMessages();
  }
}
