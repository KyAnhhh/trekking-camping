import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  Calendar,
  CheckCircle2,
  Compass,
  CreditCard,
  MapPin,
  Printer,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { dateLabel, money } from "../../utils/tour";
import "./e-ticket.css";

export default function ETicketModal({
  booking,
  contactName,
  contactPhone,
  contactEmail,
  payments = [],
  leadGuide,
  onClose,
}) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (!booking) return;
    const verifyPayload = JSON.stringify({
      code: booking.bookingCode,
      tour: booking.tourTitle,
      pax: booking.numberOfPax,
      dep: booking.departureDate,
      ret: booking.returnDate,
      contact: contactName,
      status: booking.status,
      v: "1.0",
    });

    QRCode.toDataURL(verifyPayload, {
      width: 250,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [booking, contactName]);

  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const successPayment = payments.find((p) => p.status === "SUCCESS") || payments[0];

  return createPortal(
    <div className="eticket-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="eticket-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Bar (Hidden when printing) */}
        <div className="eticket-actions-top">
          <button
            type="button"
            className="eticket-btn-print"
            onClick={handlePrint}
            title="Lưu file PDF hoặc in trực tiếp"
          >
            <Printer size={16} /> In / Lưu vé PDF
          </button>
          <button
            type="button"
            className="eticket-btn-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Ticket Card */}
        <article className="eticket-card" id="printable-eticket">
          {/* Header */}
          <header className="eticket-header">
            <div className="eticket-brand">
              <h2>
                <Compass size={24} color="#0f766e" /> TREK & CAMP VIETNAM
              </h2>
              <p>Khám phá thiên nhiên · Chinh phục giới hạn</p>
            </div>
            <div className="eticket-doc-type">
              <span>PHIẾU XÁC NHẬN VÉ ĐIỆN TỬ</span>
              <strong>{booking.bookingCode}</strong>
              <div>
                <span className="eticket-badge-confirmed">
                  <CheckCircle2 size={12} style={{ display: "inline", marginRight: 4 }} />
                  ĐÃ XÁC NHẬN & THANH TOÁN
                </span>
              </div>
            </div>
          </header>

          {/* Body Section */}
          <div className="eticket-body">
            <div className="eticket-info">
              <h3 className="eticket-tour-title">{booking.tourTitle}</h3>
              <div className="eticket-grid">
                <div className="eticket-field">
                  <label>
                    <Calendar size={13} style={{ display: "inline", marginRight: 3 }} /> Thời gian
                  </label>
                  <span className="eticket-val">
                    {dateLabel(booking.departureDate)} – {dateLabel(booking.returnDate)}
                  </span>
                </div>

                <div className="eticket-field">
                  <label>
                    <Users size={13} style={{ display: "inline", marginRight: 3 }} /> Số lượng khách
                  </label>
                  <span className="eticket-val">{booking.numberOfPax} người tham gia</span>
                </div>

                <div className="eticket-field">
                  <label>
                    <MapPin size={13} style={{ display: "inline", marginRight: 3 }} /> Điểm tập kết
                  </label>
                  <span className="eticket-val">
                    {booking.meetingPoint || "Trung tâm điều hành Trek & Camp"}
                  </span>
                </div>

                <div className="eticket-field">
                  <label>
                    <ShieldCheck size={13} style={{ display: "inline", marginRight: 3 }} /> Hướng dẫn viên
                  </label>
                  <span className="eticket-val">
                    {leadGuide?.fullName || "Đội ngũ Guide chuyên nghiệp"}
                  </span>
                </div>

                <div className="eticket-field">
                  <label>Đại diện đoàn</label>
                  <span className="eticket-val">{contactName || "Khách hàng"}</span>
                </div>

                <div className="eticket-field">
                  <label>Số điện thoại</label>
                  <span className="eticket-val">{contactPhone || "Chưa cập nhật"}</span>
                </div>

                <div className="eticket-field">
                  <label>
                    <CreditCard size={13} style={{ display: "inline", marginRight: 3 }} /> Tổng thanh toán
                  </label>
                  <span className="eticket-val" style={{ color: "#059669", fontWeight: 700 }}>
                    {money(booking.totalAmount)}
                  </span>
                </div>

                <div className="eticket-field">
                  <label>Cổng thanh toán</label>
                  <span className="eticket-val">
                    {successPayment?.paymentMethod?.includes("VNPAY")
                      ? "VNPAY (Sandbox Verified)"
                      : successPayment?.paymentMethod || "Đã quyết toán"}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code Validation Box */}
            <div className="eticket-qr-box">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`Mã QR Check-in ${booking.bookingCode}`}
                  className="eticket-qr-img"
                />
              ) : (
                <div style={{ width: 140, height: 140, background: "#f1f5f9" }} />
              )}
              <span className="eticket-qr-caption">
                Mã QR Check-in đoàn
                <br />
                <strong>{booking.bookingCode}</strong>
              </span>
            </div>
          </div>

          {/* Perforation line */}
          <div className="eticket-perforation" />

          {/* Footer & Stamp */}
          <footer className="eticket-footer">
            <div className="eticket-notes">
              <h4>Lưu ý quan trọng cho chuyến đi</h4>
              <ul>
                <li>Quý khách vui lòng có mặt tại điểm tập kết trước giờ khởi hành 30 phút.</li>
                <li>Xuất trình mã QR trên vé điện tử này (trên điện thoại hoặc bản in) cho Guide check-in.</li>
                <li>Chuẩn bị giày trekking có độ bám, áo mưa bộ, thuốc cá nhân và nước uống.</li>
                <li>Hotline hỗ trợ khẩn cấp 24/7: <strong>1900 6868</strong> - Trek & Camp Support.</li>
              </ul>
            </div>

            {/* Digital Stamp */}
            <div className="eticket-stamp">
              <span className="eticket-stamp-star">★ ★ ★</span>
              <span>TREK & CAMP</span>
              <span style={{ fontSize: "0.62rem" }}>ĐÃ XÁC NHẬN</span>
              <span style={{ fontSize: "0.5rem" }}>VERIFIED</span>
            </div>
          </footer>
        </article>
      </div>
    </div>,
    document.body
  );
}
