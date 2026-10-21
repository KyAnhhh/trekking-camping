import { useState } from "react";
import { Link } from "react-router-dom";
import { Compass, CalendarDays, Bookmark, Trash2 } from "lucide-react";
import { plannerService } from "../../api/plannerService";
import useResource from "../../hooks/useResource";
import {
  dateLabel,
  money,
  todayInVietnam,
  errorMessage,
} from "../../utils/tour";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";

import { useChat } from '../../context/ChatContext';
import ModelSelector from '../../components/chat/ModelSelector';

const load = async () => (await plannerService.list()).data.data;
export default function Planner() {
  const { selection, models, loading: modelLoading, error: modelError } = useChat();
  const { data: saved, loading, error, reload } = useResource(load);
  const [form, setForm] = useState({
    destination: "",
    startDate: "",
    days: 2,
    people: 1,
    budgetPerPerson: 3000000,
    fitness: 1,
    preferences: "",
    maxDistanceKm: "",
    maxActiveHoursPerDay: "",
    maxMedicalAccessHours: "",
  });
  const [current, setCurrent] = useState(null),
    [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(""),
    [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState("");
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function action(task) {
    if (busy) return;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const generate = (e) => {
    e.preventDefault();
    if (modelLoading || !models.some(m => m.id === selection.modelId)) { setFailure("Hãy chọn model AI trước khi tạo lịch trình."); return; }
    if (form.startDate <= todayInVietnam()) {
      setFailure("Chọn ngày khởi hành từ ngày mai.");
      return;
    }
    action(async () => {
      const input = { ...form, modelId: selection.modelId };
      [
        "maxDistanceKm",
        "maxActiveHoursPerDay",
        "maxMedicalAccessHours",
      ].forEach((k) => (input[k] = form[k] === "" ? null : Number(form[k])));
      ["days", "people", "budgetPerPerson", "fitness"].forEach(
        (k) => (input[k] = Number(input[k])),
      );
      setCurrent((await plannerService.generate(input)).data.data);
      setNotice("Đã tạo và lưu lịch trình vào tài khoản.");
      reload();
    });
  };
  const content = current?.content;
  return (
    <div className="container page-space planner-page">
      <header className="page-heading">
        <p className="eyebrow">
          <Compass size={16} /> SỔ TAY HÀNH TRÌNH
        </p>
        <h1>Một chuyến đi theo nhịp của bạn.</h1>
        <p className="muted">
          Chọn thời gian và sức mình. Cùng lên lịch từng ngày trước khi quyết
          định đặt tour.
        </p>
      </header>
      {failure && (
        <p className="notice notice-error" role="alert">
          {failure}
        </p>
      )}
      {notice && (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      )}
      <div className="planner-layout">
        <section className="panel">
          <h2>Bạn muốn đi đâu?</h2>
          <ModelSelector disabled={busy} />
          {modelError && <p role="alert" className="notice">{modelError}</p>}
          <form className="form-stack" onSubmit={generate}>
            <fieldset className="form-stack" disabled={busy}>
              <label className="field">
                Điểm đến
                <input
                  name="destination"
                  required
                  maxLength={120}
                  placeholder="Ví dụ: Lâm Đồng"
                  value={form.destination}
                  onChange={update}
                />
              </label>
              <label className="field">
                Ngày khởi hành
                <input
                  name="startDate"
                  type="date"
                  required
                  min={todayInVietnam()}
                  value={form.startDate}
                  onChange={update}
                />
              </label>
              <div className="form-row">
                <label className="field">
                  Số ngày
                  <input
                    name="days"
                    type="number"
                    min="1"
                    max="7"
                    required
                    value={form.days}
                    onChange={update}
                  />
                </label>
                <label className="field">
                  Số người
                  <input
                    name="people"
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={form.people}
                    onChange={update}
                  />
                </label>
              </div>
              <label className="field">
                Ngân sách mỗi người (VND)
                <input
                  name="budgetPerPerson"
                  type="number"
                  min="50000"
                  max="100000000"
                  step="1"
                  required
                  value={form.budgetPerPerson}
                  onChange={update}
                />
              </label>
              <label className="field">
                Mức độ phù hợp với thể lực
                <select name="fitness" value={form.fitness} onChange={update}>
                  <option value="1">Dễ · Mới bắt đầu</option>
                  <option value="2">Trung bình · Đã có trải nghiệm</option>
                  <option value="3">Khó · Có kinh nghiệm trekking</option>
                </select>
              </label>
              <details>
                <summary>Giới hạn hành trình (tùy chọn)</summary>
                <div className="form-stack">
                  {[
                    ["maxDistanceKm", "Tổng quãng đường tối đa (km)", 1000],
                    [
                      "maxActiveHoursPerDay",
                      "Vận động tối đa ngày dài nhất (giờ)",
                      24,
                    ],
                    [
                      "maxMedicalAccessHours",
                      "Ước tính tiếp cận y tế tối đa (giờ)",
                      168,
                    ],
                  ].map(([key, label, max]) => (
                    <label className="field" key={key}>
                      {label}
                      <input
                        name={key}
                        type="number"
                        min="0"
                        max={max}
                        step="0.01"
                        value={form[key]}
                        onChange={update}
                      />
                    </label>
                  ))}
                  <p className="small muted">
                    Tour thiếu chỉ số sẽ bị loại khi bật bộ lọc tương ứng. Các
                    giới hạn này là sở thích hành trình, không xác nhận phù hợp
                    với bệnh lý.
                  </p>
                </div>
              </details>
              <label className="field">
                Điều bạn muốn trải nghiệm
                <textarea
                  name="preferences"
                  rows="3"
                  maxLength={1000}
                  placeholder="Ví dụ: ngắm bình minh, đi chậm, cắm trại..."
                  value={form.preferences}
                  onChange={update}
                />
              </label>
              <p className="small muted">
                Nhu cầu và thông tin tour công khai được gửi tới AI để tạo gợi
                ý. Không nhập thông tin cá nhân nhạy cảm.
              </p>
              <button className="btn" disabled={modelLoading || !models.some(m => m.id === selection.modelId)}>
                <Bookmark size={17} />
                {busy ? "Đang xử lý..." : "Tạo và lưu lịch trình"}
              </button>
            </fieldset>
          </form>
        </section>
        <section className="planner-result" aria-live="polite">
          {busy && (
            <LoadingSpinner label="Đang xử lý yêu cầu. Việc tạo lịch trình có thể mất khoảng một phút..." />
          )}
          {content ? (
            <article className="panel">
              <p className="eyebrow">LỊCH TRÌNH GỢI Ý · ĐÃ LƯU</p>
              <h2>{content.itinerary.title}</h2>
              {content.request.modelId && <p className="muted">Model: {content.request.modelId}</p>}
              <p>{content.itinerary.summary}</p>
              <p className="small muted">
                <CalendarDays size={15} />{" "}
                {dateLabel(content.request.startDate)} · {content.request.days}{" "}
                ngày · {content.request.people} người · Ngân sách{" "}
                {money(content.request.budgetPerPerson)}/người
              </p>
              <div className="notice">
                Đây là gợi ý AI, chưa giữ chỗ hoặc xác nhận dịch vụ. Hãy xác
                minh tuyến đường, điều kiện thời tiết và yêu cầu của nhà tổ chức
                trước chuyến đi.
              </div>
              <ol className="planner-days">
                {content.itinerary.days.map((day) => (
                  <li key={day.day}>
                    <span className="planner-day-number">NGÀY {day.day}</span>
                    <h3>{day.title}</h3>
                    <dl>
                      {[
                        ["Sáng", day.morning],
                        ["Chiều", day.afternoon],
                        ["Tối", day.evening],
                      ].map(([label, text]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{text}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ol>
              <h3>Chuẩn bị trước khi đi</h3>
              <ul>
                {content.itinerary.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
              <h3>Tour phù hợp để tham khảo</h3>
              <p className="small muted">
                Giá và chỗ trống được ghi nhận lúc tạo gợi ý (
                {new Date(content.quotedAt).toLocaleString("vi-VN")}). Mở tour
                để kiểm tra lại; giá tour chưa phải tổng chi phí toàn chuyến đi.
              </p>
              {content.tours.length ? (
                content.tours.map((t) => (
                  <div className="planner-tour" key={t.scheduleId}>
                    <div>
                      <strong>{t.title}</strong>
                      <p>
                        {money(t.pricePerPerson)}/người ·{" "}
                        {dateLabel(t.departureDate)} – {dateLabel(t.returnDate)}
                      </p>
                    </div>
                    <Link className="btn btn-small btn-outline" to={t.url}>
                      Kiểm tra và đặt tour
                    </Link>
                  </div>
                ))
              ) : (
                <p>
                  Chưa có tour phù hợp đang mở bán cho nhu cầu này. Bạn có thể
                  đổi điểm đến, ngày đi hoặc ngân sách.
                </p>
              )}
            </article>
          ) : (
            !busy && (
              <EmptyState
                title="Bắt đầu bằng một điểm đến"
                description="Lịch trình từng ngày và các tour phù hợp sẽ xuất hiện tại đây. Các lịch đã tạo được lưu riêng trong tài khoản của bạn."
              />
            )
          )}
        </section>
      </div>
      <section className="panel planner-saved">
        <h2>Lịch trình đã lưu</h2>
        <p className="muted">
          Tối đa 50 lịch trình. Có thể tạo lịch mới sau một phút.
        </p>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <EmptyState
            error
            title="Chưa tải được lịch trình"
            description={error}
            onRetry={reload}
          />
        ) : !saved?.length ? (
          <p>Chưa có lịch trình đã lưu.</p>
        ) : (
          <ul>
            {saved.map((p) => (
              <li key={p.id}>
                <button
                  className="text-btn"
                  disabled={busy}
                  onClick={() =>
                    action(async () =>
                      setCurrent((await plannerService.get(p.id)).data.data),
                    )
                  }
                >
                  {p.title}
                </button>
                <span className="small muted">
                  {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                </span>
                <button
                  className="icon-btn"
                  disabled={busy}
                  aria-label={`Xóa ${p.title}`}
                  onClick={() => setDeleting(p)}
                >
                  <Trash2 size={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {deleting && (
        <Modal
          title="Xóa lịch trình đã lưu?"
          onClose={() => !busy && setDeleting(null)}
        >
          <p>{deleting?.title}</p>
          <div className="payment-actions">
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Giữ lại
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await plannerService.remove(deleting.id);
                  if (current?.id === deleting.id) setCurrent(null);
                  setDeleting(null);
                  reload();
                })
              }
            >
              Xóa lịch trình
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
