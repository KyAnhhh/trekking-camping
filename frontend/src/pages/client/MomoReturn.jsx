import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { paymentService } from "../../api/paymentService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { paymentStatuses } from "./BookingDetail";

export default function MomoReturn() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const loader = useCallback(async () => {
    if (!orderId || !/^MM-[a-f0-9-]{36}$/.test(orderId))
      throw new Error("Invalid order ID");
    // Redirect resultCode/amount are untrusted. Only the backend queries MoMo.
    return (await paymentService.refresh(orderId)).data.data;
  }, [orderId]);
  const { data, loading, error, reload } = useResource(loader);
  return (
    <div className="container page-space">
      <header className="page-heading">
        <p className="eyebrow">MOMO SANDBOX</p>
        <h1>Kết quả thanh toán.</h1>
      </header>
      {loading ? (
        <LoadingSpinner label="Đang đối soát với MoMo..." />
      ) : error ? (
        <EmptyState
          error
          title="Chưa xác minh được thanh toán"
          description={
            orderId
              ? error
              : "Thiếu mã giao dịch. Hãy mở đơn đặt tour để kiểm tra."
          }
          onRetry={orderId ? reload : undefined}
        />
      ) : (
        <section className="panel payment-summary">
          <h2>{paymentStatuses[data.status] || "Đang kiểm tra"}</h2>
          {data.status === "PENDING" && (
            <>
              <p>
                MoMo chưa trả kết quả cuối cùng. Bạn có thể kiểm tra lại sau ít
                phút.
              </p>
              <button className="btn btn-outline" onClick={reload}>
                Kiểm tra lại
              </button>
            </>
          )}
          {data.status === "REFUND_REQUIRED" && (
            <p>
              Đã ghi nhận tiền nhưng đơn chưa thể được xác nhận. Vui lòng liên
              hệ quản trị viên.
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
