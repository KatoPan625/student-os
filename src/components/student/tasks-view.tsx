'use client';

import { useActionState, useMemo, useOptimistic, useState, useTransition } from 'react';
import { mutateStudentData } from '@/app/(student)/actions';
import { formatDateTime, toLocalInput } from '@/lib/study';
import type { ActionState, StudentData, Subject, Task, TaskStatus } from '@/lib/types';
import { TaskModal } from './task-modal';
import { ConfirmModal } from './confirm-modal';
import { LoadingIndicator } from './loading-indicator';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlert,
  IconCheck,
  IconTasks,
} from './icons';

interface TasksViewProps {
  data: StudentData;
}

export function TasksView({ data }: TasksViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Map of subjects
  const subjectMap = useMemo(() => {
    return new Map<string, Subject>(data.subjects.map((s) => [s.id, s]));
  }, [data.subjects]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (selectedSubjectId === 'all') return data.tasks;
    return data.tasks.filter((t) => t.subject_id === selectedSubjectId);
  }, [data.tasks, selectedSubjectId]);

  // Drag & drop moves a card instantly; the server result (or a rollback) follows.
  const [optimisticTasks, moveTask] = useOptimistic(filteredTasks, (tasks, move: {id: string; status: TaskStatus}) =>
    tasks.map((task) => (task.id === move.id ? {...task, status: move.status} : task)));
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [moveError, setMoveError] = useState('');

  const dropTask = (taskId: string, status: TaskStatus) => {
    setDragOver(null);
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    setMoveError('');
    startTransition(async () => {
      moveTask({id: task.id, status});
      const result = await mutateStudentData({ok: false, message: ''}, taskForm(task, status));
      if (!result.ok) setMoveError(`Chưa chuyển được “${task.title}”: ${result.message}`);
    });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  return (
    <>
      <header className="page-header">
        <div className="header-left">
          <h1 className="page-title">Quản lý bài tập & Kanban</h1>
          <p className="page-subtitle">
            Theo dõi tiến trình bài tập qua các giai đoạn Cần làm, Đang làm và Đã xong.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
          >
            <IconPlus />
            <span>Thêm bài tập</span>
          </button>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="tasks-toolbar">
        <div className="filter-group">
          <label htmlFor="subject-filter">Lọc theo môn:</label>
          <select
            id="subject-filter"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            <option value="all">Tất cả môn học ({data.tasks.length})</option>
            {data.subjects.map((s) => {
              const count = data.tasks.filter((t) => t.subject_id === s.id).length;
              return (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Hiển thị <strong>{filteredTasks.length}</strong> bài tập
        </div>
      </div>

      {/* Global Empty State */}
      {data.tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon"><IconTasks width="32" height="32" /></span>
            <p className="empty-title">Chưa có bài tập nào</p>
            <p className="empty-desc">
              Tạo bài tập đầu tiên để bắt đầu theo dõi hạn nộp và tiến độ học tập trên bảng Kanban.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
            >
              <IconPlus />
              <span>Tạo bài tập đầu tiên</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {moveError && <div className="form-message error" role="alert">{moveError}</div>}
          <div className="kanban-board">
            {COLUMNS.map((column) => {
              const tasks = optimisticTasks.filter((t) => t.status === column.status);
              return (
                <section
                  key={column.status}
                  className={`kanban-column ${dragOver === column.status ? 'drag-over' : ''}`}
                  aria-labelledby={`col-${column.status}-title`}
                  onDragOver={(event) => {
                    if (!event.dataTransfer.types.includes(TASK_MIME)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOver(column.status);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropTask(event.dataTransfer.getData(TASK_MIME), column.status);
                  }}
                >
                  <div className="column-header">
                    <h2 id={`col-${column.status}-title`} className="column-title">
                      <span>{column.title}</span>
                    </h2>
                    <span className="column-count">{tasks.length}</span>
                  </div>

                  <div className="column-cards">
                    {tasks.length === 0 ? (
                      <p className="column-empty">{column.empty}</p>
                    ) : (
                      tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          subject={subjectMap.get(task.subject_id)}
                          onEdit={() => handleEdit(task)}
                          onDelete={() => setDeletingTask(task)}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        subjects={data.subjects}
        defaultSubjectId={selectedSubjectId !== 'all' ? selectedSubjectId : undefined}
      />

      {/* Delete Confirmation Modal */}
      {deletingTask && (
        <ConfirmModal
          isOpen={Boolean(deletingTask)}
          onClose={() => setDeletingTask(null)}
          entity="task"
          id={deletingTask.id}
          title="Xác nhận xóa bài tập"
          description={`Bạn có chắc chắn muốn xóa bài tập "${deletingTask.title}"?`}
        />
      )}
    </>
  );
}

const TASK_MIME = 'application/x-student-os-task';
const COLUMNS: {status: TaskStatus; title: string; empty: string}[] = [
  {status: 'todo', title: 'Cần làm', empty: 'Không có bài tập cần làm'},
  {status: 'doing', title: 'Đang làm', empty: 'Chưa có bài đang thực hiện'},
  {status: 'done', title: 'Đã xong', empty: 'Chưa có bài hoàn thành'},
];

/** Same fields as the quick status buttons: the save action replaces the whole task. */
function taskForm(task: Task, status: TaskStatus): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    entity: 'task', intent: 'save', id: task.id, subject_id: task.subject_id, title: task.title,
    description: task.description ?? '', due_at: toLocalInput(task.due_at), status,
  })) form.set(key, value);
  return form;
}

// Individual Task Card Component with Accessible Quick Status Change Buttons
function TaskCard({
  task,
  subject,
  onEdit,
  onDelete,
}: {
  task: Task;
  subject?: Subject;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [now] = useState(() => Date.now());
  const isOverdue = task.status !== 'done' && Date.parse(task.due_at) < now;
  const isDone = task.status === 'done';

  return (
    <article
      className="task-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(TASK_MIME, task.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="task-card-header">
        <span
          className="badge badge-subject"
          style={{ backgroundColor: subject?.color || '#475569' }}
        >
          {subject?.code || subject?.name || 'Môn'}
        </span>
        <div className="task-card-controls">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onEdit}
            title="Chỉnh sửa bài tập"
            aria-label={`Sửa bài tập ${task.title}`}
          >
            <IconEdit />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onDelete}
            title="Xóa bài tập"
            style={{ color: 'var(--status-overdue-text)' }}
            aria-label={`Xóa bài tập ${task.title}`}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      <h3
        className="task-card-title"
        style={isDone ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : {}}
      >
        {task.title}
      </h3>

      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}

      <div className="task-card-footer">
        <div className="task-card-meta">
          <span>Hạn: {formatDateTime(task.due_at)}</span>
          {task.priority === 'high' && !isDone && <span className="badge badge-doing">Ưu tiên cao</span>}
          {isOverdue && <span className="badge badge-overdue"><IconAlert /> Quá hạn</span>}
          {isDone && <span className="badge badge-done"><IconCheck /> Đã xong</span>}
        </div>

        {/* Quick status transition actions — must submit all fields per contract */}
        <div className="task-status-actions" role="group" aria-label="Chuyển trạng thái">
          {task.status !== 'todo' && (
            <QuickStatusButton
              task={task}
              nextStatus="todo"
              label="Cần làm"
            />
          )}
          {task.status !== 'doing' && (
            <QuickStatusButton
              task={task}
              nextStatus="doing"
              label="Đang làm"
            />
          )}
          {task.status !== 'done' && (
            <QuickStatusButton
              task={task}
              nextStatus="done"
              label="Đã xong"
            />
          )}
        </div>
      </div>
    </article>
  );
}

// Single action button sending all required fields to mutateStudentData
function QuickStatusButton({
  task,
  nextStatus,
  label,
}: {
  task: Task;
  nextStatus: TaskStatus;
  label: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    mutateStudentData,
    { ok: false, message: '' }
  );

  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="entity" value="task" />
      <input type="hidden" name="intent" value="save" />
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="subject_id" value={task.subject_id} />
      <input type="hidden" name="title" value={task.title} />
      <input type="hidden" name="description" value={task.description || ''} />
      <input type="hidden" name="due_at" value={toLocalInput(task.due_at)} />
      <input type="hidden" name="status" value={nextStatus} />

      <button
        type="submit"
        disabled={pending}
        className="btn-status-pill"
        title={`Chuyển sang ${label}`}
        aria-label={`Chuyển sang ${label}`}
      >
        {pending ? (
          <LoadingIndicator compact label="Đang lưu…" />
        ) : (
          <span>{label}</span>
        )}
      </button>

      {state.message && !state.ok && (
        <span
          role="alert"
          aria-live="polite"
          style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--status-overdue-text)', marginTop: '2px' }}
        >
          {state.message}
        </span>
      )}
    </form>
  );
}
