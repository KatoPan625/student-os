# Student OS — thiết kế MVP để cùng làm với Antigravity

Trạng thái: người dùng đã duyệt thiết kế và kế hoạch ngày 22/10/2026; mã MVP đã được triển khai cùng Antigravity. Kết quả kiểm tra và phần Supabase thật còn thiếu nằm trong `docs/VERIFICATION.md`.

## Mục tiêu

Ứng dụng web cá nhân giúp sinh viên biết hôm nay học gì, bài nào sắp đến hạn và việc nào đang làm. Đồng thời thực hành frontend, backend, database, authentication và deployment. Làm Student OS trước; Assignment Tracker cho nhóm là dự án sau.

Đã xác nhận từ yêu cầu: đăng nhập, môn học, task/deadline, Kanban To do → Doing → Done, dashboard và lịch hiển thị buổi học cùng deadline.

Giả định để duyệt: giao diện tiếng Việt, dùng được trên điện thoại và máy tính, dữ liệu riêng cho từng tài khoản, múi giờ hiển thị Asia/Ho_Chi_Minh. Chưa xây chức năng nhóm.

## Lựa chọn kỹ thuật

Đề xuất Next.js App Router + TypeScript + Supabase Auth và PostgreSQL. Dùng Next.js cho trang và xử lý yêu cầu phía server; Supabase quản lý tài khoản và lưu dữ liệu. Chưa cần backend riêng hoặc ORM.

Hai phương án khác: Next.js + PostgreSQL tự quản giúp thực hành vận hành nhiều hơn nhưng tăng việc cấu hình auth/database; bản chỉ lưu trong trình duyệt giúp dựng giao diện nhanh nhưng không đáp ứng đăng nhập và đồng bộ dữ liệu thật. Chọn Supabase để hoàn thành đủ MVP với ít thành phần hơn.

Repo hiện chưa có mã hoặc dependency. Khi triển khai, kiểm tra phiên bản tương thích và ghi lockfile; không mặc định phiên bản từ tài liệu là phiên bản đã cài.

## Luồng sử dụng và màn hình

1. Đăng ký/đăng nhập bằng email và mật khẩu; xác nhận email nếu cấu hình yêu cầu. Có đăng xuất và đặt lại mật khẩu. Thông báo lỗi rõ ràng, không làm mất dữ liệu biểu mẫu không nhạy cảm.
2. Tạo môn học với tên, mã môn tùy chọn và màu. Cho phép sửa; chỉ xóa môn chưa có task hoặc buổi học, tránh xóa dây chuyền dữ liệu.
3. Tạo task thuộc một môn: tiêu đề bắt buộc, mô tả tùy chọn, deadline gồm ngày và giờ, trạng thái mặc định To do. Có sửa, xóa sau xác nhận và lọc theo môn.
4. Kanban có ba cột To do, Doing, Done. Đổi trạng thái bằng nút hoặc menu thao tác được bằng bàn phím; kéo thả để sau. Chỉ cập nhật giao diện thành công khi server lưu được.
5. Thêm buổi học thuộc môn với giờ bắt đầu/kết thúc và địa điểm tùy chọn. MVP tạo từng buổi theo ngày cụ thể; lịch lặp theo tuần để sau.
6. Lịch tháng có chuyển tháng và chọn ngày xem chi tiết. Phân biệt buổi học với deadline bằng nhãn và màu; không chỉ dựa vào màu. Task Done vẫn hiện trong lịch với dấu đã hoàn thành.
7. Dashboard gồm lịch học hôm nay, task quá hạn, deadline trong 7 ngày tiếp theo và tiến độ mỗi môn = số task Done / tổng task. Môn chưa có task hiển thị “Chưa có bài tập”. Task Done không bị tính quá hạn.

Điều hướng: Tổng quan, Môn học, Bài tập, Lịch. Các trang có trạng thái đang tải, chưa có dữ liệu và lỗi có thể thử lại. Các trường có nhãn; thông báo lỗi và nút thao tác dùng được bằng bàn phím.

## Dữ liệu và phân quyền

