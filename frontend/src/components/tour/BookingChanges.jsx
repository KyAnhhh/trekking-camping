import { useCallback, useState } from 'react';
import api from '../../api/axiosClient';
import { tourApi } from '../../api/tourService';
import useResource from '../../hooks/useResource';
import { money, dateLabel, errorMessage, todayInVietnam } from '../../utils/tour';
import './booking-changes.css';

const statuses = { PENDING: 'Chờ xử lý', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
export default function BookingChanges({ booking, admin, onSaved }) {
  const prefix = `/api/${admin ? 'admin/' : ''}bookings/${booking.id}/change-requests`;
  const load = useCallback(async () => (await api.get(prefix)).data.data, [prefix]);
  const { data, loading, error, reload } = useResource(load);
  const [type, setType] = useState('CANCEL'), [target, setTarget] = useState(''), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [notes, setNotes] = useState({});
  const active = ['PENDING', 'CONFIRMED'].includes(booking.status) && booking.departureDate > todayInVietnam();
  const optionsLoad = useCallback(async () => {
    if (admin || type !== 'RESCHEDULE' || !active) return null;
    const tour = (await tourApi.getTourBySlug(booking.tourSlug)).data.data;
    const schedules = (await tourApi.getSchedules(tour.id)).data.data;
    return { amount: Number(tour.pricePerPax) * booking.numberOfPax, schedules: schedules.filter(s => s.id !== booking.scheduleId && s.status === 'OPEN' && s.departureDate > todayInVietnam() && s.availableSlots >= booking.numberOfPax) };
  }, [admin, type, active, booking.tourSlug, booking.numberOfPax, booking.scheduleId]);
  const options = useResource(optionsLoad);
  async function execute(operation) {
    if (busy) return; setBusy(true); setFailure('');
    try { await operation(); setReason(''); reload(); onSaved(); window.dispatchEvent(new Event('notifications:changed')); }
    catch (e) { setFailure(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <section className="panel booking-changes">
    <h2>Yêu cầu đổi lịch / hủy đơn</h2>
    <p>Yêu cầu chờ duyệt không giữ chỗ lịch mới và không gia hạn giữ chỗ của đơn. Hoàn tiền (nếu có) được đối soát riêng.</p>
    {failure && <p className="notice notice-error" role="alert">{failure}</p>}
    {loading ? <p role="status">Đang tải yêu cầu…</p> : error ? <div role="alert"><p>{error}</p><button className="btn btn-outline" onClick={reload}>Thử lại</button></div> : <>
      {!data?.length && <p className="muted">Chưa có yêu cầu.</p>}
      {data?.map(row => <article className="booking-change-item" key={row.id}>
        <h3>#{row.id} · {row.type === 'CANCEL' ? 'Hủy đơn' : 'Đổi lịch'} · {statuses[row.status]}</h3>
        <p>{new Date(row.createdAt).toLocaleString('vi-VN')}</p>
        <p className="booking-change-note"><strong>Lý do: </strong>{row.reason}</p>
        {row.targetScheduleId && <><p>Lịch mới #{row.targetScheduleId}: {row.targetSnapshot}</p><p>Tổng tiền đã xác nhận khi gửi: {money(row.quotedAmount)}</p></>}
        {row.adminNote && <p className="booking-change-note"><strong>Phản hồi quản trị: </strong>{row.adminNote}</p>}
        {admin && row.status === 'PENDING' && <div>
          <label>Ghi chú xử lý (bắt buộc)<textarea maxLength={1000} value={notes[row.id] || ''} disabled={busy} onChange={e => setNotes(old => ({ ...old, [row.id]: e.target.value }))} /></label>
          <div className="booking-change-actions">{['REJECTED', 'APPROVED'].map(decision => <button className={'btn' + (decision === 'REJECTED' ? ' btn-outline' : '')} key={decision} disabled={busy || !notes[row.id]?.trim() || (decision === 'APPROVED' && !active)} onClick={() => execute(() => api.put(`${prefix}/${row.id}`, { decision, note: notes[row.id] }))}>{decision === 'APPROVED' ? 'Duyệt yêu cầu' : 'Từ chối'}</button>)}</div>
        </div>}
      </article>)}
      {!admin && active && !data?.some(row => row.status === 'PENDING') && <form onSubmit={e => { e.preventDefault(); execute(() => api.post(prefix, { type, reason, targetScheduleId: type === 'RESCHEDULE' ? Number(target) : null, expectedAmount: type === 'RESCHEDULE' ? options.data?.amount : null })); }}>
        <label>Loại yêu cầu<select value={type} disabled={busy} onChange={e => { setType(e.target.value); setTarget(''); }}><option value="CANCEL">Hủy đơn</option><option value="RESCHEDULE">Đổi lịch cùng tour</option></select></label>
        {type === 'RESCHEDULE' && <>
          {options.loading ? <p>Đang tải lịch…</p> : options.error ? <p role="alert">{options.error} <button type="button" onClick={options.reload}>Thử lại</button></p> : <label>Lịch muốn đổi<select required value={target} disabled={busy} onChange={e => setTarget(e.target.value)}><option value="">Chọn lịch</option>{options.data?.schedules.map(s => <option key={s.id} value={s.id}>{dateLabel(s.departureDate)} – {dateLabel(s.returnDate)} · {s.availableSlots} chỗ</option>)}</select></label>}
          {!options.loading && !options.error && !options.data?.schedules.length && <p>Chưa có lịch khác đủ chỗ.</p>}
          {options.data && <p>Tổng tiền dự kiến: <strong>{money(options.data.amount)}</strong> · Chênh lệch: {money(options.data.amount - Number(booking.totalAmount))}. Gửi yêu cầu đồng nghĩa xác nhận tổng tiền này. Đơn đã thanh toán có chênh lệch cần đối soát riêng.</p>}
        </>}
        <label>Lý do<textarea required maxLength={1000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label>
        <button className="btn" disabled={busy || !reason.trim() || (type === 'RESCHEDULE' && (!target || options.loading || !!options.error))}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
      </form>}
    </>}
  </section>;
}
