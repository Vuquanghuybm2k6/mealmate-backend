import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchIngredientsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
