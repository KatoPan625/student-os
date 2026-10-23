# Student OS — chatbot Gemini tạo lịch và deadline

Ngày 22/10/2026. Trạng thái: người dùng đã duyệt thiết kế chatbot qua câu trả lời “Duyệt thiết kế chatbot”. Người dùng chọn Gemini API và giao diện đen/trắng/nâu tối giản. Giao diện/loading được giao riêng cho Antigravity.

## Mục tiêu và hành vi

Người dùng nhập yêu cầu tiếng Việt trong cửa sổ chat, ví dụ “Thêm buổi học Toán ngày 24/10/2026 từ 8h đến 10h ở B203” hoặc “Thêm deadline bài tập Toán ngày mai 23h”. Khi thông tin đầy đủ, chatbot tự tạo đúng một buổi học hoặc bài tập trong tài khoản đang đăng nhập và báo kết quả đã lưu. Lịch, dashboard và Kanban cập nhật sau thành công.

Mỗi lượt tạo tối đa một bản ghi để tái sử dụng action hiện tại và tránh tình trạng chỉ lưu được một phần của yêu cầu nhiều bản ghi. Nếu người dùng yêu cầu nhiều bản ghi, trợ lý hỏi họ chọn một việc trước, không âm thầm bỏ các việc còn lại. Chưa hỗ trợ lịch lặp, sửa/xóa bằng chat, file đính kèm, tìm kiếm web hoặc lưu lịch sử chat vào database.

Nếu thiếu môn, ngày, giờ bắt đầu/kết thúc hoặc deadline, chatbot hỏi lại và không ghi dữ liệu. Môn được chọn trong các môn thật thuộc tài khoản; nếu tên trùng thì hỏi để phân biệt. Môn chưa có thì hướng dẫn tạo môn bằng giao diện hiện tại. Các ngày tương đối được tính theo Asia/Ho_Chi_Minh từ giờ server cung cấp; ngày không có năm phải được diễn giải rõ trong kết quả. Không suy đoán giờ kết thúc hoặc tự đổi ngày quá khứ sang tương lai.

## Các lựa chọn đã cân nhắc

1. Gemini REST từ Next.js server, đầu ra JSON có schema, validation lại rồi lưu bằng quyền Supabase của người dùng: lựa chọn đề xuất, không cần dependency hay backend mới.
2. SDK/agent framework và tool executor tổng quát: tăng dependency và phạm vi không cần cho hai thao tác hiện tại.
3. Parser câu mẫu: không cần key nhưng không đáp ứng mong muốn dùng Gemini hiểu tiếng Việt.

## Luồng kỹ thuật

- Thêm panel chatbot trong shell sau đăng nhập, giữ lịch sử ngắn trong bộ nhớ tab; không localStorage và không bảng chat mới. Hiển thị rõ tin nhắn và tên môn cần thiết được gửi tới Gemini.
- Server Action xác minh phiên bằng requireUser, kiểm tra số lượt/kích thước nội dung trước khi gọi API; chỉ lấy id/tên/mã môn thuộc tài khoản. Không gửi email, token, khóa, danh sách task hoặc lịch cũ tới Gemini.
- Gọi generateContent bằng fetch có timeout, API key trong header x-goog-api-key. GEMINI_API_KEY và GEMINI_MODEL là biến server, không có NEXT_PUBLIC. Mẫu env/README hướng dẫn người dùng tự điền key; thiếu key trả thông báo cấu hình, không có câu trả lời giả.
- JSON output có một trong ba loại: trả lời/hỏi thêm, tạo task, tạo class_session. Không nhận SQL, tên bảng, user_id hoặc thao tác tùy ý do model sinh. Giới hạn 2.000 ký tự/lượt, tối đa 8 lượt ngữ cảnh và phản hồi ngắn; chặn submit khi đang xử lý.
- Validation thuần chuyển đầu ra không tin cậy qua parseStudentForm hiện có, xác minh subject_id nằm trong các môn đã đọc, chỉ cho intent=create và status task ban đầu todo. Không cho model sửa/xóa hoặc đặt owner.
- Tái sử dụng mutation hiện có để lưu, owner lấy từ phiên và RLS vẫn có hiệu lực. Không dùng service-role, không đổi schema/RLS. Dùng mã thao tác UUID cố định cho mỗi lượt để chống tạo trùng khi cùng yêu cầu được gửi lại; chỉ báo thành công sau khi database xác nhận. Revalidate bốn view sau lưu.
- Giới hạn tần suất gọi Gemini theo tài khoản bằng bộ nhớ process cho bản local; ghi rõ giới hạn này trong source/README và yêu cầu shared limiter trước khi deploy nhiều instance. Không quảng bá bản này như đã sẵn sàng production công khai.
- Dùng LoadingIndicator chung cho đang phân tích và đang lưu; lỗi API/quota/timeout/JSON/validation/database được báo an toàn, giữ lời nhắn để sửa. Không tự retry ghi dữ liệu sau lỗi chưa rõ kết quả.

## Phân công và phạm vi file

- Antigravity: components giao diện hiện có, globals.css, LoadingIndicator và CSS panel. Giữ các regression fix của modal/form/mobile.
- Codex: helper Gemini/validator và test; action chatbot; thay đổi tối thiểu action lưu để nhận id tạo do server cấp; component chat mới sau khi Anti bàn giao; route/auth loading, env mẫu, README và xác minh.
- Không commit/push/deploy. Không đọc hoặc chuyển khóa riêng của Antigravity sang ứng dụng Student OS; người dùng cung cấp Gemini key riêng qua env.

## Kiểm chứng

- Unit: cấu trúc JSON sai, loại thao tác lạ, id môn người khác, ngày không tồn tại, giờ kết thúc trước bắt đầu, thiếu thông tin, giới hạn nội dung/context, gửi lặp không tạo trùng.
- Integration bằng fetch/database mock có kiểm soát: thiếu key, timeout, quota, provider lỗi, database lỗi không được báo thành công; user chưa đăng nhập không gọi Gemini/ghi dữ liệu.
- Browser: panel mở/đóng và bàn phím, loading/pending, hỏi lại khi thiếu thông tin, kết quả thành công rồi lịch/task hiển thị sau refresh. Unit/mock pass không được gọi là Gemini API thật pass.
- Gemini thật chỉ kiểm tra khi có key hợp lệ do người dùng tự cấu hình. Các dữ liệu kiểm tra được nêu rõ; không dùng dữ liệu cá nhân ngoài phạm vi yêu cầu.

## Điểm cần duyệt

Đồng ý tự tạo một bản ghi mỗi lượt khi đủ thông tin, hỏi lại khi mơ hồ và giữ key Gemini ở server. Sau duyệt bản thiết kế này sẽ viết kế hoạch triển khai ngắn để người dùng chọn thực hiện trong chat hiện tại.
