'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { mutateStudentData } from '@/app/(student)/actions';
import type { ActionState, Subject } from '@/lib/types';
import { Modal } from './modal';
import { SUBJECT_COLORS } from '@/lib/colors';
import { LoadingIndicator } from './loading-indicator';
import { IconClose } from './icons';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: Subject | null;
}

const COLOR_PRESETS = SUBJECT_COLORS;

export function SubjectModal(props: SubjectModalProps) {
  return props.isOpen ? <SubjectModalContent key={props.subject?.id ?? 'new'} {...props}/> : null;
}

function SubjectModalContent({ isOpen, onClose, subject }: SubjectModalProps) {
  const [selectedColor, setSelectedColor] = useState(subject?.color || COLOR_PRESETS[0]);
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

  const isEditing = Boolean(subject?.id);

  return (
    <Modal titleId="subject-modal-title" pending={pending} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 id="subject-modal-title" className="modal-title">
            {isEditing ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
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
          <input type="hidden" name="entity" value="subject" />
          <input type="hidden" name="intent" value="save" />
          {subject?.id && <input type="hidden" name="id" value={subject.id} />}

          <label className="form-field">
            <span>Tên môn học <strong style={{ color: 'var(--status-overdue-text)' }}>*</strong></span>
            <input
              name="name"
              type="text"
              required
              maxLength={120}
              defaultValue={state.values?.name ?? subject?.name ?? ''}
              placeholder="Ví dụ: Giải tích 1, Lập trình hướng đối tượng…"
            />
          </label>

          <label className="form-field">
            <span>Mã môn học <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</small></span>
            <input
              name="code"
              type="text"
              maxLength={30}
              defaultValue={state.values?.code ?? subject?.code ?? ''}
              placeholder="Ví dụ: MATH101, IT2020…"
            />
          </label>

          <div className="form-field">
            <span>Màu nhận diện môn học <strong style={{ color: 'var(--status-overdue-text)' }}>*</strong></span>
            <div className="color-presets" role="group" aria-label="Bảng màu gợi ý">
              {COLOR_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`color-preset-dot ${selectedColor.toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setSelectedColor(hex)}
                  title={`Chọn màu ${hex}`}
                  aria-label={`Màu ${hex}`}
                />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.5rem' }}>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{ width: '44px', height: '36px', padding: '2px', cursor: 'pointer' }}
                aria-label="Bộ chọn màu tùy ý"
              />
              <input
                name="color"
                type="text"
                required
                pattern="^#[0-9a-fA-F]{6}$"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                placeholder="#0f766e"
                style={{ maxWidth: '130px' }}
                title="Mã màu hex gồm 7 ký tự (vd: #0f766e)"
              />
            </div>
          </div>

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
              disabled={pending}
            >
              {pending ? (
                <LoadingIndicator compact label="Đang lưu…" />
              ) : (
                <span>{isEditing ? 'Lưu cập nhật' : 'Tạo môn học'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
