import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { PushSubscribeDto } from './dto/reminders.dto';
import { RemindersService } from './reminders.service';
import { PushSubscriptionView } from './types';

@Controller('push')
export class PushController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post('subscribe')
  subscribe(
    @CurrentUserId() userId: string,
    @Body() dto: PushSubscribeDto,
  ): Promise<PushSubscriptionView> {
    return this.remindersService.subscribe(userId, dto);
  }

  @Get('subscriptions')
  subscriptions(
    @CurrentUserId() userId: string,
  ): Promise<PushSubscriptionView[]> {
    return this.remindersService.listSubscriptions(userId);
  }

  @Delete('subscriptions/:id')
  unsubscribe(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    return this.remindersService
      .unsubscribe(userId, id)
      .then(() => ({ deleted: true }));
  }
}
