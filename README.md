# BếpSV — Backend (NestJS + Prisma + PostgreSQL)

Backend cho website **gợi ý món ăn cho sinh viên**, tập trung vào 3 tính năng:

1. **Bộ lọc món theo ngân sách ví** — chỉ gợi ý món có `cost_estimate` nằm trong số tiền hiện có.
2. **Tủ lạnh thông minh** — nhập nhanh nguyên liệu bằng câu tự do, lưu vào `fridge_items`, gợi ý công thức khớp nhất.
3. **Kho công thức siêu tốc + dinh dưỡng lành mạnh** — món `<= 20 phút`, dụng cụ đơn giản, kcal/protein/carbs/fat theo từng khẩu phần.

## Stack

| Thành phần | Lựa chọn |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Validation | class-validator + class-transformer |
| Test | Jest 29 + ts-jest |

## Chạy nhanh

```bash
# 1. Cài dependency
cd backend
npm install

# 2. Tạo file môi trường
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux

# 3. Bật PostgreSQL (từ thư mục gốc dự án)
docker compose up -d postgres

# 4. Tạo bảng + seed dữ liệu mẫu
npm run prisma:migrate:deploy
npm run prisma:seed

# 5. Chạy dev server
npm run start:dev
```

API chạy tại `http://localhost:3000/api/v1`, kiểm tra nhanh:

```bash
curl http://localhost:3000/api/v1/health
```

> Nếu chưa có Docker, tạo database PostgreSQL tên `bepsv` và cập nhật `DATABASE_URL` trong `.env`.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | — | Chuỗi kết nối PostgreSQL của Prisma |
| `PORT` | `3000` | Cổng HTTP |
| `DEFAULT_USER_ID` | `demo-user` | User dùng khi không truyền `x-user-id` |
| `QUICK_RECIPE_MAX_MINUTES` | `20` | Giới hạn cứng của kho công thức siêu tốc |
| `HEALTHY_MAX_KCAL` | `600` | Ngưỡng kcal tối đa mỗi khẩu phần |
| `HEALTHY_MIN_PROTEIN` | `15` | Ngưỡng protein tối thiểu mỗi khẩu phần (g) |
| `FRIDGE_MATCH_THRESHOLD` | `0.6` | Tỷ lệ nguyên liệu chính tối thiểu để gợi ý |
| `GOOGLE_CLIENT_ID` | — | OAuth Client ID trên Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | — | OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3000/api/v1/auth/google/callback` | Redirect URI đã khai báo với Google |
| `JWT_SECRET` | chuỗi dev | Khoá ký JWT, **bắt buộc đổi khi deploy** |
| `JWT_EXPIRES_IN` | `7d` | Hạn của access token |
| `FRONTEND_URL` | `http://localhost:5173` | Nơi backend redirect về kèm token sau khi đăng nhập |

## Xác thực (Google OAuth + JWT)

Luồng đăng nhập:

1. Frontend mở `GET /api/v1/auth/google`.
2. Backend redirect sang Google; user chọn tài khoản.
3. Google gọi về `GET /api/v1/auth/google/callback`.
4. Backend tìm/tạo user theo `googleId` (hoặc liên kết theo email), ký JWT rồi redirect về:
   `FRONTEND_URL/auth/callback#access_token=...&token_type=Bearer&expires_in=7d`
5. Frontend đọc token trong fragment, gọi `GET /api/v1/auth/me` kèm header
   `Authorization: Bearer <token>` để lấy hồ sơ.

Token là JWT chứa `sub` (user id) và `email`, mặc định sống 7 ngày. Token nằm trong fragment (`#`) nên không bị gửi lên server hay lọt vào log/Referer.

Trong giai đoạn chuyển đổi, toàn bộ API dùng **JWT tuỳ chọn**:

- Có `Authorization: Bearer <token>` → `@CurrentUserId()` lấy `req.user.id`, token sai/hết hạn bị 401.
- Không có token → fallback header `x-user-id: demo-user` (hoặc `DEFAULT_USER_ID`).

Nhờ vậy frontend có thể tích hợp đăng nhập dần mà không làm gãy các API hiện có. Khi lên production, bỏ fallback header bằng cách đổi `OptionalJwtAuthGuard` thành guard bắt buộc.

