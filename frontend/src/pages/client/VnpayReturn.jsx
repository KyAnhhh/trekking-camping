import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { paymentService } from "../../api/paymentService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { paymentStatuses } from "./BookingDetail";

export default function VnpayReturn() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const validReference = /^VN\d{14}[a-f0-9]{32}$/.test(orderId || "");
  const loader = useCallback(async () => {
    if (!validReference) throw new Error("Invalid transaction reference");
    // Backend already verified the signed Return before redirecting here.
    // Read status from DB as the authenticated owner; never trust URL status/amount.
    return (await paymentService.refresh(orderId)).data.data;
  }, [orderId, validReference]);
  const { data, loading, error, reload } = useResource(loader);
  return (
    <div className="container page-space">
      <header className="page-heading">
        <p className="eyebrow">VNPAY SANDBOX</p>
        <h1>Kết quả thanh toán.</h1>
      </header>
      {loading ? (
        <LoadingSpinner label="Đang tải kết quả đã xác minh..." />
      ) : error || !data ? (
        <EmptyState
          error
          title="Chưa xác minh được thanh toán"
          description={
            validReference
              ? error
              : "Thiếu hoặc sai mã giao dịch. Hãy mở đơn đặt tour để kiểm tra."
          }
          onRetry={validReference ? reload : undefined}
        />
      ) : (
        <section className="panel payment-summary">
          <h2>{paymentStatuses[data.status] || "Đang kiểm tra"}</h2>
          {data.status === "SUCCESS" && (
            <p>Đã ghi nhận thanh toán VNPAY và xác nhận đơn đặt tour.</p>
          )}
          {["FAILED", "EXPIRED"].includes(data.status) && (
            <p>
              Thanh toán chưa thành công hoặc đã bị hủy tại VNPAY. Bạn có thể mở
              đơn để thử lại.
            </p>
          )}
          {data.status === "PENDING" && (
            <>
              <p>
                Chưa có kết quả thanh toán cuối cùng được xác minh. Vui lòng
                liên hệ quản trị viên nếu bạn đã thanh toán.
              </p>
              <button className="btn btn-outline" onClick={reload}>
                Tải lại trạng thái
              </button>
            </>
          )}
          {data.status === "REFUND_REQUIRED" && (
            <p>
              Đã ghi nhận tiền nhưng đơn không còn đủ điều kiện xác nhận. Vui
              lòng liên hệ quản trị viên để xử lý hoàn tiền.
            </p>
          )}
          <Link className="btn" to={"/my-bookings/" + data.bookingId}>
            Xem đơn đặt tour
          </Link>
        </section>
      )}
      <Link className="back-link" to="/my-bookings">
        Tất cả chuyến đi của tôi
      </Link>
    </div>
  );
}
