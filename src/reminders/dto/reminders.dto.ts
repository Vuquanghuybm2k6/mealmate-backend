import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  MEAL_TYPES,
  MealTypeValue,
  REMINDER_CHANNELS,
  ReminderChannelValue,
} from '../../domain/enums';

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ReminderItemDto {
  @IsIn([...MEAL_TYPES])
  mealType!: MealTypeValue;

  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'Giờ nhắc phải có dạng HH:mm, ví dụ 07:00',
  })
  timeOfDay!: string;

  @IsOptional()
  @IsIn([...REMINDER_CHANNELS])
  channel?: ReminderChannelValue;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateRemindersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MEAL_TYPES.length)
  @ValidateNested({ each: true })
  @Type(() => ReminderItemDto)
  reminders!: ReminderItemDto[];
}

export class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  auth!: string;
}

export class PushSubscribeDto {
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2000)
  endpoint!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}
