'use client';

import { useActionState, useEffect, useRef } from 'react';
import { mutateStudentData } from '@/app/(student)/actions';
import type { ActionState } from '@/lib/types';
import { Modal } from './modal';
import { LoadingIndicator } from './loading-indicator';
import { IconClose } from './icons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: 'subject' | 'task' | 'class_session';
  id: string;
  title: string;
  description: string;
}

export function ConfirmModal(props: ConfirmModalProps) {
  return props.isOpen ? <ConfirmModalContent key={props.id} {...props}/> : null;
}

function ConfirmModalContent({
  isOpen,
  onClose,
  entity,
  id,
  title,
  description,
}: ConfirmModalProps) {
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

  return (
    <Modal titleId="confirm-modal-title" pending={pending} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 id="confirm-modal-title" className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={pending}
            aria-label="Đóng hộp thoại"
          >
            <IconClose />
          </button>
        </div>

        <form className="modal-form" action={action}>
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={id} />

          <p style={{ color: 'var(--text-main)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            {description}
          </p>

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
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={pending}
            >
              {pending ? (
                <LoadingIndicator compact label="Đang xóa…" />
              ) : (
                <span>Xác nhận xóa</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
