import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AddFridgeItemDto,
  ParseFridgeDto,
} from './fridge-request.dto';
import { FridgeSuggestionsQueryDto } from './fridge-suggestions-query.dto';

describe('fridge DTO validation', () => {
  it('chấp nhận nguyên liệu và số lượng hợp lệ', async () => {
    const dto = plainToInstance(AddFridgeItemDto, {
      ingredientId: 'ing-trung-ga',
      quantity: '2',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.quantity).toBe(2);
  });

  it('từ chối nguyên liệu rỗng và số lượng không dương', async () => {
    const dto = plainToInstance(AddFridgeItemDto, {
      ingredientId: '',
      quantity: 0,
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['ingredientId', 'quantity']),
    );
  });

  it('kiểm tra body nhập nhanh nguyên liệu', async () => {
    const valid = plainToInstance(ParseFridgeDto, {
      text: '2 quả trứng, ít rau muống',
      save: true,
    });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(ParseFridgeDto, {
      text: '',
      save: 'yes',
    });
    const errors = await validate(invalid);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['text', 'save']),
    );
  });

  it('giới hạn ngưỡng khớp trong khoảng 0..1', async () => {
    const valid = plainToInstance(FridgeSuggestionsQueryDto, {
      threshold: '0.6',
      budget: '30000',
      meal: 'lunch',
      maxTime: '12',
    });

    expect(await validate(valid)).toHaveLength(0);
    expect(valid.threshold).toBe(0.6);

    const invalid = plainToInstance(FridgeSuggestionsQueryDto, {
      threshold: '1.5',
      meal: 'snack',
      maxTime: '0',
    });
    const errors = await validate(invalid);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['threshold', 'meal', 'maxTime']),
    );
  });
});
