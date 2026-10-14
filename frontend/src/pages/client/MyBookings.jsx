import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Users, CheckCircle2 } from "lucide-react";
import { bookingService } from "../../api/bookingService";
import useResource from "../../hooks/useResource";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { money, dateLabel } from "../../utils/tour";
const loadBookings = async () =>
  (await bookingService.getMyBookings()).data.data;
const statuses = {
  COMPLETED: "Đã hoàn thành",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};
export default function MyBookings() {
  const { data, loading, error, reload } = useResource(loadBookings);
  const { state } = useLocation();
  return (
    <div className="container page-space">
      <header className="page-heading">
        <p className="eyebrow">NHỮNG BƯỚC CHÂN SẮP TỚI</p>
        <h1>Chuyến đi của tôi.</h1>
        <p>
          Theo dõi những hành trình bạn đã chọn và chuẩn bị cho ngày lên đường.
        </p>
      </header>
      {state?.bookingCode && (
        <div className="notice notice-success" role="status">
          <CheckCircle2 size={21} />
          <span>
            Đã tạo đơn <strong>{state.bookingCode}</strong>. Đơn đang chờ xác
            nhận.
          </span>
        </div>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState
          error
          title="Chưa tải được đơn đặt tour"
          description={error}
          onRetry={reload}
        />
      ) : !data?.length ? (
        <EmptyState
          title="Hành trình đầu tiên đang chờ bạn"
          description="Khám phá các tour và chọn ngày khởi hành phù hợp."
        >
          <Link className="btn" to="/tours">
            Tìm chuyến đi <ArrowUpRight size={18} />
          </Link>
        </EmptyState>
      ) : (
        <div className="bookings-list">
          {data.map((booking) => (
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-top">
                <span className="small muted">
                  Mã đặt tour · {booking.bookingCode}
                </span>
                <span
                  className={
                    "status-badge status-" + booking.status.toLowerCase()
                  }
                >
                  {statuses[booking.status] || booking.status}
                </span>
              </div>
              <h2>
                <Link to={"/tours/" + booking.tourSlug}>
                  {booking.tourTitle}
                </Link>
              </h2>
              <div className="detail-meta">
                <span>
                  <CalendarDays size={17} />
                  {dateLabel(booking.departureDate)}
                </span>
                <span>
                  <Users size={17} />
                  {booking.numberOfPax} người
                </span>
              </div>
              <div className="booking-card-bottom">
                <div>
                  <span className="small muted">Tổng giá trị đơn</span>
                  <strong>{money(booking.totalAmount)}</strong>
                </div>
                <Link
                  className="btn btn-outline btn-small"
                  to={"/my-bookings/" + booking.id}
                >
                  Xem đơn & thanh toán <ArrowUpRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
