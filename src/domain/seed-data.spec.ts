import { ingredients, recipes } from '../../prisma/seed-data';
import {
  calculateRecipeCostPerServing,
  calculateRecipeNutritionPerServing,
  isHealthyNutrition,
} from './nutrition';
import { isBasicTool, QUICK_RECIPE_MAX_MINUTES } from './recipe-constraints';

const ingredientById = new Map(
  ingredients.map((ingredient) => [ingredient.id, ingredient]),
);

function buildRecipeIngredients(recipe: (typeof recipes)[number]) {
  return recipe.ingredients.map(([ingredientId, quantity, isMain]) => {
    const ingredient = ingredientById.get(ingredientId);

    if (!ingredient) {
      throw new Error(
        `Công thức ${recipe.id} tham chiếu nguyên liệu không tồn tại: ${ingredientId}`,
      );
    }

    return {
      recipeId: recipe.id,
      ingredientId,
      quantity,
      isMain,
      ingredient,
    };
  });
}

const nutritionPerServingByRecipe = new Map(
  recipes.map((recipe) => [
    recipe.id,
    calculateRecipeNutritionPerServing(
      buildRecipeIngredients(recipe),
      recipe.servings,
    ),
  ]),
);

describe('seed data', () => {
  it('có 36 nguyên liệu và 20 công thức, id và tên không trùng', () => {
    expect(ingredients).toHaveLength(36);
    expect(recipes).toHaveLength(20);

    expect(new Set(ingredients.map((item) => item.id)).size).toBe(
      ingredients.length,
    );
    expect(new Set(ingredients.map((item) => item.name)).size).toBe(
      ingredients.length,
    );
    expect(new Set(recipes.map((item) => item.id)).size).toBe(recipes.length);
  });

  it('mọi nguyên liệu có đơn vị, giá và khối lượng quy đổi hợp lệ', () => {
    for (const ingredient of ingredients) {
      expect(ingredient.unit.trim().length).toBeGreaterThan(0);
      expect(ingredient.pricePerUnit).toBeGreaterThanOrEqual(0);
      // gramsPerUnit = 0 sẽ làm hỏng phép quy đổi gram <-> đơn vị ở tủ lạnh.
      expect(ingredient.gramsPerUnit).toBeGreaterThan(0);
      expect(ingredient.kcal).toBeGreaterThanOrEqual(0);
      expect(ingredient.protein).toBeGreaterThanOrEqual(0);
      expect(ingredient.carbs).toBeGreaterThanOrEqual(0);
      expect(ingredient.fat).toBeGreaterThanOrEqual(0);
    }
  });

  it('mọi công thức thoả ràng buộc kho siêu tốc', () => {
    for (const recipe of recipes) {
      expect(recipe.cookMinutes).toBeGreaterThan(0);
      expect(recipe.cookMinutes).toBeLessThanOrEqual(QUICK_RECIPE_MAX_MINUTES);
      expect(recipe.servings).toBeGreaterThan(0);
      expect(Number.isInteger(recipe.servings)).toBe(true);
      expect(recipe.steps.filter((step) => step.trim().length > 0).length)
        .toBeGreaterThan(0);
      expect(recipe.tools.length).toBeGreaterThan(0);

      for (const tool of recipe.tools) {
        expect(isBasicTool(tool)).toBe(true);
      }

      const recipeIngredients = buildRecipeIngredients(recipe);

      expect(recipeIngredients.length).toBeGreaterThan(0);
      expect(recipeIngredients.every((item) => item.quantity > 0)).toBe(true);
      // Điểm khớp tủ lạnh dựa trên nguyên liệu chính, nên mỗi món phải có ít nhất một món chính.
      expect(recipeIngredients.some((item) => item.isMain)).toBe(true);
      expect(recipe.mealTypes.length).toBeGreaterThan(0);
      expect(recipe.dietTypes.length).toBeGreaterThan(0);
      expect(recipe.spiceLevel).toBeGreaterThanOrEqual(0);
      expect(recipe.spiceLevel).toBeLessThanOrEqual(3);
    }
  });

  it('chi phí và dinh dưỡng mỗi khẩu phần nằm trong khoảng hợp lý', () => {
    for (const recipe of recipes) {
      const recipeIngredients = buildRecipeIngredients(recipe);
      const cost = calculateRecipeCostPerServing(
        recipeIngredients,
        recipe.servings,
      );
      const nutrition = nutritionPerServingByRecipe.get(recipe.id)!;

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(100_000);
      expect(nutrition.kcal).toBeGreaterThan(0);
      expect(nutrition.kcal).toBeLessThanOrEqual(1_500);
      expect(nutrition.protein).toBeGreaterThanOrEqual(0);
      expect(nutrition.protein).toBeLessThanOrEqual(100);
      expect(nutrition.carbs).toBeGreaterThanOrEqual(0);
      expect(nutrition.fat).toBeGreaterThanOrEqual(0);
    }
  });

  it('có ít nhất một món lành mạnh theo ngưỡng 600 kcal / 15 g protein', () => {
    const healthy = recipes.filter((recipe) =>
      isHealthyNutrition(nutritionPerServingByRecipe.get(recipe.id)!, {
        maxKcal: 600,
        minProtein: 15,
      }),
    );

    expect(healthy.length).toBeGreaterThan(0);
  });
});
