# Student OS — giao diện tối giản và loading

Người dùng yêu cầu nhờ Antigravity thiết kế đẹp hơn, thêm loading icon; đã chọn gam tối giản đen, trắng, nâu/be và cho phép Codex điều khiển Windows gửi brief này. Đây là yêu cầu mới thay thế bảng màu xanh/cam ở brief cũ. Triển khai phần giao diện/loading ngay.

## Phạm vi

- Chỉ sửa `src/components/student/**` và `src/app/globals.css`.
- Codex sở hữu auth, backend, routes, tests, cấu hình và chatbot Gemini. Không sửa các phần đó; không cài dependency, không đọc secret/env, không commit/push/deploy, không spawn agent.
- Đọc source hiện tại trước khi sửa: Codex đã sửa vòng đời modal/form sau lần bàn giao trước. Giữ `modal.tsx` dùng native dialog, focus/ESC/restore focus; giữ unmount/key của form và `onReset` chống mất lựa chọn sau lỗi. Giữ sidebar đóng không nhận focus trên mobile.

## Thiết kế

- Bảng màu: charcoal/đen #24211f, trắng ấm #faf9f6, nền beige #f2eee8, nâu #805f46, viền #e3ddd4. Tránh gradient xanh/cam nổi. Màu trạng thái dùng tiết chế và luôn có nhãn.
- Dashboard, môn, Kanban, lịch, modal và auth CSS đồng bộ; card thoáng, typography rõ thứ bậc, đường viền nhẹ, ít bóng. Tạo bố cục có chủ đích, không chỉ thay biến màu.
- Thay icon emoji điều hướng/chức năng bằng SVG nét đơn đồng nhất nếu có thể; không thêm package icon.
- Dashboard có phần mở đầu gọn, CTA chính rõ, chỉ số dễ quét, lịch hôm nay và deadline ưu tiên. Không tự bịa dữ liệu, tên người dùng hoặc lịch mẫu.
- Mobile 390px và desktop đều dùng được, không tràn ngang. Giữ nhãn, tương phản và focus bàn phím.

## Loading

- Tạo `src/components/student/loading-indicator.tsx`, export `LoadingIndicator({label = 'Đang tải…', compact = false}: {label?: string; compact?: boolean})`.
- Component không bắt buộc client; dùng CSS spinner/SVG, icon aria-hidden và text role=status. Có prefers-reduced-motion để tắt quay, giữ nội dung trạng thái.
- Codex sẽ gắn component vào route loading và auth submit; Anti gắn spinner vào các form pending và chuyển trạng thái task trong phạm vi sở hữu. Không thêm thời gian chờ giả, không báo loading mãi sau lỗi.
- Chuẩn bị CSS `.assistant-panel`, `.assistant-header`, `.assistant-messages`, `.assistant-message`, `.assistant-composer`, `.assistant-result`, `.assistant-launcher` cùng palette. Chưa tạo chatbot giả hoặc nút gọi tới backend chưa tồn tại; Codex sẽ nối Gemini.

## Bàn giao

Ghi `src/components/student/REDESIGN-HANDOFF.md`: file sửa, lựa chọn thiết kế, loading đã gắn, kiểm tra đã chạy, giới hạn. Không build/lint toàn repo khi Codex đang chỉnh file. Không đổi hợp đồng StudentScreen, mutateStudentData hoặc schema.
