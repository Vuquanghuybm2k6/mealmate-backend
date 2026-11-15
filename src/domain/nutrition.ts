export interface NutritionValues {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionIngredientLike {
  quantity: number;
  ingredient: {
    gramsPerUnit: number;
    pricePerUnit: number;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface HealthyThresholds {
  maxKcal: number;
  minProtein: number;
}

const ZERO_NUTRITION: NutritionValues = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

export function roundTo(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateIngredientNutrition(
  ingredient: NutritionIngredientLike,
): NutritionValues {
  const grams = ingredient.quantity * ingredient.ingredient.gramsPerUnit;
  const ratio = grams / 100;

  return {
    kcal: roundTo(ingredient.ingredient.kcal * ratio),
    protein: roundTo(ingredient.ingredient.protein * ratio),
    carbs: roundTo(ingredient.ingredient.carbs * ratio),
    fat: roundTo(ingredient.ingredient.fat * ratio),
  };
}

export function calculateRecipeTotalNutrition(
  ingredients: NutritionIngredientLike[],
): NutritionValues {
  const totals = ingredients.reduce<NutritionValues>((accumulator, item) => {
    const grams = item.quantity * item.ingredient.gramsPerUnit;
    const ratio = grams / 100;

    return {
      kcal: accumulator.kcal + item.ingredient.kcal * ratio,
      protein: accumulator.protein + item.ingredient.protein * ratio,
      carbs: accumulator.carbs + item.ingredient.carbs * ratio,
      fat: accumulator.fat + item.ingredient.fat * ratio,
    };
  }, { ...ZERO_NUTRITION });

  return {
    kcal: roundTo(totals.kcal),
    protein: roundTo(totals.protein),
    carbs: roundTo(totals.carbs),
    fat: roundTo(totals.fat),
  };
}

export function calculateRecipeNutritionPerServing(
  ingredients: NutritionIngredientLike[],
  servings: number,
): NutritionValues {
  assertServings(servings);
  const total = calculateRecipeTotalNutrition(ingredients);

  return {
    kcal: roundTo(total.kcal / servings),
    protein: roundTo(total.protein / servings),
    carbs: roundTo(total.carbs / servings),
    fat: roundTo(total.fat / servings),
  };
}

export function calculateRecipeTotalCost(
  ingredients: NutritionIngredientLike[],
): number {
  return Math.round(
    ingredients.reduce(
      (total, item) => total + item.quantity * item.ingredient.pricePerUnit,
      0,
    ),
  );
}

/**
 * cost_estimate được lưu theo khẩu phần để bộ lọc ngân sách của một bữa ăn
 * là chính xác kể cả khi công thức nấu nhiều phần.
 */
export function calculateRecipeCostPerServing(
  ingredients: NutritionIngredientLike[],
  servings: number,
): number {
  assertServings(servings);
  return Math.round(calculateRecipeTotalCost(ingredients) / servings);
}

export function isHealthyNutrition(
  nutrition: Pick<NutritionValues, 'kcal' | 'protein'>,
  thresholds: HealthyThresholds,
): boolean {
  return (
    nutrition.kcal <= thresholds.maxKcal &&
    nutrition.protein >= thresholds.minProtein
  );
}

function assertServings(servings: number): void {
  if (!Number.isFinite(servings) || servings <= 0) {
    throw new Error('Số khẩu phần phải lớn hơn 0');
  }
}
