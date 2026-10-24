import { useCallback, useContext, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { tourApi } from "../../api/tourService";
import { bookingService } from "../../api/bookingService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import {
  dateLabel,
  duration,
  errorMessage,
  isBookable,
  money,
} from "../../utils/tour";
export default function Booking() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [form, setForm] = useState({
    contactName: user?.fullName || "",
    contactEmail: user?.email || "",
    contactPhone: user?.phone || "",
    scheduleId: params.get("schedule") || "",
    numberOfPax: /^\d+$/.test(params.get('people') || '') && Number(params.get('people')) >= 1 && Number(params.get('people')) <= 1000 ? Number(params.get('people')) : 1,
    specialRequirements: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const loader = useCallback(async () => {
    const tour = (await tourApi.getTourBySlug(slug)).data.data;
    const schedules = (await tourApi.getSchedules(tour.id)).data.data;
    return { tour, schedules };
  }, [slug]);
  const { data, loading, error: loadError, reload } = useResource(loader);
  const update = (e) =>
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  const openSchedules = (data?.schedules || []).filter(isBookable);
  const selected = openSchedules.find(
    (schedule) => schedule.id === Number(form.scheduleId),
  );
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const pax = Number(form.numberOfPax);
    if (
      !selected ||
      !Number.isInteger(pax) ||
      pax < 1 ||
      pax > selected.availableSlots
    ) {
      setError("Chọn lịch khởi hành và số người phù hợp với số chỗ còn lại.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          typeof value === "string" ? value.trim() : value,
        ]),
      );
      const response = await bookingService.createBooking({
        ...payload,
        scheduleId: selected.id,
        numberOfPax: pax,
      });
      navigate("/my-bookings/" + response.data.data.id, {
        replace: true,
        state: { bookingCode: response.data.data.bookingCode },
      });
    } catch (err) {
      setError(errorMessage(err));
      reload();
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <LoadingSpinner label="Đang tải lịch khởi hành..." />;
  if (loadError || !data)
    return (
      <div className="container page-space">
        <EmptyState
          error
          title="Chưa tải được chuyến đi"
          description={loadError}
          onRetry={reload}
        />
      </div>
    );
  const { tour } = data;
  return (
    <div className="container page-space">
      <Link className="back-link" to={"/tours/" + slug}>
        <ArrowLeft size={16} />
        Quay lại chi tiết tour
      </Link>
      <header className="page-heading">
        <p className="eyebrow">SẮP ĐẾN LÚC LÊN ĐƯỜNG</p>
        <h1>Đặt chỗ cho hành trình.</h1>
        <p>{tour.title}</p>
      </header>
      <div className="booking-layout">
        <form className="panel booking-form" onSubmit={submit}>
          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          <fieldset disabled={busy}>
            <legend>
              <span className="step-number">1</span> Lịch khởi hành
            </legend>
            {!openSchedules.length && (
              <div className="notice">
                Chưa có lịch khởi hành còn chỗ cho tour này.
              </div>
            )}
            <div className="form-grid">
              <label className="field">
                Ngày khởi hành
                <select
                  required
                  name="scheduleId"
                  value={form.scheduleId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      scheduleId: e.target.value,
                      numberOfPax: 1,
                    })
                  }
                >
                  <option value="">Chọn lịch khởi hành</option>
                  {openSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {dateLabel(schedule.departureDate)} · Còn{" "}
                      {schedule.availableSlots} chỗ
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Số người tham gia
                <input
                  required
                  name="numberOfPax"
                  type="number"
                  min="1"
                  max={selected?.availableSlots || 1}
                  value={form.numberOfPax}
                  onChange={update}
                />
              </label>
            </div>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>
              <span className="step-number">2</span> Thông tin liên hệ
            </legend>
            <div className="form-grid">
              <label className="field span-2">
                Họ và tên
                <input
                  required
                  name="contactName"
                  autoComplete="name"
                  value={form.contactName}
                  onChange={update}
                />
              </label>
              <label className="field">
                Email
                <input
                  required
                  name="contactEmail"
                  type="email"
                  autoComplete="email"
                  value={form.contactEmail}
                  onChange={update}
                />
              </label>
              <label className="field">
                Số điện thoại
                <input
                  required
                  name="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  minLength={8}
                  maxLength={20}
                  value={form.contactPhone}
                  onChange={update}
                />
              </label>
            </div>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>
              <span className="step-number">3</span> Chuẩn bị cùng bạn
            </legend>
            <div className="form-grid">
              <p className="notice span-2">
                Sau khi tạo đơn, khai báo riêng tư cho từng người và chờ người
                phụ trách xem xét trước thanh toán. Không nhập bệnh sử vào yêu
                cầu chung bên dưới.
              </p>
              <label className="field">
                Người liên hệ khẩn cấp
                <input
                  name="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={update}
                />
              </label>
              <label className="field">
                Điện thoại liên hệ khẩn cấp
                <input
                  name="emergencyContactPhone"
                  type="tel"
                  value={form.emergencyContactPhone}
                  onChange={update}
                />
              </label>
              <label className="field span-2">
                Yêu cầu thêm
                <textarea
                  name="specialRequirements"
                  rows="3"
                  value={form.specialRequirements}
                  onChange={update}
                  placeholder="Ăn chay, yêu cầu trang bị hoặc lưu ý khác..."
                />
              </label>
            </div>
          </fieldset>
          <p className="small muted">
            <ShieldCheck size={16} /> Chỗ được giữ tối đa 48 giờ và không quá
            ngày khởi hành trong khi hoàn tất khai báo/xem xét. Chưa thanh toán
            tại bước này.
          </p>
          <button
            className="btn full-width"
            disabled={busy || !selected}
            type="submit"
          >
            {busy ? "Đang gửi yêu cầu..." : "Xác nhận đặt tour"}
            <ArrowRight size={18} />
          </button>
        </form>
        <aside className="booking-summary">
          <p className="eyebrow">TÓM TẮT CHUYẾN ĐI</p>
          <h2>{tour.title}</h2>
          <p className="muted">
            {tour.location} · {duration(tour)}
          </p>
          <div className="summary-row">
            <span>Đơn giá</span>
            <strong>{money(tour.pricePerPax)}</strong>
          </div>
          <div className="summary-row">
            <span>Số người</span>
            <strong>{form.numberOfPax || 0}</strong>
          </div>
          {selected && (
            <div className="summary-row">
              <span>
                <CalendarDays size={15} /> Khởi hành
              </span>
              <strong>{dateLabel(selected.departureDate)}</strong>
            </div>
          )}
          {selected?.pickupAt && (
            <p className="small">
              Đón {selected.pickupAt.replace("T", " ")} (giờ Việt Nam) ·{" "}
              {selected.pickupPoint}
            </p>
          )}
          <div className="summary-total">
            <span>Tổng dự kiến</span>
            <strong>
              {money((tour.pricePerPax || 0) * Number(form.numberOfPax || 0))}
            </strong>
          </div>
          <p className="small muted">
            <Check size={15} /> Giá và chỗ trống được xác nhận khi gửi đơn.
          </p>
        </aside>
      </div>
    </div>
  );
}
