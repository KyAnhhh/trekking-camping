# Quản trị model AI — 21/10/2026

## Cập nhật mới nhất: khách chọn model, không phân công mặc định

Phần này thay thế các mô tả về model mặc định/phân công nhiệm vụ trong nhật ký bên dưới.

- Selector gọn nằm bên trái ô nhập chat; dùng chung component với trang planner. Gemini/Gemma công khai đều có thể được chọn cho cả hai luồng. Trên mobile selector rộng100px, ô nhập co giãn.
- Khách mới hoặc phiên cũ chưa chọn phải chọn model trước khi gửi; không tự chọn/fallback theo Admin. Lựa chọn cụ thể đã có được giữ khi reload. Đăng xuất/reset xóa lựa chọn cùng phiên.
- Planner gửi `modelId` trong JSON request và lưu trong nội dung lịch trình. Backend kiểm tra enabled/visible như chat; thiếu model trả400, model bị tắt/ẩn/ID giả trả409. Lịch trình cũ không có modelId vẫn đọc được.
- Admin chỉ còn Danh sách model và Hoạt động & phiên bản. Không có tab phân công nhiệm vụ. Các trường JSON cũ chatDefault/plannerDefault được đọc tương thích nhưng bỏ qua, trả/lưu null (kể cả restore); không dùng để chọn model. Không cần migration mới cho thay đổi này nếu migration quản trị AI trước đã áp dụng.
- Kho tri thức/embedding không thay đổi. Cho phép chọn không bảo đảm provider đáp ứng; lỗi mạng/quota vẫn cần xử lý riêng.
- Kiểm thử lần này: regression503 tests gồm502 pass/1 live skipped; ca planner truyền/lưu model mới chạy sau đạt, cùng5 ca planner cũ (không cộng lặp) → tổng503 test độc lập đạt,1 skipped. 18 browser checks API stub đạt, runtimeErrors=[]; phát hiện/sửa selector cũ còn sót gây ReferenceError. Không có bằng chứng DB/provider thật mới.
- Vite build chạy trực tiếp bằng `node node_modules/vite/bin/vite.js build` (npm wrapper trên máy trả exit1 không có diagnostic). Không sửa package/config hệ thống để né lỗi wrapper.

### Cập nhật timeout và nguồn

Chat dùng ngân sách provider chung 80 giây / tối đa 4 HTTP attempts qua các vòng tools. Gemma read timeout tối đa60s (giảm theo thời gian còn lại), Gemini25s; outer chat vẫn90s, frontend100s. Timeout socket không tự lặp lại trong cùng lượt. Timeout HTTP cấu hình riêng trên connection của worker, không thay cấu hình chung khi nhiều khách dùng đồng thời. Không bảo đảm provider luôn phản hồi; deadline được kiểm tra trước/sau HTTP, outer future vẫn là giới hạn chờ cuối.

Gemma4 gửi `thinkingConfig.thinkingLevel=minimal` theo tài liệu Google để tắt thinking bổ sung; chất lượng/latency thật chưa đánh giá. Nguồn: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api .

Prompt liệt kê chính xác mã nguồn RAG hiện tại, cấm mã khi nguồn rỗng/cấm dùng mã từ lịch sử cho lượt mới; DB/tool dùng link tour, không tự gắn mã RAG. Nếu còn mã nguồn lạ, không hiển thị câu AI hoặc proposal: trả thông báo rõ chưa xác minh và chỉ giữ thẻ tour đã truy vấn đúng điều kiện. Câu thông báo an toàn này được lưu vào history; không phải câu tư vấn model đã đạt. Không gọi AI bổ sung để sửa nguồn. Log chỉ model/count/mã nguồn sai, không prompt/nội dung riêng tư.

38 targeted tests đạt (0 skipped): mock timeout không retry, hai Gemma giữ model qua tool/retry và gửi thinking minimal, budget hết hạn/hết calls, timeout connection giảm theo thời gian còn lại, nguồn hợp lệ/không hợp lệ và planner regression. Chưa kiểm chứng độ trễ thực tế bằng provider thật.

