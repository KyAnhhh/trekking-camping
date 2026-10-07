import { useRef, useState } from "react";
import { Upload, Download } from "lucide-react";
import { tourApi } from "../../api/tourService";
import { errorMessage, todayInVietnam } from "../../utils/tour";

export default function TourImportPanel({ onImported }) {
  const [open, setOpen] = useState(false),
    [file, setFile] = useState(null),
    [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const selection = useRef(0);
  const download = () => {
    const date = new Date(todayInVietnam() + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + 30);
    const departure = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 1);
    const example = [
      {
        tour: {
          title: "Hành trình mẫu",
          slug: "hanh-trinh-mau",
          location: "Lâm Đồng",
          durationDays: 2,
          durationNights: 1,
          difficultyLevel: 2,
          maxCapacity: 12,
          pricePerPax: 2500000,
          summary: "Giới thiệu chuyến đi",
          description: "Mô tả chi tiết",
          requiredGear: "Giày trekking",
          safetyTips: "Đi cùng hướng dẫn viên",
        },
        itineraries: [
          {
            dayNumber: 1,
            title: "Khởi hành",
            description: "Gặp đoàn và bắt đầu hành trình",
          },
          {
            dayNumber: 2,
            title: "Trở về",
            description: "Thu dọn khu trại và trở về",
          },
        ],
        schedules: [
          {
            departureDate: departure,
            returnDate: date.toISOString().slice(0, 10),
            availableSlots: 12,
            guideAssignments: [],
          },
        ],
        gears: [{ gearName: "Lều", isProvided: true, rentalPrice: 0 }],
      },
    ];
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(example, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "tour-import-template.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const choose = async (event) => {
    const revision = ++selection.current;
    const selected = event.target.files?.[0];
    setFile(null);
    setPreview([]);
    setError("");
    setSuccess("");
    if (!selected) return;
    if (
      !selected.name.toLowerCase().endsWith(".json") ||
      !selected.size ||
      selected.size > 1024 * 1024
    ) {
      setError("Chọn file JSON theo mẫu, tối đa 1 MB.");
      return;
    }
    try {
      const parsed = JSON.parse(await selected.text());
      if (
        !Array.isArray(parsed) ||
        !parsed.length ||
        parsed.length > 50 ||
        parsed.some((e) => !e?.tour?.title || !e?.tour?.slug)
      )
        throw new Error();
      if (revision !== selection.current) return;
      setPreview(
        parsed.map((e) => ({
          title: e.tour.title,
          slug: e.tour.slug,
          schedules: e.schedules?.length || 0,
        })),
      );
      setFile(selected);
    } catch {
      if (revision === selection.current)
        setError("File chưa đúng mẫu. Cần danh sách từ 1 đến 50 tour.");
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = (await tourApi.importTours(file)).data.data;
      setSuccess(
        `Đã nhập ${result.count} tour. Các tour đã xuất hiện trong danh sách quản lý.`,
      );
      setFile(null);
      setPreview([]);
      onImported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel import-panel">
      <div className="list-toolbar">
        <div>
          <h2>Import dữ liệu tour</h2>
          <p className="muted">
            Nhập tour, lịch trình, lịch khởi hành và trang bị từ file JSON.
          </p>
        </div>
        <button
          className="btn btn-outline btn-small"
          onClick={() => setOpen(!open)}
          disabled={busy}
        >
          <Upload size={16} />
          {open ? "Đóng import" : "Import tour"}
        </button>
      </div>
      {success && (
        <div className="notice notice-success" role="status">
          {success}
        </div>
      )}
      {open && (
        <form onSubmit={submit} className="form-stack tour-import-form">
          <p>
            Tối đa 50 tour/file, 1 MB. Slug phải mới. Nếu một tour lỗi, toàn bộ
            lần nhập sẽ bị hủy. Sau khi nhập, bạn có thể upload ảnh tại trang
            chi tiết tour.
          </p>
          <button type="button" className="btn btn-outline" onClick={download}>
            <Download size={16} />
            Tải file mẫu
          </button>
          <label className="field">
            Chọn file JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={choose}
              disabled={busy}
            />
          </label>
          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          {!!preview.length && (
            <>
              <p>
                <strong>{preview.length} tour chuẩn bị nhập:</strong>
              </p>
              <ul>
                {preview.map((tour, index) => (
                  <li key={index}>
                    {tour.title} · {tour.slug} · {tour.schedules} lịch khởi hành
                  </li>
                ))}
              </ul>
            </>
          )}
          <button className="btn" disabled={busy || !file}>
            {busy ? "Đang nhập dữ liệu..." : "Xác nhận nhập tour"}
          </button>
        </form>
      )}
    </section>
  );
}
