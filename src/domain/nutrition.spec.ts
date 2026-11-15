import {
  calculateIngredientNutrition,
  calculateRecipeCostPerServing,
  calculateRecipeNutritionPerServing,
  calculateRecipeTotalCost,
  calculateRecipeTotalNutrition,
  isHealthyNutrition,
} from './nutrition';
import { makeIngredient, makeRecipeIngredient } from '../test-support/fixtures';

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

const items = [
  makeRecipeIngredient('recipe-a', egg, { quantity: 2 }),
  makeRecipeIngredient('recipe-a', tomato, { quantity: 2 }),
];

describe('nutrition calculations', () => {
  it('tính dinh dưỡng của một nguyên liệu theo khối lượng thực tế', () => {
    expect(calculateIngredientNutrition(items[0])).toEqual({
      kcal: 155,
      protein: 13,
      carbs: 1.1,
      fat: 11,
    });
    expect(calculateIngredientNutrition(items[1])).toEqual({
      kcal: 36,
      protein: 1.8,
      carbs: 7.8,
      fat: 0.4,
    });
  });

  it('tính tổng dinh dưỡng và chia theo số khẩu phần', () => {
    expect(calculateRecipeTotalNutrition(items)).toEqual({
      kcal: 191,
      protein: 14.8,
      carbs: 8.9,
      fat: 11.4,
    });

    expect(calculateRecipeNutritionPerServing(items, 2)).toEqual({
      kcal: 95.5,
      protein: 7.4,
      carbs: 4.5,
      fat: 5.7,
    });
  });

  it('tính chi phí tổng và chi phí mỗi khẩu phần', () => {
    expect(calculateRecipeTotalCost(items)).toBe(13_000);
    expect(calculateRecipeCostPerServing(items, 2)).toBe(6_500);
  });

  it('làm tròn chi phí mỗi khẩu phần thành số đồng', () => {
    const oddCostItems = [
      makeRecipeIngredient('recipe-b', egg, { quantity: 1 }),
      makeRecipeIngredient('recipe-b', tomato, { quantity: 1 }),
    ];

    expect(calculateRecipeTotalCost(oddCostItems)).toBe(6_500);
    expect(calculateRecipeCostPerServing(oddCostItems, 3)).toBe(2_167);
  });

  it('áp dụng đúng ngưỡng dinh dưỡng lành mạnh (bao gồm biên)', () => {
    expect(
      isHealthyNutrition(
        { kcal: 600, protein: 15 },
        { maxKcal: 600, minProtein: 15 },
      ),
    ).toBe(true);
    expect(
      isHealthyNutrition(
        { kcal: 600.1, protein: 15 },
        { maxKcal: 600, minProtein: 15 },
      ),
    ).toBe(false);
    expect(
      isHealthyNutrition(
        { kcal: 600, protein: 14.9 },
        { maxKcal: 600, minProtein: 15 },
      ),
    ).toBe(false);
  });

  it('từ chối số khẩu phần không hợp lệ', () => {
    expect(() => calculateRecipeNutritionPerServing(items, 0)).toThrow(
      'Số khẩu phần phải lớn hơn 0',
    );
    expect(() => calculateRecipeCostPerServing(items, -1)).toThrow(
      'Số khẩu phần phải lớn hơn 0',
    );
  });
});
