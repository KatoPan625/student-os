# Student OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thành Student OS cá nhân với đăng nhập, môn học, bài tập, Kanban, lịch và dashboard tiếng Việt.

**Architecture:** Next.js App Router đọc dữ liệu và thực hiện mutation phía server; Supabase cung cấp Auth, PostgreSQL và RLS. Các component giao diện nhận dữ liệu có kiểu và gọi Server Actions. Không có backend riêng, ORM hoặc dữ liệu mẫu thay cho backend thật.

**Tech Stack:** Next.js, React, TypeScript, Supabase JS + SSR, CSS, npm. Dùng Node.js test runner có sẵn; không thêm thư viện lịch, kéo thả hoặc test runner cho MVP.

**Spec:** `docs/superpowers/specs/2026-10-22-student-os-design.md` — người dùng đã duyệt ngày 22/10/2026.

**Kết quả:** đã triển khai và build local cùng Antigravity; 11 test unit và 4 kiểm tra UI đạt. Đã tạo Supabase Student OS trong KatoPan, áp migration, cấu hình env/auth URL và kiểm tra RLS trực tiếp trên database thật đạt. Các bước còn trống cần tài khoản/email thật và kiểm tra trình duyệt sau đăng nhập. Chi tiết: `docs/VERIFICATION.md`.

## Global Constraints

- Giao diện tiếng Việt, dùng được trên điện thoại và máy tính, dữ liệu riêng cho từng tài khoản, múi giờ hiển thị Asia/Ho_Chi_Minh.
- Thời điểm lưu bằng timestamptz; deadline gồm ngày và giờ. Kiểm tra ends_at > starts_at.
- Kanban có ba cột To do, Doing, Done; đổi trạng thái bằng nút hoặc menu thao tác được bằng bàn phím.
- Chỉ cập nhật giao diện thành công khi server lưu được. Khi lưu lỗi, giữ nội dung biểu mẫu không nhạy cảm.
- Chỉ xóa môn chưa có task hoặc buổi học, tránh xóa dây chuyền dữ liệu.
- Không commit, push hoặc triển khai công khai nếu chưa được người dùng yêu cầu.
- Không tạo trước bảng hoặc abstraction cho Assignment Tracker. Pomodoro, ghi chú, email/Zalo, lịch lặp, kéo thả và chức năng nhóm để sau.

## Review Focus

1. Task Done có deadline quá khứ: không tính quá hạn; vẫn hiện trong lịch với dấu hoàn thành. Kiểm tra ở Task 3.
2. Giờ Việt Nam sát nửa đêm hoặc chuyển tháng/năm: sự kiện xuất hiện đúng ngày, không phụ thuộc múi giờ máy/server. Kiểm tra ở Task 3.
3. Client gửi user_id hoặc subject_id của người khác: server và database từ chối, dữ liệu hai tài khoản không lẫn. Kiểm tra ở Task 2 và 4.
4. Phiên hết hạn, callback lỗi hoặc URL chuyển hướng ngoài ứng dụng: không cấp quyền và không chuyển tới website ngoài. Kiểm tra ở Task 1 và 4.
5. Lỗi mạng/lưu dữ liệu hoặc môn đang có dữ liệu: không báo thành công giả, không mất nội dung, không xóa dây chuyền. Kiểm tra ở Task 2–4.

## Hợp đồng chung và quyền sửa file

Các đường dẫn dưới đây tính từ gốc repo. Mọi thay đổi đều nằm trong repo hiện tại; không tạo worktree riêng vì cần phối hợp cùng thư mục với Antigravity.