- Tài khoản dùng Supabase Auth; chưa cần bảng hồ sơ riêng.
- `subjects`: id, user_id, name, code tùy chọn, color, created_at.
- `tasks`: id, user_id, subject_id, title, description tùy chọn, due_at, status, created_at.
- `class_sessions`: id, user_id, subject_id, starts_at, ends_at, location tùy chọn, created_at.

Thời điểm lưu bằng timestamptz, hiển thị theo múi giờ đã chọn. Kiểm tra ends_at > starts_at. Deadline quá khứ được phép để ghi nhận bài quá hạn. Tiêu đề/tên môn không được rỗng sau khi bỏ khoảng trắng; trạng thái chỉ nhận ba giá trị hợp lệ.

Bật Row Level Security trên cả ba bảng cho các thao tác đọc, tạo, sửa, xóa theo auth.uid(). Không tin user_id do trình duyệt gửi lên. Ràng buộc quan hệ phải ngăn task/buổi học gắn với môn của người khác, kể cả khi gọi API trực tiếp; có thể dùng khóa ngoại ghép (subject_id, user_id) tham chiếu subjects(id, user_id).

Mỗi thao tác server phải kiểm tra phiên đăng nhập, dữ liệu đầu vào và quyền sở hữu. Việc ẩn nút hoặc chặn trang không thay thế phân quyền. Không đưa service-role key vào trình duyệt; không ghi secret vào Git. Không hiển thị thông báo database thô cho người dùng.

## Phạm vi kiểm tra khi triển khai

- Luồng chính: đăng nhập → tạo môn → tạo task → đổi Doing/Done → dashboard và lịch phản ánh sau khi tải lại.
- Tạo buổi học; kiểm tra hai loại sự kiện cùng một ngày và chuyển tháng.
- Hai tài khoản A/B: B không đọc/sửa/xóa dữ liệu A và không tạo task hoặc buổi học trong môn A bằng API trực tiếp.
- Deadline sát nửa đêm theo giờ Việt Nam, task quá hạn, task Done, môn không có task, giờ kết thúc không hợp lệ.
- Khi lưu lỗi: báo lỗi, giữ nội dung người dùng nhập, không báo thành công giả.
- Chạy lint, typecheck, build và các kiểm tra tích hợp phù hợp. Đăng nhập/database thật cần dự án Supabase và cấu hình môi trường; không coi dữ liệu mẫu là bằng chứng backend hoạt động.

## Phối hợp Codex và Antigravity

Chưa xác minh được kết nối điều khiển trực tiếp với Antigravity. Không coi tài liệu này là tác vụ đã được giao hoặc đã chạy bên đó.

Mở cùng thư mục dự án trong Antigravity và cung cấp tài liệu này làm brief. Đề xuất phân công để duyệt: Antigravity phụ trách giao diện dashboard, môn học, Kanban và lịch; Codex phụ trách schema/RLS, auth, xử lý dữ liệu và kiểm tra tích hợp. Trước khi hai bên viết mã, chốt cấu trúc và danh sách file mỗi bên phụ trách; không sửa đồng thời cùng file.

Nội dung có thể gửi cho Antigravity:

> Cùng xây Student OS trong repo này theo docs/superpowers/specs/2026-10-22-student-os-design.md. Hãy đọc brief và hướng dẫn repo, đề xuất giao diện tiếng Việt responsive cùng danh sách file bạn sẽ phụ trách. Phối hợp với Codex để chốt hợp đồng dữ liệu trước khi triển khai; không tự thêm tính năng, thay stack hoặc sửa file bên Codex đang làm. Báo lại những gì đã thực sự chạy và kiểm tra.

## Để giai đoạn sau

Pomodoro, ghi chú, email/Zalo nhắc deadline, lịch học lặp, kéo thả Kanban, tệp đính kèm và chức năng nhóm. Không tạo trước bảng hoặc abstraction cho Assignment Tracker.

## Tài liệu đã đối chiếu qua Context7

- [Next.js: Server Actions và kiểm tra quyền](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/server-actions.mdx)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Điều kiện bắt đầu viết mã

Người dùng duyệt hoặc sửa bản thiết kế này. Sau đó viết kế hoạch triển khai ngắn, thống nhất cách chia việc với Antigravity rồi triển khai theo từng luồng hoàn chỉnh. Không commit, push hoặc triển khai công khai nếu chưa được người dùng yêu cầu.
