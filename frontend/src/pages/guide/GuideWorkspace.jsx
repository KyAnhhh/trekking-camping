import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { guideWorkspaceService } from '../../api/guideWorkspaceService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import AdminPager from '../../components/common/AdminPager';
import { dateLabel } from '../../utils/tour';
import '../../styles/workspace.css';
export default function GuideWorkspace() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get('page')) || 0);
  const load = useCallback(async () => (await guideWorkspaceService.trips(page)).data.data, [page]);
  const { data, loading, error, reload } = useResource(load);
  return <div className="container workspace-page">
    <header className="admin-page-heading"><div><p className="eyebrow">KHÔNG GIAN HƯỚNG DẪN VIÊN</p><h1>Lịch dẫn đoàn của tôi.</h1><p>Các chuyến được phân công, hiển thị theo ngày khởi hành mới nhất.</p></div><button className="btn btn-outline" disabled={loading} onClick={reload}>Tải lại</button></header>
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa mở được lịch làm việc" description={error} onRetry={reload} /> : <>
      {!data?.items.length ? <EmptyState title="Chưa có lịch phân công" description="Liên hệ quản trị viên để được phân công vào lịch khởi hành." /> : <div className="workspace-grid">{data.items.map(trip => <article className="panel guide-trip" key={trip.id}>
        <span className="status-badge">{trip.role === 'LEAD' ? 'Trưởng đoàn' : 'Hỗ trợ đoàn'}</span><h2>{trip.title}</h2>
        <p><CalendarDays size={17} />{dateLabel(trip.departureDate)} – {dateLabel(trip.returnDate)}</p>
        <p><MapPin size={17} />{trip.pickupPoint || 'Điểm đón chưa cập nhật'}</p>
        <p className="small muted">{trip.pickupAt ? `Đón khách: ${new Date(trip.pickupAt).toLocaleString('vi-VN')}` : 'Giờ đón chưa cập nhật'} · {({OPEN:'Đang mở',FULL:'Đã đủ chỗ',CLOSED:'Đã đóng',CANCELLED:'Đã hủy'})[trip.status] || trip.status}</p>
        <Link className="btn btn-outline btn-small" to={'/guide-workspace/' + trip.id}>Danh sách khách & điểm danh →</Link>
      </article>)}</div>}
      <AdminPager data={data} onPage={p => setParams({ page: String(p) })} />
    </>}
  </div>;
}
