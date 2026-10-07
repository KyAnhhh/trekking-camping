import { Link } from 'react-router-dom';
import { Mountain, BookOpen, ArrowUpRight, Users, Plus } from 'lucide-react';
import { tourApi } from '../../api/tourService';
import { adminService } from '../../api/adminService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
const loadOverview = async () => {
  const results = await Promise.allSettled([
    tourApi.getAllTours(),
    adminService.getUsers(),
    adminService.getFiles(),
  ]);
  return results.map((result) => (result.status === 'fulfilled' ? result.value.data.data : null));
};
export default function Dashboard() {
  const { data, loading, reload } = useResource(loadOverview);
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">TREK & CAMP / QUẢN TRỊ</p>
          <h1>Một ngày mới, những hành trình mới.</h1>
          <p className="muted">Chuẩn bị nội dung và thông tin để khách sẵn sàng lên đường.</p>
        </div>
        <Link className="btn" to="/admin/tours?create=1">
          <Plus size={18} />
          Tạo tour
        </Link>
      </header>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="stats-grid">
          {[
            { label: 'Tour đang hiển thị', icon: Mountain, to: '/admin/tours' },
            { label: 'Tài khoản người dùng', icon: Users, to: '/admin/users' },
            { label: 'Tài liệu tri thức', icon: BookOpen, to: '/admin/knowledge' },
          ].map(({ label, icon: Icon, to }, index) => (
            <Link key={to} to={to} className="stat-card">
              <Icon size={23} />
              <strong>{data?.[index]?.length ?? '—'}</strong>
              <span>
                {label}
                <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      )}
      {data?.some((item) => item === null) && (
        <div role="alert" className="notice notice-error">
          Một số dữ liệu chưa tải được.{' '}
          <button className="text-btn" onClick={reload}>
            Thử lại
          </button>
        </div>
      )}
      <div className="admin-two-col">
        <section className="panel">
          <p className="eyebrow">CHUẨN BỊ MỘT CHUYẾN ĐI</p>
          <h2>Từ thông tin đến lịch khởi hành</h2>
          <ol className="task-list">
            <li>
              <strong>Tạo thông tin tour</strong>
              <p>Tên, địa điểm, thời lượng, độ khó và giá mỗi người.</p>
            </li>
            <li>
              <strong>Bổ sung lịch trình & trang bị</strong>
              <p>Giúp khách hiểu từng ngày và những gì cần mang theo.</p>
            </li>
            <li>
              <strong>Mở lịch khởi hành</strong>
              <p>Chọn ngày, số chỗ và thông tin hướng dẫn viên.</p>
            </li>
          </ol>
          <Link className="text-link" to="/admin/tours">
            Quản lý tour <ArrowUpRight size={17} />
          </Link>
        </section>
        <section className="panel green-panel">
          <BookOpen size={30} strokeWidth={1.4} />
          <h2>
            Tri thức tốt.
            <br />
            Tư vấn rõ ràng.
          </h2>
          <p>Cập nhật tài liệu để trợ lý có thêm thông tin về các chuyến đi và cách chuẩn bị.</p>
          <Link className="btn btn-lime" to="/admin/knowledge">
            Mở kho tri thức <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
    </>
  );
}
