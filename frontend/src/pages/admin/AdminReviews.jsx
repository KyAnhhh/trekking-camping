import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { operationsService } from '../../api/operationsService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import AdminPager from '../../components/common/AdminPager';
import ReviewPhotos from '../../components/tour/ReviewPhotos';
import Modal from '../../components/common/Modal';
import { errorMessage } from '../../utils/tour';
const labels = { ALL: 'Tất cả', VISIBLE: 'Đang hiển thị', HIDDEN: 'Đã ẩn' };
export default function AdminReviews() {
  const [params, setParams] = useSearchParams();
  const visibility = params.get('visibility') || 'ALL', page = Math.max(0, Number(params.get('page')) || 0);
  const load = useCallback(async () => (await operationsService.reviews(visibility, page)).data.data, [visibility, page]);
  const { data, loading, error, reload } = useResource(load);
  const [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  async function moderate() {
    if (busy) return;
    setBusy(true); setFailure('');
    try { await operationsService.moderate(selected.id, selected.approved, !selected.approved); setSelected(null); reload(); }
    catch (e) { setFailure(errorMessage(e)); } finally { setBusy(false); }
  }
  return <>
    <header className="page-heading"><p className="eyebrow">PHẢN HỒI SAU CHUYẾN ĐI</p><h1>Quản lý đánh giá.</h1><p>Ẩn hoặc khôi phục hiển thị; giữ nguyên nội dung và số sao khách đã gửi.</p></header>
    <div className="list-toolbar"><label>Hiển thị đánh giá <select disabled={busy} value={visibility} onChange={e => setParams({ visibility: e.target.value, page: '0' })}>{Object.entries(labels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><button className="btn btn-outline btn-small" disabled={busy || loading} onClick={reload}>Tải lại</button></div>
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được đánh giá" description={error} onRetry={reload} /> : <>
      {!data?.items.length ? <EmptyState title="Không có đánh giá trong bộ lọc này" /> : <div className="bookings-list">{data.items.map(r => <article className="booking-card" key={r.id}>
        <ReviewPhotos reviewId={r.id} mode="admin" />
        <div className="booking-card-top"><strong>{r.author} · {r.rating}/5 sao</strong><span className="status-badge">{r.approved ? 'Đang hiển thị' : 'Đã ẩn'}</span></div>
        <h2>{r.tour}</h2><p className="break-word">{r.comment}</p><p className="muted">{r.createdAt && new Date(r.createdAt).toLocaleString('vi-VN')}</p>
        <div className="booking-card-bottom">{r.bookingId && <Link className="text-link" to={'/admin/bookings/' + r.bookingId}>Xem đơn liên quan →</Link>}<button className="btn btn-outline btn-small" disabled={busy} onClick={() => { setSelected(r); setFailure(''); }}>{r.approved ? 'Ẩn đánh giá' : 'Hiển thị lại'}</button></div>
      </article>)}</div>}
      <AdminPager data={data} busy={busy} onPage={p => setParams({ visibility, page: String(p) })} />
    </>}
    {selected && <Modal title={selected.approved ? 'Ẩn đánh giá?' : 'Hiển thị lại đánh giá?'} onClose={() => { if (!busy) setSelected(null); }}>
      <p>Thao tác ảnh hưởng danh sách và điểm trung bình công khai của tour. Nội dung và số sao được giữ nguyên.</p>
      {failure && <div className="notice notice-error" role="alert">{failure}<button className="text-btn" disabled={busy} onClick={() => { setSelected(null); reload(); }}>Tải lại danh sách</button></div>}
      <button className="btn" disabled={busy} onClick={moderate}>{busy ? 'Đang lưu…' : 'Xác nhận'}</button>
    </Modal>}
  </>;
}
