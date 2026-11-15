import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import {
  InMemoryPreferenceRepository,
  InMemoryRecipeRepository,
} from '../test-support/in-memory-repositories';
import {
  TEST_CONFIG,
  makeIngredient,
  makePreference,
  makeRecipe,
  makeRecipeIngredient,
} from '../test-support/fixtures';

const egg = makeIngredient({
  id: 'ing-egg',
  name: 'Trứng gà',
  unit: 'quả',
  pricePerUnit: 3500,
  gramsPerUnit: 50,
  kcal: 155,
  protein: 13,
  carbs: 1.1,
  fat: 11,
});

const tomato = makeIngredient({
  id: 'ing-tomato',
  name: 'Cà chua',
  unit: 'quả',
  pricePerUnit: 3000,
  gramsPerUnit: 100,
  kcal: 18,
  protein: 0.9,
  carbs: 3.9,
  fat: 0.2,
});

const rice = makeIngredient({
  id: 'ing-rice',
  name: 'Gạo',
  unit: 'g',
  pricePerUnit: 20,
  gramsPerUnit: 1,
  kcal: 365,
  protein: 7.1,
  carbs: 80,
  fat: 0.7,
});

const pork = makeIngredient({
  id: 'ing-pork',
  name: 'Thịt heo xay',
  unit: 'g',
  pricePerUnit: 120,
  gramsPerUnit: 1,
  kcal: 242,
  protein: 17,
  fat: 18,
});

const cabbage = makeIngredient({
  id: 'ing-cabbage',
  name: 'Bắp cải',
  unit: 'g',
  pricePerUnit: 15,
  gramsPerUnit: 1,
  kcal: 25,
  protein: 1.3,
  carbs: 5.8,
  fat: 0.1,
});

const recipeA = makeRecipe({
  id: 'recipe-a',
  title: 'Cơm trứng cà chua',
  cookMinutes: 15,
  costEstimate: 14_600,
  kcal: 483,
  protein: 20.5,
  carbs: 72.9,
  fat: 12,
  mealTypes: ['lunch', 'dinner'],
  dietTypes: ['omnivore', 'vegetarian'],
  spiceLevel: 1,
  ingredients: [
    makeRecipeIngredient('recipe-a', egg, { quantity: 2, isMain: true }),
    makeRecipeIngredient('recipe-a', tomato, { quantity: 2, isMain: true }),
    makeRecipeIngredient('recipe-a', rice, { quantity: 80, isMain: false }),
  ],
});

const recipeB = makeRecipe({
  id: 'recipe-b',
  title: 'Cơm thịt kho',
  cookMinutes: 20,
  costEstimate: 25_000,
  kcal: 650,
  protein: 30,
  mealTypes: ['lunch', 'dinner'],
  dietTypes: ['omnivore'],
  spiceLevel: 3,
  ingredients: [
    makeRecipeIngredient('recipe-b', pork, { quantity: 100, isMain: true }),
    makeRecipeIngredient('recipe-b', rice, { quantity: 80, isMain: false }),
  ],
});

const recipeC = makeRecipe({
  id: 'recipe-c',
  title: 'Bánh mì trứng',
  cookMinutes: 8,
  costEstimate: 12_000,
  kcal: 480,
  protein: 22,
  mealTypes: ['breakfast'],
  dietTypes: ['omnivore', 'vegetarian'],
  spiceLevel: 0,
  ingredients: [
    makeRecipeIngredient('recipe-c', egg, { quantity: 2, isMain: true }),
  ],
});

const recipeD = makeRecipe({
  id: 'recipe-d',
  title: 'Salad chay',
  cookMinutes: 10,
  costEstimate: 8_000,
  kcal: 250,
  protein: 8,
  mealTypes: ['lunch'],
  dietTypes: ['omnivore', 'vegetarian', 'vegan'],
  spiceLevel: 1,
  ingredients: [
    makeRecipeIngredient('recipe-d', tomato, { quantity: 1, isMain: true }),
    makeRecipeIngredient('recipe-d', cabbage, { quantity: 100, isMain: true }),
  ],
});

const recipeE = makeRecipe({
  id: 'recipe-e',
  title: 'Món nấu lâu',
  cookMinutes: 35,
  costEstimate: 5_000,
  kcal: 400,
  protein: 20,
  mealTypes: ['lunch'],
});

function createService(preferences = [] as ReturnType<typeof makePreference>[]) {
  const recipeRepository = new InMemoryRecipeRepository([
    recipeA,
    recipeB,
    recipeC,
    recipeD,
    recipeE,
  ]);
  const preferenceRepository = new InMemoryPreferenceRepository(preferences);

  return {
    service: new RecipesService(
      recipeRepository,
      preferenceRepository,
      TEST_CONFIG,
    ),
    recipeRepository,
    preferenceRepository,
  };
}

