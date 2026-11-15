import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import {
  ShoppingListView,
  ShoppingItemView,
  ShoppingService,
} from './shopping.service';

@Controller('shopping')
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Get()
  getCurrentList(@CurrentUserId() userId: string): Promise<ShoppingListView> {
    return this.shoppingService.getCurrentList(userId);
  }

  @Post('items')
  addItem(
    @CurrentUserId() userId: string,
    @Body() dto: { name: string; group?: string; qty?: string; price?: number; emoji?: string },
  ): Promise<ShoppingItemView> {
    return this.shoppingService.addItem(userId, dto);
  }

  @Patch('items/:id/toggle')
  toggleItem(
    @CurrentUserId() userId: string,
    @Param('id') itemId: string,
  ): Promise<ShoppingItemView> {
    return this.shoppingService.toggleItem(userId, itemId);
  }

  @Delete('items/:id')
  removeItem(
    @CurrentUserId() userId: string,
    @Param('id') itemId: string,
  ): Promise<{ success: boolean }> {
    return this.shoppingService.removeItem(userId, itemId);
  }

  @Get('recent')
  getRecentLists(
    @CurrentUserId() userId: string,
  ): Promise<Array<{ id: string; title: string; sub: string }>> {
    return this.shoppingService.getRecentLists(userId);
  }
}
