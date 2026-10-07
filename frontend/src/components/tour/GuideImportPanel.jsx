import { useRef, useState } from "react";
import { Upload, Download } from "lucide-react";
import { guideService } from "../../api/guideService";
import { errorMessage } from "../../utils/tour";

export default function GuideImportPanel({ onImported, disabled, onBusyChange }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const input = useRef(null);
  const selection = useRef(0);
  const submitting = useRef(false);
  const blocked = disabled || busy;

  function download() {
    const example = [{ code: "HDV_MAU_01", fullName: "Hướng dẫn viên mẫu",
      bio: "Thay bằng thông tin hồ sơ đã xác nhận.", experienceSince: null,
      specialties: "", languages: "Tiếng Việt", phone: "", email: "", active: true }];
    const url = URL.createObjectURL(new Blob([JSON.stringify(example, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "guide-import-template.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function choose(event) {
    const revision = ++selection.current;
    const selected = event.target.files?.[0];
    setFile(null); setPreview([]); setError(""); setSuccess(""); setReading(false);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".json") || !selected.size || selected.size > 1024 * 1024) {
      setError("Chọn file JSON UTF-8 có nội dung, tối đa 1 MB."); return;
    }
    setReading(true);
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await selected.arrayBuffer());
      const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
      if (!Array.isArray(parsed) || !parsed.length || parsed.length > 100) {
        throw new Error("File cần chứa danh sách từ 1 đến 100 hướng dẫn viên.");
      }
      const codes = new Set();
      const allowed = new Set(["code", "fullName", "bio", "experienceSince", "specialties", "languages", "phone", "email", "active"]);
      parsed.forEach((row, i) => {
        if (!row || Array.isArray(row) || typeof row !== "object" || Object.keys(row).some(k => !allowed.has(k))
            || typeof row.code !== "string" || !/^[A-Z0-9_-]{2,40}$/.test(row.code)
            || typeof row.fullName !== "string" || !row.fullName.trim() || row.fullName.length > 150
            || typeof row.active !== "boolean") throw new Error(`Hồ sơ thứ ${i + 1} sai cấu trúc hoặc thiếu mã, họ tên, trạng thái. Hãy dùng file mẫu.`);
        if (codes.has(row.code)) throw new Error(`Hồ sơ thứ ${i + 1} có mã trùng trong file.`);
        codes.add(row.code);
      });
      if (revision !== selection.current) return;
      setPreview(parsed.map(({ code, fullName, active }) => ({ code, fullName, active })));
      setFile(selected);
    } catch (err) {
      if (revision === selection.current) setError(err instanceof SyntaxError || err instanceof TypeError
        ? "Không đọc được JSON UTF-8. Hãy dùng file mẫu." : err.message);
    } finally {
      if (revision === selection.current) setReading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!file || blocked || reading || submitting.current) return;
    submitting.current = true;
    setBusy(true); onBusyChange(true); setError(""); setSuccess("");
    try {
      const result = (await guideService.importGuides(file)).data.data;
      setSuccess(`Đã nhập ${result.count} hướng dẫn viên. Bạn có thể thêm ảnh và phân công lịch khởi hành.`);
      setFile(null); setPreview([]); input.current.value = "";
      onImported();
    } catch (err) { setError(errorMessage(err)); }
    finally { submitting.current = false; setBusy(false); onBusyChange(false); }
  }

  return <section className="panel import-panel">
    <div className="list-toolbar">
      <div><h2>Import hướng dẫn viên</h2><p className="muted">Nhập nhiều hồ sơ từ file JSON. Hồ sơ đang có được giữ nguyên.</p></div>
      <button className="btn btn-outline btn-small" disabled={blocked} onClick={() => setOpen(!open)}>
        <Upload size={16} /> {open ? "Đóng import" : "Import hướng dẫn viên"}
      </button>
    </div>
    {success && <div className="notice notice-success" role="status">{success}</div>}
    {open && <form className="form-stack tour-import-form" onSubmit={submit}>
      <p>Tối đa 100 hồ sơ/file, 1 MB. Nếu mã đã tồn tại hoặc một hồ sơ lỗi, toàn bộ lần nhập sẽ bị hủy. Ảnh đại diện được upload sau khi nhập.</p>
      <button type="button" className="btn btn-outline" onClick={download} disabled={blocked}><Download size={16} /> Tải file mẫu</button>
      <label className="field">Chọn file JSON hướng dẫn viên
        <input ref={input} type="file" accept=".json,application/json" disabled={blocked} onChange={choose} />
      </label>
      {reading && <p role="status">Đang đọc file...</p>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {!!preview.length && <><p><strong>{preview.length} hồ sơ chuẩn bị nhập:</strong></p>
        <ul>{preview.map(row => <li key={row.code}>{row.code} · {row.fullName} · {row.active ? "Đang nhận phân công" : "Ngừng nhận phân công"}</li>)}</ul>
        <p className="small muted">Hệ thống kiểm tra thêm dữ liệu và mã đã tồn tại khi xác nhận nhập.</p>
      </>}
      <button className="btn" disabled={blocked || reading || !file}>{busy ? "Đang nhập..." : "Xác nhận nhập hướng dẫn viên"}</button>
    </form>}
  </section>;
}