describe('RecipesService', () => {
  describe('feature 1 - lọc theo ngân sách và bữa ăn', () => {
    it('chỉ trả món trong ngân sách và đúng bữa, ưu tiên món sát ngân sách', async () => {
      const { service } = createService();

      const result = await service.list('demo-user', {
        budget: 15_000,
        meal: 'lunch',
      });

      expect(result.map((item) => item.id)).toEqual(['recipe-a', 'recipe-d']);
      expect(result.every((item) => item.costEstimate <= 15_000)).toBe(true);
    });

    it('xếp món đắt gần ngân sách lên trước khi không có sở thích', async () => {
      const { service } = createService();

      const result = await service.list('demo-user', { budget: 30_000 });

      expect(result[0].id).toBe('recipe-b');
      expect(result.map((item) => item.id)).not.toContain('recipe-e');
    });

    it('dùng ngân sách mặc định trong hồ sơ khi không truyền budget', async () => {
      const { service } = createService([
        makePreference({ defaultBudget: 15_000 }),
      ]);

      const result = await service.list('demo-user', {});

      // Hồ sơ demo hợp khẩu vị với recipe-a và recipe-d hơn recipe-c,
      // nên thứ tự ưu tiên khẩu vị đứng trước độ gần ngân sách.
      expect(result.map((item) => item.id)).toEqual([
        'recipe-a',
        'recipe-d',
        'recipe-c',
      ]);
    });

    it('lọc theo bữa sáng', async () => {
      const { service } = createService();

      const result = await service.list('demo-user', { meal: 'breakfast' });

      expect(result.map((item) => item.id)).toEqual(['recipe-c']);
    });

    it('áp dụng giới hạn kết quả', async () => {
      const { service } = createService();

      const result = await service.list('demo-user', { budget: 30_000, limit: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('recipe-b');
    });

    it('trả danh sách rỗng khi ngân sách quá thấp', async () => {
      const { service } = createService();

      expect(await service.list('demo-user', { budget: 0 })).toEqual([]);
    });
  });

  describe('preferences', () => {
    it('ưu tiên món gần khẩu vị cay của người dùng', async () => {
      const { service } = createService([
        makePreference({ spiceLevel: 3, defaultBudget: 30_000 }),
      ]);

      const result = await service.list('demo-user', {});

      expect(result[0].id).toBe('recipe-b');
    });

    it('lọc món chay theo chế độ ăn', async () => {
      const { service } = createService([
        makePreference({ dietType: 'vegetarian' }),
      ]);

      const result = await service.list('demo-user', {});
      const ids = result.map((item) => item.id);

      expect(ids).toEqual(
        expect.arrayContaining(['recipe-a', 'recipe-c', 'recipe-d']),
      );
      expect(ids).not.toContain('recipe-b');
    });

    it('chế độ thuần chay chỉ trả món có tag vegan', async () => {
      const { service } = createService([
        makePreference({ dietType: 'vegan' }),
      ]);

      expect(
        (await service.list('demo-user', {})).map((item) => item.id),
      ).toEqual(['recipe-d']);
    });

    it('loại món chứa nguyên liệu người dùng không thích', async () => {
      const { service } = createService([
        makePreference({ dislikedIngredientIds: ['ing-tomato'] }),
      ]);

      const ids = (await service.list('demo-user', {})).map((item) => item.id);

      expect(ids).not.toContain('recipe-a');
      expect(ids).not.toContain('recipe-d');
      expect(ids).toEqual(expect.arrayContaining(['recipe-b', 'recipe-c']));
    });
  });

  describe('feature 3 - kho công thức siêu tốc và dinh dưỡng', () => {
    it('chỉ trả món nấu tối đa 20 phút dù client xin 120 phút', async () => {
      const { service } = createService();

      const ids = (await service.list('demo-user', { maxTime: 120 })).map(
        (item) => item.id,
      );

      expect(ids).not.toContain('recipe-e');
    });

    it('lọc theo thời gian nấu thực tế', async () => {
      const { service } = createService();

      const ids = (await service.list('demo-user', { maxTime: 10 })).map(
        (item) => item.id,
      );

      expect(ids).toEqual(['recipe-c', 'recipe-d']);
    });

    it('lọc chế độ lành mạnh theo kcal và protein mỗi khẩu phần', async () => {
      const { service } = createService();

      const ids = (await service.list('demo-user', { healthy: true })).map(
        (item) => item.id,
      );

      expect(ids).toEqual(expect.arrayContaining(['recipe-a', 'recipe-c']));
      expect(ids).not.toContain('recipe-b');
      expect(ids).not.toContain('recipe-d');
    });

    it('dùng ngưỡng lành mạnh riêng trong hồ sơ người dùng', async () => {
      const { service } = createService([
        makePreference({ healthyMaxKcal: 300, healthyMinProtein: 5 }),
      ]);

      const ids = (await service.list('demo-user', { healthy: true })).map(
        (item) => item.id,
      );

      expect(ids).toContain('recipe-d');
      expect(ids).not.toContain('recipe-a');
    });

    it('trả chi tiết món kèm dinh dưỡng tính lại từ nguyên liệu', async () => {
      const { service } = createService();

      const detail = await service.detail('demo-user', 'recipe-a');

      expect(detail.title).toBe('Cơm trứng cà chua');
      expect(detail.estimatedTotalCost).toBe(14_600);
      expect(detail.nutrition).toEqual({
        kcal: 483,
        protein: 20.5,
        carbs: 72.9,
        fat: 12,
      });
      expect(detail.ingredients).toHaveLength(3);
      expect(detail.ingredients[0]).toMatchObject({
        name: 'Trứng gà',
        quantity: 2,
        grams: 100,
        estimatedCost: 7_000,
        isMain: true,
      });
      expect(detail.steps[0]).toBe('Bước 1');
      expect(detail.tools).toEqual(['nồi']);
    });

    it('báo lỗi 404 khi không tìm thấy món', async () => {
      const { service } = createService();

      await expect(service.detail('demo-user', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('feature 2 - gợi ý theo tủ lạnh', () => {
    it('chấm điểm theo nguyên liệu chính đang có', async () => {
      const { service } = createService();
      const available = new Map([
        ['ing-egg', 2],
        ['ing-tomato', 2],
        ['ing-rice', 80],
      ]);

      const result = await service.suggestForFridge(available, {
        meal: 'lunch',
      });

      expect(result[0].recipe.id).toBe('recipe-a');
      expect(result[0].matchScore).toBe(1);
      expect(result[0].missingIngredients).toEqual([]);
      expect(result[0].matchedIngredients.length).toBe(3);
    });

    it('sắp xếp điểm khớp giảm dần rồi tới thời gian nấu', async () => {
      const { service } = createService();
      const available = new Map([['ing-egg', 2]]);

      const result = await service.suggestForFridge(available, {
        threshold: 0.5,
        meal: 'breakfast',
      });

      expect(result.map((item) => item.recipe.id)).toEqual(['recipe-c']);
    });

    it('liệt kê nguyên liệu còn thiếu và số lượng thiếu', async () => {
      const { service } = createService();
      const available = new Map([['ing-egg', 1]]);

      const result = await service.suggestForFridge(available, {
        threshold: 0.5,
        meal: 'lunch',
      });
      const missing = result[0].missingIngredients;

      expect(result[0].matchScore).toBe(0.5);
      expect(missing).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ingredientId: 'ing-egg',
            status: 'not_enough',
            availableQuantity: 1,
            requiredQuantity: 2,
            missingQuantity: 1,
          }),
          expect.objectContaining({
            ingredientId: 'ing-tomato',
            status: 'missing',
            missingQuantity: 2,
          }),
          expect.objectContaining({
            ingredientId: 'ing-rice',
            isMain: false,
            status: 'missing',
          }),
        ]),
      );
    });

    it('món dưới ngưỡng khớp bị loại', async () => {
      const { service } = createService();
      const available = new Map([['ing-tomato', 1]]);

      expect(
        await service.suggestForFridge(available, {
          meal: 'lunch',
          threshold: 0.6,
        }),
      ).toEqual([]);
      expect(
        (
          await service.suggestForFridge(available, {
            meal: 'lunch',
            threshold: 0.5,
          })
        ).map((item) => item.recipe.id),
      ).toEqual(['recipe-d', 'recipe-a']);
    });

    it('lọc gợi ý theo ngân sách', async () => {
      const { service } = createService();
      const available = new Map([
        ['ing-egg', 2],
        ['ing-tomato', 1],
      ]);

      const result = await service.suggestForFridge(available, {
        threshold: 0.5,
        budget: 10_000,
      });

      expect(result.map((item) => item.recipe.id)).toEqual(['recipe-d']);
    });

    it('trả rỗng khi tủ lạnh trống', async () => {
      const { service } = createService();

      expect(await service.suggestForFridge(new Map())).toEqual([]);
    });

    it('từ chối ngưỡng khớp ngoài khoảng 0..1', async () => {
      const { service } = createService();

      await expect(
        service.suggestForFridge(new Map(), { threshold: 1.5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('recalculate metrics', () => {
    it('tính lại cost_estimate khi giá nguyên liệu thay đổi', async () => {
      const { service, recipeRepository } = createService();
      egg.pricePerUnit = 4000;

      const result = await service.recalculateMetrics('ing-egg');

      expect(result.updated).toBe(2);
      expect((await recipeRepository.findById('recipe-a'))?.costEstimate).toBe(
        15_600,
      );
      expect((await recipeRepository.findById('recipe-a'))?.kcal).toBe(483);
      expect((await recipeRepository.findById('recipe-a'))?.isHealthy).toBe(
        true,
      );
    });

    it('tính lại toàn bộ công thức khi không truyền ingredientId', async () => {
      const { service } = createService();

      expect(await service.recalculateMetrics()).toEqual({ updated: 5 });
    });
  });
});
