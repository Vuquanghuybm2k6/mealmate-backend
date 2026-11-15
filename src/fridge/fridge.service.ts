import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FridgeItemEntity } from '../domain/entities';
import { FRIDGE_REPOSITORY, FridgeRepository } from '../domain/repositories';
import { IngredientsService } from '../ingredients/ingredients.service';
import { RecipesService } from '../recipes/recipes.service';
import { RecipeSuggestionView } from '../recipes/types';
import { AddFridgeItemDto, ParseFridgeDto } from './dto/fridge-request.dto';
import { FridgeSuggestionsQueryDto } from './dto/fridge-suggestions-query.dto';
import { FridgeParserService } from './fridge-parser.service';
import {
  FridgeItemView,
  ParseFridgeResultView,
} from './types';

@Injectable()
export class FridgeService {
  constructor(
    @Inject(FRIDGE_REPOSITORY)
    private readonly fridgeRepository: FridgeRepository,
    private readonly ingredientsService: IngredientsService,
    private readonly parser: FridgeParserService,
    private readonly recipesService: RecipesService,
  ) {}

  async list(userId: string): Promise<FridgeItemView[]> {
    const items = await this.fridgeRepository.listByUser(userId);

    return items.map((item) => this.toView(item));
  }

  async add(userId: string, dto: AddFridgeItemDto): Promise<FridgeItemView> {
    const ingredient = await this.findIngredient(dto.ingredientId);
    const item = await this.fridgeRepository.upsert(
      userId,
      ingredient.id,
      dto.quantity,
    );

    return this.toView(item);
  }

  async remove(
    userId: string,
    idOrIngredientId: string,
  ): Promise<{ deleted: number }> {
    const deleted = await this.fridgeRepository.remove(
      userId,
      idOrIngredientId,
    );

    if (deleted === 0) {
      throw new NotFoundException('Không tìm thấy nguyên liệu trong tủ lạnh');
    }

    return { deleted };
  }

  async parse(
    userId: string,
    dto: ParseFridgeDto,
  ): Promise<ParseFridgeResultView> {
    const text = dto.text.trim();

    if (!text) {
      throw new BadRequestException('Vui lòng nhập nguyên liệu');
    }

    const ingredients = await this.ingredientsService.findAllForMatching();
    const parsed = this.parser.parse(text, ingredients);
    const save = dto.save === true;

    if (save) {
      for (const item of parsed.items) {
        await this.fridgeRepository.upsert(
          userId,
          item.ingredientId,
          item.quantity,
        );
      }
    }

    return { ...parsed, saved: save };
  }

  async suggestions(
    userId: string,
    query: FridgeSuggestionsQueryDto,
  ): Promise<RecipeSuggestionView[]> {
    const items = await this.fridgeRepository.listByUser(userId);
    const availableIngredients = new Map(
      items.map((item) => [item.ingredientId, item.quantity]),
    );

    return this.recipesService.suggestForFridge(availableIngredients, {
      threshold: query.threshold,
      budget: query.budget,
      meal: query.meal,
      maxTime: query.maxTime,
      limit: query.limit,
    });
  }

  private async findIngredient(ingredientId: string) {
    const ingredients = await this.ingredientsService.findAllForMatching();
    const ingredient = ingredients.find((item) => item.id === ingredientId);

    if (!ingredient) {
      throw new NotFoundException('Không tìm thấy nguyên liệu');
    }

    return ingredient;
  }

  private toView(item: FridgeItemEntity): FridgeItemView {
    return {
      id: item.id,
      ingredientId: item.ingredientId,
      name: item.ingredient.name,
      category: item.ingredient.category,
      unit: item.ingredient.unit,
      quantity: item.quantity,
      addedAt: item.addedAt,
    };
  }
}
