'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logFocusSession } from '@/app/(student)/actions';
import type { Subject } from '@/lib/types';
import { LoadingIndicator } from './loading-indicator';
import { IconClock } from './icons';

const LENGTHS = [25, 50];
type Timer = { startedAt: string; minutes: number; endAt: number | null; remaining: number };

const clock = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

// shortcut: the timer lives in dashboard state, so leaving the page drops a running block; persist it if users ask.
export function FocusTimer({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [length, setLength] = useState(LENGTHS[0]);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // A finished block whose save failed stays here so the user can retry instead of losing it.
  const [unsaved, setUnsaved] = useState<{ startedAt: string; minutes: number; subjectId: string } | null>(null);

  const remaining = timer ? (timer.endAt === null ? timer.remaining : timer.endAt - now) : length * 60000;
  const running = timer?.endAt != null;

  async function persist(entry: { startedAt: string; minutes: number; subjectId: string }) {
    setSaving(true);
    setUnsaved(null);
    try {
      const result = await logFocusSession({ subject_id: entry.subjectId, started_at: entry.startedAt, minutes: entry.minutes });
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
      else setUnsaved(entry);
    } catch {
      setMessage({ ok: false, text: 'Mất kết nối. Chưa lưu được phiên tập trung.' });
      setUnsaved(entry);
    } finally {
      setSaving(false);
    }
  }

  function save(minutes: number, current: Timer) {
    setTimer(null);
    if (minutes < 1) {
      setMessage({ ok: false, text: 'Phiên dưới 1 phút nên không được ghi lại.' });
      return;
    }
    void persist({ startedAt: current.startedAt, minutes, subjectId });
  }

  useEffect(() => {
    if (timer?.endAt == null) return;
    // Wall-clock end time, so a throttled background tab still finishes on time.
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at >= timer.endAt!) {
        window.clearInterval(id);
        save(timer.minutes, timer);
      }
    }, 1000);
    return () => window.clearInterval(id);
  });

  const start = () => {
    const at = Date.now();
    setMessage(null);
    setNow(at);
    setTimer({ startedAt: new Date(at).toISOString(), minutes: length, endAt: at + length * 60000, remaining: length * 60000 });
  };
  const pause = () => timer && setTimer({ ...timer, endAt: null, remaining: timer.endAt! - Date.now() });
  const resume = () => {
    if (!timer) return;
    const at = Date.now();
    setNow(at);
    setTimer({ ...timer, endAt: at + timer.remaining });
  };
  const stop = () => timer && save(Math.floor((timer.minutes * 60000 - remaining) / 60000), timer);

  return (
    <section className="card focus-card" aria-labelledby="focus-title">
      <div className="card-header">
        <h2 id="focus-title" className="card-title">
          <IconClock />
          <span>Phiên tập trung</span>
        </h2>
      </div>

      {subjects.length === 0 ? (
        <p className="empty-desc">Tạo môn học trước để ghi lại thời gian tập trung theo môn.</p>
      ) : (
        <>
          <div className="focus-controls">
            <label className="form-field">
              <span>Môn</span>
              <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={Boolean(timer) || saving}>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <div className="focus-lengths" role="group" aria-label="Độ dài phiên">
              {LENGTHS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={`btn btn-sm ${length === minutes ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={length === minutes}
                  disabled={Boolean(timer) || saving}
                  onClick={() => setLength(minutes)}
                >
                  {minutes} phút
                </button>
              ))}
            </div>
          </div>

          <p className="focus-clock" role="timer" aria-label={`Còn lại ${clock(remaining)}`}>{clock(remaining)}</p>

          <div className="focus-actions">
            {!timer && unsaved && (
              <button type="button" className="btn btn-secondary" onClick={() => persist(unsaved)} disabled={saving}>
                Thử lưu lại {unsaved.minutes} phút
              </button>
            )}
            {!timer && (
              <button type="button" className="btn btn-primary" onClick={start} disabled={saving || !subjectId}>
                {saving ? <LoadingIndicator compact label="Đang lưu…" /> : <span>Bắt đầu</span>}
              </button>
            )}
            {timer && (running
              ? <button type="button" className="btn btn-secondary" onClick={pause}>Tạm dừng</button>
              : <button type="button" className="btn btn-primary" onClick={resume}>Tiếp tục</button>)}
            {timer && <button type="button" className="btn btn-ghost" onClick={stop}>Kết thúc & lưu</button>}
          </div>
        </>
      )}

      {message && (
        <div className={`form-message ${message.ok ? 'success' : 'error'}`} role={message.ok ? 'status' : 'alert'} aria-live="polite">
          {message.text}
        </div>
      )}
    </section>
  );
}
