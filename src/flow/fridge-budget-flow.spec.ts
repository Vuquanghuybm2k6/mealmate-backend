import { FridgeParserService } from '../fridge/fridge-parser.service';
import { FridgeService } from '../fridge/fridge.service';
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
  makePreference,
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
  kcal: 155,
  protein: 13,
  carbs: 1.1,
  fat: 11,
});

const tomato = makeIngredient({
  id: 'ing-tomato',
  name: 'Cà chua',
  aliases: ['cà chua'],
  category: 'Rau củ',
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
  category: 'Tinh bột',
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
  aliases: ['thịt heo', 'thịt băm'],
  category: 'Đạm',
  unit: 'g',
  pricePerUnit: 120,
  gramsPerUnit: 1,
  kcal: 242,
  protein: 17,
  fat: 18,
});

function riceEggIngredients(recipeId: string, eggQuantity = 2) {
  return [
    makeRecipeIngredient(recipeId, egg, { quantity: eggQuantity, isMain: true }),
    makeRecipeIngredient(recipeId, tomato, { quantity: 2, isMain: true }),
    makeRecipeIngredient(recipeId, rice, { quantity: 80, isMain: false }),
  ];
}

// Công thức 1 khẩu phần: tổng chi phí 14.600đ.
const comTrung = makeRecipe({
  id: 'recipe-com-trung',
  title: 'Cơm trứng cà chua',
  cookMinutes: 15,
  servings: 1,
  costEstimate: 14_600,
  kcal: 483,
  protein: 20.5,
  carbs: 72.9,
  fat: 12,
  mealTypes: ['lunch', 'dinner'],
  dietTypes: ['omnivore', 'vegetarian'],
  spiceLevel: 1,
  ingredients: riceEggIngredients('recipe-com-trung'),
});

// Cùng nguyên liệu nhưng 2 khẩu phần: cost_estimate phải là 7.300đ/khẩu phần.
const canhTrung = makeRecipe({
  id: 'recipe-canh-trung',
  title: 'Canh trứng cà chua',
  cookMinutes: 15,
  servings: 2,
  costEstimate: 7_300,
  kcal: 241.5,
  protein: 10.2,
  carbs: 36.5,
  fat: 6,
  mealTypes: ['lunch', 'dinner'],
  dietTypes: ['omnivore', 'vegetarian'],
  spiceLevel: 1,
  ingredients: riceEggIngredients('recipe-canh-trung'),
});

const comThit = makeRecipe({
  id: 'recipe-com-thit',
  title: 'Cơm thịt kho',
  cookMinutes: 20,
  costEstimate: 25_000,
  kcal: 650,
  protein: 30,
  mealTypes: ['lunch', 'dinner'],
  dietTypes: ['omnivore'],
  spiceLevel: 3,
  ingredients: [
    makeRecipeIngredient('recipe-com-thit', pork, {
      quantity: 100,
      isMain: true,
    }),
    makeRecipeIngredient('recipe-com-thit', rice, {
      quantity: 80,
      isMain: false,
    }),
  ],
});

const banhMi = makeRecipe({
  id: 'recipe-banh-mi',
  title: 'Bánh mì trứng',
  cookMinutes: 8,
  costEstimate: 12_000,
  kcal: 480,
  protein: 22,
  mealTypes: ['breakfast'],
  dietTypes: ['omnivore', 'vegetarian'],
  spiceLevel: 0,
  ingredients: [
    makeRecipeIngredient('recipe-banh-mi', egg, {
      quantity: 2,
      isMain: true,
    }),
  ],
});

function createHarness() {
  const ingredientRepository = new InMemoryIngredientRepository([
    egg,
    tomato,
    rice,
    pork,
  ]);
  const recipeRepository = new InMemoryRecipeRepository([
    comTrung,
    canhTrung,
    comThit,
    banhMi,
  ]);
  const preferenceRepository = new InMemoryPreferenceRepository([
    makePreference({ defaultBudget: 15_000, spiceLevel: 1 }),
  ]);
  const fridgeRepository = new InMemoryFridgeRepository(ingredientRepository);
  const ingredientsService = new IngredientsService(ingredientRepository);
  const recipesService = new RecipesService(
    recipeRepository,
    preferenceRepository,
    TEST_CONFIG,
  );
  const fridgeService = new FridgeService(
    fridgeRepository,
    ingredientsService,
    new FridgeParserService(),
    recipesService,
  );

  return { recipesService, fridgeService, fridgeRepository };
}

