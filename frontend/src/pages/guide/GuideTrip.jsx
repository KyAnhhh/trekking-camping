import { useCallback, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { guideWorkspaceService } from '../../api/guideWorkspaceService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import AdminPager from '../../components/common/AdminPager';
import PassengerPanel from '../../components/tour/PassengerPanel';
import { dateLabel } from '../../utils/tour';
import '../../styles/workspace.css';
export default function GuideTrip() {
  const { id } = useParams(); const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get('page')) || 0);
  const load = useCallback(async () => (await guideWorkspaceService.roster(id, page)).data.data, [id, page]);
  const { data, loading, error, reload } = useResource(load);
  const [expanded, setExpanded] = useState(null);

  const totalPax = data?.guests?.items?.reduce((sum, g) => sum + (g.people || 0), 0) || 0;
  const totalPresent = data?.guests?.items?.reduce((sum, g) => sum + (g.presentCount || 0), 0) || 0;
  const attendanceRate = totalPax > 0 ? Math.round((totalPresent / totalPax) * 100) : 0;

  return <div className="container workspace-page">
    <Link className="text-link" to="/guide-workspace">← Lịch dẫn đoàn</Link>
    <header className="page-heading"><p className="eyebrow">DANH SÁCH ĐOÀN</p><h1>{data?.trip.title || 'Khách tham gia chuyến đi'}</h1>{data && <p>{dateLabel(data.trip.departureDate)} – {dateLabel(data.trip.returnDate)} · {data.trip.pickupPoint || 'Chưa có điểm đón'}</p>}</header>
    <p className="notice">Mở từng đơn để xem tên hành khách và điểm danh. Số điện thoại liên hệ và thao tác điểm danh mở từ ngày trước khởi hành đến hết ngày kết thúc.</p>
    
    {data?.guests?.items?.length > 0 && (
      <div className="attendance-summary-card">
        <div className="attendance-summary-header">
          <div>
            <span className="attendance-summary-label">TIẾN ĐỘ ĐIỂM DANH TỔNG ĐOÀN</span>
            <div className="attendance-summary-pax">
              <strong>{totalPresent}</strong> / {totalPax} khách đã có mặt
            </div>
          </div>
          <div className="attendance-summary-badge" data-complete={totalPresent === totalPax && totalPax > 0}>
            {attendanceRate}%
          </div>
        </div>
        <div className="attendance-progress-track">
          <div 
            className="attendance-progress-fill" 
            style={{ width: `${attendanceRate}%` }} 
          />
        </div>
        <div className="attendance-summary-meta">
          <span>{data.guests.items.length} đơn đặt chỗ trên trang này</span>
          {totalPresent === totalPax && totalPax > 0 ? (
            <span className="attendance-status-done">Đã đủ quân số ✓</span>
          ) : (
            <span className="attendance-status-pending">Còn thiếu {Math.max(0, totalPax - totalPresent)} khách</span>
          )}
        </div>
      </div>
    )}

    <button className="btn btn-outline btn-small" disabled={loading} onClick={reload}>Tải lại danh sách</button>
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được đoàn" description={error} onRetry={reload} /> : <>
      {!data?.guests.items.length ? <EmptyState title="Chưa có đơn đã xác nhận trong đoàn" /> : <div className="workspace-list">{data.guests.items.map(guest => <article className="panel" key={guest.bookingId}>
        <div className="attendance-row"><div><span className="small muted">{guest.code}</span><h2>{guest.contactName}</h2><p>{guest.people} khách · {guest.namedPassengers || 0} đã có tên</p>
          {guest.namedPassengers > 0 ? <p>{guest.presentCount || 0}/{guest.people} đã có mặt</p> : guest.presentCount != null && <p className="small muted">Điểm danh tổng số cũ: {guest.presentCount}/{guest.people}. Chưa xác định danh tính từng người.</p>}
          {guest.contactPhone && <a className="text-link" href={'tel:' + guest.contactPhone}>{guest.contactPhone}</a>}
          {guest.markedAt && <p className="small muted">Cập nhật: {new Date(guest.markedAt).toLocaleString('vi-VN')}</p>}
        </div><button className="btn btn-outline btn-small" aria-expanded={expanded === guest.bookingId} onClick={() => setExpanded(current => current === guest.bookingId ? null : guest.bookingId)}>{expanded === guest.bookingId ? 'Ẩn hành khách' : 'Xem hành khách'}</button></div>
        {expanded === guest.bookingId && <PassengerPanel bookingId={guest.bookingId} scheduleId={id} onMarked={reload} />}
      </article>)}</div>}
      <AdminPager data={data?.guests} busy={loading} onPage={p => { setExpanded(null); setParams({ page: String(p) }); }} />
    </>}
  </div>;
}
