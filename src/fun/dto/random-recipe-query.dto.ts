import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { MEAL_TYPES, MealTypeValue } from '../../domain/enums';

export const FUN_SOURCES = ['budget', 'fridge'] as const;
export type FunSource = (typeof FUN_SOURCES)[number];

export class RandomRecipeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  budget?: number;

  @IsOptional()
  @IsIn([...MEAL_TYPES])
  meal?: MealTypeValue;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  healthy?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  maxTime?: number;

  @IsOptional()
  @IsIn([...FUN_SOURCES])
  source?: FunSource;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  threshold?: number;
}
