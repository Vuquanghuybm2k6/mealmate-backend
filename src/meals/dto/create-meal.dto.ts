import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MEAL_TYPES, MealTypeValue } from '../../domain/enums';

export class CreateMealDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  recipeId!: string;

  @IsIn([...MEAL_TYPES])
  mealType!: MealTypeValue;

  @IsOptional()
  @IsISO8601()
  eatenAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(10_000)
  kcal?: number;
}
