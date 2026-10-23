'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { mutateStudentData } from '@/app/(student)/actions';
import { toLocalInput, localDateKey } from '@/lib/study';
import type { ActionState, ClassSession, Subject } from '@/lib/types';
import { Modal } from './modal';
import { LoadingIndicator } from './loading-indicator';
import { IconClose } from './icons';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: ClassSession | null;
  subjects: Subject[];
  defaultSubjectId?: string;
  defaultDateKey?: string; // YYYY-MM-DD
}

export function SessionModal(props: SessionModalProps) {
  return props.isOpen ? <SessionModalContent key={props.session?.id ?? 'new'} {...props}/> : null;
}

function SessionModalContent({
  isOpen,
  onClose,
  session,
  subjects,
  defaultSubjectId,
  defaultDateKey,
}: SessionModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    session?.subject_id ?? defaultSubjectId ?? subjects[0]?.id ?? ''
  );
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

  const isEditing = Boolean(session?.id);

  let defaultStartsAt = '';
  let defaultEndsAt = '';
  if (session?.starts_at && session?.ends_at) {
    defaultStartsAt = toLocalInput(session.starts_at);
    defaultEndsAt = toLocalInput(session.ends_at);
  } else if (defaultDateKey) {
    defaultStartsAt = `${defaultDateKey}T08:00`;
    defaultEndsAt = `${defaultDateKey}T10:00`;
  } else {
    const today = localDateKey(new Date().toISOString());
    defaultStartsAt = `${today}T08:00`;
    defaultEndsAt = `${today}T10:00`;
  }

  return (
    <Modal titleId="session-modal-title" pending={pending} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 id="session-modal-title" className="modal-title">
            {isEditing ? 'Chỉnh sửa buổi học' : 'Thêm buổi học mới'}
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
          <input type="hidden" name="entity" value="class_session" />
          <input type="hidden" name="intent" value="save" />
          {session?.id && <input type="hidden" name="id" value={session.id} />}

          {subjects.length === 0 ? (
            <div className="form-message error" role="alert">
              Bạn chưa có môn học nào. Vui lòng tạo môn học trước khi thêm buổi học.
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

          <div className="form-row">
            <label className="form-field">
              <span>Bắt đầu (Giờ VN) <strong style={{ color: 'var(--status-overdue-text)' }}>*</strong></span>
              <input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={state.values?.starts_at ?? defaultStartsAt}
              />
            </label>

            <label className="form-field">
              <span>Kết thúc (Giờ VN) <strong style={{ color: 'var(--status-overdue-text)' }}>*</strong></span>
              <input
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={state.values?.ends_at ?? defaultEndsAt}
              />
            </label>
          </div>

          <label className="form-field">
            <span>Địa điểm / Phòng học / Link Meet <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</small></span>
            <input
              name="location"
              type="text"
              maxLength={300}
              defaultValue={state.values?.location ?? session?.location ?? ''}
              placeholder="Ví dụ: Phòng A203, Giảng đường H1, hoặc link Google Meet"
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
                <span>{isEditing ? 'Lưu cập nhật' : 'Tạo buổi học'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
