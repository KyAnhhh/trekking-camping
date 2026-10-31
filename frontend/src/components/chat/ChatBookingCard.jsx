import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Calendar,
  Clock3,
  MapPin,
  Mountain,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { chatService } from "../../api/chatService";
import {
  money,
  dateLabel,
  errorMessage,
  tourImage,
  landscape,
  formatDifficulty,
} from "../../utils/tour";

export default function ChatBookingCard({ tour, suggestedPeople = 1 }) {
  const { user } = useContext(AuthContext);
  const [people, setPeople] = useState(suggestedPeople);
  const [quote, setQuote] = useState(null);
  const [contact, setContact] = useState({});
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const requestId = useRef(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (suggestedPeople && suggestedPeople > 0 && !quote) {
      setPeople(Number(suggestedPeople));
    }
  }, [suggestedPeople, quote]);

  const imageSrc = tourImage(tour);

  async function prepare(fresh = false, customPeople = null) {
    if (!user) {
      setError("Vui lòng đăng nhập để tiến hành đặt tour.");
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const targetPeople = customPeople != null ? customPeople : Number(people);
    if (!requestId.current || fresh) requestId.current = crypto.randomUUID();
    try {
      const { data } = await chatService.prepareBooking({
        requestId: requestId.current,
        scheduleId: tour.scheduleId,
        people: targetPeople,
      });
      setQuote(data.data);
      setShowBookingForm(true);
      setAccepted(false);
      setContact({
        contactName: data.data.contactName || "",
        contactEmail: data.data.contactEmail || "",
        contactPhone: data.data.contactPhone || "",
      });
      if (data.data.bookingId) setBooking({ id: data.data.bookingId });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function confirm(event) {
    event.preventDefault();
    if (!accepted || !quote || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await chatService.confirmBooking(quote.draftId, {
        ...contact,
        confirmed: true,
      });
      setBooking(data.data);
      setUncertain(false);
    } catch (e) {
      const unknown = !e.response || e.response.status >= 500;
      setUncertain(unknown);
      setError(
        unknown
          ? "Chưa nhận được kết quả tạo đơn. Bấm xác nhận lại với cùng thông tin để kiểm tra; không tạo yêu cầu mới."
          : errorMessage(e)
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <article className="chat-tour-card">
      {/* 1. Tour Visual Banner with Badges */}
      <div className="chat-tour-img-wrap">
        <img
          src={imageSrc}
          alt={tour.title}
          className="chat-tour-img"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = landscape;
          }}
        />
        <div className="chat-tour-badges">
          <span className="chat-tour-badge difficulty">
            <Mountain size={11} /> {formatDifficulty(tour.difficulty)}
          </span>
          {tour.durationDays ? (
            <span className="chat-tour-badge duration">
              <Clock3 size={11} /> {tour.durationDays}N{tour.durationDays - 1}Đ
            </span>
          ) : null}
        </div>
      </div>

      {/* 2. Tour Info & Specs */}
      <div className="chat-tour-content">
        <div className="chat-tour-location">
          <MapPin size={12} />
          <span>{tour.location || "Điểm đến trải nghiệm"}</span>
        </div>

        <h4 className="chat-tour-title">
          <Link to={tour.url}>{tour.title}</Link>
        </h4>

        <div className="chat-tour-meta-row">
          <div className="chat-tour-meta-item">
            <Calendar size={13} />
            <span>
              {dateLabel(tour.departureDate)} – {dateLabel(tour.returnDate)}
            </span>
          </div>
          <div className="chat-tour-meta-item">
            <Users size={13} />
            <span>Còn {tour.availableSlots} chỗ trống</span>
          </div>
        </div>

        {tour.previouslyCompleted && (
          <p className="chat-tour-completed-note">
            <CheckCircle2 size={13} /> Bạn đã từng hoàn tất chuyến đi này
          </p>
        )}

        {/* 3. Pricing & Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 6px', borderTop: '1px solid #e7edea', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} style={{ color: 'var(--forest, #1d4034)' }} />
            <span>Số người đi:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={busy || people <= 1}
              style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbdad2', background: '#f8fafc', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => {
                const next = Math.max(1, Number(people) - 1);
                setPeople(next);
                requestId.current = null;
                if (quote) prepare(true, next);
              }}
            >
              -
            </button>
            <strong style={{ minWidth: '24px', textAlign: 'center', fontSize: '0.95rem' }}>{people}</strong>
            <button
              type="button"
              disabled={busy || people >= Math.min(50, tour.availableSlots || 50)}
              style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbdad2', background: '#f8fafc', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => {
                const next = Math.min(Math.min(50, tour.availableSlots || 50), Number(people) + 1);
                setPeople(next);
                requestId.current = null;
                if (quote) prepare(true, next);
              }}
            >
              +
            </button>
          </div>
        </div>

        <div className="chat-tour-footer" style={{ borderTop: 'none', paddingTop: '4px' }}>
          <div className="chat-tour-price">
            <small>{people > 1 ? `Tạm tính (${people} khách)` : "Giá mỗi khách"}</small>
            <strong>{money(tour.pricePerPerson * people)}</strong>
          </div>

          <div className="chat-tour-buttons">
            <Link className="btn btn-small btn-outline" to={tour.url}>
              Chi tiết <ArrowUpRight size={14} />
            </Link>
            {!user ? (
              <Link className="btn btn-small btn-lime" to="/login">
                Đăng nhập đặt tour
              </Link>
            ) : booking ? (
              <Link className="btn btn-small btn-lime" to={`/my-bookings/${booking.id}`}>
                Xem đơn #{booking.id}
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-small btn-lime"
                disabled={busy}
                onClick={() => {
                  if (!showBookingForm) {
                    prepare();
                  } else {
                    setShowBookingForm(!showBookingForm);
                  }
                }}
              >
                <Sparkles size={13} />
                {busy ? "Đang lấy giá..." : showBookingForm ? "Đóng lại" : "Đặt tour ngay"}
              </button>
            )}
          </div>
        </div>

        {/* 4. Booking Draft Confirmation Sheet */}
        {booking && (
          <div className="notice chat-booking-notice">
            <CheckCircle2 size={16} />
            <div>
              <strong>Đã tạo đơn thành công{booking.bookingCode ? ` (${booking.bookingCode})` : ""}!</strong>
              <p>Chưa xác nhận thanh toán. Bạn hãy kiểm tra thông tin và khai báo sức khỏe trong trang đơn.</p>
              <Link className="btn btn-small btn-lime mt-2" to={`/my-bookings/${booking.id}`}>
                Khai báo tham gia và xem đơn
              </Link>
            </div>
          </div>
        )}

        {showBookingForm && !booking && user && (
          <div className="chat-booking-expanded">
            {!quote ? (
              <div className="chat-booking-actions">
                <label>
                  <span>Số khách</span>
                  <input
                    aria-label={`Số khách — ${tour.title}`}
                    type="number"
                    min="1"
                    max={Math.min(50, tour.availableSlots)}
                    value={people}
                    disabled={busy}
                    onChange={(e) => {
                      setPeople(e.target.value);
                      requestId.current = null;
                    }}
                  />
                </label>
                <button
                  className="btn btn-small btn-lime"
                  disabled={
                    busy ||
                    !Number.isInteger(Number(people)) ||
                    Number(people) < 1 ||
                    Number(people) > Math.min(50, tour.availableSlots)
                  }
                  onClick={() => prepare()}
                >
                  {busy ? "Đang tính giá..." : "Xem tóm tắt giá"}
                </button>
              </div>
            ) : (
              <form onSubmit={confirm} className="chat-quote-form">
                <fieldset disabled={busy}>
                  <legend>Xác nhận thông tin đặt tour</legend>
                  <div className="chat-quote-summary">
                    <p>
                      <strong>{quote.title}</strong> · <span>{quote.people} khách</span>
                    </p>
                    <p>
                      Tổng tiền: <strong>{money(quote.totalAmount)}</strong> ({money(quote.unitPrice)}/khách)
                    </p>
                    <p className="muted text-xs">
                      {quote.pickupAt
                        ? `Đón tại: ${quote.pickupPoint} (${quote.pickupAt.replace("T", " ")})`
                        : "Giờ/điểm đón cụ thể sẽ được thông báo sau khi xác nhận."}
                    </p>
                  </div>

                  <div className="chat-form-fields">
                    <label className="field">
                      <span>Họ và tên người đại diện</span>
                      <input
                        required
                        disabled={uncertain}
                        type="text"
                        maxLength={150}
                        value={contact.contactName || ""}
                        onChange={(e) => {
                          setContact({ ...contact, contactName: e.target.value });
                          setAccepted(false);
                        }}
                      />
                    </label>

                    <label className="field">
                      <span>Email nhận thông tin</span>
                      <input
                        required
                        disabled={uncertain}
                        type="email"
                        maxLength={255}
                        value={contact.contactEmail || ""}
                        onChange={(e) => {
                          setContact({ ...contact, contactEmail: e.target.value });
                          setAccepted(false);
                        }}
                      />
                    </label>

                    <label className="field">
                      <span>Số điện thoại liên hệ</span>
                      <input
                        required
                        disabled={uncertain}
                        type="tel"
                        maxLength={20}
                        pattern="[+0-9 ()\-]{8,20}"
                        value={contact.contactPhone || ""}
                        onChange={(e) => {
                          setContact({ ...contact, contactPhone: e.target.value });
                          setAccepted(false);
                        }}
                      />
                    </label>
                  </div>

                  <label className="check-field">
                    <input
                      type="checkbox"
                      disabled={uncertain}
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      required
                    />
                    <span>
                      Tôi đã đối chiếu lịch trình, số khách và tổng chi phí; đồng ý gửi yêu cầu đặt tour.
                    </span>
                  </label>

                  <div className="chat-form-actions">
                    <button
                      className="btn btn-small btn-lime"
                      type="submit"
                      disabled={!accepted || busy}
                    >
                      {busy ? "Đang gửi đơn..." : "Xác nhận tạo booking"}
                    </button>
                    <button
                      className="btn btn-small btn-outline"
                      type="button"
                      disabled={busy || uncertain}
                      onClick={() => prepare(true)}
                    >
                      Tính lại giá mới
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </div>
        )}

        {error && <p className="notice notice-error" role="alert">{error}</p>}
      </div>
    </article>
  );
}
