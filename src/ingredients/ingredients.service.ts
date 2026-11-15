import { Inject, Injectable } from '@nestjs/common';
import { IngredientEntity } from '../domain/entities';
import {
  INGREDIENT_REPOSITORY,
  IngredientRepository,
} from '../domain/repositories';
import { normalizeForSearch } from '../domain/text';

export interface IngredientView {
  id: string;
  name: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  gramsPerUnit: number;
  aliases: string[];
  nutritionPer100g: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

@Injectable()
export class IngredientsService {
  constructor(
    @Inject(INGREDIENT_REPOSITORY)
    private readonly ingredientRepository: IngredientRepository,
  ) {}

  async search(query?: string): Promise<IngredientView[]> {
    const ingredients = await this.ingredientRepository.findAll();
    const normalizedQuery = normalizeForSearch(query ?? '');

    const matched = normalizedQuery
      ? ingredients.filter((ingredient) =>
          this.searchableText(ingredient).includes(normalizedQuery),
        )
      : ingredients;

    return matched.map((ingredient) => this.toView(ingredient));
  }

  async findAllForMatching(): Promise<IngredientEntity[]> {
    return this.ingredientRepository.findAll();
  }

  private searchableText(ingredient: IngredientEntity): string {
    return normalizeForSearch(
      [ingredient.name, ...ingredient.aliases, ingredient.category].join(' '),
    );
  }

  private toView(ingredient: IngredientEntity): IngredientView {
    return {
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      pricePerUnit: ingredient.pricePerUnit,
      gramsPerUnit: ingredient.gramsPerUnit,
      aliases: ingredient.aliases,
      nutritionPer100g: {
        kcal: ingredient.kcal,
        protein: ingredient.protein,
        carbs: ingredient.carbs,
        fat: ingredient.fat,
      },
    };
  }
}
