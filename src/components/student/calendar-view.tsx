'use client';

import { useMemo, useState } from 'react';
import { getMonthDays, localDateKey, toUtc, formatDateTime } from '@/lib/study';
import type { StudentData, Subject, ClassSession, Task } from '@/lib/types';
import { SessionModal } from './session-modal';
import { TaskModal } from './task-modal';
import { ConfirmModal } from './confirm-modal';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconEdit,
  IconTrash,
  IconClock,
  IconMapPin,
  IconCheck,
} from './icons';

interface CalendarViewProps {
  data: StudentData;
}

const WEEKDAYS = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

export function CalendarView({ data }: CalendarViewProps) {
  // Current VN date
  const todayKey = useMemo(() => localDateKey(new Date().toISOString()), []);
  const [initYear, initMonth] = useMemo(() => {
    const parts = todayKey.split('-').map(Number);
    return [parts[0], parts[1]];
  }, [todayKey]);

  const [currentYear, setCurrentYear] = useState<number>(initYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initMonth);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  // Modals state
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<ClassSession | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Subject lookup
  const subjectMap = useMemo(() => {
    return new Map<string, Subject>(data.subjects.map((s) => [s.id, s]));
  }, [data.subjects]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(initYear);
    setCurrentMonth(initMonth);
    setSelectedDateKey(todayKey);
  };

  // Month calendar days
  const calendarDays = useMemo(() => {
    try {
      return getMonthDays(currentYear, currentMonth);
    } catch {
      return [];
    }
  }, [currentYear, currentMonth]);

  // Function to get sessions and tasks for any given day
  const getEventsForDay = (dayKey: string) => {
    try {
      const dayStart = Date.parse(toUtc(`${dayKey}T00:00`));
      const dayEnd = dayStart + 86400000;

      const sessions = data.classSessions.filter(
        (s) => Date.parse(s.starts_at) < dayEnd && Date.parse(s.ends_at) > dayStart
      );

      const tasks = data.tasks.filter((t) => localDateKey(t.due_at) === dayKey);

      return { sessions, tasks };
    } catch {
      return { sessions: [], tasks: [] };
    }
  };

  // Selected date events
  const selectedDayEvents = getEventsForDay(selectedDateKey);

  const targetMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  return (
    <>
      <header className="page-header">
        <div className="header-left">
          <h1 className="page-title">Lịch học & Deadline</h1>
          <p className="page-subtitle">
            Tổng quan thời khóa biểu cùng hạn nộp bài tập theo ngày và tháng.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingSession(null);
              setIsSessionModalOpen(true);
            }}
          >
            <IconPlus />
            <span>Thêm buổi học</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
          >
            <IconPlus />
            <span>Thêm bài tập</span>
          </button>
        </div>
      </header>

      <div className="calendar-wrapper">
        {/* Topbar: Month switcher */}
        <div className="calendar-topbar">
          <div className="calendar-month-nav">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrevMonth}
              aria-label="Tháng trước"
            >
              <IconChevronLeft />
              <span>Tháng trước</span>
            </button>
            <h2 className="current-month-label">
              Tháng {currentMonth} năm {currentYear}
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleNextMonth}
              aria-label="Tháng sau"
            >
              <span>Tháng sau</span>
              <IconChevronRight />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleToday}
            >
              <span>Hôm nay ({todayKey.split('-').reverse().join('/')})</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid-card">
          <table className="calendar-table" aria-label={`Lịch tháng ${currentMonth} năm ${currentYear}`}>
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th key={day} className="calendar-th" scope="col">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIndex) => {
                const week = calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7);
                return (
                  <tr key={weekIndex}>
                    {week.map((dayKey) => {
                      const isOtherMonth = !dayKey.startsWith(targetMonthPrefix);
                      const isToday = dayKey === todayKey;
                      const isSelected = dayKey === selectedDateKey;
                      const dayNum = parseInt(dayKey.slice(8), 10);
                      const { sessions, tasks } = getEventsForDay(dayKey);

                      return (
                        <td
                          key={dayKey}
                          className={`calendar-td ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedDateKey(dayKey)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Ngày ${dayKey}: ${sessions.length} buổi học, ${tasks.length} deadline`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedDateKey(dayKey);
                            }
                          }}
                        >
                          <div className="day-header">
                            <span className="day-num">{dayNum}</span>
                            {(sessions.length > 0 || tasks.length > 0) && (
                              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                                {sessions.length + tasks.length}
                              </span>
                            )}
                          </div>

                          <div className="day-events">
                            {/* Class Sessions */}
                            {sessions.map((session) => {
                              const sub = subjectMap.get(session.subject_id);
                              return (
                                <div
                                  key={`session-${session.id}`}
                                  className="event-chip class-session"
                                  title={`[Buổi học] ${sub?.name || 'Môn học'} - ${formatDateTime(session.starts_at)}`}
                                >
                                  <span style={{ fontWeight: 700 }}>[Học]</span> {sub?.code || sub?.name || 'Môn học'}
                                </div>
                              );
                            })}

                            {/* Task Deadlines (Including Done) */}
                            {tasks.map((task) => {
                              const isDone = task.status === 'done';
                              return (
                                <div
                                  key={`task-${task.id}`}
                                  className={`event-chip ${isDone ? 'task-done' : 'task-deadline'}`}
                                  title={`[Hạn nộp] ${task.title} (${isDone ? 'Đã xong' : 'Chưa xong'})`}
                                >
                                  <span style={{ fontWeight: 700 }}>
                                    {isDone ? '[✓ Xong]' : '[Hạn]'}
                                  </span>{' '}
                                  {task.title}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Day Detail Panel */}
        <section className="day-detail-panel" aria-labelledby="selected-day-title">
          <div className="day-detail-header">
            <h3 id="selected-day-title" className="day-detail-title">
              <span>Chi tiết ngày: {selectedDateKey.split('-').reverse().join('/')}</span>
              {selectedDateKey === todayKey && (
                <span className="badge badge-doing" style={{ marginLeft: '0.5rem' }}>
                  Hôm nay
                </span>
              )}
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditingSession(null);
                  setIsSessionModalOpen(true);
                }}
              >
                <IconPlus />
                <span>Buổi học ngày này</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
              >
                <IconPlus />
                <span>Bài tập ngày này</span>
              </button>
            </div>
          </div>

          <div className="day-detail-grid">
            {/* Class Sessions List */}
            <div className="day-detail-section">
              <div className="section-title">
                <span>Buổi học trong ngày ({selectedDayEvents.sessions.length})</span>
              </div>

              {selectedDayEvents.sessions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  Không có buổi học nào vào ngày này.
                </p>
              ) : (
                <div className="item-list">
                  {selectedDayEvents.sessions.map((session) => {
                    const sub = subjectMap.get(session.subject_id);
                    return (
                      <article key={session.id} className="item-row">
                        <div className="item-left">
                          <span
                            className="badge badge-subject"
                            style={{ backgroundColor: sub?.color || 'var(--charcoal)' }}
                          >
                            {sub?.code || sub?.name || 'Môn'}
                          </span>
                          <div className="item-info">
                            <h4 className="item-title">{sub?.name || 'Chưa rõ môn'}</h4>
                            <div className="item-meta">
                              <span>
                                <IconClock /> {formatDateTime(session.starts_at)} – {formatDateTime(session.ends_at)}
                              </span>
                              {session.location && <span><IconMapPin /> {session.location}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingSession(session);
                              setIsSessionModalOpen(true);
                            }}
                            aria-label="Sửa buổi học"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeletingSession(session)}
                            style={{ color: 'var(--status-overdue-text)' }}
                            aria-label="Xóa buổi học"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tasks / Deadlines List */}
            <div className="day-detail-section">
              <div className="section-title">
                <span>Deadline bài tập ({selectedDayEvents.tasks.length})</span>
              </div>

              {selectedDayEvents.tasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  Không có hạn nộp bài tập nào vào ngày này.
                </p>
              ) : (
                <div className="item-list">
                  {selectedDayEvents.tasks.map((task) => {
                    const sub = subjectMap.get(task.subject_id);
                    const isDone = task.status === 'done';
                    return (
                      <article key={task.id} className="item-row">
                        <div className="item-left">
                          <span
                            className="badge badge-subject"
                            style={{ backgroundColor: sub?.color || 'var(--brown)' }}
                          >
                            {sub?.code || sub?.name || 'Môn'}
                          </span>
                          <div className="item-info">
                            <h4
                              className="item-title"
                              style={isDone ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : {}}
                            >
                              {task.title}
                            </h4>
                            <div className="item-meta">
                              <span>Hạn: {formatDateTime(task.due_at)}</span>
                              <span className={`badge badge-${task.status}`}>
                                {isDone ? (
                                  <>
                                    <IconCheck /> Đã xong
                                  </>
                                ) : task.status === 'doing' ? (
                                  'Đang làm'
                                ) : (
                                  'Cần làm'
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            aria-label="Sửa bài tập"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeletingTask(task)}
                            style={{ color: 'var(--status-overdue-text)' }}
                            aria-label="Xóa bài tập"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Session Modal */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => {
          setIsSessionModalOpen(false);
          setEditingSession(null);
        }}
        session={editingSession}
        subjects={data.subjects}
        defaultDateKey={selectedDateKey}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        subjects={data.subjects}
        defaultDateKey={selectedDateKey}
      />

      {/* Delete Session Confirmation Modal */}
      {deletingSession && (
        <ConfirmModal
          isOpen={Boolean(deletingSession)}
          onClose={() => setDeletingSession(null)}
          entity="class_session"
          id={deletingSession.id}
          title="Xác nhận xóa buổi học"
          description={`Bạn có chắc chắn muốn xóa buổi học này không? (${formatDateTime(deletingSession.starts_at)} – ${formatDateTime(deletingSession.ends_at)})`}
        />
      )}

      {/* Delete Task Confirmation Modal */}
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
