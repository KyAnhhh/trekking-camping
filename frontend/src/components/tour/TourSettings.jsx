import { useState } from "react";
import { tourApi } from "../../api/tourService";
import { errorMessage } from "../../utils/tour";
import Modal from "../common/Modal";
import AdventureFields, { adventurePayload } from "./AdventureFields";
const fields = [
  "title",
  "slug",
  "location",
  "durationDays",
  "durationNights",
  "difficultyLevel",
  "pricePerPax",
  "maxCapacity",
  "summary",
  "description",
  "safetyTips",
  "requiredGear",
  "insuranceInfo",
  "emergencyHotline",
];
export default function TourSettings({ tour, onSaved }) {
  const [adventure, setAdventure] = useState(tour.adventureProfile || {});
  const [open, setOpen] = useState(false),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [form, setForm] = useState(() =>
    Object.fromEntries(fields.map((k) => [k, tour[k] ?? ""])),
  );
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        adventureProfile: adventurePayload(adventure),
      };
      [
        "durationDays",
        "durationNights",
        "difficultyLevel",
        "pricePerPax",
        "maxCapacity",
      ].forEach((k) => (payload[k] = Number(payload[k])));
      await tourApi.update(tour.id, payload);
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function active() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await tourApi.setActive(tour.id, !tour.isActive);
      setConfirm(false);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel tour-settings">
      <div className="list-toolbar">
        <div>
          <h2>Thông tin và mở bán</h2>
          <p className="muted">
            {tour.isActive
              ? "Tour đang hiển thị cho khách."
              : "Tour đã ngừng mở bán; dữ liệu lịch và booking được giữ lại."}
          </p>
        </div>
        <div className="payment-actions">
          <button
            className="btn btn-small btn-outline"
            disabled={busy}
            onClick={() => setOpen(!open)}
          >
            {open ? "Đóng chỉnh sửa" : "Sửa thông tin tour"}
          </button>
          <button
            className="btn btn-small btn-outline"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            {tour.isActive ? "Ngừng mở bán" : "Mở bán lại"}
          </button>
        </div>
      </div>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {open && (
        <form className="form-stack" onSubmit={save}>
          <fieldset disabled={busy} className="form-stack">
            <p className="muted">
              Slug được giữ cố định. Khi đã có lịch, thời lượng và sức chứa
              không thay đổi. Giá mới chỉ áp dụng cho đơn tạo sau khi lưu.
            </p>
            <div className="form-row">
              {[
                ["title", "Tên tour"],
                ["location", "Địa điểm"],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    required
                    maxLength={255}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="form-row">
              {[
                ["durationDays", "Số ngày", 1, 365],
                ["durationNights", "Số đêm", 0, 365],
                ["maxCapacity", "Sức chứa", 1, 1000],
                ["pricePerPax", "Giá mỗi người (VND)", 0, 1000000000],
              ].map(([key, label, min, max]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    type="number"
                    required
                    min={min}
                    max={max}
                    step="1"
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="field">
              Độ khó
              <select
                value={form.difficultyLevel}
                onChange={(e) =>
                  setForm({ ...form, difficultyLevel: e.target.value })
                }
              >
                <option value="1">Dễ</option>
                <option value="2">Trung bình</option>
                <option value="3">Khó</option>
              </select>
            </label>
            {[
              ["summary", "Tóm tắt", 5000],
              ["description", "Mô tả", 50000],
              ["safetyTips", "Lưu ý an toàn", 10000],
              ["requiredGear", "Trang bị cần chuẩn bị", 10000],
              ["insuranceInfo", "Thông tin bảo hiểm", 10000],
            ].map(([key, label, max]) => (
              <label className="field" key={key}>
                {label}
                <textarea
                  rows="3"
                  maxLength={max}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="field">
              Liên hệ khẩn cấp
              <input
                maxLength={100}
                value={form.emergencyHotline}
                onChange={(e) =>
                  setForm({ ...form, emergencyHotline: e.target.value })
                }
              />
            </label>
            <AdventureFields value={adventure} onChange={setAdventure} />
            {error && (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn">
              {busy ? "Đang lưu..." : "Lưu thông tin tour"}
            </button>
          </fieldset>
        </form>
      )}
      {confirm && (
        <Modal
          title={tour.isActive ? "Ngừng mở bán tour?" : "Mở bán lại tour?"}
          onClose={() => !busy && setConfirm(false)}
        >
          <p>
            {tour.isActive
              ? "Tour sẽ ẩn khỏi danh mục công khai. Nếu còn khách đặt chuyến chưa kết thúc, hệ thống yêu cầu xử lý booking trước."
              : "Tour sẽ xuất hiện lại trong danh mục công khai với các lịch còn nhận khách."}
          </p>
          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          <div className="payment-actions">
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Quay lại
            </button>
            <button className="btn" disabled={busy} onClick={active}>
              Xác nhận
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