- Codex: package/config/lockfile, `src/lib/**`, `src/proxy.ts`, `src/app/**` trừ `globals.css`, `supabase/**`, `tests/**`, `scripts/**`, `.env.example`, `.gitignore`, `README.md`, tài liệu.
- Antigravity: `src/components/student/**` và `src/app/globals.css`, sau khi xác nhận đã nhận brief. Codex không sửa các file này trong lúc Antigravity đang làm.
- Đã mở Antigravity và giao brief qua chat `Student OS Frontend Implementation`, nhận HANDOFF.md; giao diện đã tích hợp và sửa các finding của review.
- Hai bên dùng `src/lib/types.ts`: `TaskStatus = 'todo' | 'doing' | 'done'`; các tên trường giữ dạng snake_case như schema. `Subject`, `Task`, `ClassSession` có đúng các trường trong spec; cột không bắt buộc dùng `string | null`.
- `StudentData = { subjects: Subject[]; tasks: Task[]; classSessions: ClassSession[] }`.
- `ActionState = { ok: boolean; message: string; values?: Record<string, string> }`. Không trả password, token hoặc lỗi database thô trong state.
- Server Action `mutateStudentData(previous: ActionState, form: FormData): Promise<ActionState>` nhận `entity` (`subject`, `task`, `class_session`), `intent` (`save`, `delete`), `id` tùy chọn và các trường entity. Không nhận quyền sở hữu từ form. Đổi trạng thái task dùng intent save với đủ dữ liệu task hiện tại.
- `StudentView = 'dashboard' | 'subjects' | 'tasks' | 'calendar'`. Bốn URL tương ứng đi qua `src/app/(student)/[view]/page.tsx`; view không hợp lệ trả 404.
- Giao diện xuất `StudentScreen({ view, data }: { view: StudentView; data: StudentData })` từ `src/components/student/student-screen.tsx`. Component gọi Server Action ở `src/app/(student)/actions.ts` và dùng `src/lib/study.ts` cho tính ngày/tiến độ. Không gọi database trực tiếp hoặc tự cài auth khác.

## Task 1: Khởi tạo ứng dụng và hoàn thành luồng tài khoản

**Files:** `package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/{page.tsx,actions.ts}`, `src/app/auth/callback/route.ts`, `src/app/reset-password/{page.tsx,actions.ts}`, `src/components/auth-form.tsx`, `src/lib/{types.ts,auth.ts,auth-input.ts}`, `src/lib/supabase/{server.ts,session.ts}`, `src/proxy.ts`, `tests/auth-input.test.ts`.

**Interfaces:** `createClient()` trả Supabase server client dùng cookies; `requireUser()` trả `{ supabase, user }` đã xác minh bằng `auth.getUser()`, nếu không hợp lệ chuyển tới `/login`. `safeNext(value: string | null): '/dashboard' | '/reset-password'` chỉ nhận hai đích nội bộ này, mặc định `/dashboard`.

- [x] Khởi tạo package/config tối thiểu, chọn phiên bản stable tương thích tại lúc cài, lưu npm lockfile. Scripts: dev, build, start, lint, typecheck, test. Test dùng `node --test tests/*.test.ts` trên Node 24 đã có; cấu hình TypeScript cho test import `.ts`.
- [x] Viết `tests/auth-input.test.ts`: `safeNext('https://example.com') === '/dashboard'`, `safeNext('//example.com') === '/dashboard'`, `safeNext('/reset-password') === '/reset-password'`; biểu mẫu sai email hoặc mật khẩu thiếu bị từ chối, không trả password trong ActionState. Chạy npm test và xác nhận thất bại vì implementation chưa có.
- [x] Cài các dependency cần cho stack, tạo helper và luồng đăng ký, đăng nhập, đăng xuất, quên mật khẩu, callback PKCE và cập nhật mật khẩu. Callback chỉ cho đích allowlist. Dùng site URL từ cấu hình server để tạo email redirect, không tin Origin tùy ý từ client.
- [x] Refresh session trong proxy, chuyển tiếp cookies/cache headers đúng tài liệu SSR của phiên bản cài. Trang riêng tư không dùng shared caching. Không dùng getSession làm bằng chứng quyền truy cập server.
- [x] Khi thiếu cấu hình Supabase, trang công khai hiển thị hướng dẫn cấu hình ngắn, không giả đăng nhập. `.env.example` chỉ có tên biến và giá trị mẫu: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SITE_URL.
- [x] Chạy npm test, npm run typecheck, npm run lint và npm run build; kỳ vọng exit 0. Luồng email thực tế được kiểm tra lại ở Task 4 sau khi có Supabase.

## Task 2: Schema, RLS và xử lý dữ liệu

