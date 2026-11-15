import { IsISO8601, IsOptional } from 'class-validator';

export class DueRemindersQueryDto {
  @IsOptional()
  @IsISO8601()
  now?: string;
}
