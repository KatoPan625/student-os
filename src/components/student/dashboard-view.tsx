'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { getDashboard, formatDateTime } from '@/lib/study';
import type { StudentData, Subject } from '@/lib/types';
import { TaskModal } from './task-modal';
import { SessionModal } from './session-modal';
import { SubjectModal } from './subject-modal';
import { FocusTimer } from './focus-timer';
import {
  IconPlus,
  IconCalendar,
  IconTasks,
  IconSubjects,
  IconClock,
  IconMapPin,
  IconAlert,
  IconArrowRight,
} from './icons';

interface DashboardViewProps {
  data: StudentData;
}

export function DashboardView({ data }: DashboardViewProps) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Subject lookup map
  const subjectMap = useMemo(() => {
    return new Map<string, Subject>(data.subjects.map((s) => [s.id, s]));
  }, [data.subjects]);

  const dashboard = useMemo(() => {
    return getDashboard(data, new Date());
  }, [data]);

  return (
    <>
      <header className="page-header">
        <div className="header-left">
          <h1 className="page-title">Tổng quan học tập</h1>
          <p className="page-subtitle">
            Lịch học hôm nay, hạn nộp bài tập và tiến độ các môn học.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsTaskModalOpen(true)}
          >
            <IconPlus />
            <span>Thêm bài tập</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsSessionModalOpen(true)}
          >
            <IconCalendar />
            <span>Thêm buổi học</span>
          </button>
        </div>
      </header>

      {/* Metrics Row — Dễ quét, thứ bậc rõ */}
      <section className="metrics-grid" aria-label="Chỉ số tổng quan">
        <div className="metric-card today">
          <span className="metric-label">Buổi học hôm nay</span>
          <div className="metric-value-row">
            <span className="metric-value">{dashboard.todayClasses.length}</span>
            <span className="metric-icon"><IconCalendar /></span>
          </div>
        </div>

        <div className="metric-card overdue">
          <span className="metric-label">Bài tập quá hạn</span>
          <div className="metric-value-row">
            <span className={`metric-value ${dashboard.overdueTasks.length > 0 ? 'danger' : ''}`}>
              {dashboard.overdueTasks.length}
            </span>
            <span className="metric-icon"><IconAlert /></span>
          </div>
        </div>

        <div className="metric-card upcoming">
          <span className="metric-label">Hạn nộp 7 ngày tới</span>
          <div className="metric-value-row">
            <span className="metric-value">{dashboard.upcomingTasks.length}</span>
            <span className="metric-icon"><IconClock /></span>
          </div>
        </div>

        <div className="metric-card subjects">
          <span className="metric-label">Môn học đang theo</span>
          <div className="metric-value-row">
            <span className="metric-value">{data.subjects.length}</span>
            <span className="metric-icon"><IconSubjects /></span>
          </div>
        </div>
      </section>

      {/* Next up + focus timer */}
      <div className="dashboard-grid">
        <section className="card" aria-labelledby="next-tasks-title">
          <div className="card-header">
            <h2 id="next-tasks-title" className="card-title">
              <IconTasks />
              <span>Nên làm tiếp</span>
            </h2>
            <Link href="/tasks" className="btn btn-ghost btn-sm">
              <span>Kanban</span>
              <IconArrowRight />
            </Link>
          </div>
          {dashboard.nextTasks.length === 0 ? (
            <p className="empty-desc">Không còn bài tập chưa xong. Thêm bài mới khi có deadline.</p>
          ) : (
            <ol className="next-list">
              {dashboard.nextTasks.map((task) => {
                const subject = subjectMap.get(task.subject_id);
                const overdue = dashboard.overdueTasks.some((late) => late.id === task.id);
                return (
                  <li key={task.id} className="next-item">
                    <span className="next-dot" style={{ backgroundColor: subject?.color || '#475569' }} aria-hidden="true" />
                    <div className="item-info">
                      <span className="item-title">{task.title}</span>
                      <span className="item-meta">
                        {subject?.name ?? 'Môn học'} · {formatDateTime(task.due_at)}
                      </span>
                    </div>
                    {overdue ? <span className="badge badge-overdue">Quá hạn</span>
                      : task.priority === 'high' ? <span className="badge badge-doing">Ưu tiên cao</span> : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <FocusTimer subjects={data.subjects} />
      </div>

      {/* Dashboard Two-Column Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Today's Schedule & Overdue Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Lịch học hôm nay */}
          <section className="card" aria-labelledby="today-classes-title">
            <div className="card-header">
              <h2 id="today-classes-title" className="card-title">
                <IconCalendar />
                <span>Lịch học hôm nay</span>
              </h2>
              <Link href="/calendar" className="btn btn-ghost btn-sm">
                <span>Xem lịch</span>
                <IconArrowRight />
              </Link>
            </div>

            {dashboard.todayClasses.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><IconCalendar width="28" height="28" /></span>
                <p className="empty-title">Không có buổi học nào hôm nay</p>
                <p className="empty-desc">
                  Bạn có thể xem lại bài cũ hoặc dành thời gian hoàn thành các bài tập sắp đến hạn.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsSessionModalOpen(true)}
                >
                  <IconPlus />
                  <span>Thêm buổi học</span>
                </button>
              </div>
            ) : (
              <div className="item-list">
                {dashboard.todayClasses.map((session) => {
                  const subject = subjectMap.get(session.subject_id);
                  return (
                    <article key={session.id} className="item-row">
                      <div className="item-left">
                        <span
                          className="badge badge-subject"
                          style={{ backgroundColor: subject?.color || '#475569' }}
                        >
                          {subject?.code || subject?.name || 'Môn'}
                        </span>
                        <div className="item-info">
                          <h3 className="item-title">{subject?.name || 'Chưa rõ môn'}</h3>
                          <div className="item-meta">
                            <span>
                              <IconClock /> {formatDateTime(session.starts_at)} – {formatDateTime(session.ends_at)}
                            </span>
                            {session.location && (
                              <span>
                                <IconMapPin /> {session.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bài tập quá hạn (nếu có) */}
          <section className="card" aria-labelledby="overdue-tasks-title">
            <div className="card-header">
              <h2 id="overdue-tasks-title" className="card-title">
                <IconAlert />
                <span>Bài tập quá hạn</span>
              </h2>
              <Link href="/tasks" className="btn btn-ghost btn-sm">
                <span>Xem Kanban</span>
                <IconArrowRight />
              </Link>
            </div>

            {dashboard.overdueTasks.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">Không có bài tập quá hạn</p>
                <p className="empty-desc">
                  Mọi bài tập đều đang đúng hạn hoặc đã hoàn thành. Tiếp tục duy trì nhé!
                </p>
              </div>
            ) : (
              <div className="item-list">
                {dashboard.overdueTasks.map((task) => {
                  const subject = subjectMap.get(task.subject_id);
                  return (
                    <article key={task.id} className="item-row" style={{ borderColor: 'var(--status-overdue-border)' }}>
                      <div className="item-left">
                        <span
                          className="badge badge-subject"
                          style={{ backgroundColor: subject?.color || '#475569' }}
                        >
                          {subject?.code || subject?.name || 'Môn'}
                        </span>
                        <div className="item-info">
                          <h3 className="item-title">{task.title}</h3>
                          <div className="item-meta">
                            <span className="badge badge-overdue">
                              Hạn: {formatDateTime(task.due_at)}
                            </span>
                            <span className={`badge badge-${task.status}`}>
                              {task.status === 'doing' ? 'Đang làm' : 'Cần làm'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Upcoming Tasks & Subject Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Bài tập sắp tới trong 7 ngày */}
          <section className="card" aria-labelledby="upcoming-tasks-title">
            <div className="card-header">
              <h2 id="upcoming-tasks-title" className="card-title">
                <IconClock />
                <span>Hạn nộp trong 7 ngày tới</span>
              </h2>
              <Link href="/tasks" className="btn btn-ghost btn-sm">
                <span>Xem tất cả</span>
                <IconArrowRight />
              </Link>
            </div>

            {dashboard.upcomingTasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><IconTasks width="28" height="28" /></span>
                <p className="empty-title">Không có deadline trong 7 ngày tới</p>
                <p className="empty-desc">
                  Thời gian biểu thảnh thơi. Bạn có thể thêm bài tập mới để lên kế hoạch trước.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsTaskModalOpen(true)}
                >
                  <IconPlus />
                  <span>Thêm bài tập</span>
                </button>
              </div>
            ) : (
              <div className="item-list">
                {dashboard.upcomingTasks.map((task) => {
                  const subject = subjectMap.get(task.subject_id);
                  return (
                    <article key={task.id} className="item-row">
                      <div className="item-left">
                        <span
                          className="badge badge-subject"
                          style={{ backgroundColor: subject?.color || '#475569' }}
                        >
                          {subject?.code || subject?.name || 'Môn'}
                        </span>
                        <div className="item-info">
                          <h3 className="item-title">{task.title}</h3>
                          <div className="item-meta">
                            <span>Hạn: {formatDateTime(task.due_at)}</span>
                            <span className={`badge badge-${task.status}`}>
                              {task.status === 'doing' ? 'Đang làm' : 'Cần làm'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Tiến độ môn học */}
          <section className="card" aria-labelledby="progress-title">
            <div className="card-header">
              <h2 id="progress-title" className="card-title">
                <IconSubjects />
                <span>Tiến độ theo môn học</span>
              </h2>
              <Link href="/subjects" className="btn btn-ghost btn-sm">
                <span>Chi tiết</span>
                <IconArrowRight />
              </Link>
            </div>

            {dashboard.progress.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><IconSubjects width="28" height="28" /></span>
                <p className="empty-title">Chưa có môn học nào</p>
                <p className="empty-desc">
                  Tạo các môn học của kỳ này để bắt đầu theo dõi bài tập và lịch học.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsSubjectModalOpen(true)}
                >
                  <IconPlus />
                  <span>Tạo môn học đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="progress-list">
                {dashboard.progress.map(({ subject, done, total, percent }) => (
                  <div key={subject.id} className="progress-item">
                    <div className="progress-header">
                      <span className="progress-subject">
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: subject.color || 'var(--primary)',
                            display: 'inline-block',
                          }}
                        />
                        {subject.name} {subject.code ? `(${subject.code})` : ''}
                      </span>
                      <span className="progress-ratio">
                        {percent === null ? (
                          <em style={{ color: 'var(--text-muted)' }}>Chưa có bài tập</em>
                        ) : (
                          `${done}/${total} bài (${percent}%)`
                        )}
                        {dashboard.weekFocusMinutes.get(subject.id) ? ` · ${dashboard.weekFocusMinutes.get(subject.id)} phút tuần này` : ''}
                      </span>
                    </div>

                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-valuenow={percent ?? 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Tiến độ môn ${subject.name}`}
                    >
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percent ?? 0}%`,
                          backgroundColor: subject.color || 'var(--primary)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        subjects={data.subjects}
      />
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        subjects={data.subjects}
      />
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
      />
    </>
  );
}
