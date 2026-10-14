import { useContext, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { chatService } from "../../api/chatService";
import { money, dateLabel, errorMessage } from "../../utils/tour";

export default function ChatBookingCard({ tour, suggestedPeople = 1 }) {
  const { user } = useContext(AuthContext);
  const [people, setPeople] = useState(suggestedPeople);
  const [quote, setQuote] = useState(null), [contact, setContact] = useState({});
  const [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [booking, setBooking] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const requestId = useRef(null), inFlight = useRef(false);
  async function prepare(fresh = false) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    if (!requestId.current || fresh) requestId.current = crypto.randomUUID();
    try {
      const { data } = await chatService.prepareBooking({ requestId: requestId.current, scheduleId: tour.scheduleId, people: Number(people) });
      setQuote(data.data); setAccepted(false);
      setContact({ contactName: data.data.contactName || "", contactEmail: data.data.contactEmail || "", contactPhone: data.data.contactPhone || "" });
      if (data.data.bookingId) setBooking({ id: data.data.bookingId });
    } catch (e) { setError(errorMessage(e)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function confirm(event) {
    event.preventDefault();
    if (!accepted || !quote || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const { data } = await chatService.confirmBooking(quote.draftId, { ...contact, confirmed: true });
      setBooking(data.data);
      setUncertain(false);
    } catch (e) {
      const unknown = !e.response || e.response.status >= 500;
      setUncertain(unknown);
      setError(unknown ? "Chưa nhận được kết quả tạo đơn. Bấm xác nhận lại với cùng thông tin để kiểm tra; không tạo yêu cầu mới." : errorMessage(e));
    }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="chat-tour-card">
    <Link to={tour.url}><strong>{tour.title}</strong></Link>
    <p>{dateLabel(tour.departureDate)} – {dateLabel(tour.returnDate)} · {money(tour.pricePerPerson)}/khách</p>
    <p>{tour.availableSlots} chỗ tại thời điểm tra cứu. {tour.previouslyCompleted ? "Bạn có booking hoàn tất cho tour này; vẫn có thể chọn lại." : ""}</p>
    {booking ? <div className="notice">Đã tạo đơn{booking.bookingCode ? ` ${booking.bookingCode}` : ""}. Chưa xác nhận thanh toán.
      <Link className="btn btn-small" to={`/my-bookings/${booking.id}`}>Khai báo tham gia và xem đơn</Link>
    </div> : !user ? <Link to="/login">Đăng nhập để đặt tour</Link> : <>
      {!quote && <div className="chat-booking-actions">
        <label>Số khách <input aria-label={`Số khách — ${tour.title}`} type="number" min="1" max={Math.min(50, tour.availableSlots)} value={people}
          disabled={busy} onChange={(e) => { setPeople(e.target.value); requestId.current = null; }} /></label>
        <button className="btn btn-small" disabled={busy || !Number.isInteger(Number(people)) || Number(people) < 1 || Number(people) > Math.min(50,tour.availableSlots)} onClick={() => prepare()}>{busy ? "Đang lấy giá..." : "Xem tóm tắt đặt tour"}</button>
      </div>}
      {quote && <form onSubmit={confirm}>
        <fieldset disabled={busy}>
          <legend>Xác nhận đặt chỗ</legend>
          <p><strong>{quote.title}</strong> · {quote.people} khách</p>
          <p>{dateLabel(quote.departureDate)} – {dateLabel(quote.returnDate)}</p>
          <p>Tổng tiền: <strong>{money(quote.totalAmount)}</strong> ({money(quote.unitPrice)}/khách)</p>
          <p>{quote.pickupAt ? `${quote.pickupAt.replace("T", " ")} · ${quote.pickupPoint}` : "Giờ/điểm đón chưa cập nhật; cần xác nhận với nhà tổ chức."}</p>
          {quote.requirements && <p>{quote.requirements}</p>}
          <p>Bản tóm tắt có hiệu lực đến {new Date(quote.expiresAt).toLocaleTimeString("vi-VN")}. Chưa giữ chỗ.</p>
          {[["contactName","Họ tên", "text",150], ["contactEmail","Email","email",255], ["contactPhone","Điện thoại","tel",20]].map(([key,label,type,max]) =>
            <label className="field" key={key}>{label}<input required disabled={uncertain} type={type} maxLength={max} value={contact[key] || ""} pattern={key === "contactPhone" ? "[+0-9 ()\\-]{8,20}" : undefined} onChange={(e) => { setContact({ ...contact, [key]: e.target.value }); setAccepted(false); }} /></label>)}
          <label className="check-field"><input type="checkbox" disabled={uncertain} checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required /> Tôi đã kiểm tra lịch, số khách, tổng tiền và thông tin liên hệ; đồng ý tạo đơn.</label>
          <p>Thông tin liên hệ được gửi riêng tới backend, không gửi cho AI. Sau tạo đơn cần khai báo và được xem xét trước thanh toán.</p>
          <button className="btn btn-small" type="submit" disabled={!accepted}>{busy ? "Đang tạo đơn..." : "Xác nhận tạo booking"}</button>
        </fieldset>
        <button className="btn btn-small btn-outline" type="button" disabled={busy || uncertain} onClick={() => prepare(true)}>Lấy giá mới / xác nhận lại</button>
      </form>}
    </>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
  </section>;
}
