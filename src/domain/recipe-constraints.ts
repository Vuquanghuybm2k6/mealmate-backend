import { DifficultyValue } from './enums';
import { normalizeForSearch } from './text';

export const QUICK_RECIPE_MAX_MINUTES = 20;

export const BASIC_TOOLS = [
  'nồi',
  'chảo',
  'nồi cơm điện',
  'lò vi sóng',
] as const;

export interface QuickRecipeInput {
  cookMinutes: number;
  difficulty: DifficultyValue;
  tools: string[];
  servings: number;
  steps: string[];
  ingredients: Array<{ quantity: number }>;
}

export function isBasicTool(tool: string): boolean {
  const normalizedTool = normalizeForSearch(tool);

  return BASIC_TOOLS.some(
    (basicTool) => normalizeForSearch(basicTool) === normalizedTool,
  );
}

export function validateQuickRecipe(input: QuickRecipeInput): string[] {
  const errors: string[] = [];

  if (
    !Number.isFinite(input.cookMinutes) ||
    input.cookMinutes <= 0 ||
    input.cookMinutes > QUICK_RECIPE_MAX_MINUTES
  ) {
    errors.push(
      `Thời gian nấu phải từ 1 đến ${QUICK_RECIPE_MAX_MINUTES} phút`,
    );
  }

  if (input.difficulty !== 'easy') {
    errors.push('Công thức trong kho siêu tốc phải có độ khó "easy"');
  }

  if (input.tools.length === 0) {
    errors.push('Công thức phải có ít nhất một dụng cụ nấu');
  } else {
    const invalidTools = input.tools.filter((tool) => !isBasicTool(tool));

    if (invalidTools.length > 0) {
      errors.push(`Dụng cụ chưa được hỗ trợ: ${invalidTools.join(', ')}`);
    }
  }

  if (!Number.isInteger(input.servings) || input.servings <= 0) {
    errors.push('Số khẩu phần phải là số nguyên lớn hơn 0');
  }

  if (input.steps.filter((step) => step.trim().length > 0).length === 0) {
    errors.push('Công thức phải có ít nhất một bước nấu');
  }

  if (input.ingredients.length === 0) {
    errors.push('Công thức phải có ít nhất một nguyên liệu');
  }

  if (
    input.ingredients.some(
      (ingredient) => !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0,
    )
  ) {
    errors.push('Khối lượng nguyên liệu phải lớn hơn 0');
  }

  return errors;
}

export function assertQuickRecipe(input: QuickRecipeInput): void {
  const errors = validateQuickRecipe(input);

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
}
