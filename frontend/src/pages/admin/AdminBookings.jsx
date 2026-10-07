import { Link } from "react-router-dom";
import { bookingService } from "../../api/bookingService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { money, dateLabel } from "../../utils/tour";
const loadBookings = async () => (await bookingService.getAll()).data.data;
const statuses = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};
export default function AdminBookings() {
  const { data, loading, error, reload } = useResource(loadBookings);
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">QUẢN LÝ CHUYẾN ĐI</p>
        <h1>Đơn đặt tour.</h1>
        <p>Kiểm tra thanh toán, thông tin liên hệ và trạng thái từng đơn.</p>
      </header>
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState
          error
          title="Chưa tải được đơn"
          description={error}
          onRetry={reload}
        />
      ) : !data?.length ? (
        <EmptyState title="Chưa có đơn đặt tour" />
      ) : (
        <div className="bookings-list">
          {data.map(({ booking, contactName, payments }) => (
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-top">
                <span className="small muted">
                  {booking.bookingCode} · {contactName}
                </span>
                <span
                  className={
                    "status-badge status-" + booking.status.toLowerCase()
                  }
                >
                  {statuses[booking.status] || booking.status}
                </span>
              </div>
              <h2>{booking.tourTitle}</h2>
              <p>
                {dateLabel(booking.departureDate)} · {booking.numberOfPax} người
              </p>
              {payments.some((p) => p.status === "REFUND_REQUIRED") && (
                <p className="notice notice-error">
                  Có giao dịch cần xử lý hoàn tiền.
                </p>
              )}
              <div className="booking-card-bottom">
                <strong>{money(booking.totalAmount)}</strong>
                <Link
                  className="btn btn-outline btn-small"
                  to={"/admin/bookings/" + booking.id}
                >
                  Xem và xử lý đơn →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
