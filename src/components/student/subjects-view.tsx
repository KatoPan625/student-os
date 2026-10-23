'use client';

import { useState } from 'react';
import type { StudentData, Subject } from '@/lib/types';
import { SubjectModal } from './subject-modal';
import { ConfirmModal } from './confirm-modal';
import { IconPlus, IconEdit, IconTrash, IconSubjects } from './icons';

interface SubjectsViewProps {
  data: StudentData;
}

export function SubjectsView({ data }: SubjectsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Delete confirmation state
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const handleEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  return (
    <>
      <header className="page-header">
        <div className="header-left">
          <h1 className="page-title">Quản lý môn học</h1>
          <p className="page-subtitle">
            Tạo và sắp xếp các môn học trong học kỳ để gắn với bài tập và thời khóa biểu.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
          >
            <IconPlus />
            <span>Thêm môn học</span>
          </button>
        </div>
      </header>

      {data.subjects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon"><IconSubjects width="32" height="32" /></span>
            <p className="empty-title">Chưa có môn học nào</p>
            <p className="empty-desc">
              Tạo môn học đầu tiên để bắt đầu thêm bài tập, hạn nộp và thời khóa biểu.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
            >
              <IconPlus />
              <span>Tạo môn học đầu tiên</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="subjects-grid">
          {data.subjects.map((sub) => {
            const subjectTasks = data.tasks.filter((t) => t.subject_id === sub.id);
            const doneTasks = subjectTasks.filter((t) => t.status === 'done');
            const subjectSessions = data.classSessions.filter((s) => s.subject_id === sub.id);

            return (
              <article key={sub.id} className="subject-card">
                <div
                  className="subject-card-bar"
                  style={{ backgroundColor: sub.color || 'var(--brown)' }}
                />

                <div className="subject-card-header">
                  <div>
                    <h2 className="subject-name">{sub.name}</h2>
                    {sub.code && <span className="subject-code">{sub.code}</span>}
                  </div>
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: sub.color,
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 0 1px var(--border-main)',
                      flexShrink: 0,
                    }}
                    title={`Màu nhận diện: ${sub.color}`}
                  />
                </div>

                <div className="subject-card-stats">
                  <div>
                    <strong>{subjectTasks.length}</strong> bài tập
                    {subjectTasks.length > 0 && ` (${doneTasks.length} hoàn thành)`}
                  </div>
                  <div>
                    <strong>{subjectSessions.length}</strong> buổi học trong lịch
                  </div>
                </div>

                <div className="subject-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(sub)}
                    aria-label={`Sửa môn ${sub.name}`}
                  >
                    <IconEdit />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDeletingSubject(sub)}
                    style={{ color: 'var(--status-overdue-text)' }}
                    aria-label={`Xóa môn ${sub.name}`}
                  >
                    <IconTrash />
                    <span>Xóa</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Subject Modal */}
      <SubjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSubject(null);
        }}
        subject={editingSubject}
      />

      {/* Delete Confirmation Modal */}
      {deletingSubject && (
        <ConfirmModal
          isOpen={Boolean(deletingSubject)}
          onClose={() => setDeletingSubject(null)}
          entity="subject"
          id={deletingSubject.id}
          title="Xác nhận xóa môn học"
          description={`Bạn có chắc chắn muốn xóa môn "${deletingSubject.name}"? Lưu ý: Môn học chỉ có thể xóa khi chưa có bài tập hoặc buổi học nào liên kết.`}
        />
      )}
    </>
  );
}
