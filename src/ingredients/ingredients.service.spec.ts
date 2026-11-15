import { IngredientsService } from './ingredients.service';
import { InMemoryIngredientRepository } from '../test-support/in-memory-repositories';
import { makeIngredient } from '../test-support/fixtures';

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

const pork = makeIngredient({
  id: 'ing-pork',
  name: 'Thịt heo xay',
  aliases: ['thịt lợn xay', 'thịt băm'],
  category: 'Đạm',
  unit: 'g',
  pricePerUnit: 120,
  kcal: 242,
});

const spinach = makeIngredient({
  id: 'ing-spinach',
  name: 'Rau muống',
  category: 'Rau củ',
  unit: 'bó',
  pricePerUnit: 5000,
  gramsPerUnit: 300,
});

const tomato = makeIngredient({
  id: 'ing-tomato',
  name: 'Cà chua',
  aliases: ['tomato'],
  category: 'Rau củ',
  unit: 'quả',
  pricePerUnit: 3000,
});

describe('IngredientsService', () => {
  let service: IngredientsService;

  beforeEach(() => {
    service = new IngredientsService(
      new InMemoryIngredientRepository([egg, pork, spinach, tomato]),
    );
  });

  it('trả về toàn bộ nguyên liệu khi không có từ khoá', async () => {
    const result = await service.search();

    expect(result.map((item) => item.id)).toEqual([
      'ing-egg',
      'ing-pork',
      'ing-spinach',
      'ing-tomato',
    ]);
    expect(result[0].nutritionPer100g.kcal).toBe(155);
  });

  it('tìm không phân biệt dấu và hoa thường', async () => {
    expect((await service.search('TRUNG')).map((item) => item.id)).toEqual([
      'ing-egg',
    ]);
    expect((await service.search('thit lon')).map((item) => item.id)).toEqual([
      'ing-pork',
    ]);
  });

  it('tìm theo alias và tên tiếng Anh', async () => {
    expect((await service.search('tomato'))[0].id).toBe('ing-tomato');
  });

  it('tìm theo danh mục', async () => {
    const result = await service.search('rau cu');

    expect(result.map((item) => item.id)).toEqual([
      'ing-spinach',
      'ing-tomato',
    ]);
  });

  it('trả về danh sách rỗng khi không khớp', async () => {
    expect(await service.search('sầu riêng')).toEqual([]);
  });
});
