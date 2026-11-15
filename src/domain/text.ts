export function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (character) => (character === 'đ' ? 'd' : 'D'));
}

/**
 * Dùng cho tìm kiếm nguyên liệu và so khớp tên/dụng cụ.
 * Bỏ dấu, viết thường, bỏ toàn bộ dấu câu.
 */
export function normalizeForSearch(input: string): string {
  return stripDiacritics(input.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dùng cho bộ tách nguyên liệu: giữ dấu chấm và dấu gạch chéo để xử lý
 * số thập phân / phân số (1.5 kg, 1/2 củ).
 */
export function normalizeForParser(input: string): string {
  return stripDiacritics(input.toLowerCase())
    .replace(/[^a-z0-9\s/.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách câu tự do thành từng mệnh đề nhỏ. Dấu phẩy nằm giữa hai chữ số
 * (1,5 kg) được giữ nguyên, sau đó đổi thành dấu chấm.
 */
export function splitIngredientClauses(input: string): string[] {
  return input
    .replace(/(\d),(\d)/g, '$1.$2')
    .split(/[,;\n]+|\s+(?:và|va|với|voi)\s+/gi)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}
