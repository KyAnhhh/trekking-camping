import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  Award,
  CheckCircle2,
  Compass,
  Copy,
  ExternalLink,
  Flame,
  Mountain,
  Printer,
  Shield,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { bookingService } from "../../api/bookingService";
import { dateLabel } from "../../utils/tour";
import "./certificate.css";

export default function CertificateModal({
  bookingId,
  admin = false,
  onClose,
}) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [qrMap, setQrMap] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    bookingService
      .getCertificates(bookingId, admin)
      .then((res) => {
        if (!isMounted) return;
        const list = res.data?.data || [];
        setCertificates(list);
        setLoading(false);

        // Generate QR codes for all certificates
        list.forEach((cert, idx) => {
          const targetUrl = cert.verificationUrl || `${window.location.origin}/certificate/verify/${cert.certificateCode}`;
          QRCode.toDataURL(targetUrl, {
            width: 200,
            margin: 1,
            color: {
              dark: "#1e3a2f",
              light: "#ffffff",
            },
          })
            .then((url) => {
              if (isMounted) {
                setQrMap((prev) => ({ ...prev, [idx]: url }));
              }
            })
            .catch((err) => console.error("QR Code Error:", err));
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err.response?.data?.message ||
            "Không thể tải giấy chứng nhận. Vui lòng thử lại sau."
        );
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingId, admin]);

  const activeCert = certificates[selectedIndex] || null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!activeCert) return;
    const url =
      activeCert.verificationUrl ||
      `${window.location.origin}/certificate/verify/${activeCert.certificateCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return createPortal(
    <div
      className="cert-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="cert-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="cert-modal-toolbar">
          {certificates.length > 1 ? (
            <div className="cert-pax-tabs">
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
                <Users size={15} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Chứng nhận:
              </span>
              {certificates.map((c, idx) => (
                <button
                  key={c.certificateCode || idx}
                  type="button"
                  className={`cert-pax-tab ${selectedIndex === idx ? "active" : ""}`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  #{idx + 1} {c.recipientName}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>
              🎖️ Giấy chứng nhận hoàn thành hành trình
            </div>
          )}

          <div className="cert-modal-actions">
            <button
              type="button"
              className="cert-btn cert-btn-copy"
              onClick={handleCopyLink}
              title="Sao chép liên kết chứng thực công khai"
              disabled={!activeCert}
            >
              <Copy size={15} /> {copied ? "Đã sao chép!" : "Copy Link"}
            </button>
            <button
              type="button"
              className="cert-btn cert-btn-print"
              onClick={handlePrint}
              title="In ra giấy hoặc lưu thành tệp PDF khổ A4 ngang"
              disabled={!activeCert}
            >
              <Printer size={15} /> In / Lưu PDF (A4)
            </button>
            <button
              type="button"
              className="cert-btn-close"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div className="cert-scroll-view">
          {loading ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "#64748b" }}>
              <div className="spinner" style={{ margin: "0 auto 1rem auto" }} />
              Đang chuẩn bị phôi giấy chứng nhận...
            </div>
          ) : error ? (
            <div className="cert-ineligible-box">
              <h3>Chưa thể cấp chứng nhận</h3>
              <p>{error}</p>
            </div>
          ) : !activeCert ? (
            <div className="cert-ineligible-box">
              <h3>Không tìm thấy dữ liệu</h3>
              <p>Chưa có dữ liệu thành viên để xuất chứng nhận cho đơn này.</p>
            </div>
          ) : (
            <div className="certificate-document" id="printable-certificate">
              <div className="cert-inner-border">
                {/* 4 Corner Ornaments */}
                <div className="cert-corner top-left" />
                <div className="cert-corner top-right" />
                <div className="cert-corner bottom-left" />
                <div className="cert-corner bottom-right" />

                {/* Header */}
                <header className="cert-header">
                  <div className="cert-brand">
                    <Mountain size={16} color="#0f766e" /> TREK & CAMP VIETNAM · BƯỚC RA THIÊN NHIÊN
                  </div>
                  <div className="cert-title-sub">
                    HỆ THỐNG GHI NHẬN THÀNH TÍCH DÃ NGOẠI & THÁM HIỂM
                  </div>
                  <h1 className="cert-main-title">GIẤY CHỨNG NHẬN CHINH PHỤC</h1>
                  <p className="cert-certifies-text">
                    Trân trọng ghi nhận và trao tặng danh hiệu dã ngoại cho du khách:
                  </p>
                </header>

                {/* Recipient */}
                <section className="cert-recipient-section">
                  <h2 className="cert-recipient-name">{activeCert.recipientName}</h2>
                  <p className="cert-congrats-text">
                    Đã xuất sắc hoàn thành trọn vẹn chuyến thám hiểm{" "}
                    <strong>{activeCert.tourTitle}</strong> tại{" "}
                    <strong>{activeCert.destination}</strong>, thể hiện tinh thần bền bỉ,
                    tôn trọng thiên nhiên và vượt qua giới hạn của bản thân.
                  </p>
                </section>

                {/* Stats & Badge Rank */}
                <div className="cert-stats-row">
                  <div className="cert-stat-item">
                    <div className="cert-stat-val">
                      {activeCert.distanceKm ? `${activeCert.distanceKm} km` : "15-25 km"}
                    </div>
                    <div className="cert-stat-lbl">Quãng đường</div>
                  </div>
                  <div className="cert-stat-item">
                    <div className="cert-stat-val">
                      {activeCert.maxAltitudeM ? `${activeCert.maxAltitudeM} m` : "1.800+ m"}
                    </div>
                    <div className="cert-stat-lbl">Độ cao đỉnh</div>
                  </div>
                  <div className="cert-stat-item">
                    <div className="cert-stat-val">
                      {activeCert.durationDays || 2}N{activeCert.durationNights || 1}Đ
                    </div>
                    <div className="cert-stat-lbl">Thời lượng</div>
                  </div>
                  <div className="cert-stat-item">
                    <div className="cert-stat-val">
                      Cấp {activeCert.difficultyLevel || 2}/5
                    </div>
                    <div className="cert-stat-lbl">Độ khó</div>
                  </div>

                  {/* Badge */}
                  <div
                    className={`cert-badge-rank ${
                      activeCert.badgeRank?.toLowerCase() || "silver"
                    }`}
                  >
                    {activeCert.badgeRank === "GOLD" ? (
                      <Trophy size={16} />
                    ) : activeCert.badgeRank === "SILVER" ? (
                      <Award size={16} />
                    ) : (
                      <Flame size={16} />
                    )}
                    <span>{activeCert.badgeRank} SUMMIT</span>
                  </div>
                </div>

                {/* Footer */}
                <footer className="cert-footer">
                  {/* Left: QR & Code */}
                  <div className="cert-seal-box">
                    {qrMap[selectedIndex] && (
                      <img
                        className="cert-qr"
                        src={qrMap[selectedIndex]}
                        alt="QR Code Xác thực chứng nhận"
                        title="Quét để xác thực online"
                      />
                    )}
                    <div className="cert-code-meta">
                      <span>Mã chứng nhận:</span>
                      <strong>{activeCert.certificateCode}</strong>
                      <span>Mã đơn: #{activeCert.bookingCode}</span>
                    </div>
                  </div>

                  {/* Center: Official Seal */}
                  <div className="cert-stamp-col">
                    <div className="cert-stamp-seal">
                      <Shield size={20} />
                      <span>TREK & CAMP</span>
                      <span>CHỨNG NHẬN</span>
                      <span style={{ fontSize: "8px" }}>OFFICIAL SEAL</span>
                    </div>
                  </div>

                  {/* Right: Signature */}
                  <div className="cert-sign-col">
                    <div className="cert-sign-date">
                      Ngày cấp: {activeCert.issuedDate}
                    </div>
                    <div className="cert-sign-handwriting">
                      {activeCert.leadGuideName?.split(" ")[0] || "TrekCamp"}
                    </div>
                    <div className="cert-sign-name">
                      {activeCert.leadGuideName || "Nguyễn Hoàng Nam"}
                    </div>
                    <div className="cert-sign-role">
                      Trưởng đoàn Hướng dẫn viên
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
