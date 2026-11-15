import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { RecipeSuggestionView } from '../recipes/types';
import {
  AddFridgeItemDto,
  ParseFridgeDto,
} from './dto/fridge-request.dto';
import { FridgeSuggestionsQueryDto } from './dto/fridge-suggestions-query.dto';
import { FridgeService } from './fridge.service';
import { FridgeItemView, ParseFridgeResultView } from './types';

@Controller('fridge')
export class FridgeController {
  constructor(private readonly fridgeService: FridgeService) {}

  @Get()
  list(@CurrentUserId() userId: string): Promise<FridgeItemView[]> {
    return this.fridgeService.list(userId);
  }

  @Get('suggestions')
  suggestions(
    @CurrentUserId() userId: string,
    @Query() query: FridgeSuggestionsQueryDto,
  ): Promise<RecipeSuggestionView[]> {
    return this.fridgeService.suggestions(userId, query);
  }

  @Post('parse')
  @HttpCode(200)
  parse(
    @CurrentUserId() userId: string,
    @Body() dto: ParseFridgeDto,
  ): Promise<ParseFridgeResultView> {
    return this.fridgeService.parse(userId, dto);
  }

  @Post()
  add(
    @CurrentUserId() userId: string,
    @Body() dto: AddFridgeItemDto,
  ): Promise<FridgeItemView> {
    return this.fridgeService.add(userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.fridgeService.remove(userId, id);
  }
}
