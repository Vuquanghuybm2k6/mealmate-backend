import {
  normalizeForParser,
  normalizeForSearch,
  splitIngredientClauses,
  stripDiacritics,
} from './text';

describe('text utilities', () => {
  it('bỏ dấu tiếng Việt và chuẩn hoá chữ thường', () => {
    expect(stripDiacritics('Trứng Gà Đỏ')).toBe('Trung Ga Do');
    expect(normalizeForSearch('  Trứng   Gà Đỏ! ')).toBe('trung ga do');
  });

  it('giữ dấu chấm trong normalizeForParser để xử lý số thập phân', () => {
    expect(normalizeForParser('1.5 kg cà chua')).toBe('1.5 kg ca chua');
  });

  it('tách mệnh đề theo dấu phẩy, chấm phẩy, xuống dòng và chữ và', () => {
    expect(
      splitIngredientClauses(
        'nhà còn 3 quả trứng, 2 quả cà chua và ít rau muống\nhành lá',
      ),
    ).toEqual([
      'nhà còn 3 quả trứng',
      '2 quả cà chua',
      'ít rau muống',
      'hành lá',
    ]);
  });

  it('không tách nhầm dấu phẩy thập phân', () => {
    expect(splitIngredientClauses('1,5 kg gạo; 200g thịt')).toEqual([
      '1.5 kg gạo',
      '200g thịt',
    ]);
  });
});
