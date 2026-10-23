# Student OS — Báo cáo bàn giao giao diện (Handoff từ Antigravity)

Tài liệu này tổng kết toàn bộ phần việc triển khai giao diện theo phân công trong `docs/ANTIGRAVITY.md` và thiết kế tại `docs/superpowers/specs/2026-10-22-student-os-design.md`.

---

## 1. Danh sách file đã triển khai

Chỉ chỉnh sửa đúng phạm vi được giao (`src/app/globals.css` và `src/components/student/**`):

1. **`src/app/globals.css`**:
   - Hệ màu và biến CSS theo đúng brief: Sidebar xanh đậm (`#0d1726`), nền sáng ấm (`#f7f6f2`), điểm nhấn xanh lá (`#059669`) và cam (`#ea580c`), card có khoảng thở, font hệ thống (`var(--font-system)`).
   - Style toàn bộ trang xác thực của Codex: `.auth-page`, `.auth-card`, `.brand`, `.eyebrow`, `.auth-tabs`, `.auth-form`, `.form-field`, `.form-message` (cả trạng thái alert lỗi và status thành công), `.setup-note`.
   - Reset form & button an toàn: không phủ selector `button` làm vỡ layout; hỗ trợ `:focus-visible` với viền cam tương phản cao cho người dùng bàn phím.
   - CSS linh hoạt cho Shell, Metrics, Kanban 3 cột, Lịch học tháng/ngày, Dialog & Modal với animation nhẹ nhàng, responsive hoàn chỉnh trên mobile/tablet.

2. **`src/components/student/student-screen.tsx`**:
   - Entrypoint: `export function StudentScreen({view, data}: {view: StudentView; data: StudentData})`.
   - Layout responsive với Sidebar cố định trên desktop, thanh menu trượt kèm hamburger button và backdrop overlay trên mobile.
   - Điều hướng `Link` Next.js đến `/dashboard`, `/subjects`, `/tasks`, `/calendar` với hiển thị tab đang chọn (`active` & `aria-current="page"`).
   - Nút đăng xuất tích hợp Server Action: `<form action={signOut}><button type="submit">...</button></form>`.
   - Điều phối hiển thị 4 view chính tương ứng với tham số `view`.

3. **`src/components/student/dashboard-view.tsx`**:
   - Tích hợp `getDashboard(data, now)`.
   - 4 thẻ thống kê trực quan: Buổi học hôm nay, Bài tập quá hạn (cảnh báo đỏ nếu > 0), Hạn nộp 7 ngày tới, Tổng số môn học.
   - Cột trái: Lịch học hôm nay (kèm địa điểm, thời gian, empty state CTA) và Danh sách bài tập quá hạn (loại trừ các task đã Done).
   - Cột phải: Hạn nộp trong 7 ngày tới và Tiến độ theo môn học (tính `%` số bài hoàn thành; môn chưa có bài tập hiển thị rõ chữ *Chưa có bài tập* theo đúng spec).
   - Các nút CTA mở nhanh modal tạo bài tập, buổi học, môn học.

4. **`src/components/student/subjects-view.tsx`**:
   - Quản lý CRUD môn học (Tên môn, Mã môn, Màu sắc).
   - Thẻ môn học hiển thị dải màu nhận diện, mã môn, số lượng bài tập và buổi học liên kết.
   - Hỗ trợ Sửa môn học và Xóa môn học qua modal xác nhận.
   - Empty state thân thiện khi sinh viên chưa tạo môn học nào.

5. **`src/components/student/tasks-view.tsx`**:
   - Bảng Kanban 3 cột: **Cần làm** (`todo`), **Đang làm** (`doing`), **Đã xong** (`done`).
   - Thanh công cụ lọc theo môn học (tất cả hoặc từng môn cụ thể) kèm số đếm bài tập.
   - Mỗi thẻ bài tập hiển thị môn học, tiêu đề, mô tả, hạn nộp (`formatDateTime`), nhãn quá hạn (`⚠️ Quá hạn`), nhãn hoàn thành (`✓ Đã xong`).
   - Nút chuyển trạng thái nhanh (To do ⇄ Doing ⇄ Done) qua Server Action, tuân thủ nghiêm ngặt hợp đồng gửi đầy đủ các trường: `entity="task"`, `intent="save"`, `id`, `subject_id`, `title`, `description`, `due_at` (chuẩn local ISO), `status`.
   - Đầy đủ nút Sửa và Xóa (kèm xác nhận).

