import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListRecipesQueryDto } from './list-recipes-query.dto';

describe('ListRecipesQueryDto', () => {
  it('chuyển đổi query string sang kiểu dữ liệu đúng', async () => {
    const dto = plainToInstance(ListRecipesQueryDto, {
      budget: '30000',
      meal: 'lunch',
      healthy: 'true',
      maxTime: '20',
      limit: '10',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto).toMatchObject({
      budget: 30000,
      meal: 'lunch',
      healthy: true,
      maxTime: 20,
      limit: 10,
    });
  });

  it('chấp nhận healthy=false', async () => {
    const dto = plainToInstance(ListRecipesQueryDto, {
      healthy: 'false',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.healthy).toBe(false);
  });

  it('từ chối ngân sách âm, bữa ăn lạ và thời gian không hợp lệ', async () => {
    const dto = plainToInstance(ListRecipesQueryDto, {
      budget: '-1',
      meal: 'snack',
      healthy: 'yes',
      maxTime: '0',
      limit: '100',
    });

    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining(['budget', 'meal', 'healthy', 'maxTime', 'limit']),
    );
  });
});
