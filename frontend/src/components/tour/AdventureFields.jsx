import { todayInVietnam } from "../../utils/tour";

export const metricFields = [
  ["distanceKm", "Quãng đường trekking toàn tour (km)", 1000, "0.01"],
  ["maxAltitudeM", "Độ cao cao nhất (m so với mực nước biển)", 9000, "1"],
  ["totalAscentM", "Tổng độ cao leo lên tích lũy (m)", 100000, "1"],
  ["activeHoursPerDay", "Thời gian vận động ngày dài nhất (giờ)", 24, "0.01"],
  ["medicalAccessHours", "Thời gian tiếp cận y tế ước tính (giờ)", 168, "0.01"],
  ["customersPerGuide", "Số khách / hướng dẫn viên dự kiến", 1000, "1"],
];
export function adventurePayload(value) {
  if (!value || !Object.keys(value).length) return undefined;
  const result = Object.fromEntries(
    Object.entries(value || {}).map(([k, v]) => [k, v === "" ? null : v]),
  );
  metricFields.forEach(([k]) => {
    if (result[k] != null) result[k] = Number(result[k]);
  });
  if (typeof result.recommendedMonths === "string") {
    result.recommendedMonths = result.recommendedMonths
      .split(",")
      .map((month) => month.trim())
      .join(",");
    if (!result.recommendedMonths) result.recommendedMonths = null;
  }
  return result;
}
export default function AdventureFields({ value = {}, onChange }) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  const present = (v) => v != null && String(v).trim() !== "";
  const needsSource = metricFields.some(([key]) => present(value[key])) ||
    present(value.participationRequirements);
  const needsMedicalNotes = present(value.medicalAccessHours);
  const requiredText = (key) =>
    (key === "sourceNote" && needsSource) ||
    (key === "medicalAccessNotes" && needsMedicalNotes);
  return (
    <section className="span-2 adventure-editor">
      <h3>Tổng quan hành trình & yêu cầu tham gia</h3>
      <p className="muted">
        Để trống nếu chưa có dữ liệu. Chỉ nhập số liệu do nhà tổ chức xác nhận;
        không lấy số minh họa làm thông số thực tế.
      </p>
      {needsSource && (
        <p className="muted">
          Đã nhập thông số hoặc yêu cầu tham gia: cần điền nguồn/người xác nhận
          và ngày xác minh trước khi lưu. Ngày xác minh không được sau hôm nay.
        </p>
      )}
      <div className="form-grid">
        {metricFields.map(([key, label, max, step]) => (
          <label key={key} className="field">
            {label}
            <input
              type="number"
              min={key === "customersPerGuide" ? 1 : 0}
              max={max}
              step={step}
              value={value[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <label className="field">
          Tháng khuyến nghị (ví dụ 3,4,5)
          <input
            maxLength={100}
            pattern={"\\s*(?:[1-9]|1[0-2])(?:\\s*,\\s*(?:[1-9]|1[0-2])){0,11}\\s*"}
            title="Nhập tháng từ 1 đến 12, ngăn cách bằng dấu phẩy, ví dụ 3,4,5."
            value={value.recommendedMonths ?? ""}
            onChange={(e) => set("recommendedMonths", e.target.value)}
          />
        </label>
        <label className="field">
          Điểm tập kết
          <input
            maxLength={255}
            value={value.assemblyPoint ?? ""}
            onChange={(e) => set("assemblyPoint", e.target.value)}
          />
        </label>
        {[
          [
            "medicalAccessNotes",
            "Điểm xuất phát, cơ sở y tế và điều kiện ước tính",
            2000,
          ],
          [
            "pickupNotes",
            "Hướng dẫn đón khách (xác nhận giờ cụ thể theo lịch)",
            2000,
          ],
          [
            "participationRequirements",
            "Yêu cầu vận động, hỗ trợ và trường hợp cần trao đổi trước",
            5000,
          ],
          ["sourceNote", "Nguồn / người xác nhận thông số", 2000],
        ].map(([key, label, max]) => (
          <label key={key} className="field span-2">
            {label}{requiredText(key) ? " (bắt buộc)" : ""}
            <textarea
              rows="2"
              maxLength={max}
              required={requiredText(key)}
              ref={(node) => node?.setCustomValidity(
                requiredText(key) && !present(value[key])
                  ? `Vui lòng nhập ${label.toLowerCase()}.`
                  : "",
              )}
              value={value[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <label className="field">
          Ngày xác minh{needsSource ? " (bắt buộc)" : ""}
          <input
            type="date"
            required={needsSource}
            max={todayInVietnam()}
            value={value.verifiedOn ?? ""}
            onChange={(e) => set("verifiedOn", e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
