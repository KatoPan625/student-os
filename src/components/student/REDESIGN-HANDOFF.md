# Student OS — Báo cáo tái thiết kế giao diện & Loading (Redesign Handoff)

Báo cáo bàn giao cho Codex và người dùng theo yêu cầu tại `docs/ANTIGRAVITY-REDESIGN.md`.

---

## 1. Danh sách file đã tạo và chỉnh sửa

Thuộc phạm vi sở hữu của Antigravity (`src/components/student/**` và `src/app/globals.css`):

1. **`src/app/globals.css`**:
   - Thiết lập bảng màu tối giản:
     - **Charcoal / Đen**: `#24211f` (text chính, sidebar, tiêu đề)
     - **Trắng ấm**: `#faf9f6` (card, modal, dialog)
     - **Beige**: `#f2eee8` (nền trang, kanban column, filter bar)
     - **Nâu ấm**: `#805f46` (màu điểm nhấn chính, nút CTA, active indicator, focus ring)
     - **Viền nhẹ**: `#e3ddd4` (đường viền thanh mảnh, ít bóng)
   - Màu trạng thái tiết chế và luôn có nhãn text rõ ràng:
     - Hoàn thành (Done): `#2e573a` trên nền `#edf4ee`
     - Quá hạn (Overdue): `#8a2c26` trên nền `#faeceb`
     - Đang làm (Doing): `#7a501a` trên nền `#fcf5ea`
   - Animation loading spinner mượt mà với `@media (prefers-reduced-motion: reduce)` để tắt quay và bảo toàn thông tin trạng thái.
   - Sửa toàn bộ CSS cho các trang auth (`.auth-page`, `.auth-card`, `.brand`, `.eyebrow`, `.auth-tabs`, `.auth-form`, `.form-field`, `.form-message`, `.setup-note`) đồng bộ bảng màu.
   - Chuẩn bị đầy đủ CSS cho Gemini Assistant theo brief: `.assistant-panel`, `.assistant-header`, `.assistant-messages`, `.assistant-message`, `.assistant-composer`, `.assistant-result`, `.assistant-launcher`.
   - Ngăn rò rỉ focus trên mobile khi đóng sidebar (`visibility: hidden; pointer-events: none;`).

2. **`src/components/student/loading-indicator.tsx`**:
   - Xuất component `LoadingIndicator({ label = 'Đang tải…', compact = false })`.
   - SVG spinner có `aria-hidden="true"`, nhãn trạng thái có `role="status"` và `aria-live="polite"`.
   - Chế độ `compact={true}` cho các nút bấm / pill chuyển trạng thái; chế độ `compact={false}` cho loading dạng block.

3. **`src/components/student/icons.tsx`**:
   - Bộ icon SVG nét đơn đồng nhất (`stroke="currentColor" strokeWidth="1.75"`), thay thế toàn bộ emoji ở thanh điều hướng và các nút thao tác.
   - Không cài thêm bất kỳ package icon ngoài nào.

4. **`src/components/student/student-screen.tsx`**:
   - Tích hợp bộ icon SVG nét đơn (`IconDashboard`, `IconSubjects`, `IconTasks`, `IconCalendar`, `IconLogout`, `IconMenu`, `IconClose`).
   - Giữ sidebar đóng không nhận focus bàn phím trên mobile.

5. **`src/components/student/dashboard-view.tsx`**:
   - Bố cục tối giản, phân cấp typography rõ ràng, không dùng ảnh trang trí hay gradient chói lóa.
   - Thống kê 4 chỉ số dễ quét, ưu tiên Lịch học hôm nay và Bài tập sắp tới.
   - Empty state tinh gọn với nút CTA trực tiếp.
   - Thay emoji bằng các biểu tượng SVG tương ứng.

6. **`src/components/student/subjects-view.tsx`**:
   - Thẻ môn học tối giản với dải màu nhận diện mảnh, mã môn và số lượng bài tập/buổi học.
   - Nút Sửa và Xóa dùng icon SVG nét đơn.
   - Giữ nguyên tích hợp `SubjectModal` và `ConfirmModal`.

7. **`src/components/student/tasks-view.tsx`**:
   - Bảng Kanban 3 cột phẳng, viền nhẹ, nền cột beige sạch sẽ.
   - Gắn `LoadingIndicator` vào các nút chuyển trạng thái nhanh (`QuickStatusButton`) khi `pending`.
   - Gửi đầy đủ các trường dữ liệu đến `mutateStudentData` khi đổi trạng thái.

8. **`src/components/student/calendar-view.tsx`**:
   - Lịch tháng Thứ Hai đến Chủ Nhật, nút chuyển tháng, ngày hôm nay và chọn ngày.
   - Phân biệt buổi học (`[Học]`) và hạn nộp (`[Hạn]`, `[✓ Xong]`) bằng cả nhãn chữ và viền màu.
   - Bảng chi tiết ngày hiển thị rõ ràng danh sách buổi học và deadline.

9. **`src/components/student/subject-modal.tsx`**, **`task-modal.tsx`**, **`session-modal.tsx`**, **`confirm-modal.tsx`**:
   - Bảo toàn toàn bộ fix vòng đời của Codex: dùng `Modal` (`<dialog>` native, `showModal()`, focus restore, ESC/click backdrop), unmount key (`key={props...}`), và `onReset={(e) => e.preventDefault()}`.
   - Gắn `LoadingIndicator` vào các nút submit khi `pending` (thay vì chữ tĩnh).
   - Bộ màu preset trong `subject-modal.tsx` chuyển sang các gam màu ấm, trầm nhã nhặn.

---

## 2. Loading Indicator đã gắn

- `SubjectModal`: nút submit chuyển thành `<LoadingIndicator compact label="Đang lưu…" />` khi đang gửi.
- `TaskModal`: nút submit chuyển thành `<LoadingIndicator compact label="Đang lưu…" />` khi đang gửi.
- `SessionModal`: nút submit chuyển thành `<LoadingIndicator compact label="Đang lưu…" />` khi đang gửi.
- `ConfirmModal`: nút xác nhận xóa chuyển thành `<LoadingIndicator compact label="Đang xóa…" />` khi đang xóa.
- `QuickStatusButton` (Kanban): hiển thị `<LoadingIndicator compact label="Đang lưu…" />` trong thời gian pending của Server Action.

---

## 3. Kiểm tra đã thực hiện

1. **TypeScript Typecheck (`npx tsc --noEmit`)**:
   - Thành công với **0 lỗi** typecheck trên toàn bộ dự án.
2. **Node Test Suite (`node --test tests/*.test.ts`)**:
   - **14/14 tests passed** (bao gồm cả các bài test mới cho chatbot Gemini mà Codex vừa bổ sung).
3. **Responsive & Accessibility**:
   - Layout co giãn tốt ở độ rộng từ 390px (mobile) đến desktop màn hình lớn mà không bị tràn ngang.
   - Tương phản màu chữ đáp ứng chuẩn hiển thị, viền focus visible bằng gam nâu ấm rõ ràng.

---

## 4. Giới hạn & Bàn giao cho Codex

- Không thay đổi hợp đồng `StudentScreen`, `mutateStudentData`, hay database schema.
- CSS cho Gemini Assistant đã sẵn sàng theo đúng tên class được yêu cầu; không tạo component chatbot giả lập. Codex có thể nối với backend Gemini theo tiến độ.