Nếu chưa điền `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, server vẫn khởi động bình thường; riêng `GET /auth/google` trả **503** với thông báo chưa cấu hình.

### Endpoint auth

```http
GET /api/v1/auth/google           # bắt đầu đăng nhập Google
GET /api/v1/auth/google/callback  # Google gọi về, redirect kèm token
GET /api/v1/auth/me               # Bearer token -> hồ sơ user
```

## API

### Tính năng 1 — Lọc theo ngân sách

```http
GET /api/v1/recipes?budget=30000&meal=lunch&healthy=true&maxTime=20&limit=10
```

| Query | Kiểu | Ghi chú |
|---|---|---|
| `budget` | int (đồng) | Không truyền thì dùng `defaultBudget` trong hồ sơ |
| `meal` | `breakfast` \| `lunch` \| `dinner` | Lọc theo bữa |
| `healthy` | boolean | Bật chế độ dinh dưỡng lành mạnh |
| `maxTime` | int (phút) | Luôn bị chặn trên bởi `QUICK_RECIPE_MAX_MINUTES` |
| `limit` | int | Mặc định 50 |

Thứ tự ưu tiên: **khẩu vị (diet + độ cay) → món sát ngân sách → thời gian nấu → tên món**.
Món chứa nguyên liệu bị ghét và món không hợp chế độ ăn bị loại trước khi xếp hạng.

`GET /api/v1/recipes/:id` trả chi tiết kèm nguyên liệu, khối lượng, chi phí và dinh dưỡng từng nguyên liệu.

### Tính năng 2 — Tủ lạnh thông minh

```http
GET    /api/v1/fridge
POST   /api/v1/fridge                  { "ingredientId": "ing-trung-ga", "quantity": 2 }
DELETE /api/v1/fridge/:id              # nhận cả id bản ghi hoặc ingredientId
POST   /api/v1/fridge/parse            { "text": "2 quả trứng, ít rau muống", "save": true }
GET    /api/v1/fridge/suggestions?threshold=0.6&budget=30000&meal=lunch&maxTime=15
```

`POST /fridge/parse` hiểu:

- Tên có/không dấu, alias tiếng Việt và tiếng Anh (`trứng`, `trung`, `egg`).
- Số đếm: `2 quả`, `ba củ`, `nửa bó`, `ít rau`.
- Khối lượng: `200g`, `1,5 kg`, `1/2 củ`, `200ml`.
- Quy đổi gram sang đơn vị nguyên liệu nhờ `gramsPerUnit` (ví dụ `200g trứng` → 4 quả).
- Cộng dồn nguyên liệu trùng trong nhiều mệnh đề.

`save: true` ghi luôn vào `fridge_items` (upsert + cộng dồn số lượng).

**Điểm khớp** = số nguyên liệu chính đang có / tổng nguyên liệu chính (nếu công thức không đánh dấu nguyên liệu chính thì tính trên toàn bộ nguyên liệu). Gợi ý được lọc theo `threshold`, sắp xếp giảm dần theo điểm khớp, rồi tăng dần theo thời gian nấu và chi phí.

Mỗi gợi ý trả về `matchedIngredients` và `missingIngredients`, trong đó mỗi nguyên liệu có `requiredQuantity`, `availableQuantity`, `missingQuantity` và `status` (`enough` / `not_enough` / `missing`) để frontend hiển thị “cần mua thêm gì”.

### Tính năng 3 — Kho công thức siêu tốc

- Chỉ trả công thức `cookMinutes <= 20`, `difficulty = easy`, dụng cụ thuộc `nồi`, `chảo`, `nồi cơm điện`, `lò vi sóng`.
- Seed script gọi `assertQuickRecipe()` cho **mọi** công thức, seed sẽ fail nếu vi phạm.
- Dinh dưỡng được tính từ `quantity * gramsPerUnit / 100 * nutritionPer100g`, chia theo `servings`.
- `isHealthy` = `kcal <= healthyMaxKcal && protein >= healthyMinProtein` (mặc định `600 kcal` / `15 g`), có thể ghi đè theo từng user trong `user_preferences`.

## Mô hình dữ liệu

`backend/prisma/schema.prisma` gồm:

- `users`, `user_preferences` — khẩu vị, ngân sách mặc định, ngưỡng dinh dưỡng.
- `ingredients` — giá, đơn vị, `gramsPerUnit`, dinh dưỡng/100g, alias.
- `recipes`, `recipe_ingredients` — công thức, dụng cụ, bước nấu, tag bữa ăn/chế độ ăn.
- `fridge_items` — nguyên liệu hiện có của từng user (unique theo `userId + ingredientId`).

### Quyết định quan trọng: `cost_estimate` theo khẩu phần

`recipes.cost_estimate` lưu **chi phí mỗi khẩu phần** (`tổng chi phí nguyên liệu / servings`), không phải tổng chi phí cả nồi. Nhờ vậy bộ lọc “ví còn 15.000đ” vẫn đúng với công thức nấu 2–3 phần. Tổng chi phí nguyên liệu vẫn có trong chi tiết công thức (`estimatedTotalCost`).

Tương tự, `kcal/protein/carbs/fat` trên `recipes` là giá trị **mỗi khẩu phần**.

`RecipesService.recalculateMetrics()` tính lại toàn bộ (hoặc theo `ingredientId`) khi giá nguyên liệu thay đổi; hiện chưa mở thành endpoint.

## Kiểm thử

```bash
npm test            # 104 unit + integration test
npm run test:cov    # kèm báo cáo coverage
npm run typecheck   # tsc --noEmit
npm run build       # nest build
```

Các test không cần PostgreSQL: repository được trừu tượng hoá sau interface/token, test dùng implementation in-memory trong `src/test-support/`.

| File | Nội dung |
|---|---|
| `src/domain/*.spec.ts` | Bỏ dấu/tách câu, dinh dưỡng, ràng buộc công thức siêu tốc |
| `src/recipes/dto/*.spec.ts` | Validate query lọc món |
| `src/recipes/recipes.service.spec.ts` | Ngân sách, bữa ăn, khẩu vị, healthy, gợi ý tủ lạnh, tính lại metric |
| `src/fridge/fridge-parser.service.spec.ts` | Parser câu tự do, alias, đơn vị, phân số, cộng dồn |
| `src/fridge/dto/*.spec.ts` | Validate body/query tủ lạnh |
| `src/fridge/fridge.service.spec.ts` | CRUD tủ lạnh, parse/save, gợi ý |
| `src/ingredients/ingredients.service.spec.ts` | Tìm nguyên liệu không dấu |
| `src/auth/auth.service.spec.ts` | Tạo/liên kết user Google, phát JWT, lấy hồ sơ |
| `src/auth/auth.controller.spec.ts` | Redirect kèm token trong fragment, lấy hồ sơ |
| `src/auth/google.strategy.spec.ts` | Map Google profile sang user |
| `src/auth/jwt.strategy.spec.ts` | Xác thực payload JWT và load user |
| `src/auth/auth.guards.spec.ts` | Guard OAuth thiếu cấu hình, JWT tuỳ chọn |
| `src/common/decorators/current-user-id.decorator.spec.ts` | Ưu tiên `req.user.id`, fallback header |
| `src/domain/seed-data.spec.ts` | Validate toàn bộ 36 nguyên liệu + 20 công thức trong seed |
| `src/flow/fridge-budget-flow.spec.ts` | Luồng tích hợp: ví → nhập tủ lạnh → gợi ý → chi tiết → dọn tủ |

Kết quả hiện tại: **17 suites / 104 tests pass**.

## Cấu trúc thư mục

```text
backend/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/          # migration init đã tạo sẵn
│  ├─ seed-data.ts         # dữ liệu seed tách riêng để test không cần DB
│  └─ seed.ts              # 36 nguyên liệu, 20 công thức, user demo
├─ src/
│  ├─ auth/                # Google OAuth, JWT, guard, decorator user
│  ├─ config/              # env + AppConfig
│  ├─ domain/              # entity, enum, nutrition, constraint, text utils
│  ├─ infrastructure/prisma/   # repository implementations
│  ├─ recipes/             # tính năng 1 + 3
│  ├─ fridge/              # tính năng 2
│  ├─ ingredients/         # tra cứu nguyên liệu
│  ├─ flow/                # integration test xuyên tính năng
│  └─ test-support/        # fixture + in-memory repository
└─ docker-compose.yml (ở thư mục gốc dự án)
```

## Seed dữ liệu

`npm run prisma:seed` tạo:

- 36 nguyên liệu Việt Nam với giá/đơn vị/dinh dưỡng/alias.
- 20 công thức `<= 20 phút`, toàn bộ `easy`, dụng cụ cơ bản.
- User `demo-user` với ngân sách mặc định `30.000đ`, khẩu vị cay mức 1, mục tiêu `2000 kcal` / `60 g protein`.

Seed là idempotent (upsert), có thể chạy lại nhiều lần. Seed sẽ xoá tủ lạnh của user demo để trạng thái test luôn sạch.

## Việc còn lại

- Frontend (chưa triển khai), gồm trang `/auth/callback` đọc token từ fragment.
- Điền `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` thật vào `.env` để test đăng nhập.
- Bỏ fallback `x-user-id` khi lên production (đổi sang `JwtAuthGuard` bắt buộc).
- Endpoint quản trị công thức/nguyên liệu + gọi `recalculateMetrics()`.
- Lịch sử ăn uống, vòng quay chọn món và thông điệp vui (theo thiết kế gốc).
