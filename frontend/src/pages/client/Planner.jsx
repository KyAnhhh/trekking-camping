import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { Compass, CalendarDays, Bookmark, Trash2, Bot, SlidersHorizontal, Sparkles, CheckCircle2, Lock } from "lucide-react";
import { plannerService } from "../../api/plannerService";
import useResource from "../../hooks/useResource";
import { AuthContext } from "../../context/AuthContext";
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
import ChatPanel from '../../components/chat/ChatPanel';

const load = async () => (await plannerService.list()).data.data;

const getTomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type) => parts.find((part) => part.type === type).value;
  return get("year") + "-" + get("month") + "-" + get("day");
};

export default function Planner() {
  const { user } = useContext(AuthContext);
  const { selection, models, loading: modelLoading, error: modelError, setDraft } = useChat();
  const { data: saved, loading, error, reload } = useResource(load);

  const [activeTab, setActiveTab] = useState('ai-chat'); // 'ai-chat' | 'manual-form'
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const [form, setForm] = useState({
    destination: "Tà Năng - Phan Dũng",
    startDate: getTomorrowDate(),
    days: 2,
    people: 2,
    budgetPerPerson: 3000000,
    fitness: 1,
    preferences: "Ngắm bình minh săn mây, cắm trại đêm",
    maxDistanceKm: "",
    maxActiveHoursPerDay: "",
    maxMedicalAccessHours: "",
  });

  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [deleting, setDeleting] = useState(null);
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

  const handleGenerate = (e) => {
    if (e) e.preventDefault();
    if (!user) {
      setQuickModalOpen(false);
      setLoginPromptOpen(true);
      return;
    }
    const effectiveModelId = selection?.modelId || models[0]?.id || 'gemini-3.5-flash-lite';
    if (!form.destination.trim()) {
      setFailure("Vui lòng nhập điểm đến mong muốn.");
      return;
    }
    if (form.startDate <= todayInVietnam()) {
      setFailure("Chọn ngày khởi hành từ ngày mai.");
      return;
    }
    action(async () => {
      const input = { ...form, modelId: effectiveModelId };
      [
        "maxDistanceKm",
        "maxActiveHoursPerDay",
        "maxMedicalAccessHours",
      ].forEach((k) => (input[k] = form[k] === "" ? null : Number(form[k])));
      ["days", "people", "budgetPerPerson", "fitness"].forEach(
        (k) => (input[k] = Number(input[k])),
      );
      const res = await plannerService.generate(input);
      setCurrent(res.data.data);
      setNotice("Đã tạo và lưu lịch trình vào tài khoản thành công!");
      setQuickModalOpen(false);
      reload();
    });
  };

  const handleOpenSaveModal = () => {
    if (!user) {
      setLoginPromptOpen(true);
      return;
    }
    setQuickModalOpen(true);
  };

  const handleSamplePlan = () => {
    if (!user) {
      setLoginPromptOpen(true);
      return;
    }
    setForm((prev) => ({ ...prev, destination: "Tà Năng - Phan Dũng", days: 2 }));
    setQuickModalOpen(true);
  };

  const handleAskAiAboutDestination = () => {
    const question = `Lên cho mình lịch trình trekking cắm trại tại ${form.destination || 'Đà Lạt'} ${form.days} ngày ${form.people} người, ngân sách khoảng ${(form.budgetPerPerson || 3000000).toLocaleString('vi-VN')}đ/người.`;
    setDraft(question);
    setActiveTab('ai-chat');
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
          Trò chuyện trực tiếp cùng Trợ lý AI hoặc tùy chỉnh biểu mẫu để tạo lộ trình từng ngày và lưu vào tài khoản.
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

      {/* Mode Switcher Tabs */}
      <div className="planner-mode-tabs" role="tablist" aria-label="Phương thức lập lịch trình">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ai-chat'}
          className={`planner-mode-tab ${activeTab === 'ai-chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-chat')}
        >
          <Bot size={17} />
          <span>Trợ lý AI Lập lịch trình</span>
          <span className="planner-tab-badge">Mới</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'manual-form'}
          className={`planner-mode-tab ${activeTab === 'manual-form' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual-form')}
        >
          <SlidersHorizontal size={16} />
          <span>Tùy chỉnh biểu mẫu chi tiết</span>
        </button>
      </div>

      <div className="planner-layout">
        {/* Left Column: Either AI Chat Assistant or Manual Form */}
        {activeTab === 'ai-chat' ? (
          <section className="planner-chat-panel-container">
            <div className="planner-tab-header">
              <h2>
                <Sparkles size={17} />
                Trợ lý AI Lên Lịch Trình
              </h2>
              <p className="small muted">
                Nhắn yêu cầu hoặc chọn gợi ý bên dưới. AI sẽ tự động lên kế hoạch và bạn có thể lưu thành Lịch trình chính thức.
              </p>
            </div>
            <ChatPanel
              compact={false}
              plannerMode={true}
              onSaveCurrentPlan={handleOpenSaveModal}
              onSwitchToForm={() => setActiveTab('manual-form')}
            />
          </section>
        ) : (
          <section className="panel">
            <h2>Bạn muốn đi đâu?</h2>
            <ModelSelector variant="card" disabled={busy} />
            {modelError && <p role="alert" className="notice">{modelError}</p>}
            <form className="form-stack" onSubmit={handleGenerate}>
              <fieldset className="form-stack" disabled={busy}>
                <label className="field">
                  Điểm đến
                  <input
                    name="destination"
                    required
                    maxLength={120}
                    placeholder="Ví dụ: Lâm Đồng, Tà Năng, Tây Ninh..."
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
                <button className="btn" disabled={busy}>
                  <Bookmark size={17} />
                  {busy ? "Đang xử lý..." : "Tạo và lưu lịch trình"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline planner-switch-btn"
                  onClick={handleAskAiAboutDestination}
                >
                  <Bot size={15} />
                  Nhờ Trợ lý AI tư vấn điểm đến này
                </button>
              </fieldset>
            </form>
          </section>
        )}

        {/* Right Column: Visual Timeline & Result */}
        <section className="planner-result" aria-live="polite">
          {busy && (
            <LoadingSpinner label="Đang xử lý yêu cầu. Việc tạo lịch trình có thể mất khoảng một phút..." />
          )}

          {content ? (
            <article className="panel">
              <div className="planner-helper-box">
                <h3>
                  <CheckCircle2 size={16} color="#1b6b3b" />
                  Lịch trình đã được lưu vào tài khoản
                </h3>
                <p>
                  Bạn có thể xem lại bất cứ lúc nào ở danh sách <strong>Lịch trình đã lưu</strong> phía dưới, hoặc kiểm tra các tour thực tế có thể đặt chỗ ngay.
                </p>
              </div>

              <p className="eyebrow">LỊCH TRÌNH GỢI Ý · ĐÃ LƯU</p>
              <h2>{content.itinerary.title}</h2>
              {content.request.modelId && <p className="muted">Mô hình AI: {content.request.modelId}</p>}
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
              <div className="panel">
                <EmptyState
                  title="Bắt đầu lên kế hoạch cho chuyến đi"
                  description="Hãy trò chuyện với Trợ lý AI ở bên cạnh hoặc điền biểu mẫu. AI sẽ tự động phân tích và tạo lịch trình chi tiết từng ngày, danh sách trang bị và đề xuất tour phù hợp nhất."
                />
                <div className="planner-preview-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={handleSamplePlan}
                  >
                    <Sparkles size={14} />
                    Tạo lịch trình Tà Năng mẫu ngay
                  </button>
                </div>
              </div>
            )
          )}
        </section>
      </div>

      {/* Saved Plans Section */}
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

      {/* Quick Modal to Confirm and Generate Official Plan from Chat */}
      {quickModalOpen && (
        <Modal
          title="Xác nhận & Lưu Lịch trình chính thức"
          onClose={() => !busy && setQuickModalOpen(false)}
        >
          <p className="small muted">
            Lịch trình sẽ được tạo bởi AI và lưu trực tiếp vào tài khoản của bạn để dễ dàng theo dõi.
          </p>
          <form className="planner-quick-modal-form" onSubmit={handleGenerate}>
            <label className="field">
              Điểm đến
              <input
                name="destination"
                required
                maxLength={120}
                value={form.destination}
                onChange={update}
                placeholder="Ví dụ: Đà Lạt, Tà Năng - Phan Dũng..."
              />
            </label>
            <div className="form-row">
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
            </div>
            <div className="form-row">
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
              <label className="field">
                Ngân sách mỗi người (VND)
                <input
                  name="budgetPerPerson"
                  type="number"
                  min="50000"
                  max="100000000"
                  step="100000"
                  required
                  value={form.budgetPerPerson}
                  onChange={update}
                />
              </label>
            </div>
            <div className="payment-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={() => setQuickModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button className="btn" type="submit" disabled={busy}>
                <Bookmark size={15} />
                {busy ? "Đang tạo..." : "Xác nhận tạo & Lưu"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
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

      {/* Login Required Modal for Guest attempting to generate/save plan */}
      {loginPromptOpen && (
        <Modal
          title="Đăng nhập để lập lịch trình"
          onClose={() => setLoginPromptOpen(false)}
        >
          <div className="planner-login-required-modal">
            <div className="login-prompt-icon-box" style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ display: "inline-flex", padding: 16, borderRadius: "50%", background: "#eaf3e7", color: "#1b6b3b" }}>
                <Lock size={32} />
              </span>
            </div>
            <p style={{ textAlign: "center", lineHeight: 1.6, color: "var(--forest, #1b382b)" }}>
              Bạn có thể thoải mái hỏi đáp kinh nghiệm và xem tư vấn cùng Trợ lý AI. Tuy nhiên, tính năng <strong>tạo và lưu lịch trình chính thức</strong> vào tài khoản yêu cầu bạn đăng nhập.
            </p>
            <div className="payment-actions" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setLoginPromptOpen(false)}
              >
                Tiếp tục hỏi AI
              </button>
              <Link
                className="btn"
                to="/login?redirect=/planner"
                onClick={() => setLoginPromptOpen(false)}
              >
                Đăng nhập ngay
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
