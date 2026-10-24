import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosClient';
import useResource from '../../hooks/useResource';
import AdminPager from '../common/AdminPager';
import './booking-changes.css';
export default function BookingChangeQueue() {
  const [page, setPage] = useState(0);
  const load = useCallback(async () => (await api.get('/api/admin/booking-change-requests', { params: { page } })).data.data, [page]);
  const { data, loading, error, reload } = useResource(load);
  return <section className="panel"><div className="list-toolbar"><h2>Yêu cầu đổi lịch / hủy chờ duyệt</h2><button className="btn btn-outline btn-small" disabled={loading} onClick={reload}>Tải lại yêu cầu</button></div>
    {loading ? <p role="status">Đang tải…</p> : error ? <p role="alert">{error}</p> : <>
      {!data?.items.length && <p>Không có yêu cầu chờ xử lý.</p>}
      {data?.items.map(row => <article key={row.id} className="booking-change-item"><p>Yêu cầu #{row.id} · Đơn #{row.bookingId} · {row.type === 'CANCEL' ? 'Hủy đơn' : 'Đổi lịch'}</p><p>{row.reason}</p><Link className="btn btn-outline btn-small" to={`/admin/bookings/${row.bookingId}`}>Xem và xử lý →</Link></article>)}
      <AdminPager data={data} onPage={setPage} />
    </>}
  </section>;
}
