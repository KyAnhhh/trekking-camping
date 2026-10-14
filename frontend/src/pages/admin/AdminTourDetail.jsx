import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Plus } from "lucide-react";
import { tourApi } from "../../api/tourService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import TourTimeline from "../../components/tour/TourTimeline";
import TourImageManager from "../../components/tour/TourImageManager";
import GuideAssignment from "../../components/tour/GuideAssignment";
import GuideTeam from "../../components/tour/GuideTeam";
import TourSettings from "../../components/tour/TourSettings";
import ScheduleEditor from "../../components/tour/ScheduleEditor";
import {
  dateLabel,
  duration,
  money,
  errorMessage,
  todayInVietnam,
} from "../../utils/tour";
const initial = {
  itineraries: { dayNumber: 1, title: "", description: "" },
  schedules: {
    departureDate: "",
    returnDate: "",
    availableSlots: 1,
  },
  gears: { gearName: "", isProvided: true, rentalPrice: 0 },
};
export default function AdminTourDetail() {
  const { slug } = useParams();
  const [tab, setTab] = useState("itineraries");
  const [assigning, setAssigning] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [forms, setForms] = useState(initial);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const loader = useCallback(async () => {
    return (await tourApi.adminDetail(slug)).data.data;
  }, [slug]);
  const { data, loading, error: loadError, reload } = useResource(loader);
  function update(event) {
    const { name, value, type, checked } = event.target;
    setForms((current) => ({
      ...current,
      [tab]: { ...current[tab], [name]: type === "checkbox" ? checked : value },
    }));
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payload = { ...forms[tab] };
      if (tab === "itineraries") payload.dayNumber = Number(payload.dayNumber);
      if (tab === "schedules") {
        payload.availableSlots = Number(payload.availableSlots);
        if (payload.returnDate < payload.departureDate)
          throw new Error("Ngày kết thúc phải từ ngày khởi hành trở đi.");
      }
      if (tab === "gears")
        payload.rentalPrice = payload.isProvided
          ? 0
          : Number(payload.rentalPrice);
      await {
        itineraries: tourApi.addItinerary,
        schedules: tourApi.addSchedule,
        gears: tourApi.addGear,
      }[tab](data.tour.id, payload);
      setForms((current) => ({ ...current, [tab]: initial[tab] }));
      setSuccess("Đã thêm thông tin vào tour.");
      reload();
    } catch (err) {
      setError(
        err.response
          ? errorMessage(err)
          : err.message || "Không thể lưu thông tin.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <LoadingSpinner />;
  if (loadError || !data)
    return (
      <EmptyState
        error
        title="Không thể tải thông tin tour"
        description={loadError}
        onRetry={reload}
      />
    );
  const { tour } = data,
    form = forms[tab];
  const tabs = [
    ["itineraries", "Lịch trình"],
    ["schedules", "Lịch khởi hành"],
    ["gears", "Trang bị"],
  ];
  return (
    <>
      <Link className="back-link" to="/admin/tours">
        <ArrowLeft size={16} />
        Danh sách tour
      </Link>
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">CHI TIẾT HÀNH TRÌNH</p>
          <h1>{tour.title}</h1>
          <p className="muted">
            {tour.location} · {duration(tour)} · {money(tour.pricePerPax)} /
            người
          </p>
        </div>
        {tour.isActive && (
          <Link className="btn btn-outline" to={"/tours/" + slug}>
            Xem trên website <ArrowUpRight size={17} />
          </Link>
        )}
      </header>
      <TourSettings
        key={tour.updatedAt || tour.id}
        tour={tour}
        onSaved={reload}
      />
      {editingSchedule && (
        <ScheduleEditor
          tourId={tour.id}
          schedule={editingSchedule}
          onSaved={reload}
          onClose={() => setEditingSchedule(null)}
        />
      )}
      <div className="segmented-tabs" aria-label="Nhóm thông tin tour">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            disabled={busy}
            aria-pressed={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setError("");
              setSuccess("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {success && (
        <div className="notice notice-success" role="status">
          {success}
        </div>
      )}
      <div className="admin-detail-grid">
        <section className="panel">
          <h2>{tabs.find(([key]) => key === tab)[1]} hiện có</h2>
          {data[tab] === null ? (
            <EmptyState error title="Chưa tải được dữ liệu" onRetry={reload} />
          ) : !data[tab].length ? (
            <EmptyState
              title="Chưa có thông tin"
              description="Sử dụng biểu mẫu bên cạnh để bổ sung cho hành trình."
            />
          ) : tab === "itineraries" ? (
            <TourTimeline items={data.itineraries} />
          ) : tab === "schedules" ? (
            <div className="admin-item-list">
              {data.schedules.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>
                      {dateLabel(item.departureDate)} —{" "}
                      {dateLabel(item.returnDate)}
                    </strong>
                    <p>
                      Còn {item.availableSlots} chỗ ·{" "}
                      {item.guideName || "Chưa có hướng dẫn viên"}
                    </p>
                    <GuideTeam
                      members={item.guides}
                      legacyName={item.guideName}
                    />
                    {item.departureDate > todayInVietnam() &&
                      item.status !== "CANCELLED" && (
                        <button
                          className="btn btn-small btn-outline"
                          disabled={busy}
                          onClick={() => setEditingSchedule(item)}
                        >
                          Sửa lịch
                        </button>
                      )}
                    {item.departureDate > todayInVietnam() &&
                      item.status !== "CANCELLED" && (
                        <button
                          className="btn btn-small btn-outline"
                          onClick={() => setAssigning(item)}
                        >
                          Phân công hướng dẫn viên
                        </button>
                      )}
                  </div>
                  <span className="status-badge">
                    {item.status === "OPEN"
                      ? "Đang mở"
                      : item.status === "CLOSED"
                        ? "Đã đóng"
                        : item.status === "CANCELLED"
                          ? "Đã hủy"
                          : item.status}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-item-list">
              {data.gears.map((item) => (
                <article key={item.id}>
                  <strong>{item.gearName}</strong>
                  <span>
                    {item.isProvided
                      ? "Có trong tour"
                      : money(item.rentalPrice)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h2>
            <Plus size={20} /> Bổ sung thông tin
          </h2>
          <form className="form-stack" onSubmit={submit}>
            {error && (
              <div className="notice notice-error" role="alert">
                {error}
              </div>
            )}
            <fieldset disabled={busy} className="form-stack">
              {tab === "itineraries" && (
                <>
                  <label className="field">
                    Ngày thứ
                    <input
                      required
                      type="number"
                      name="dayNumber"
                      min="1"
                      max={tour.durationDays}
                      value={form.dayNumber}
                      onChange={update}
                    />
                  </label>
                  <label className="field">
                    Tên chặng
                    <input
                      required
                      name="title"
                      value={form.title}
                      onChange={update}
                    />
                  </label>
                  <label className="field">
                    Nội dung lịch trình
                    <textarea
                      required
                      name="description"
                      rows="5"
                      value={form.description}
                      onChange={update}
                    />
                  </label>
                </>
              )}
              {tab === "schedules" && (
                <>
                  <label className="field">
                    Ngày khởi hành
                    <input
                      required
                      type="date"
                      name="departureDate"
                      min={todayInVietnam()}
                      value={form.departureDate}
                      onChange={update}
                    />
                  </label>
                  <label className="field">
                    Ngày kết thúc
                    <input
                      required
                      type="date"
                      name="returnDate"
                      min={form.departureDate || todayInVietnam()}
                      value={form.returnDate}
                      onChange={update}
                    />
                  </label>
                  <label className="field">
                    Số chỗ mở bán
                    <input
                      required
                      type="number"
                      name="availableSlots"
                      min="1"
                      max={tour.maxCapacity}
                      value={form.availableSlots}
                      onChange={update}
                    />
                  </label>
                  <p className="small muted">
                    Sau khi tạo lịch, chọn “Phân công hướng dẫn viên” để chọn
                    trưởng đoàn và người hỗ trợ.
                  </p>
                </>
              )}
              {tab === "gears" && (
                <>
                  <label className="field">
                    Tên trang bị
                    <input
                      required
                      name="gearName"
                      value={form.gearName}
                      onChange={update}
                    />
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      name="isProvided"
                      checked={form.isProvided}
                      onChange={update}
                    />
                    Được cung cấp trong tour
                  </label>
                  {!form.isProvided && (
                    <label className="field">
                      Giá thuê (VNĐ)
                      <input
                        required
                        type="number"
                        name="rentalPrice"
                        min="0"
                        value={form.rentalPrice}
                        onChange={update}
                      />
                    </label>
                  )}
                </>
              )}
            </fieldset>
            <button className="btn full-width" disabled={busy}>
              {busy ? "Đang lưu..." : "Thêm vào tour"}
              <Plus size={17} />
            </button>
          </form>
        </section>
      </div>
      <TourImageManager tourId={tour.id} onChanged={reload} />
      {assigning && (
        <GuideAssignment
          schedule={assigning}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setAssigning(null);
            setSuccess("Đã cập nhật đội ngũ đồng hành.");
            reload();
          }}
        />
      )}
    </>
  );
}
