import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FridgeService } from './fridge.service';
import { FridgeParserService } from './fridge-parser.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { RecipesService } from '../recipes/recipes.service';
import {
  InMemoryFridgeRepository,
  InMemoryIngredientRepository,
  InMemoryPreferenceRepository,
  InMemoryRecipeRepository,
} from '../test-support/in-memory-repositories';
import {
  TEST_CONFIG,
  makeIngredient,
  makeRecipe,
  makeRecipeIngredient,
} from '../test-support/fixtures';

const egg = makeIngredient({
  id: 'ing-egg',
  name: 'Trứng gà',
  aliases: ['trứng'],
  category: 'Đạm',
  unit: 'quả',
  pricePerUnit: 3500,
  gramsPerUnit: 50,
});

const tomato = makeIngredient({
  id: 'ing-tomato',
  name: 'Cà chua',
  aliases: ['ca chua'],
  category: 'Rau củ',
  unit: 'quả',
  pricePerUnit: 3000,
  gramsPerUnit: 100,
});

const rice = makeIngredient({
  id: 'ing-rice',
  name: 'Gạo',
  category: 'Tinh bột',
  unit: 'g',
  pricePerUnit: 20,
  gramsPerUnit: 1,
});

const recipeA = makeRecipe({
  id: 'recipe-a',
  title: 'Cơm trứng cà chua',
  cookMinutes: 15,
  costEstimate: 14_600,
  kcal: 483,
  protein: 20.5,
  mealTypes: ['lunch', 'dinner'],
  ingredients: [
    makeRecipeIngredient('recipe-a', egg, { quantity: 2, isMain: true }),
    makeRecipeIngredient('recipe-a', tomato, { quantity: 2, isMain: true }),
    makeRecipeIngredient('recipe-a', rice, { quantity: 80, isMain: false }),
  ],
});

function createService() {
  const ingredientRepository = new InMemoryIngredientRepository([
    egg,
    tomato,
    rice,
  ]);
  const recipesService = new RecipesService(
    new InMemoryRecipeRepository([recipeA]),
    new InMemoryPreferenceRepository(),
    TEST_CONFIG,
  );
  const fridgeRepository = new InMemoryFridgeRepository(ingredientRepository);
  const ingredientsService = new IngredientsService(ingredientRepository);
  const service = new FridgeService(
    fridgeRepository,
    ingredientsService,
    new FridgeParserService(),
    recipesService,
  );

  return { service, fridgeRepository, ingredientRepository };
}

describe('FridgeService', () => {
  describe('CRUD tủ lạnh', () => {
    it('thêm nguyên liệu và cộng dồn số lượng khi đã có', async () => {
      const { service } = createService();

      const first = await service.add('demo-user', {
        ingredientId: 'ing-egg',
        quantity: 2,
      });
      const second = await service.add('demo-user', {
        ingredientId: 'ing-egg',
        quantity: 1,
      });

      expect(first).toMatchObject({
        ingredientId: 'ing-egg',
        name: 'Trứng gà',
        unit: 'quả',
        quantity: 2,
      });
      expect(second.quantity).toBe(3);
      expect(await service.list('demo-user')).toHaveLength(1);
    });

    it('báo lỗi khi thêm nguyên liệu không tồn tại', async () => {
      const { service } = createService();

      await expect(
        service.add('demo-user', {
          ingredientId: 'ing-missing',
          quantity: 1,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('xóa nguyên liệu theo ingredientId và báo lỗi nếu không có', async () => {
      const { service } = createService();
      await service.add('demo-user', {
        ingredientId: 'ing-egg',
        quantity: 2,
      });

      expect(await service.remove('demo-user', 'ing-egg')).toEqual({
        deleted: 1,
      });
      await expect(service.remove('demo-user', 'ing-egg')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('chỉ trả nguyên liệu của đúng người dùng', async () => {
      const { service } = createService();
      await service.add('user-a', { ingredientId: 'ing-egg', quantity: 1 });
      await service.add('user-b', { ingredientId: 'ing-tomato', quantity: 1 });

      expect((await service.list('user-a')).map((item) => item.ingredientId)).toEqual([
        'ing-egg',
      ]);
    });
  });

  describe('nhập nhanh bằng câu tự do', () => {
    it('chỉ phân tích mà không lưu khi save=false', async () => {
      const { service } = createService();

      const result = await service.parse('demo-user', {
        text: '2 quả trứng, 2 quả cà chua',
      });

      expect(result.saved).toBe(false);
      expect(result.items).toHaveLength(2);
      expect(await service.list('demo-user')).toEqual([]);
    });

    it('lưu vào tủ lạnh khi save=true', async () => {
      const { service } = createService();

      const result = await service.parse('demo-user', {
        text: '2 quả trứng, 2 quả cà chua',
        save: true,
      });

      expect(result.saved).toBe(true);
      expect(await service.list('demo-user')).toHaveLength(2);
      expect(
        (await service.list('demo-user')).map((item) => item.quantity),
      ).toEqual(expect.arrayContaining([2, 2]));
    });

    it('cộng dồn với nguyên liệu đã có trong tủ lạnh', async () => {
      const { service } = createService();
      await service.add('demo-user', {
        ingredientId: 'ing-egg',
        quantity: 1,
      });

      await service.parse('demo-user', {
        text: '2 quả trứng',
        save: true,
      });

      const items = await service.list('demo-user');

      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it('báo lỗi khi câu nhập rỗng', async () => {
      const { service } = createService();

      await expect(
        service.parse('demo-user', { text: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('gợi ý công thức từ tủ lạnh', () => {
    it('trả rỗng khi tủ lạnh trống', async () => {
      const { service } = createService();

      expect(await service.suggestions('demo-user', {})).toEqual([]);
    });

    it('gợi ý món khớp sau khi nhập nguyên liệu', async () => {
      const { service } = createService();
      await service.parse('demo-user', {
        text: '2 quả trứng, 2 quả cà chua',
        save: true,
      });

      const result = await service.suggestions('demo-user', { meal: 'lunch' });

      expect(result).toHaveLength(1);
      expect(result[0].recipe.id).toBe('recipe-a');
      expect(result[0].matchScore).toBe(1);
      expect(result[0].missingIngredients).toEqual([
        expect.objectContaining({
          ingredientId: 'ing-rice',
          status: 'missing',
          isMain: false,
        }),
      ]);
    });

    it('truyền ngân sách và ngưỡng khớp xuống bộ gợi ý', async () => {
      const { service } = createService();
      await service.parse('demo-user', {
        text: '2 quả trứng, 2 quả cà chua',
        save: true,
      });

      expect(
        await service.suggestions('demo-user', { budget: 10_000 }),
      ).toEqual([]);
      expect(
        await service.suggestions('demo-user', {
          threshold: 1,
          budget: 15_000,
          meal: 'lunch',
        }),
      ).toHaveLength(1);
    });
  });
});
