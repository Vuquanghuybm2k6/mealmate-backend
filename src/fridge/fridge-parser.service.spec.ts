import { FridgeParserService } from './fridge-parser.service';
import { makeIngredient } from '../test-support/fixtures';

const egg = makeIngredient({
  id: 'ing-egg',
  name: 'Trứng gà',
  aliases: ['trứng'],
  unit: 'quả',
  pricePerUnit: 3500,
  gramsPerUnit: 50,
});

const tomato = makeIngredient({
  id: 'ing-tomato',
  name: 'Cà chua',
  aliases: ['ca chua'],
  unit: 'quả',
  pricePerUnit: 3000,
  gramsPerUnit: 100,
});

const spinach = makeIngredient({
  id: 'ing-spinach',
  name: 'Rau muống',
  aliases: ['rau muong'],
  unit: 'bó',
  pricePerUnit: 5000,
  gramsPerUnit: 300,
});

const pork = makeIngredient({
  id: 'ing-pork',
  name: 'Thịt heo xay',
  aliases: ['thịt heo', 'thịt băm'],
  unit: 'g',
  pricePerUnit: 120,
  gramsPerUnit: 1,
});

const rice = makeIngredient({
  id: 'ing-rice',
  name: 'Gạo',
  aliases: [],
  unit: 'g',
  pricePerUnit: 20,
  gramsPerUnit: 1,
});

const cabbage = makeIngredient({
  id: 'ing-cabbage',
  name: 'Bắp cải',
  aliases: ['bap cai'],
  unit: 'củ',
  pricePerUnit: 12_000,
  gramsPerUnit: 800,
});

const ingredients = [egg, tomato, spinach, pork, rice, cabbage];

describe('FridgeParserService', () => {
  const parser = new FridgeParserService();

  it('tách nhiều nguyên liệu, số đếm và số từ trong một câu', () => {
    const result = parser.parse(
      'nhà còn 3 quả trứng, ít rau muống',
      ingredients,
    );

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: 'ing-egg',
          quantity: 3,
          unit: 'quả',
          estimatedPrice: 10_500,
          sourceText: 'nhà còn 3 quả trứng',
        }),
        expect.objectContaining({
          ingredientId: 'ing-spinach',
          quantity: 1,
          unit: 'bó',
        }),
      ]),
    );
    expect(result.unmatched).toEqual([]);
  });

  it('hiểu số lượng theo gram và quy đổi sang đơn vị của nguyên liệu', () => {
    const result = parser.parse(
      '2 quả cà chua và 200g thịt heo xay',
      ingredients,
    );
    const tomatoItem = result.items.find(
      (item) => item.ingredientId === 'ing-tomato',
    );
    const porkItem = result.items.find(
      (item) => item.ingredientId === 'ing-pork',
    );

    expect(tomatoItem?.quantity).toBe(2);
    expect(porkItem?.quantity).toBe(200);
    expect(porkItem?.estimatedPrice).toBe(24_000);
  });

  it('hiểu phân số, số thập phân và chữ "nửa"', () => {
    expect(parser.parse('nửa bắp cải', ingredients).items[0].quantity).toBe(
      0.5,
    );
    expect(
      parser.parse('1,5 kg gạo', ingredients).items[0].quantity,
    ).toBe(1500);
    expect(
      parser.parse('1/2 bắp cải', ingredients).items[0].quantity,
    ).toBe(0.5);
  });

  it('quy đổi gram sang số quả theo gramsPerUnit', () => {
    expect(parser.parse('200g trứng', ingredients).items[0].quantity).toBe(4);
  });

  it('dùng số lượng mặc định hợp lý khi người dùng chỉ gõ tên', () => {
    expect(parser.parse('trứng', ingredients).items[0].quantity).toBe(1);
    expect(parser.parse('gạo', ingredients).items[0].quantity).toBe(100);
  });

  it('không phân biệt dấu và nhận alias', () => {
    expect(parser.parse('3 qua trung', ingredients).items[0].quantity).toBe(3);
    expect(
      parser.parse('200g thịt băm', ingredients).items[0].ingredientId,
    ).toBe('ing-pork');
  });

  it('cộng dồn nguyên liệu trùng trong nhiều mệnh đề', () => {
    const result = parser.parse('2 quả trứng, 1 quả trứng', ingredients);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(3);
    expect(result.items[0].estimatedPrice).toBe(10_500);
  });

  it('gán số lượng gần nhất cho từng nguyên liệu trong cùng mệnh đề', () => {
    const result = parser.parse(
      '1 bó rau muống 2 quả cà chua',
      ingredients,
    );
    const spinachItem = result.items.find(
      (item) => item.ingredientId === 'ing-spinach',
    );
    const tomatoItem = result.items.find(
      (item) => item.ingredientId === 'ing-tomato',
    );

    expect(spinachItem?.quantity).toBe(1);
    expect(tomatoItem?.quantity).toBe(2);
  });

  it('trả về danh sách nguyên liệu chưa nhận diện được', () => {
    const result = parser.parse('bơ, sữa', ingredients);

    expect(result.items).toEqual([]);
    expect(result.unmatched).toEqual(['bơ', 'sữa']);
  });

  it('trả kết quả rỗng với chuỗi rỗng', () => {
    expect(parser.parse('   ', ingredients)).toEqual({
      items: [],
      unmatched: [],
    });
  });
});
