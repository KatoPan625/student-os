# Student OS Gemini Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chatbot Gemini tiếng Việt tự thêm một buổi học hoặc deadline mỗi lượt vào tài khoản đang đăng nhập.

**Architecture:** Server Action xác minh phiên, gọi Gemini REST với JSON schema, kiểm tra kết quả bằng validator hiện có rồi lưu bằng Supabase client của người dùng. Panel chỉ giữ lịch sử ngắn trong bộ nhớ; không thêm bảng hay SDK.

**Tech Stack:** Next.js 16.4.2, React 19.3.1, TypeScript, Supabase JS/SSR hiện có, fetch, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-22-student-os-assistant-design.md`, đã được người dùng duyệt.

## Global Constraints

- Giữ repo dùng chung với Anti; Anti sửa components hiện có/globals.css/LoadingIndicator; Codex chỉ gắn chatbot sau khi Anti bàn giao.
- Không commit/push/deploy, không thêm dependency, không đọc key của Antigravity.
- GEMINI_API_KEY chỉ phía server; chỉ gửi nội dung chat và id/tên/mã môn cần thiết tới Google.
- Một bản ghi/lượt, không sửa/xóa qua chat, không lịch lặp, không lưu lịch sử vào DB.
- Tối đa 2.000 ký tự/tin, 8 lượt context; giờ Việt Nam; không tự bịa thông tin thiếu.
- RLS và xác thực giữ nguyên; validation không tin đầu ra model; thiếu key báo cấu hình.

## Review Focus

1. Model trả user_id/SQL/intent=xóa: không có đường thực thi, Task 1 kiểm tra.
2. Gửi trùng khi timeout: UUID thao tác cố định, chỉ một hàng được tạo, Task 2 kiểm tra.
3. Context do client sửa nhằm chọn môn tài khoản khác: server đọc lại môn thật, Task 1/2 kiểm tra.
4. Quá ngày/tháng và giờ VN sát nửa đêm: truyền giờ server rõ ràng, validator ngày hiện tại được tái sử dụng, Task 1 kiểm tra.
5. Quota/timeout/lỗi lưu không được báo thành công: Task 2 mock và Task 3 browser kiểm tra.

## Task 1: Hợp đồng chat, validation và Gemini

**Files:** tạo `src/lib/assistant.ts`, `tests/assistant.test.ts`; thêm kiểu `AssistantMessage` và `AssistantState` trong `src/lib/types.ts`.

**Interfaces:** `AssistantMessage={role:'user'|'assistant';text:string}`. `AssistantState={ok:boolean;message:string;created?:{entity:'task'|'class_session';id:string}}`. `validateAssistantInput(input:unknown):{requestId:string;messages:AssistantMessage[]}`. `parseAssistantReply(reply:unknown,subjects:Subject[])` trả lời hỏi thêm hoặc command tạo đã qua parseStudentForm. `requestAssistant(messages,subjects,now,fetcher=fetch)` gọi Gemini, không ghi database.

- [x] Viết test trước: input rỗng/2.001 ký tự/9 lượt bị từ chối; đầu ra type lạ và môn ngoài allowlist bị từ chối; deadline/ngày sai và session kết thúc sớm bị từ chối; clarification không tạo command. Assert qua Node assert. Chạy `node --test tests/assistant.test.ts`, xác nhận fail vì chưa có helper.
- [x] Implement input/output validator dùng UUID và parser FormData hiện có. Chỉ cho task/class_session, status task luôn todo; model không điều khiển owner/id thao tác. Giữ text phản hồi ngắn, không render HTML.
- [x] Implement requestAssistant qua REST generateContent + JSON schema, x-goog-api-key, timeout 20 giây và max output giới hạn. Model hiện tại là gemini-3.5-flash-lite; dùng temperature mặc định theo docs sau khi kiểm tra thật. Truyền thời điểm server và múi giờ; không gửi task/lịch cũ.
- [x] Mock fetch kiểm tra header/body không chứa secret khác/owner/email, JSON lỗi, 429/500, timeout và phản hồi thiếu candidates không thành công. Chạy `npm test`, tất cả pass.

## Task 2: Lưu dữ liệu thật, bảo vệ và chống trùng

**Files:** tạo `src/app/(student)/assistant-actions.ts`; tạo `src/lib/assistant-save.ts` cùng `tests/assistant-save.test.ts` nếu tách phần DB giúp test; sửa tối thiểu `src/app/(student)/actions.ts` chỉ khi tái sử dụng cần thiết, không đổi public contract mutateStudentData.

**Interfaces:** `sendAssistantMessage(input:{requestId:string;messages:AssistantMessage[]}):Promise<AssistantState>`. `saveAssistantRecord(client,userId,requestId,command)` insert id=requestId và owner server, xác nhận hàng đã tồn tại cùng owner/nội dung khi conflict; conflict khác nội dung trả lỗi.

- [x] Viết test với DB mock: gửi hai lần cùng UUID+nội dung chỉ có một hàng, conflict khác nội dung bị từ chối; insert lỗi không trả created; payload luôn có owner server. Chạy test thấy fail trước implementation.
- [x] Action requireUser trước đọc môn/API/DB; input được kiểm tra lại, giới hạn 10 lượt gọi/phút/tài khoản bằng Map process cho bản local (comment shortcut: shared limiter cần trước multi-instance deploy). Dọn entries hết hạn khi gọi; thiếu key không gọi provider.
- [x] Sau reply hợp lệ, dùng Supabase client người dùng insert theo entity allowlist; tái dùng parseStudentForm, không service role, không thay schema. Chỉ báo thành công sau DB xác nhận, revalidate bốn view. Không auto retry lần ghi chưa rõ kết quả. Reviewer tìm được lỗi mất phản hồi; đã thêm regression và giữ command gốc để retry.
- [x] Kiểm tra bằng mock lỗi provider/DB, môn người khác và đầu vào chưa đăng nhập không được gọi fetch hoặc ghi. `npm test`, lint/typecheck pass. RLS giữ nguyên, không có DDL mới.

## Task 3: Panel, loading, env và kiểm chứng

**Files:** tạo `src/components/student/assistant-panel.tsx`; sau Anti bàn giao sửa `student-screen.tsx`; sửa `src/app/(student)/loading.tsx`, `src/components/auth-form.tsx`, `.env.example`, README và docs/VERIFICATION. Mở rộng fixture chỉ để mock action chatbot, không fake route production.

**Interfaces:** `AssistantPanel()` gọi sendAssistantMessage, giữ context tối đa 8 lượt và request UUID ổn định khi gửi lại; LoadingIndicator theo brief Anti. router.refresh sau created.

- [x] Gắn nút mở chat, vùng hội thoại aria-live, ô nhập có nhãn, gửi pending/disabled, đóng/mở bàn phím. Panel đặt ở layout đăng nhập để giữ hội thoại khi chuyển trang. Không lưu chat ngoài bộ nhớ. Tách nội dung lỗi và kết quả đã lưu; lỗi giữ tin nhắn để sửa.
- [x] Tích hợp LoadingIndicator cho route, auth submit, chat; Anti xử lý form hiện có. Tôn trọng prefers-reduced-motion, không sleep giả.
- [x] Env mẫu thêm GEMINI_API_KEY/GEMINI_MODEL, README hướng dẫn cấu hình key. Người dùng yêu cầu Codex điền key vào env; đã thực hiện, Git ignore và kiểm tra không lộ trong source/tests/docs/client bundle. Nêu dữ liệu gửi tới Gemini, quota và giới hạn rate limiter local.
- [ ] Chạy `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`; browser kiểm tra UI mới, loading, panel lỗi thiếu key, hỏi lại/success bằng fixture. Khi có key, kiểm tra Gemini thật; chưa có key ghi rõ chưa kiểm chứng.
- [ ] Kiểm tra regression modal/form/mobile bằng fixture, lưu ảnh desktop/mobile, cập nhật VERIFICATION và báo giới hạn thực tế. Không tự commit/push/deploy.

## Thực hiện

Người dùng đã duyệt kế hoạch và chọn Codex triển khai trong chat hiện tại. Code và review fix đã thực hiện; hai bước kiểm chứng cuối chỉ đánh dấu hoàn tất khi browser được cấp quyền localhost và kiểm tra thực tế xong. Kết quả hiện tại ở docs/VERIFICATION.md.
