import { Controller, Get, Put, Body, Query } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { DueRemindersQueryDto } from './dto/due-reminders-query.dto';
import { UpdateRemindersDto } from './dto/reminders.dto';
import { RemindersService } from './reminders.service';
import { DueReminderView, ReminderView } from './types';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list(@CurrentUserId() userId: string): Promise<ReminderView[]> {
    return this.remindersService.list(userId);
  }

  @Put()
  update(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateRemindersDto,
  ): Promise<ReminderView[]> {
    return this.remindersService.update(userId, dto);
  }

  /**
   * Frontend hỏi mỗi 60 giây. Endpoint chỉ đọc, không đánh dấu đã gửi;
   * frontend dùng slotKey để tránh hiện trùng một nhắc nhở.
   */
  @Get('due')
  due(
    @CurrentUserId() userId: string,
    @Query() query: DueRemindersQueryDto,
  ): Promise<DueReminderView[]> {
    const now = query.now ? new Date(query.now) : new Date();

    return this.remindersService.getDue(userId, now);
  }
}
