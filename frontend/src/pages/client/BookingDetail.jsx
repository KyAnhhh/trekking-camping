import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  RefreshCw,
  Users,
} from "lucide-react";
import { bookingService } from "../../api/bookingService";
import { paymentService } from "../../api/paymentService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import BookingGuideTeam from "../../components/tour/BookingGuideTeam";
import BookingReview from "../../components/tour/BookingReview";
import ParticipationPanel from "../../components/tour/ParticipationPanel";
import PassengerPanel from "../../components/tour/PassengerPanel";
import {
  money,
  dateLabel,
  errorMessage,
  todayInVietnam,
} from "../../utils/tour";

const statuses = {
  COMPLETED: "Đã hoàn thành",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};
export const paymentStatuses = {
  PENDING: "Chờ kết quả thanh toán",
  SUCCESS: "Đã thanh toán",
  FAILED: "Thanh toán không thành công",
  EXPIRED: "Phiên thanh toán đã hết hạn",
  REFUND_REQUIRED: "Cần xử lý hoàn tiền",
};

export default function BookingDetail({ admin = false }) {
  const { id } = useParams();
  const loader = useCallback(
    async () => (await bookingService.getDetail(id, admin)).data.data,
    [id, admin],
  );
  const { data, loading, error, reload } = useResource(loader);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  const action = async (operation) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await operation();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
      setCancelOpen(false);
      reload();
    }
  };
  const pay = () =>
    action(async () => {
      const { data: result } = (await paymentService.start(Number(id))).data;
      if (result.paymentUrl) {
        const url = new URL(result.paymentUrl);
        if (
          url.origin !== "https://sandbox.vnpayment.vn" ||
          url.pathname !== "/paymentv2/vpcpay.html" ||
          url.username ||
          url.password
        ) {
          throw new Error("Invalid payment URL");
        }
        window.location.href = url.href;
      } else {
        setNotice(paymentStatuses[result.status] || "Đã kiểm tra giao dịch.");
      }
    });
  return (
    <div className={admin ? "" : "container page-space"}>
      <Link
        className="back-link"
        to={admin ? "/admin/bookings" : "/my-bookings"}
      >
        <ArrowLeft size={16} /> Danh sách đặt tour
      </Link>
      {actionError && (
        <div className="notice notice-error" role="alert">
          {actionError}
        </div>
      )}
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : error || !data ? (
        <EmptyState
          error
          title="Chưa tải được đơn"
          description={error}
          onRetry={reload}
        />
      ) : (
        <>
          <header className="page-heading">
            <p className="eyebrow">ĐƠN ĐẶT TOUR · {data.booking.bookingCode}</p>
            <h1>{data.booking.tourTitle}</h1>
            <span
              className={
                "status-badge status-" + data.booking.status.toLowerCase()
              }
            >
              {statuses[data.booking.status] || data.booking.status}
            </span>
          </header>
          <ParticipationPanel
            bookingId={id}
            admin={admin}
            bookingStatus={data.booking.status}
            onSaved={reload}
          />
          <PassengerPanel bookingId={id} admin={admin} />
          <div className="booking-layout">
            <section className="panel booking-form">
              <h2>Thông tin chuyến đi</h2>
              <div className="detail-meta">
                <span>
                  <CalendarDays size={18} />
                  {dateLabel(data.booking.departureDate)} –{" "}
                  {dateLabel(data.booking.returnDate)}
                </span>
                <span>
                  <Users size={18} />
                  {data.booking.numberOfPax} người
                </span>
              </div>
              <BookingGuideTeam bookingId={id} admin={admin} />
              <h3>Người liên hệ</h3>
              <p>{data.contactName}</p>
              <p>{data.contactEmail}</p>
              <p>{data.contactPhone}</p>
              <Link
                className="text-link"
                to={"/tours/" + data.booking.tourSlug}
              >
                Xem lịch trình tour →
              </Link>
              <h3>Lịch sử thanh toán</h3>
              {!data.payments.length && (
                <p className="muted">Chưa có giao dịch thanh toán.</p>
              )}
              {data.payments.map((payment) => (
                <article className="payment-row" key={payment.id}>
                  <div>
                    <strong>
                      {paymentStatuses[payment.status] || payment.status}
                    </strong>
                    <p className="small muted payment-reference">
                      {payment.transactionCode}
                    </p>
                    <span>
                      {money(payment.amount)} ·{" "}
                      {payment.paymentMethod === "VNPAY_SANDBOX"
                        ? "VNPAY Sandbox"
                        : payment.paymentMethod === "MOMO_SANDBOX"
                          ? "MoMo Sandbox (giao dịch cũ)"
                          : payment.paymentMethod}
                    </span>
                    {payment.status === "REFUND_REQUIRED" && (
                      <p className="notice">
                        Đã ghi nhận tiền nhưng đơn chưa thể được xác nhận. Vui
                        lòng liên hệ quản trị viên để xử lý hoàn tiền.
                      </p>
                    )}
                  </div>
                  {payment.status === "PENDING" && (
                    <button
                      className="btn btn-outline btn-small"
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          const result = (
                            await paymentService.refresh(
                              payment.transactionCode,
                            )
                          ).data.data;
                          setNotice(
                            (result.status === "PENDING" &&
                            payment.paymentMethod === "VNPAY_SANDBOX"
                              ? "VNPAY chưa có kết quả cuối cùng. Vui lòng kiểm tra lại sau; hệ thống chưa tạo thêm thanh toán."
                              : paymentStatuses[result.status]) ||
                              "Đã kiểm tra giao dịch.",
                          );
                        })
                      }
                    >
                      <RefreshCw size={16} /> Kiểm tra với cổng thanh toán
                    </button>
                  )}
                </article>
              ))}
            </section>
            <aside className="panel payment-summary">
              <p className="eyebrow">TỔNG THANH TOÁN</p>
              <h2>{money(data.booking.totalAmount)}</h2>
              {!admin &&
                data.booking.status === "PENDING" &&
                data.booking.departureDate > todayInVietnam() &&
                !data.payments.some((p) =>
                  ["SUCCESS", "REFUND_REQUIRED"].includes(p.status),
                ) && (
                  <>
                    <p className="muted">
                      Thanh toán trên môi trường thử nghiệm VNPAY. Đơn được xác
                      nhận khi backend nhận kết quả hợp lệ.
                    </p>
                    <button
                      className="btn btn-full"
                      disabled={
                        busy ||
                        (!!data.participationStatus &&
                          data.participationStatus !== "READY")
                      }
                      onClick={pay}
                    >
                      <CreditCard size={18} />{" "}
                      {busy ? "Đang xử lý..." : "Thanh toán VNPAY Sandbox"}
                    </button>
                    {data.participationStatus &&
                      data.participationStatus !== "READY" && (
                        <p className="notice">
                          Hoàn tất khai báo và chờ người phụ trách xem xét trước
                          khi thanh toán.
                        </p>
                      )}
                  </>
                )}
              {data.booking.status === "CONFIRMED" && (
                <p className="notice notice-success">
                  Chuyến đi đã được xác nhận. Hãy chuẩn bị cho ngày lên đường!
                </p>
              )}
              {admin && data.canConfirm && (
                <button
                  className="btn btn-full"
                  disabled={busy}
                  onClick={() => action(() => bookingService.confirm(id))}
                >
                  Xác nhận đơn
                </button>
              )}
              {admin &&
                data.booking.status === "CONFIRMED" &&
                data.booking.returnDate < todayInVietnam() && (
                  <button
                    className="btn btn-full"
                    disabled={busy}
                    onClick={() => action(() => bookingService.complete(id))}
                  >
                    Xác nhận đã hoàn thành chuyến đi
                  </button>
                )}
              {data.canCancel && (
                <button
                  className="btn btn-outline btn-full"
                  disabled={busy}
                  onClick={() => setCancelOpen(true)}
                >
                  Hủy đơn đặt tour
                </button>
              )}
              {!data.canCancel && data.booking.status !== "CANCELLED" && (
                <p className="small muted">
                  Đơn đã thanh toán, đang chờ đối soát hoặc đã đến ngày khởi
                  hành cần được hỗ trợ trước khi hủy.
                </p>
              )}
            </aside>
          </div>
          {!admin && <BookingReview bookingId={id} />}
        </>
      )}
      {cancelOpen && (
        <Modal
          title="Hủy đơn đặt tour?"
          onClose={() => {
            if (!busy) setCancelOpen(false);
          }}
        >
          <p>
            Số chỗ đã giữ sẽ được trả lại cho lịch khởi hành. Nếu muốn đi lại,
            bạn cần tạo đơn mới.
          </p>
          <div className="payment-actions">
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setCancelOpen(false)}
            >
              Giữ lại đơn
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => action(() => bookingService.cancel(id, admin))}
            >
              {busy ? "Đang hủy..." : "Xác nhận hủy"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
