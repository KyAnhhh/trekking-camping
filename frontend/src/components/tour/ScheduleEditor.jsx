import { useState } from "react";
import { tourApi } from "../../api/tourService";
import { errorMessage, todayInVietnam } from "../../utils/tour";
import Modal from "../common/Modal";
export default function ScheduleEditor({ tourId, schedule, onSaved, onClose }) {
  const [form, setForm] = useState({
    departureDate: schedule.departureDate,
    returnDate: schedule.returnDate,
    availableSlots: schedule.availableSlots,
    status: schedule.status,
    pickupAt: schedule.pickupAt || "",
    pickupPoint: schedule.pickupPoint || "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await tourApi.updateSchedule(tourId, schedule.id, {
        ...form,
        pickupAt: form.pickupAt || null,
        pickupPoint: form.pickupPoint || null,
        availableSlots: Number(form.availableSlots),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Chỉnh sửa lịch khởi hành" onClose={() => !busy && onClose()}>
      <p className="muted">
        Lịch đã có booking không được đổi ngày hoặc số chỗ thủ công. Gỡ phân
        công hướng dẫn viên trước khi đổi ngày. Lịch đã hủy không mở lại.
      </p>
      <form className="form-stack" onSubmit={save}>
        <fieldset className="form-stack" disabled={busy}>
          <label className="field">
            Ngày đi
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
            Ngày về
            <input
              required
              type="date"
              name="returnDate"
              min={form.departureDate}
              value={form.returnDate}
              onChange={update}
            />
          </label>
          <label className="field">
            Số chỗ còn lại
            <input
              required
              type="number"
              name="availableSlots"
              min="0"
              max="1000"
              value={form.availableSlots}
              onChange={update}
            />
          </label>
          <label className="field">
            Thời điểm đón (giờ Việt Nam, tùy chọn)
            <input
              type="datetime-local"
              name="pickupAt"
              value={form.pickupAt}
              onChange={update}
            />
          </label>
          <label className="field">
            Điểm đón của lịch này
            <input
              maxLength={500}
              name="pickupPoint"
              value={form.pickupPoint}
              onChange={update}
            />
          </label>
          <label className="field">
            Trạng thái
            <select name="status" value={form.status} onChange={update}>
              <option value="OPEN">Mở nhận khách</option>
              <option value="FULL">Đã đầy</option>
              <option value="CLOSED">Tạm đóng</option>
              <option value="CANCELLED">Hủy lịch</option>
            </select>
          </label>
          {form.status === "CANCELLED" && (
            <p className="notice">
              Lưu với trạng thái hủy sẽ đóng lịch vĩnh viễn; cần tạo lịch mới
              nếu tổ chức lại.
            </p>
          )}
          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}
          <button className="btn">
            {busy ? "Đang lưu..." : "Lưu lịch khởi hành"}
          </button>
        </fieldset>
      </form>
    </Modal>
  );
}