const USER_ID = 'demo-user';

describe('Luồng tích hợp: ngân sách ví → tủ lạnh → gợi ý → chi tiết → dọn tủ', () => {
  it('đi trọn luồng với dữ liệu tủ lạnh nhập nhanh', async () => {
    const { recipesService, fridgeService, fridgeRepository } =
      createHarness();

    // 1. Ngân sách mặc định 15.000đ: chỉ món trong ví và đúng bữa trưa.
    const affordable = await recipesService.list(USER_ID, { meal: 'lunch' });

    expect(affordable.map((item) => item.id)).toEqual([
      'recipe-com-trung',
      'recipe-canh-trung',
    ]);
    expect(affordable.every((item) => item.costEstimate <= 15_000)).toBe(true);
    // Món 25.000đ và món bữa sáng không được lọt vào danh sách.
    expect(affordable.map((item) => item.id)).not.toContain('recipe-com-thit');
    expect(affordable.map((item) => item.id)).not.toContain('recipe-banh-mi');

    // 2. Nhập nhanh nguyên liệu và lưu luôn vào tủ lạnh.
    const parseResult = await fridgeService.parse(USER_ID, {
      text: '2 quả trứng, 2 quả cà chua, 80g gạo',
      save: true,
    });

    expect(parseResult.saved).toBe(true);
    expect(parseResult.unmatched).toEqual([]);
    expect(parseResult.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ingredientId: 'ing-egg', quantity: 2 }),
        expect.objectContaining({ ingredientId: 'ing-tomato', quantity: 2 }),
        expect.objectContaining({ ingredientId: 'ing-rice', quantity: 80 }),
      ]),
    );
    expect(fridgeRepository.snapshot()).toHaveLength(3);

    // 3. Gợi ý món khớp 100% nguyên liệu chính, đủ cả gạo nên không thiếu gì.
    const suggestions = await fridgeService.suggestions(USER_ID, {
      meal: 'lunch',
      threshold: 0.6,
    });

    expect(suggestions.map((item) => item.recipe.id)).toEqual([
      'recipe-canh-trung',
      'recipe-com-trung',
    ]);
    expect(suggestions.every((item) => item.matchScore === 1)).toBe(true);
    expect(suggestions[0].missingIngredients).toEqual([]);
    expect(suggestions[0].matchedIngredients).toHaveLength(3);

    // 4. Mở chi tiết: chi phí và dinh dưỡng được tính lại theo từng khẩu phần.
    const detail = await recipesService.detail(USER_ID, 'recipe-canh-trung');

    expect(detail.costEstimate).toBe(7_300);
    expect(detail.estimatedTotalCost).toBe(14_600);
    expect(detail.nutrition).toEqual({
      kcal: 241.5,
      protein: 10.3,
      carbs: 36.5,
      fat: 6,
    });
    expect(detail.ingredients).toHaveLength(3);

    // 5. Dùng hết trứng và cà chua: không còn nguyên liệu chính nào khớp.
    await fridgeService.remove(USER_ID, 'ing-egg');
    await fridgeService.remove(USER_ID, 'ing-tomato');

    expect(await fridgeService.suggestions(USER_ID, { threshold: 0.6 })).toEqual(
      [],
    );

    // 6. Dọn nốt gạo: tủ lạnh trống và gợi ý vẫn rỗng.
    await fridgeService.remove(USER_ID, 'ing-rice');

    expect(await fridgeService.list(USER_ID)).toEqual([]);
    expect(await fridgeService.suggestions(USER_ID, {})).toEqual([]);
  });

  it('lọc gợi ý theo số tiền còn lại trong ví', async () => {
    const { fridgeService } = createHarness();

    await fridgeService.parse(USER_ID, {
      text: '2 quả trứng, 2 quả cà chua, 80g gạo',
      save: true,
    });

    const tightBudget = await fridgeService.suggestions(USER_ID, {
      meal: 'lunch',
      budget: 10_000,
    });

    expect(tightBudget.map((item) => item.recipe.id)).toEqual([
      'recipe-canh-trung',
    ]);
    expect(tightBudget[0].recipe.costEstimate).toBe(7_300);
  });
});
