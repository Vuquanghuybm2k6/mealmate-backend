import { IsIn, IsOptional } from 'class-validator';
import {
  FUN_MESSAGE_CONTEXTS,
  FunMessageContextValue,
} from '../../domain/enums';

export class FunMessageQueryDto {
  @IsOptional()
  @IsIn([...FUN_MESSAGE_CONTEXTS])
  context?: FunMessageContextValue;
}
