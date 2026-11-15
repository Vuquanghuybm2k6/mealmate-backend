import {
  assertQuickRecipe,
  isBasicTool,
  QuickRecipeInput,
  validateQuickRecipe,
} from './recipe-constraints';

const validRecipe: QuickRecipeInput = {
  cookMinutes: 15,
  difficulty: 'easy',
  tools: ['nồi', 'chảo'],
  servings: 1,
  steps: ['Nấu cơm', 'Chiên trứng'],
  ingredients: [{ quantity: 2 }],
};

describe('quick recipe constraints', () => {
  it('chấp nhận công thức hợp lệ', () => {
    expect(validateQuickRecipe(validRecipe)).toEqual([]);
    expect(() => assertQuickRecipe(validRecipe)).not.toThrow();
  });

  it('so khớp dụng cụ cơ bản không phân biệt dấu và hoa thường', () => {
    expect(isBasicTool('NỒI')).toBe(true);
    expect(isBasicTool('noi com dien')).toBe(true);
    expect(isBasicTool('Lò vi sóng')).toBe(true);
    expect(isBasicTool('lò nướng')).toBe(false);
  });

  it('từ chối món nấu quá 20 phút', () => {
    expect(
      validateQuickRecipe({ ...validRecipe, cookMinutes: 21 }),
    ).toContain('Thời gian nấu phải từ 1 đến 20 phút');
    expect(
      () => assertQuickRecipe({ ...validRecipe, cookMinutes: 0 }),
    ).toThrow();
  });

  it('từ chối độ khó không phải easy', () => {
    expect(
      validateQuickRecipe({ ...validRecipe, difficulty: 'medium' }),
    ).toContain('Công thức trong kho siêu tốc phải có độ khó "easy"');
  });

  it('từ chối dụng cụ không cơ bản hoặc thiếu dụng cụ', () => {
    expect(
      validateQuickRecipe({ ...validRecipe, tools: [] }),
    ).toContain('Công thức phải có ít nhất một dụng cụ nấu');
    expect(
      validateQuickRecipe({ ...validRecipe, tools: ['lò nướng'] }),
    ).toContain('Dụng cụ chưa được hỗ trợ: lò nướng');
  });

  it('từ chối số khẩu phần, các bước và nguyên liệu không hợp lệ', () => {
    const errors = validateQuickRecipe({
      ...validRecipe,
      servings: 0,
      steps: ['   '],
      ingredients: [],
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'Số khẩu phần phải là số nguyên lớn hơn 0',
        'Công thức phải có ít nhất một bước nấu',
        'Công thức phải có ít nhất một nguyên liệu',
      ]),
    );
  });

  it('từ chối khối lượng nguyên liệu không dương', () => {
    expect(
      validateQuickRecipe({
        ...validRecipe,
        ingredients: [{ quantity: 0 }],
      }),
    ).toContain('Khối lượng nguyên liệu phải lớn hơn 0');
  });
});