### Sửa lỗi lưu lần đầu trả 503

GET trước đây trả cấu hình mặc định khi bảng có sẵn nhưng thiếu row id=1, trong khi PUT trả 503. PUT nay tự seed row bằng PostgreSQL `INSERT ... ON CONFLICT DO NOTHING`, đọc lại dưới khóa rồi kiểm tra revision và ghi audit trong cùng transaction. Không ghi đè cấu hình đã có. Đây là khởi tạo dữ liệu, không tự tạo/sửa schema: migration bên dưới vẫn cần nếu thiếu bảng/cột. Hai tests mới mô phỏng thiếu row và một writer khác đã lưu trước; không phải bằng chứng concurrency trên PostgreSQL thật.

## Triển khai

1. Sao lưu database và áp dụng thủ công `docs/sql/ai-model-management.sql` bằng công cụ PostgreSQL đang dùng, trước khi khởi động backend mới. Script không chứa secret, không xóa dữ liệu; tạo bảng cấu hình/lịch sử và thêm trường model/revision vào phiên/tin nhắn. **Lượt triển khai này chưa chạy migration trên database thực tế.** Không dùng Hibernate update để thay cho bước review/apply SQL.
2. Khởi động backend theo cách hiện có (`mvn spring-boot:run` trong backend), frontend (`npm run dev` trong frontend). Không cần package mới. Giữ GEMINI_API_KEY ở server; không thêm secret vào frontend.
3. Mở `/admin/ai-models` bằng tài khoản ADMIN. Danh sách Gemini ban đầu lấy từ GEMINI_MODELS hiện có; hai model Gemma được khai báo sẵn nhưng **disabled/hidden**. ID provider/endpoint không được sửa từ trình duyệt.
4. Kiểm thử với dữ liệu tổng hợp trong môi trường riêng trước khi bật Gemma. Checkbox xác nhận tương thích là **attestation của admin**, không tự gọi provider hoặc chứng minh chất lượng. Các model Gemini cũ giữ trạng thái được chấp nhận từ cấu hình hiện có; không có nghĩa chúng vừa được kiểm chứng live.
5. Bật model, cho khách chọn nếu cần; chọn mặc định tư vấn/lập lịch trình rồi lưu. Backend từ chối model công khai nhưng tắt, model bật chưa xác nhận và mặc định không hợp lệ. Tắt mặc định phải chọn thay thế trong cùng lần lưu.

## Nhiệm vụ và dữ liệu

- Chat/RAG: model được chọn đọc nguồn từ hệ thống retrieval hiện có, gọi công cụ đọc tour và đề xuất booking. Model không trực tiếp tạo đơn, giữ chỗ hoặc thanh toán.
- Planner: dùng model mặc định riêng, tiếp tục validation JSON và tour của PlannerService.
- Embedding: giữ TransformersEmbeddingModel local + PgVectorStore. Đổi model trả lời không đổi embedding. Đổi embedding/index chưa thuộc UI này.
- Mỗi lượt chốt model tại `ChatSessions.begin`; mọi vòng tools và transient retry dùng đúng ID đó. Không fallback sang model khác khi model đã được chọn. Admin thay cấu hình chỉ ảnh hưởng lượt tiếp theo; lựa chọn cụ thể đã bị tắt trả 409, không đổi ngầm.
- Lựa chọn lưu trong database theo phiên; phiên cũ mặc định null/revision0. Owner/token bảo vệ cả đọc và đổi lựa chọn. Busy/revision cũ trả 409. JWT không bắt buộc với phiên khách nhưng session token vẫn bắt buộc.
- Cấu hình được khóa khi lưu, kiểm tra expected revision, ghi audit gồm actor/time/snapshot. Restore tạo revision mới và validate lại, không sửa lịch sử.
- Thống kê chỉ trong bộ nhớ **instance hiện tại**, mất khi restart; đo lượt xử lý và lỗi HTTP, không phải số provider requests/token/chi phí. Không lưu prompt/secret trong thống kê.

