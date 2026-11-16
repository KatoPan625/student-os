'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { readTimetableImage, saveTimetable } from '@/app/(student)/assistant-actions';
import { localDateKey } from '@/lib/study';
import type { TimetableRow } from '@/lib/timetable';
import type { Subject } from '@/lib/types';
import { Modal } from './modal';
import { LoadingIndicator } from './loading-indicator';
import { IconClose } from './icons';

const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
type Row = TimetableRow & { include: boolean };

// Server Actions accept 1MB bodies by default, so shrink the photo to well under that before sending.
async function compressImage(file: File): Promise<{ mimeType: string; data: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    const data = url.slice(url.indexOf(',') + 1);
    if (data.length <= 900_000) return { mimeType: 'image/jpeg', data };
  }
  throw new Error('Ảnh quá lớn. Hãy cắt sát bảng thời khóa biểu rồi thử lại.');
}

export function TimetableImportModal({ subjects, onClose }: { subjects: Subject[]; onClose: () => void }) {
  const router = useRouter();
  const today = localDateKey(new Date().toISOString());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => new Date(Date.parse(`${today}T00:00:00Z`) + 15 * 7 * 86400000).toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current && current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  async function read() {
    if (!file) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await readTimetableImage(await compressImage(file));
      setMessage({ ok: result.ok, text: result.message });
      if (result.rows) setRows(result.rows.map((row) => ({ ...row, include: true })));
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Chưa đọc được ảnh.' });
    } finally {
      setPending(false);
    }
  }

  async function save() {
    if (!rows) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await saveTimetable({
        from,
        to,
        rows: rows.filter((row) => row.include).map(({ subject_id, weekday, start, end, location }) => ({ subject_id, weekday, start, end, location })),
      });
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        router.refresh();
        onClose();
      }
    } catch {
      setMessage({ ok: false, text: 'Mất kết nối. Hãy tải lại trang để kiểm tra trước khi thử lại.' });
    } finally {
      setPending(false);
    }
  }

  const included = rows?.filter((row) => row.include).length ?? 0;

  return (
    <Modal titleId="timetable-modal-title" pending={pending} onClose={onClose}>
      <div className="modal-dialog modal-dialog-wide">
        <div className="modal-header">
          <h2 id="timetable-modal-title" className="modal-title">Nhập thời khóa biểu từ ảnh</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={pending} aria-label="Đóng">
            <IconClose />
          </button>
        </div>

        <div className="modal-form">
          {subjects.length === 0 && (
            <div className="form-message error" role="alert">
              Bạn chưa có môn học nào. Hãy tạo môn trước để gán các buổi học.
            </div>
          )}
          <div className="form-row">
            <label className="form-field">
              <span>Học kỳ bắt đầu</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Học kỳ kết thúc</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} required />
            </label>
          </div>

          <label className="form-field">
            <span>Ảnh thời khóa biểu (JPG, PNG, WebP)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => { setFile(event.target.files?.[0] ?? null); setRows(null); setMessage(null); }}
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Ảnh được gửi tới Google Gemini để đọc, không lưu lại. Kết quả có thể sai: hãy kiểm tra từng dòng trước khi lưu.
            </small>
          </label>

          {rows && (
            <fieldset className="timetable-rows" disabled={pending}>
              <legend>Kiểm tra {rows.length} buổi/tuần đọc được</legend>
              {rows.map((row, index) => (
                <div key={index} className={`timetable-row ${row.include ? '' : 'excluded'}`}>
                  <label className="timetable-include">
                    <input type="checkbox" checked={row.include} onChange={(event) => update(index, { include: event.target.checked })} />
                    <span>{row.label || `Dòng ${index + 1}`}</span>
                  </label>
                  <label className="form-field">
                    <span>Môn</span>
                    <select value={row.subject_id} onChange={(event) => update(index, { subject_id: event.target.value })}>
                      <option value="">— Chọn môn —</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` (${subject.code})` : ''}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Thứ</span>
                    <select value={row.weekday} onChange={(event) => update(index, { weekday: Number(event.target.value) })}>
                      {WEEKDAYS.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Bắt đầu</span>
                    <input type="time" value={row.start} onChange={(event) => update(index, { start: event.target.value })} />
                  </label>
                  <label className="form-field">
                    <span>Kết thúc</span>
                    <input type="time" value={row.end} onChange={(event) => update(index, { end: event.target.value })} />
                  </label>
                  <label className="form-field">
                    <span>Phòng</span>
                    <input type="text" maxLength={300} value={row.location} onChange={(event) => update(index, { location: event.target.value })} />
                  </label>
                </div>
              ))}
            </fieldset>
          )}

          {message && (
            <div className={`form-message ${message.ok ? 'success' : 'error'}`} role={message.ok ? 'status' : 'alert'} aria-live="polite">
              {message.text}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pending}>Hủy</button>
            {rows ? (
              <button type="button" className="btn btn-primary" onClick={save} disabled={pending || included === 0}>
                {pending ? <LoadingIndicator compact label="Đang lưu…" /> : <span>Tạo lịch cho {included} buổi/tuần</span>}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={read} disabled={pending || !file || subjects.length === 0}>
                {pending ? <LoadingIndicator compact label="Gemini đang đọc ảnh…" /> : <span>Đọc ảnh</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
