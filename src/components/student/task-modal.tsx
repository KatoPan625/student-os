'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { mutateStudentData } from '@/app/(student)/actions';
import { toLocalInput, localDateKey } from '@/lib/study';
import type { ActionState, Subject, Task, TaskStatus } from '@/lib/types';
import { Modal } from './modal';
import { LoadingIndicator } from './loading-indicator';
import { IconClose } from './icons';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  subjects: Subject[];
  defaultSubjectId?: string;
  defaultDateKey?: string; // YYYY-MM-DD
}

export function TaskModal(props: TaskModalProps) {
  return props.isOpen ? <TaskModalContent key={props.task?.id ?? 'new'} {...props}/> : null;
}

function TaskModalContent({
  isOpen,
  onClose,
  task,
  subjects,
  defaultSubjectId,
  defaultDateKey,
}: TaskModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    task?.subject_id ?? defaultSubjectId ?? subjects[0]?.id ?? ''
  );
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [state, action, pending] = useActionState<ActionState, FormData>(
    mutateStudentData,
    { ok: false, message: '' }
  );

  const prevRef = useRef(state);

  useEffect(() => {
    if (prevRef.current !== state) {
      prevRef.current = state;
      if (state.ok) {
        onClose();
      }
    }
  }, [state, onClose]);

  if (!isOpen) return null;

  const isEditing = Boolean(task?.id);

  // Compute default due_at string YYYY-MM-DDTHH:mm
  let defaultDueAt = '';
  if (task?.due_at) {
    defaultDueAt = toLocalInput(task.due_at);
  } else if (defaultDateKey) {
    defaultDueAt = `${defaultDateKey}T23:59`;
  } else {
    const today = localDateKey(new Date().toISOString());
    defaultDueAt = `${today}T23:59`;
  }

  return (
    <Modal titleId="task-modal-title" pending={pending} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 id="task-modal-title" className="modal-title">
            {isEditing ? 'Chỉnh sửa bài tập' : 'Thêm bài tập mới'}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={pending}
            aria-label="Đóng"
          >
            <IconClose />
          </button>
        </div>

        <form className="modal-form" action={action} onReset={(event) => event.preventDefault()}>
          <input type="hidden" name="entity" value="task" />
          <input type="hidden" name="intent" value="save" />
          {task?.id && <input type="hidden" name="id" value={task.id} />}

          {subjects.length === 0 ? (
            <div className="form-message error" role="alert">
              Bạn chưa có môn học nào. Vui lòng tạo môn học trước khi thêm bài tập.
            </div>
          ) : (
            <label className="form-field">
              <span>Môn học <strong style={{ color: 'var(--status-overdue-text)' }}>*</strong></span>
              <select
                name="subject_id"
                required
                value={selectedSubjectId}
                onChange={(event) => setSelectedSubjectId(event.target.value)}
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="form-field">
            <span>Tiêu đề bài tập <strong style={{ color: 'var(--status-overdue-text)' }}>*</strong></span>
            <input
              name="title"
              type="text"
              required
              maxLength={240}
              defaultValue={state.values?.title ?? task?.title ?? ''}
              placeholder="Ví dụ: Nộp báo cáo tuần 3, Bài tập lớn chương 2…"
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Hạn nộp (Giờ VN) <strong style={{ color: 'var(--status-overdue-text)' }}>*</strong></span>
              <input
                name="due_at"
                type="datetime-local"
                required
                defaultValue={state.values?.due_at ?? defaultDueAt}
              />
            </label>

            <label className="form-field">
              <span>Trạng thái <strong style={{ color: 'var(--status-overdue-text)' }}>*</strong></span>
              <select
                name="status"
                required
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as TaskStatus)}
              >
                <option value="todo">Cần làm (To do)</option>
                <option value="doing">Đang làm (Doing)</option>
                <option value="done">Đã xong (Done)</option>
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Độ ưu tiên</span>
            <select name="priority" defaultValue={state.values?.priority || task?.priority || 'normal'}>
              <option value="high">Cao — đưa lên đầu gợi ý</option>
              <option value="normal">Bình thường</option>
              <option value="low">Thấp</option>
            </select>
          </label>

          <label className="form-field">
            <span>Ghi chú / Mô tả <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</small></span>
            <textarea
              name="description"
              rows={3}
              maxLength={10000}
              defaultValue={state.values?.description ?? task?.description ?? ''}
              placeholder="Yêu cầu cụ thể, tài liệu tham khảo, tiêu chí đánh giá…"
            />
          </label>

          {state.message && (
            <div
              className={`form-message ${state.ok ? 'success' : 'error'}`}
              role={state.ok ? 'status' : 'alert'}
              aria-live="polite"
            >
              {state.message}
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={pending}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || subjects.length === 0}
            >
              {pending ? (
                <LoadingIndicator compact label="Đang lưu…" />
              ) : (
                <span>{isEditing ? 'Lưu cập nhật' : 'Tạo bài tập'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
