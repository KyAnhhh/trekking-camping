import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import {
  Award,
  CheckCircle2,
  Compass,
  FileCheck2,
  Flame,
  Home,
  Mountain,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { bookingService } from "../../api/bookingService";
import "../../components/tour/certificate.css";

export default function CertificateVerifyPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchCode, setSearchCode] = useState(code || "");
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    bookingService
      .verifyCertificate(code)
      .then((res) => {
        const data = res.data?.data;
        setCert(data);
        setLoading(false);

        const targetUrl = window.location.href;
        QRCode.toDataURL(targetUrl, {
          width: 200,
          margin: 1,
          color: { dark: "#1e3a2f", light: "#ffffff" },
        })
          .then((url) => setQrUrl(url))
          .catch((e) => console.error(e));
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            `Không tìm thấy dữ liệu xác thực cho chứng nhận mã "${code}".`
        );
        setCert(null);
        setLoading(false);
      });
  }, [code]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/certificate/verify/${encodeURIComponent(searchCode.trim())}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container page-space" style={{ maxWidth: "1000px" }}>
      {/* Search Header */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <p className="eyebrow">HỆ THỐNG XÁC THỰC CHỨNG CHỈ TRỰC TUYẾN</p>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Tra cứu & Xác minh Chứng nhận Chinh phục Tour
        </h1>
        <p className="muted" style={{ maxWidth: "600px", margin: "0 auto 1.5rem auto" }}>
          Mỗi giấy chứng nhận của Trek & Camp đều mang một mã định danh duy nhất kèm chữ ký số và con dấu xác thực hành trình dã ngoại.
        </p>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          style={{
            display: "flex",
            maxWidth: "500px",
            margin: "0 auto",
            gap: "0.5rem",
          }}
        >
          <input
            type="text"
            className="input"
            placeholder="Nhập mã chứng nhận (ví dụ: TC-CERT-2026-...)"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            style={{ flex: 1, borderRadius: "8px" }}
          />
          <button type="submit" className="btn" style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
            <Search size={16} /> Kiểm tra
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: "4rem 0", textAlign: "center", color: "#64748b" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem auto" }} />
          Đang truy xuất và xác thực dữ liệu từ hệ sinh thái Trek & Camp...
        </div>
      ) : error ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <ShieldAlert size={48} color="#dc2626" style={{ margin: "0 auto 1rem auto" }} />
          <h2 style={{ color: "#991b1b", fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Chứng nhận không hợp lệ hoặc chưa được kích hoạt
          </h2>
          <p style={{ color: "#7f1d1d", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            {error}
          </p>
          <Link to="/" className="btn btn-outline" style={{ display: "inline-flex", gap: "6px" }}>
            <Home size={16} /> Về trang chủ
          </Link>
        </div>
      ) : cert ? (
        <div>
          {/* Verification Badge Bar */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "12px",
              padding: "1rem 1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  background: "#22c55e",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div>
                <strong style={{ color: "#166534", fontSize: "1.05rem", display: "block" }}>
                  CHỨNG NHẬN HỢP LỆ & CHÍNH THỨC
                </strong>
                <span style={{ fontSize: "0.85rem", color: "#15803d" }}>
                  Phát hành bởi Hệ sinh thái Trek & Camp Vietnam · Ngày cấp: {cert.issuedDate}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                className="cert-btn cert-btn-print"
                onClick={handlePrint}
              >
                <Printer size={16} /> In / Lưu PDF A4
              </button>
            </div>
          </div>

          {/* Render Full Certificate */}
          <div className="cert-scroll-view" style={{ background: "transparent", padding: 0 }}>
            <div className="certificate-document" id="printable-certificate" style={{ margin: "0 auto" }}>
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
                  <h2 className="cert-recipient-name">{cert.recipientName}</h2>
                  <p className="cert-congrats-text">
                    Đã xuất sắc hoàn thành trọn vẹn chuyến thám hiểm{" "}
                    <strong>{cert.tourTitle}</strong> tại{" "}
                    <strong>{cert.destination}</strong>, thể hiện tinh thần bền bỉ,
                    tôn trọng thiên nhiên và vượt qua giới hạn của bản thân.
                  </p>
                </section>

                {/* Stats & Badge Rank */}
                <div className="cert-stats-row">
                  <div className="cert-stat-item">
                    <div className="cert-stat-val">
                      {cert.distanceKm ? `${cert.distanceKm} km` : "15-25 km"}
                    </div>
                    <div className="cert-stat-lbl">Quãng đường</div>
                  </div>
                  <div className="cert-stat-item">
                    <div className="cert-stat-val">
                      {cert.maxAltitudeM ? `${cert.maxAltitudeM} m` : "1.800+ m"}
                    </div>
                    <div className="cert-stat-lbl">Độ cao đỉnh</div>
                  </div>
                  <div className="cert-stat-item">
                    <div className="cert-stat-val">
                      {cert.durationDays || 2}N{cert.durationNights || 1}Đ
                    </div>
                    <div className="cert-stat-lbl">Thời lượng</div>
                  </div>
                  <div className="cert-stat-item">
                    <div className="cert-stat-val">
                      Cấp {cert.difficultyLevel || 2}/5
                    </div>
                    <div className="cert-stat-lbl">Độ khó</div>
                  </div>

                  {/* Badge */}
                  <div
                    className={`cert-badge-rank ${
                      cert.badgeRank?.toLowerCase() || "silver"
                    }`}
                  >
                    {cert.badgeRank === "GOLD" ? (
                      <Trophy size={16} />
                    ) : cert.badgeRank === "SILVER" ? (
                      <Award size={16} />
                    ) : (
                      <Flame size={16} />
                    )}
                    <span>{cert.badgeRank} SUMMIT</span>
                  </div>
                </div>

                {/* Footer */}
                <footer className="cert-footer">
                  {/* Left: QR & Code */}
                  <div className="cert-seal-box">
                    {qrUrl && (
                      <img
                        className="cert-qr"
                        src={qrUrl}
                        alt="QR Code Xác thực chứng nhận"
                        title="Quét để xác thực online"
                      />
                    )}
                    <div className="cert-code-meta">
                      <span>Mã chứng nhận:</span>
                      <strong>{cert.certificateCode}</strong>
                      <span>Mã đơn: #{cert.bookingCode}</span>
                    </div>
                  </div>

                  {/* Center: Official Seal */}
                  <div className="cert-stamp-col">
                    <div className="cert-stamp-seal">
                      <FileCheck2 size={20} />
                      <span>TREK & CAMP</span>
                      <span>CHỨNG NHẬN</span>
                      <span style={{ fontSize: "8px" }}>OFFICIAL SEAL</span>
                    </div>
                  </div>

                  {/* Right: Signature */}
                  <div className="cert-sign-col">
                    <div className="cert-sign-date">
                      Ngày cấp: {cert.issuedDate}
                    </div>
                    <div className="cert-sign-handwriting">
                      {cert.leadGuideName?.split(" ")[0] || "TrekCamp"}
                    </div>
                    <div className="cert-sign-name">
                      {cert.leadGuideName || "Nguyễn Hoàng Nam"}
                    </div>
                    <div className="cert-sign-role">
                      Trưởng đoàn Hướng dẫn viên
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
