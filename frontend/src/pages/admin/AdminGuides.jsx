import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { guideService } from "../../api/guideService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import GuideImportPanel from "../../components/tour/GuideImportPanel";
import { errorMessage, mediaUrl } from "../../utils/tour";
const empty = {
  code: "",
  fullName: "",
  bio: "",
  experienceSince: "",
  specialties: "",
  languages: "",
  phone: "",
  email: "",
  active: true,
};
export default function AdminGuides() {
  const loader = useCallback(
    async () => (await guideService.list()).data.data,
    [],
  );
  const { data, loading, error, reload } = useResource(loader);
  const [form, setForm] = useState(empty),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [actionError, setActionError] = useState("");
  const formRef = useRef(null);
  function edit(row) {
    setEditing(row.profile.id);
    setActionError("");
    setNotice("");
    setForm({
      ...empty,
      ...Object.fromEntries(
        Object.keys(empty).map((k) => [
          k,
          row[k] ?? row.profile[k] ?? empty[k],
        ]),
      ),
    });
    formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    const payload = {
      ...form,
      experienceSince:
        form.experienceSince === "" ? null : Number(form.experienceSince),
    };
    try {
      await (editing
        ? guideService.update(editing, payload)
        : guideService.create(payload));
      setForm(empty);
      setEditing(null);
      setNotice("Đã lưu hồ sơ hướng dẫn viên.");
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(id, event) {
    const input = event.target,
      file = input.files?.[0];
    if (!file || busy) return;
    if (file.size > 5 * 1024 * 1024) {
      setActionError("Ảnh tối đa 5 MB.");
      input.value = "";
      return;
    }
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await guideService.upload(id, file);
      setNotice("Đã cập nhật ảnh đại diện.");
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
      input.value = "";
    }
  }
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">ĐỘI NGŨ ĐỒNG HÀNH</p>
          <h1>Hướng dẫn viên</h1>
          <p className="muted">
            Quản lý hồ sơ và chuyên môn. Phân công đội ngũ trong từng lịch khởi
            hành.
          </p>
        </div>
      </header>
      {notice && (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      )}
      {actionError && (
        <p className="notice notice-error" role="alert">
          {actionError}
        </p>
      )}
      <GuideImportPanel onImported={reload} disabled={busy} onBusyChange={setBusy} />
      <div className="admin-detail-grid">
        <section className="panel">
          <h2>Danh sách đội ngũ</h2>
          <label className="field">
            Tìm theo tên hoặc mã
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <EmptyState
              error
              title="Chưa tải được hướng dẫn viên"
              description={error}
              onRetry={reload}
            />
          ) : (
            <div className="guide-admin-list">
              {(data || [])
                .filter((g) =>
                  `${g.profile.fullName} ${g.profile.code}`
                    .toLocaleLowerCase("vi")
                    .includes(search.toLocaleLowerCase("vi")),
                )
                .map((row) => (
                  <article className="guide-admin-card" key={row.profile.id}>
                    {row.profile.avatarUrl && (
                      <img
                        className="guide-admin-avatar"
                        src={mediaUrl(row.profile.avatarUrl)}
                        alt={row.profile.fullName}
                      />
                    )}
                    <div>
                      <strong>{row.profile.fullName}</strong>
                      <p className="small muted">
                        {row.profile.code} ·{" "}
                        {row.active ? "Đang nhận chuyến" : "Ngừng hoạt động"}
                      </p>
                      <p>{row.profile.specialties}</p>
                      <div className="guide-actions">
                        <button
                          className="btn btn-small btn-outline"
                          disabled={busy}
                          onClick={() => edit(row)}
                        >
                          Sửa hồ sơ
                        </button>
                        <Link
                          className="text-link"
                          to={`/guides/${row.profile.id}`}
                        >
                          Xem hồ sơ
                        </Link>
                      </div>
                      <label className="field small">
                        Ảnh đại diện (JPEG/PNG, tối đa 5 MB)
                        <input
                          aria-label={`Ảnh đại diện ${row.profile.fullName}`}
                          disabled={busy}
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={(e) => upload(row.profile.id, e)}
                        />
                      </label>
                    </div>
                  </article>
                ))}
              {!data?.length && (
                <EmptyState
                  title="Chưa có hướng dẫn viên"
                  description="Tạo hồ sơ đầu tiên bằng biểu mẫu bên cạnh."
                />
              )}
            </div>
          )}
        </section>
        <section className="panel" ref={formRef}>
          <h2>{editing ? "Cập nhật hồ sơ" : "Thêm hướng dẫn viên"}</h2>
          <form className="form-stack" onSubmit={save}>
            <fieldset className="form-stack" disabled={busy}>
              <label className="field">
                Mã hướng dẫn viên
                <input
                  required
                  disabled={!!editing}
                  pattern="[A-Z0-9_-]{2,40}"
                  maxLength={40}
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="HDV_001"
                />
              </label>
              {[
                ["fullName", "Họ tên", "text", 150],
                ["phone", "Điện thoại liên hệ (nội bộ)", "tel", 30],
                ["email", "Email (nội bộ)", "email", 254],
                ["specialties", "Chuyên môn", "text", 500],
                ["languages", "Ngôn ngữ", "text", 200],
              ].map(([key, label, type, max]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    type={type}
                    required={key === "fullName"}
                    maxLength={max}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label className="field">
                Năm bắt đầu dẫn tour
                <input
                  type="number"
                  min="1960"
                  max={new Date().getFullYear()}
                  value={form.experienceSince}
                  onChange={(e) =>
                    setForm({ ...form, experienceSince: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Giới thiệu
                <textarea
                  rows="5"
                  maxLength={4000}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Đang nhận phân công
              </label>
              <button className="btn">
                {busy ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => {
                    setEditing(null);
                    setForm(empty);
                  }}
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </fieldset>
          </form>
        </section>
      </div>
    </>
  );
}