**Files:** `supabase/migrations/202610220001_student_os.sql`, `src/lib/{types.ts,validation.ts,data.ts}`, `src/app/(student)/{layout.tsx,actions.ts}`, `src/app/(student)/[view]/page.tsx`, `tests/validation.test.ts`, `scripts/check-rls.ts`.

**Interfaces:** `getStudentData(): Promise<StudentData>` chỉ trả dữ liệu tài khoản đã xác minh; dùng hợp đồng mutateStudentData phía trên. `parseStudentForm(form: FormData)` trả discriminated union theo entity/intent hoặc lỗi tiếng Việt; mỗi trường text được trim, trường date local được đổi từ giờ Việt Nam sang ISO UTC.

- [x] Viết test validation: tên/tiêu đề chỉ có khoảng trắng bị từ chối; status ngoài allowlist bị từ chối; deadline quá khứ hợp lệ; kết thúc bằng/trước bắt đầu bị từ chối; UUID sai bị từ chối; thời điểm không có thật như 30/2 bị từ chối. Chạy npm test để thấy các ca này chưa có implementation.
- [x] Viết và áp migration vào project Student OS mới: ba bảng theo spec, UUID khóa chính, NOT NULL/CHECK phù hợp, index user_id và cột khóa ngoại. subjects có UNIQUE(id,user_id); tasks và class_sessions dùng FK ghép (subject_id,user_id), không cascade khi xóa môn. Bật RLS và bốn policy CRUD cho authenticated theo auth.uid(), UPDATE kiểm tra cả USING và WITH CHECK.
- [x] Implement parser và Server Actions: requireUser ở mỗi lần đọc/ghi, đặt user_id từ phiên, truy vấn mutation kèm user_id, trả lỗi an toàn. Chỉ báo thành công khi có bản ghi được ghi/xóa; ID không tồn tại không được báo thành công. Revalidate bốn view sau mutation thành công. Giữ values không nhạy cảm khi thất bại.
- [x] Viết script tích hợp với hai tài khoản thử A/B: A tạo môn/task/buổi học; B không đọc/sửa/xóa hoặc liên kết vào môn A; A không đổi owner; xóa môn đang có dữ liệu bị từ chối. Assert dữ liệu A còn nguyên sau các yêu cầu B và assert không có bản ghi trái quyền. Cleanup chỉ các UUID do chính lần chạy tạo, không xóa dữ liệu có sẵn.
- [x] Chạy npm test, typecheck và lint, kỳ vọng exit 0. Chạy script RLS khi có cấu hình thật; thiếu cấu hình phải báo chưa chạy, không tính là pass. Không áp migration vào database có dữ liệu ngoài phạm vi được cho phép.

## Task 3: Dashboard, môn học, Kanban và lịch với Antigravity

**Files:** Codex: `src/lib/study.ts`, `tests/study.test.ts`; Antigravity: `src/components/student/{student-screen.tsx,overview.tsx,subjects.tsx,tasks.tsx,calendar.tsx,record-form.tsx}`, `src/app/globals.css`.

**Interfaces:** `localDateKey(iso: string): string` trả YYYY-MM-DD theo Asia/Ho_Chi_Minh; `toUtc(local: string): string` chuyển input datetime-local giờ Việt Nam sang ISO UTC sau validation; `getDashboard(data: StudentData, now: Date)` trả `{ todayClasses, overdueTasks, upcomingTasks, progress }`; `getMonthDays(year: number, month: number): string[]` dùng month 1–12, trả các ô ngày theo tuần bắt đầu thứ Hai, đủ hàng tuần.

