# Student OS

Dashboard học tập cá nhân bằng Next.js App Router, TypeScript và Supabase. Giao diện tiếng Việt, thời gian Asia/Ho_Chi_Minh (UTC+7).

## Chạy trên máy

Yêu cầu Node.js 24 trở lên và npm. Dùng npm nhất quán với package-lock.json.

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Chỉ sao chép mẫu env khi chưa có `.env.local`; không ghi đè cấu hình đã có.

Mở http://127.0.0.1:3000. Khi chưa cấu hình Supabase, trang đăng nhập sẽ hướng dẫn thiết lập và khóa submit; không có tài khoản hoặc dữ liệu giả.

## Cấu hình Supabase

Workspace hiện tại đã kết nối project [Student OS trong KatoPan](https://supabase.com/dashboard/project/awhsljpbmuzvpwlyptjp), vùng Singapore. Migration đã áp dụng, `.env.local` đã có URL/publishable key và được Git ignore; Site URL cùng hai callback bên dưới đã lưu. Không chạy lại migration hoặc sao chép đè env trong workspace này. Các bước sau dành cho máy/project mới.

1. Tạo một Supabase project riêng cho Student OS. Trong SQL Editor, chạy nguyên file `supabase/migrations/202610220001_student_os.sql` một lần. File tạo ba bảng mới; không chạy chồng lên database đã có các bảng cùng tên.
2. Trong Project Settings / API, lấy project URL và **publishable key**; điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` trong `.env.local`. Không dùng service-role hoặc secret key. Không gửi mật khẩu hay key bí mật qua chat/Git.
3. Đặt `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000` cho máy local. Khi deploy sau này, đổi thành origin HTTPS thực tế.
4. Trong Authentication / URL Configuration, đặt Site URL giống biến trên và thêm redirect URL `http://127.0.0.1:3000/auth/callback` cùng `http://127.0.0.1:3000/auth/callback?next=/reset-password`. Dùng đúng host/port khi truy cập để cookie PKCE khớp; tránh đổi giữa localhost và 127.0.0.1 khi xác nhận email.
5. Bật email/password provider và cấu hình xác nhận email phù hợp. Email Confirm signup / Reset password phải giữ link xác nhận mặc định `{{ .ConfirmationURL }}` để Supabase trả authorization code về callback. Liên kết PKCE cần mở cùng trình duyệt đã yêu cầu email. SMTP và giới hạn gửi thư phụ thuộc cấu hình Supabase của bạn.
6. Khởi động lại server sau khi sửa biến môi trường. Đăng ký, xác nhận email nếu được yêu cầu rồi đăng nhập.

Đăng nhập → tạo môn → tạo bài tập/deadline → chuyển To do/Doing/Done. Trang lịch hiển thị buổi học và deadline; buổi học tạo riêng theo từng ngày. Xóa môn chỉ được phép khi môn không còn bài tập/buổi học. Dashboard tính tiến độ từ trạng thái task; bài Done không bị tính quá hạn.

## Chatbot Gemini

Trong [Google AI Studio](https://aistudio.google.com/apikey), tạo API key riêng cho Student OS và tự điền `GEMINI_API_KEY` trong `.env.local`. Không gửi key qua chat hoặc đưa vào Git. `GEMINI_MODEL=gemini-3.5-flash-lite` là mặc định theo [tài liệu model chính thức](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite); có thể đổi thành model hỗ trợ JSON structured output mà tài khoản của bạn được sử dụng. Giữ temperature mặc định theo hướng dẫn Gemini 3 để tránh phản hồi lặp. Key này chỉ dùng phía server, không đặt tiền tố NEXT_PUBLIC_.

Khởi động lại server sau khi điền key. Với bản production local: dừng server, chạy `npm run build` rồi `npm start`. Với `npm run dev`, dừng/chạy lại lệnh dev.

Mở “Trợ lý học tập” sau đăng nhập, nhập ví dụ “Thêm deadline bài tập Toán ngày 24/10/2026 lúc 23h” hoặc “Thêm buổi học Toán ngày mai từ 8h đến 10h ở B203”. Môn phải được tạo trước. Mỗi lượt thêm một lịch hoặc deadline; thiếu thông tin sẽ hỏi lại. Kết quả ghi thành công mới cập nhật lịch/Kanban/dashboard. Khi lỗi chưa xác nhận lưu, dùng nút Thử lại cùng yêu cầu để kiểm tra, tránh tự tạo thêm bản khác.

Nội dung hội thoại ngắn cùng id/tên/mã môn của tài khoản được gửi tới Google Gemini để xử lý; không gửi email, token hay toàn bộ lịch/bài tập cũ. Chat chỉ giữ trong bộ nhớ tab. Gemini có thể hiểu sai ngày/giờ: kiểm tra thông tin đã tạo và sửa bằng biểu mẫu nếu cần. Không hỗ trợ sửa/xóa bằng chat, nhiều bản ghi trong một lượt hoặc lịch lặp.

Giới hạn bản local: 2.000 ký tự/tin, 8 lượt ngữ cảnh, 10 yêu cầu/phút/tài khoản và timeout Gemini 20 giây. Rate limit và cache chống lặp dùng bộ nhớ process; cần shared limiter/deduplication trước khi deploy nhiều instance. Hạn mức/chi phí Gemini phụ thuộc project/key của bạn; không tự bật billing hay tạo tài nguyên trả phí.

## Kiểm tra

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Test unit kiểm tra validation, callback redirect, chuyển UTC+7, lịch tháng và số liệu dashboard. Build thành công không chứng minh dịch vụ email hoặc RLS trên project của bạn hoạt động.

Kiểm tra UI độc lập khi chưa có Supabase:

```powershell
npm run test:ui:serve
```

Fixture chạy tại http://127.0.0.1:3101, bundle trực tiếp component thật với dữ liệu tổng hợp. CRUD action luôn trả lỗi; chatbot dùng các nhánh hỏi lại/lỗi/thành công giả lập có nhãn Fixture để kiểm tra UI. Nó không đăng nhập, không gọi Gemini, không đọc/ghi database và không nằm trong route ứng dụng. Chạy hàm trong `tests/ui/checks.playwright` bằng Playwright để kiểm tra giữ bản nháp khi lưu lỗi, mở bản ghi khác, lựa chọn môn/trạng thái, bàn phím hộp thoại và menu mobile. Sau khi sửa source, dừng/chạy lại fixture hoặc dùng `node scripts/ui-check.mjs --build-only`. Build fixture dùng webpack có sẵn trong Next; cần xem lại script nếu nâng phiên bản Next.

Audit lúc tạo dự án: dependency production không có cảnh báo. Full audit có 5 mục high trong chuỗi công cụ phát triển ESLint → fast-glob → micromatch → braces; chưa có bản sửa tương thích được registry đề xuất. Không hạ Next hoặc tắt lint chỉ để che cảnh báo.

Để kiểm tra database thật, tạo hai tài khoản **thử riêng biệt đã xác nhận email** trong một Supabase project thử đã chạy migration, rồi điền các biến SUPABASE_TEST_* và TEST_USER_* trong `.env.local`:

```powershell
npm run test:rls
```

Script chỉ dùng publishable key, đăng nhập hai tài khoản và kiểm tra CRUD, quyền sở hữu, chống liên kết chéo môn và chống xóa dây chuyền. Nó chỉ dọn các UUID được tạo trong chính lần chạy. Thiếu cấu hình trả exit code 1 và báo CHƯA CHẠY, không giả pass.

Có thể chạy nguyên file `supabase/tests/student_os_rls.sql` trong SQL Editor để kiểm tra policy và ràng buộc trực tiếp. File dùng hai user tạm, role `authenticated`/`anon`, rồi rollback toàn bộ dữ liệu thử. Kiểm tra này đã pass trên project hiện tại; nó không thay thế kiểm tra JWT, đăng nhập, email hay CRUD qua trình duyệt. Chi tiết ở `docs/VERIFICATION.md`.

Kiểm tra thủ công thêm: đăng ký/xác nhận email/reset mật khẩu, phiên hết hạn, tải lại sau thay đổi, lỗi mạng khi lưu, chuyển tháng/năm, thao tác bàn phím và màn hình điện thoại.

## Phối hợp với Antigravity

Brief: `docs/ANTIGRAVITY.md`. Antigravity sở hữu `src/components/student/**` và `src/app/globals.css`; Codex sở hữu backend/auth/routes/config/test. Không sửa cùng file trong lúc bên kia đang làm. Không tự commit, push hoặc deploy.

Chưa làm trong MVP: Pomodoro, ghi chú, email/Zalo nhắc deadline, lịch học lặp, kéo thả Kanban và quản lý nhóm.
