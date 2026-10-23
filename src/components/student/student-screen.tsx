'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/app/login/actions';
import type { StudentData, StudentView } from '@/lib/types';
import { DashboardView } from './dashboard-view';
import { SubjectsView } from './subjects-view';
import { TasksView } from './tasks-view';
import { CalendarView } from './calendar-view';
import {
  IconDashboard,
  IconSubjects,
  IconTasks,
  IconCalendar,
  IconLogout,
  IconMenu,
  IconClose,
} from './icons';

interface StudentScreenProps {
  view: StudentView;
  data: StudentData;
}

const NAV_ITEMS: Array<{
  view: StudentView;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { view: 'dashboard', href: '/dashboard', label: 'Tổng quan', icon: IconDashboard },
  { view: 'subjects', href: '/subjects', label: 'Môn học', icon: IconSubjects },
  { view: 'tasks', href: '/tasks', label: 'Bài tập', icon: IconTasks },
  { view: 'calendar', href: '/calendar', label: 'Lịch học', icon: IconCalendar },
];

export function StudentScreen({ view, data }: StudentScreenProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="student-shell">
      {/* Mobile Topbar */}
      <header className="mobile-topbar">
        <Link href="/dashboard" className="sidebar-brand">
          <div className="brand-icon">S</div>
          <div className="brand-info">
            <span className="brand-title">Student OS</span>
            <span className="brand-subtitle">Góc học tập</span>
          </div>
        </Link>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={mobileNavOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <IconClose /> : <IconMenu />}
        </button>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileNavOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Charcoal Tối Giản) */}
      <aside
        className={`student-sidebar ${mobileNavOpen ? 'open' : ''}`}
        aria-label="Điều hướng ứng dụng"
      >
        <div className="sidebar-header">
          <Link href="/dashboard" className="sidebar-brand">
            <div className="brand-icon">S</div>
            <div className="brand-info">
              <span className="brand-title">Student OS</span>
              <span className="brand-subtitle">Góc học tập cá nhân</span>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.view;
            const Icon = item.icon;
            return (
              <Link
                key={item.view}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileNavOpen(false)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-note">
            <span>Giờ Việt Nam (UTC+7)</span>
          </div>
          <form action={signOut} className="logout-form">
            <button
              type="submit"
              className="logout-btn"
              title="Đăng xuất khỏi tài khoản"
            >
              <span aria-hidden="true"><IconLogout /></span>
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area (Nền Beige) */}
      <main className="student-main" id="main-content">
        <div className="content-container">
          {view === 'dashboard' && <DashboardView data={data} />}
          {view === 'subjects' && <SubjectsView data={data} />}
          {view === 'tasks' && <TasksView data={data} />}
          {view === 'calendar' && <CalendarView data={data} />}
        </div>
      </main>
    </div>
  );
}
