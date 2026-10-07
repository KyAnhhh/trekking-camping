import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, ArrowUpRight, Search, X } from "lucide-react";
import { tourApi } from "../../api/tourService";
import useResource from "../../hooks/useResource";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import TourImportPanel from "../../components/tour/TourImportPanel";
import {
  duration,
  money,
  formatDifficulty,
  errorMessage,
} from "../../utils/tour";
const loadTours = async () => (await tourApi.getAllTours()).data.data;
const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export default function AdminTours() {
  const { data: tours, loading, error, reload } = useResource(loadTours);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState("");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    location: "",
    durationDays: 2,
    durationNights: 1,
    difficultyLevel: 1,
    pricePerPax: "",
    maxCapacity: 12,
    summary: "",
    description: "",
    requiredGear: "",
    safetyTips: "",
    insuranceInfo: "",
    emergencyHotline: "",
  });
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  async function create(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaveError("");
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          typeof value === "string" ? value.trim() : value,
        ]),
      );
      [
        "durationDays",
        "durationNights",
        "difficultyLevel",
        "pricePerPax",
        "maxCapacity",
      ].forEach((key) => {
        payload[key] = Number(payload[key]);
      });
      const response = await tourApi.createTour(payload);
      navigate("/admin/tours/" + (response.data.data?.slug || payload.slug));
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const filtered = (tours || []).filter((tour) =>
    (tour.title + " " + tour.location)
      .toLocaleLowerCase("vi")
      .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">QUẢN LÝ HÀNH TRÌNH</p>
          <h1>Tour & lịch khởi hành</h1>
          <p className="muted">
            Các tour đang hiển thị trên website và thông tin tổ chức chuyến đi.
          </p>
        </div>
        <button
          className="btn"
          onClick={() => setParams(params.has("create") ? {} : { create: "1" })}
        >
          {params.has("create") ? <X size={18} /> : <Plus size={18} />}
          {params.has("create") ? "Đóng biểu mẫu" : "Tạo tour mới"}
        </button>
      </header>
      {params.has("create") && (
        <section className="panel create-tour-panel">
          <h2>Thêm một hành trình mới</h2>
          <p className="muted">
            Sau khi tạo tour, bổ sung lịch trình, trang bị và lịch khởi hành.
          </p>
          <form onSubmit={create} className="form-stack">
            {saveError && (
              <div role="alert" className="notice notice-error">
                {saveError}
              </div>
            )}
            <fieldset disabled={busy} className="form-grid">
              <label className="field">
                Tên tour
                <input
                  required
                  name="title"
                  maxLength="255"
                  value={form.title}
                  onChange={update}
                  onBlur={() => {
                    if (!form.slug)
                      setForm({ ...form, slug: slugify(form.title) });
                  }}
                />
              </label>
              <label className="field">
                Đường dẫn tour
                <input
                  required
                  name="slug"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Chữ thường không dấu, số và dấu gạch ngang"
                  value={form.slug}
                  onChange={update}
                  placeholder="ta-nang-phan-dung"
                />
              </label>
              <label className="field span-2">
                Địa điểm
                <input
                  required
                  name="location"
                  value={form.location}
                  onChange={update}
                />
              </label>
              <label className="field">
                Số ngày
                <input
                  required
                  type="number"
                  name="durationDays"
                  min="1"
                  value={form.durationDays}
                  onChange={update}
                />
              </label>
              <label className="field">
                Số đêm
                <input
                  required
                  type="number"
                  name="durationNights"
                  min="0"
                  value={form.durationNights}
                  onChange={update}
                />
              </label>
              <label className="field">
                Độ khó
                <select
                  name="difficultyLevel"
                  value={form.difficultyLevel}
                  onChange={update}
                >
                  <option value="1">Dễ</option>
                  <option value="2">Trung bình</option>
                  <option value="3">Mạo hiểm</option>
                </select>
              </label>
              <label className="field">
                Sức chứa tối đa
                <input
                  required
                  name="maxCapacity"
                  type="number"
                  min="1"
                  value={form.maxCapacity}
                  onChange={update}
                />
              </label>
              <label className="field">
                Giá mỗi người (VNĐ)
                <input
                  required
                  type="number"
                  name="pricePerPax"
                  min="0"
                  step="1000"
                  value={form.pricePerPax}
                  onChange={update}
                />
              </label>
              <label className="field">
                Điện thoại hỗ trợ
                <input
                  name="emergencyHotline"
                  type="tel"
                  value={form.emergencyHotline}
                  onChange={update}
                />
              </label>
              {[
                ["summary", "Giới thiệu ngắn"],
                ["description", "Mô tả hành trình"],
                ["requiredGear", "Trang bị khách cần mang"],
                ["safetyTips", "Lưu ý an toàn"],
                ["insuranceInfo", "Thông tin bảo hiểm"],
              ].map(([name, label]) => (
                <label className="field span-2" key={name}>
                  {label}
                  <textarea
                    name={name}
                    rows={name === "description" ? 4 : 2}
                    value={form[name]}
                    onChange={update}
                  />
                </label>
              ))}
            </fieldset>
            <button className="btn" disabled={busy}>
              {busy ? "Đang tạo tour..." : "Tạo tour & bổ sung lịch trình"}
              <ArrowUpRight size={18} />
            </button>
          </form>
        </section>
      )}
      <TourImportPanel onImported={reload} />
      <section className="panel">
        <div className="list-toolbar">
          <h2>
            Tour đang hiển thị{" "}
            <span className="count-pill">{tours?.length ?? "—"}</span>
          </h2>
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Tìm tour trong trang quản trị"
              placeholder="Tìm tên tour, địa điểm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <EmptyState
            error
            title="Chưa tải được danh sách tour"
            description={error}
            onRetry={reload}
          />
        ) : !filtered.length ? (
          <EmptyState
            title="Chưa có tour phù hợp"
            description="Thử từ khóa khác hoặc tạo hành trình mới."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hành trình</th>
                  <th>Thời lượng</th>
                  <th>Độ khó</th>
                  <th>Giá / người</th>
                  <th>
                    <span className="sr-only">Quản lý</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tour) => (
                  <tr key={tour.id}>
                    <td>
                      <strong>{tour.title}</strong>
                      <small>{tour.location}</small>
                    </td>
                    <td>{duration(tour)}</td>
                    <td>
                      <span className="status-badge">
                        {formatDifficulty(tour.difficultyLevel)}
                      </span>
                    </td>
                    <td>{money(tour.pricePerPax)}</td>
                    <td>
                      <Link
                        className="text-link"
                        to={"/admin/tours/" + tour.slug}
                        aria-label={"Quản lý " + tour.title}
                      >
                        Chi tiết <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
