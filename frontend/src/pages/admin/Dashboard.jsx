import { Link } from 'react-router-dom';
import { operationsService } from '../../api/operationsService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import DashboardCharts from '../../components/admin/DashboardCharts';
const load = async () => (await operationsService.overview()).data.data;
export default function Dashboard() {
  const { data, loading, error, reload } = useResource(load);
  return <>
    <header className="admin-page-heading"><div><p className="eyebrow">ĐIỀU HÀNH CHUYẾN ĐI</p><h1>Tổng quan nghiệp vụ.</h1><p className="muted">Ưu tiên các đơn và giao dịch cần xử lý.</p></div><button className="btn btn-outline" onClick={reload} disabled={loading}>Tải lại</button></header>
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được tổng quan" description={error} onRetry={reload} /> : data && <>
      <div className="stats-grid">{[
        ['Booking chờ duyệt tham gia', data.awaitingReview, '/admin/bookings?queue=REVIEW_REQUIRED'],
        ['Giao dịch chưa có kết quả cuối', data.pendingPayments, '/admin/payments?status=PENDING'],
        ['Giao dịch cần xử lý hoàn tiền', data.refundRequired, '/admin/payments?status=REFUND_REQUIRED'],
      ].map(([label, count, to]) => <Link className="stat-card" to={to} key={to}><strong>{count}</strong><span>{label} →</span></Link>)}</div>
      <DashboardCharts data={data} />
      <div className="admin-two-col">
        <section className="panel"><h2>Đánh giá của khách</h2><p>{data.visibleReviews} đang hiển thị · {data.hiddenReviews} đã ẩn</p><Link className="text-link" to="/admin/reviews">Quản lý đánh giá →</Link></section>
        <section className="panel green-panel"><h2>Tri thức theo tour hiện tại</h2><p>Sau khi sửa tour, lịch trình hoặc trang bị, đồng bộ lại kho tri thức. Chatbot sẽ bỏ qua bản tour có nội dung đã cũ.</p><Link className="btn btn-lime" to="/admin/knowledge">Mở kho tri thức →</Link></section>
      </div>
    </>}
  </>;
}
