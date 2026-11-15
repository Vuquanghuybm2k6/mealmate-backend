import { Controller, Get, Query } from '@nestjs/common';
import { SearchIngredientsQueryDto } from './dto/search-ingredients.dto';
import { IngredientsService, IngredientView } from './ingredients.service';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  search(
    @Query() query: SearchIngredientsQueryDto,
  ): Promise<IngredientView[]> {
    return this.ingredientsService.search(query.q);
  }
}
