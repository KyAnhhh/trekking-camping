import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { operationsService } from '../../api/operationsService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import AdminPager from '../../components/common/AdminPager';
import { money, dateLabel } from '../../utils/tour';
const filters = { ALL: 'Tất cả', REVIEW_REQUIRED: 'Chờ duyệt tham gia', PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' };
export default function AdminBookings() {
  const [params, setParams] = useSearchParams();
  const queue = params.get('queue') || 'ALL', page = Math.max(0, Number(params.get('page')) || 0);
  const load = useCallback(async () => (await operationsService.bookings(queue, page)).data.data, [queue, page]);
  const { data, loading, error, reload } = useResource(load);
  return <>
    <header className="page-heading"><p className="eyebrow">QUẢN LÝ CHUYẾN ĐI</p><h1>Đơn đặt tour.</h1><p>Duyệt điều kiện tham gia và kiểm tra thanh toán trong chi tiết đơn.</p></header>
    <div className="list-toolbar"><label>Bộ lọc đơn <select value={queue} onChange={e => setParams({ queue: e.target.value, page: '0' })}>{Object.entries(filters).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label><button className="btn btn-outline btn-small" onClick={reload} disabled={loading}>Tải lại</button></div>
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được đơn" description={error} onRetry={reload} /> : <>
      {!data?.items.length ? <EmptyState title="Không có đơn trong bộ lọc này" /> : <div className="bookings-list">{data.items.map(b => <article className="booking-card" key={b.id}>
        <div className="booking-card-top"><span>{b.code} · {b.contactName}</span><span className={'status-badge status-' + b.status.toLowerCase()}>{filters[b.status] || b.status}</span></div>
        <h2>{b.tour}</h2><p>{dateLabel(b.departureDate)} · {b.people} người</p>
        {b.participationStatus === 'REVIEW_REQUIRED' && <p className="notice">Cần duyệt điều kiện tham gia{b.deadline ? ' · Hạn: ' + new Date(b.deadline).toLocaleString('vi-VN') : ''}</p>}
        <div className="booking-card-bottom"><strong>{money(b.amount)}</strong><Link className="btn btn-outline btn-small" to={'/admin/bookings/' + b.id}>Xem và xử lý đơn →</Link></div>
      </article>)}</div>}
      <AdminPager data={data} onPage={p => setParams({ queue, page: String(p) })} />
    </>}
  </>;
}