6. **`src/components/student/calendar-view.tsx`**:
   - Lịch học tháng bắt đầu từ Thứ Hai dựa trên `getMonthDays(year, month)`.
   - Chuyển tháng trước/sau và nút quay về "Hôm nay".
   - Phân biệt rõ ràng giữa **Buổi học** (`[Học]`) và **Deadline** (`[Hạn]` hoặc `[✓ Xong]`) bằng cả nhãn text và màu sắc. Task Done vẫn hiển thị với dấu gạch ngang/nhãn đã hoàn thành.
   - Bấm vào bất kỳ ngày nào để xem **Chi tiết ngày** (danh sách buổi học, danh sách deadline, nút tạo nhanh buổi học/bài tập cho ngày đó).
   - Hỗ trợ sửa/xóa trực tiếp sự kiện từ bảng chi tiết ngày.

7. **`src/components/student/subject-modal.tsx`**:
   - Modal tạo/sửa môn học với 8 màu gợi ý nhanh (preset swatches) kèm bộ chọn màu tùy ý.
   - Xử lý qua React 19 `useActionState(mutateStudentData, {ok: false, message: ''})`.
   - Khóa nút khi `pending`, hiển thị thông báo `aria-live="polite"`, giữ nguyên input khi lỗi.

8. **`src/components/student/task-modal.tsx`**:
   - Modal tạo/sửa bài tập: Chọn môn học, Tiêu đề, Hạn nộp (`type="datetime-local"`), Trạng thái, Mô tả.
   - Tự động điền ngày/giờ mặc định phù hợp (hạn cuối ngày, định dạng `YYYY-MM-DDTHH:mm`).

9. **`src/components/student/session-modal.tsx`**:
   - Modal tạo/sửa buổi học: Chọn môn học, Giờ bắt đầu, Giờ kết thúc, Địa điểm/Phòng học/Link Meet.
   - Tự động điền giờ học mẫu hợp lệ theo giờ Việt Nam.

10. **`src/components/student/confirm-modal.tsx`**:
    - Hộp thoại xác nhận xóa chung cho Subject, Task, ClassSession.
    - Cảnh báo rõ ràng việc môn học có dữ liệu phụ thuộc sẽ bị từ chối xóa từ phía server.

---

## 2. API và Helper đã sử dụng

- **Server Actions & Auth**:
  - `mutateStudentData(previous, form)` từ `@/app/(student)/actions`
  - `signOut` từ `@/app/login/actions`
- **Helpers từ `@/lib/study`**:
  - `localDateKey(iso)`: Chuyển đổi mốc thời gian sang chuỗi ngày `YYYY-MM-DD` theo múi giờ `Asia/Ho_Chi_Minh`.
  - `toLocalInput(iso)`: Định dạng chuỗi `YYYY-MM-DDTHH:mm` phục vụ thuộc tính `defaultValue` của `<input type="datetime-local">`.
  - `toUtc(local)`: Kiểm tra biên độ thời gian và ngày bắt đầu/kết thúc lịch.
  - `formatDateTime(iso)`: Định dạng hiển thị ngày giờ thân thiện tiếng Việt.
  - `getMonthDays(year, month)`: Lấy mảng các ngày trong lưới tháng (bắt đầu từ Thứ Hai).
  - `getDashboard(data, now)`: Tính toán số liệu thống kê, bài tập sắp tới, quá hạn và tiến độ môn học.
- **Types từ `@/lib/types`**:
  - `StudentView`, `StudentData`, `Subject`, `Task`, `TaskStatus`, `ClassSession`, `ActionState`.

---

## 3. Kiểm tra đã chạy

1. **Node Test Suite**:
   - Đã chạy `node --test tests/*.test.ts`.
   - Kết quả: **11/11 tests pass** (bao gồm timezone UTC+7, input validation, calendar boundaries, dashboard progress, overdue exclusions).
2. **TypeScript Compilation Check**:
   - Đã chạy `npx tsc --noEmit`.
   - Kết quả: **0 lỗi** typecheck trên toàn bộ project và các component vừa tạo.
3. **Accessibility & Form Behavior**:
   - Toàn bộ button, input, select và form action đều có nhãn/aria labels rõ ràng.
   - Trạng thái `disabled={pending}` được áp dụng cho mọi nút submit để chống double-click.
   - Giữ nguyên nội dung input khi action báo lỗi (`role="alert"`).
   - Form đóng và reset an toàn khi `state.ok === true` thông qua ref đối soát trạng thái (không gây vòng lặp render/lint).

---

## 4. Ghi chú bàn giao cho Codex

- Phần giao diện hoàn toàn độc lập, sẵn sàng tích hợp ngay với server component `src/app/(student)/[view]/page.tsx` và cơ chế session/Supabase của Codex.
- Đúng theo thỏa thuận, Antigravity **không** chạy `npm run build` toàn repo hoặc `npm run lint` tự động để không ghi đè vào tiến trình Codex đang hoàn thiện các file backend. Codex có thể tích hợp và chạy full test/build khi sẵn sàng.
