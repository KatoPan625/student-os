# Student OS — giao việc cho Antigravity

Người dùng đã duyệt thiết kế/kế hoạch và yêu cầu Codex tự mở Antigravity, giao việc cho agent. Hãy triển khai ngay phần giao diện theo tài liệu, không dừng ở proposal.

Đọc `docs/superpowers/specs/2026-10-22-student-os-design.md`, kế hoạch tương ứng và `src/lib/types.ts`.

Bạn sở hữu CHỈ `src/components/student/**` và `src/app/globals.css`. Codex đang viết các file khác. Không sửa package/config/lib/server/database/auth/routes, không cài package, không commit/push/deploy. Không đọc file secret. Không thêm dữ liệu mẫu hoặc auth giả vào luồng thật. Không spawn agent khác.

Tạo giao diện tiếng Việt, responsive, đẹp và gọn với CSS thuần: sidebar xanh đậm, nền sáng ấm, điểm nhấn xanh lá/cam, card có khoảng thở, font hệ thống. Dashboard quản lý học tập dùng hàng ngày, không cần ảnh trang trí. Hiển thị empty state có CTA khi chưa có dữ liệu.

Entrypoint: `export function StudentScreen({view,data}:{view:StudentView;data:StudentData})` trong `src/components/student/student-screen.tsx`. Import types từ `@/lib/types`. Dùng Link tới /dashboard, /subjects, /tasks, /calendar. Đăng xuất: import `signOut` từ `@/app/login/actions`, dùng `<form action={signOut}>`.

Server Action được Codex cung cấp: `mutateStudentData(previous:ActionState,form:FormData):Promise<ActionState>` từ `@/app/(student)/actions`. Dùng React useActionState; state ban đầu `{ok:false,message:''}`. Form hidden `entity=subject|task|class_session`, `intent=save|delete`, `id` nếu sửa/xóa. Field names như types. Ngày gửi `YYYY-MM-DDTHH:mm` theo giờ Việt Nam, server tự đổi UTC. Status values todo/doing/done. Submit pending bị khóa, thông báo aria-live; giữ input khi lỗi, không đóng form khi action lỗi. Xóa phải xác nhận; xóa môn có dữ liệu sẽ bị server từ chối. Nếu dùng useEffect để đóng form/reset khi success, tránh lặp render/lint.

Các helper `@/lib/study` Codex cung cấp:
- `localDateKey(iso:string):string` → YYYY-MM-DD theo giờ VN.
- `toLocalInput(iso:string):string` → YYYY-MM-DDTHH:mm cho edit datetime-local.
- `formatDateTime(iso:string):string` → ngày/giờ hiển thị tiếng Việt.
- `getMonthDays(year:number,month:number):string[]`, month 1–12, tuần thứ Hai, có ô tháng bên cạnh.
- `getDashboard(data:StudentData,now:Date)` → `{todayClasses:ClassSession[],overdueTasks:Task[],upcomingTasks:Task[],progress:Array<{subject:Subject,done:number,total:number,percent:number|null}>}`.

Màn hình cần đủ CRUD môn học (name,code,color), task (subject_id,title,description,due_at,status), buổi học (subject_id,starts_at,ends_at,location). Form nhãn rõ, bắt buộc phù hợp, nút bàn phím được. Mô tả/địa điểm/code optional. Kanban có filter môn, menu đổi trạng thái (gửi đủ field task trong save); không kéo thả. Lịch chuyển tháng, chọn ngày, hiển thị cả deadline (kể cả Done) và buổi học, có nút thêm buổi học. Dashboard số liệu thật, lịch hôm nay, task sắp hạn/quá hạn và tiến độ. Môn không có task hiển thị Chưa có bài tập.

CSS cũng style trang auth của Codex: `.auth-page`, `.auth-card`, `.brand`, `.eyebrow`, `.auth-tabs`, `.auth-form`, `.form-field`, `.form-message`, `.setup-note`. CSS global có style body, button, input, select, textarea và focus visible; tránh selector button phủ sai layout.

Hoàn thành file rồi ghi báo cáo ngắn vào `src/components/student/HANDOFF.md`: file đã làm, helper/API bạn dùng, kiểm tra đã chạy, vấn đề còn lại. Không chạy build/lint toàn repo trong khi Codex đang thay file; Codex sẽ tích hợp và chạy sau.