## API

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/api/chat/models` | Public, chỉ model đang bật/công khai |
| POST | `/api/chat/sessions/{id}/state` | Owner + sessionToken trong body |
| PATCH | `/api/chat/sessions/{id}/settings` | Owner + sessionToken, modelId hoặc null, revision |
| POST | `/api/chat` | Contract cũ + settingsRevision; response thêm modelId |
| GET/PUT | `/api/admin/ai-models` | ADMIN; PUT `{revision, settings}` |
| GET | `/api/admin/ai-models/history` | ADMIN, 20 phiên bản gần nhất |
| POST | `/api/admin/ai-models/history/{revision}/restore` | ADMIN; body `{expectedRevision}` |
| GET | `/api/admin/ai-models/metrics` | ADMIN |

ApiResponse giữ nguyên. PATCH CORS chỉ mở tại path settings cho origins localhost5173/3000; không wildcard. ID model giả hoặc disabled bị backend từ chối.

## Hành vi trình duyệt

Widget và trang chat dùng chung selector, lịch sử và draft; reload khôi phục model/history từ server. Lỗi provider hiển thị riêng, không ghi như câu trả lời AI. Retry chỉ hiện sau lỗi HTTP xác định; không tự retry sau mất kết nối/abort vì server có thể đã lưu kết quả. **Dừng chờ chỉ hủy HTTP phía client, không bảo đảm hủy xử lý ở server**. Sau đó tải lại hội thoại để kiểm tra kết quả trước khi gửi lại. Chưa triển khai replay theo request ID; không tuyên bố idempotency cho arbitrary resubmission. Reset/đổi tài khoản chặn phản hồi muộn bằng generation guard.

## Bằng chứng đã chạy

- Maven: 498 tests tổng, **497 passed, 1 skipped** (live smoke opt-in), 0 failure/error. Bao gồm auth matrix, registry, session selection, cả hai Gemma với vòng tool và retry giữ model, chat/booking/planner regression. DB/provider giả lập; không phải kiểm chứng migration/PostgreSQL/provider thật.
- Frontend `npm run build`: đạt.
- `node --test tests/api-contracts.test.mjs`: 15 passed.
- Chrome `tests/ai-models-ui.mjs`: **14 checks đạt**, runtimeErrors=[], toàn bộ API stub; kiểm tra guest selector, reload, busy, model label, error/retry, mobile390px, focus, reset/late response, admin save/audit và embedding riêng. Các lần chạy sửa harness không cộng thêm số kiểm thử. Harness ban đầu chặn nhầm `/src/api`, xử lý OPTIONS như mutation và serialize DOM; đã sửa trước kết quả cuối.
- Không gọi AI thật, gửi email hoặc chạy migration/DB ứng dụng. Không bật công khai Gemma, không commit/push.

Lệnh backend đã dùng trên máy này:

```powershell
cd backend
mvn -o "-Dmaven.repo.local=C:/Users/thong/.m2/repository" "-Dtest=AiModelsTest,Chat*Test,ApiAuthorizationMatrixTest,Plan*Test" test
```

Browser test cần Vite localhost5177 và Chrome riêng debugging9224, không dùng profile thường. Test luôn chặn API bằng fixture; không dùng nó để kết luận backend/DB đạt.

## Còn cần nghiệm thu trước công khai

Áp dụng migration trên DB test, startup thật, kiểm tra ghi đồng thời/restore bằng PostgreSQL, rồi test provider thật (system instruction, tools, JSON planner, dẫn nguồn, thiếu nguồn, không bịa giá/chỗ). Đề xuất 4 ca × 2 Gemma, tối đa 16 calls gồm tool/retry, chỉ chạy sau khi duyệt ngân sách. Cấu hình SDK/pgvector hoặc quota cũ không được sửa bởi thay đổi này.

Nguồn API: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api . Hai Gemma dùng chung Gemini API phía server; bổ sung model không bảo đảm hết quota/quá tải.