- [x] Viết test: 2026-10-22T17:30:00Z thuộc ngày 2026-10-23; input 2026-10-23T00:30 đổi thành cùng thời điểm UTC; Done quá hạn không vào overdueTasks; task đúng thời điểm now không quá hạn; upcoming tính từ now đến dưới now + 7 ngày; môn trống không chia cho 0; lịch tháng 2 năm nhuận và chuyển tháng 12 → 1 có ô ngày đúng. Chạy npm test và thấy fail trước implementation.
- [x] Implement study.ts theo các kiểu đã chốt. Dashboard sắp xếp buổi học theo giờ, task theo deadline; tiến độ trả done/total và null phần trăm cho môn không có task. Hoàn thành test trước khi bàn giao helper cho Antigravity.
- [x] Theo yêu cầu mới của người dùng, Codex tự mở Antigravity, tạo project từ đúng thư mục và gửi brief/hợp đồng/phạm vi file qua chat GUI. Antigravity triển khai giao diện tiếng Việt responsive, menu điều hướng, form thêm/sửa, xác nhận xóa, lọc môn, ba cột Kanban và lịch tháng/chọn ngày; đã nhận HANDOFF.md.
- [x] Giao diện dùng các helper ngày chung; lịch có cả task Done và buổi học, phân biệt bằng nhãn. Loading, empty, error, pending rõ ràng; khóa submit trong khi lưu; không xóa nội dung form nếu action thất bại. Không nhúng dữ liệu mẫu vào luồng dữ liệu thật.
- [x] Kiểm tra bàn phím, nhãn form, focus, giữ bản nháp khi lỗi và desktop/mobile bằng fixture độc lập. Test, lint, typecheck và build đều pass sau khi nhận file giao diện.
- [ ] Với Supabase thật, kiểm tra task đổi trạng thái rồi tải lại vẫn giữ trạng thái.

## Task 4: Tích hợp, hướng dẫn chạy và kiểm tra thực tế

**Files:** `README.md`, `.env.example`, `scripts/check-rls.ts`; sửa lỗi đúng file bên sở hữu sau khi thống nhất, cập nhật checkbox trong kế hoạch.

**Interfaces:** `npm run test:rls` chạy script RLS, lấy SUPABASE_TEST_URL, SUPABASE_TEST_PUBLISHABLE_KEY và email/password A/B từ môi trường của người chạy. Không cần hoặc sử dụng service-role key trong script.

- [x] README hướng dẫn npm ci, cấu hình env, tạo Supabase project, áp migration, cấu hình Site URL/redirect allowlist và email confirmation/recovery, npm run dev và các lệnh kiểm tra. Dữ liệu thử dùng tài khoản riêng; không đưa thông tin đăng nhập vào repo.
- [x] Tạo project trong KatoPan theo lựa chọn người dùng, áp migration, điền env được Git ignore, lưu Site URL/callback bằng Brave và build lại production.
- [x] Kiểm tra RLS/constraints thật qua `supabase/tests/student_os_rls.sql`, tất cả assert pass và fixtures rollback; Data API thật kết nối được với publishable key, anon không thấy dữ liệu riêng. Chưa thay thế kiểm tra JWT/email/tài khoản thật ở bước dưới.
- [ ] Khi có Supabase, chạy full luồng hai tài khoản và script RLS; xác nhận mọi assert pass. Kiểm tra đăng ký/xác nhận email, đăng xuất, reset mật khẩu, phiên hết hạn và callback sai code. Ghi rõ phần chưa chạy nếu thiếu dịch vụ hoặc tài khoản.
- [ ] Browser: tạo môn → task → Doing → Done → lịch/dashboard → tải lại; tạo hai loại sự kiện cùng ngày, chuyển tháng; tạo và sửa buổi học; xóa task sau xác nhận. Mô phỏng request lưu lỗi và kiểm tra biểu mẫu không mất nội dung, không báo thành công.
- [x] Chạy npm test, npm run lint, npm run typecheck, npm run build và kiểm tra git diff không có secret hoặc thay đổi ngoài phạm vi. Không tự commit/push/deploy.
- [x] Báo kết quả thực tế, file quan trọng, lệnh đã chạy và phần bị chặn. Nếu Antigravity chưa bàn giao, ghi rõ phần giao diện chưa hoàn thành; không gọi toàn MVP là hoàn thành.

## Ghi chú môi trường đã kiểm tra

Repo chưa có commit. Node v24.21.0 và npm 11.19.0 có sẵn; dependency đã pin trong package-lock. Không dùng Docker. Supabase thật và giao diện Antigravity đã tích hợp; production local chạy tại http://127.0.0.1:3000.
