import { useCallback, useState } from 'react';
import { passengerService } from '../../api/passengerService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import AdminPager from '../common/AdminPager';
import { errorMessage } from '../../utils/tour';
import '../../styles/workspace.css';

const labels = { NOT_CHECKED: 'Chưa điểm danh', PRESENT: 'Có mặt', ABSENT: 'Vắng mặt' };
function NamesEditor({ data, bookingId, admin, onClose, onSaved }) {
  const [names, setNames] = useState(() => Array.from({ length: Math.min(data.expectedCount, 500) }, (_, i) => data.passengers[i]?.fullName || ''));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [stale, setStale] = useState(false);
  async function save(event) {
    event.preventDefault(); if (busy || stale) return; setBusy(true); setError('');
    try { await passengerService.save(bookingId, names.map(n => n.trim()), data.revision, admin); onSaved(); }
    catch (e) { setError(errorMessage(e)); if (e.response?.status === 409) setStale(true); }
    finally { setBusy(false); }
  }
  return <form className="form-stack passenger-names-form" onSubmit={save}>
    <p>Nhập đủ {data.expectedCount} hành khách theo số chỗ trong đơn. Không nhập thông tin sức khỏe vào họ tên.</p>
    {names.map((name, i) => <label className="field" key={i}>Hành khách {i + 1}<input required maxLength={150} value={name} disabled={busy || stale} onChange={e => setNames(current => current.map((n, j) => i === j ? e.target.value : n))} /></label>)}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    <div className="passenger-actions"><button className="btn" disabled={busy || stale}>{busy ? 'Đang lưu…' : 'Lưu danh sách'}</button><button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>{stale ? 'Đóng và tải lại' : 'Hủy chỉnh sửa'}</button></div>
  </form>;
}
function History({ bookingId, admin, scheduleId }) {
  const [page, setPage] = useState(0);
  const load = useCallback(async () => (await passengerService.history(bookingId, page, admin, scheduleId)).data.data, [bookingId, page, admin, scheduleId]);
  const { data, loading, error, reload } = useResource(load);
  return <section className="passenger-history"><h3>Lịch sử điểm danh</h3>
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được lịch sử" description={error} onRetry={reload} /> : <>
      {!data?.items.length ? <p className="muted">Chưa có thay đổi điểm danh.</p> : <ol>{data.items.map(row => <li key={row.id}><strong>{row.passengerName}</strong><p>{labels[row.previousStatus]} → {labels[row.status]}</p><span className="small muted">{row.guideName} · {new Date(row.createdAt).toLocaleString('vi-VN')}</span></li>)}</ol>}
      <AdminPager data={data} busy={loading} onPage={setPage} />
    </>}
  </section>;
}
export default function PassengerPanel({ bookingId, admin = false, scheduleId = null, onMarked }) {
  const load = useCallback(async () => (await passengerService.list(bookingId, admin, scheduleId)).data.data, [bookingId, admin, scheduleId]);
  const { data, loading, error, reload } = useResource(load);
  const [editing, setEditing] = useState(false), [history, setHistory] = useState(false), [historyRevision, setHistoryRevision] = useState(0);
  const [selection, setSelection] = useState(null), [status, setStatus] = useState('PRESENT');
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [stale, setStale] = useState(false), [notice, setNotice] = useState('');
  const refresh = () => { setEditing(false); reload(); };
  async function mark(event) {
    event.preventDefault(); if (busy || stale) return; setBusy(true); setFailure('');
    try {
      await passengerService.mark(scheduleId, bookingId, selection.id, status, selection.revision);
      setSelection(null); setHistoryRevision(v => v + 1); reload(); onMarked?.();
    } catch (e) { setFailure(errorMessage(e)); if ([404, 409].includes(e.response?.status)) setStale(true); }
    finally { setBusy(false); }
  }
  return <section className="panel passenger-panel">
    <header className="passenger-heading"><div><p className="eyebrow">ĐỒNG HÀNH TRONG CHUYẾN ĐI</p><h2>Danh sách hành khách</h2></div><button className="text-btn" disabled={loading || busy || editing} onClick={reload}>Tải lại</button></header>
    {notice && <p className="notice notice-success" role="status">{notice}</p>}
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được hành khách" description={error} onRetry={reload} /> : data && <>
      <p className="muted">{data.passengers.length}/{data.expectedCount} đã có tên · {data.passengers.filter(p => p.status === 'PRESENT').length} có mặt · {data.passengers.filter(p => p.status === 'ABSENT').length} vắng mặt</p>
      {editing ? <NamesEditor key={data.revision} data={data} bookingId={bookingId} admin={admin} onClose={refresh} onSaved={() => { setNotice('Đã lưu danh sách hành khách.'); refresh(); }} /> : <>
        {!data.passengers.length ? <p className="notice">Chưa có danh sách theo tên. Chủ booking hoặc admin cần nhập đủ tên trước khi hướng dẫn viên điểm danh từng người.</p> : <ol className="passenger-list">{data.passengers.map(person => <li key={person.id}>
          <span className="passenger-position" aria-hidden="true">{person.position}</span><div><strong>{person.fullName}</strong><p className={`small passenger-status passenger-status-${person.status.toLowerCase()}`}>{labels[person.status]}</p></div>
          {scheduleId != null && data.canCheckIn && <button className="btn btn-outline btn-small" onClick={() => { setSelection(person); setStatus(person.status === 'NOT_CHECKED' ? 'PRESENT' : person.status); setFailure(''); setStale(false); }}>Điểm danh<span className="sr-only"> {person.fullName}</span></button>}
        </li>)}</ol>}
        {data.editable && scheduleId == null && <button className="btn btn-outline btn-small" onClick={() => { setNotice(''); setEditing(true); }}>Nhập / sửa hành khách</button>}
        {scheduleId == null && <p className="small muted">Khách được sửa trước ngày khởi hành; admin hỗ trợ đến hết chuyến. Danh sách khóa chỉnh sửa tên sau lần điểm danh đầu tiên.</p>}
        {scheduleId != null && !data.canCheckIn && <p className="small muted">Điểm danh mở khi danh sách đầy đủ, đơn đã xác nhận và trong khoảng từ ngày trước khởi hành đến hết ngày kết thúc.</p>}
      </>}
      <button className="text-btn passenger-history-toggle" onClick={() => setHistory(v => !v)} aria-expanded={history}>{history ? 'Ẩn lịch sử điểm danh' : 'Xem lịch sử điểm danh'}</button>
      {history && <History key={historyRevision} bookingId={bookingId} admin={admin} scheduleId={scheduleId} />}
    </>}
    {selection && <Modal title="Xác nhận điểm danh hành khách" onClose={() => { if (!busy) setSelection(null); }}><form className="form-stack" onSubmit={mark}>
      <p><strong>{selection.fullName}</strong></p><label className="field">Trạng thái<select value={status} onChange={e => setStatus(e.target.value)} disabled={busy || stale}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <p className="small muted">Thay đổi được lưu kèm hướng dẫn viên thực hiện và thời gian cập nhật.</p>
      {failure && <p className="notice notice-error" role="alert">{failure}</p>}
      <div className="passenger-actions"><button className="btn" disabled={busy || stale}>{busy ? 'Đang lưu…' : 'Lưu điểm danh'}</button><button type="button" className="btn btn-outline" disabled={busy} onClick={() => { setSelection(null); reload(); }}>{stale ? 'Đóng và tải lại' : 'Hủy'}</button></div>
    </form></Modal>}
  </section>;
}
