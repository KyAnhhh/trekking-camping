import { duration, dateLabel } from "../../utils/tour";
// Editorial comparison scales, not clinical thresholds or a fitness clearance.
const axes = [
  ["medicalAccessHours", "Tiếp cận y tế", "giờ", [0.5, 1, 2, 4]],
  ["distanceKm", "Quãng đường", "km", [5, 10, 20, 40]],
  ["activeHoursPerDay", "Vận động/ngày", "giờ", [2, 4, 6, 8]],
  ["totalAscentM", "Tổng leo lên", "m", [200, 500, 1000, 2000]],
  ["maxAltitudeM", "Độ cao cao nhất", "m", [500, 1000, 2000, 3000]],
];
const point = (i, r) => [
  180 + Math.sin((i * Math.PI * 2) / 5) * r,
  165 - Math.cos((i * Math.PI * 2) / 5) * r,
];
const polygon = (r) => axes.map((_, i) => point(i, r).join(",")).join(" ");
const shown = (v, unit = "") =>
  v == null || v === "" ? "Chưa cập nhật" : `${v} ${unit}`;
export default function TourSummary({ tour }) {
  const p = tour.adventureProfile || {};
  const complete = axes.every(
    ([k]) => p[k] != null && Number.isFinite(Number(p[k])),
  );
  const values = axes.map(([k, , , limits], i) =>
    point(i, (1 + limits.filter((n) => Number(p[k]) > n).length) * 23),
  );
  return (
    <section
      className="adventure-summary"
      aria-labelledby="adventure-summary-title"
    >
      <p className="eyebrow">HIỂU CUNG ĐƯỜNG TRƯỚC KHI ĐI</p>
      <h2 id="adventure-summary-title">Tổng quan hành trình</h2>
      <div className="adventure-summary-layout">
        <div>
          {complete ? (
            <svg
              viewBox="0 0 360 335"
              role="img"
              aria-label="Biểu đồ so sánh 5 chỉ số hành trình; số liệu và thang quy đổi bên dưới"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <polygon
                  key={n}
                  points={polygon(n * 23)}
                  fill={n === 5 ? "#163d2c" : "none"}
                  stroke="#78926f"
                  strokeWidth="1"
                />
              ))}
              <polygon
                points={values.map((v) => v.join(",")).join(" ")}
                fill="#d9ec9a55"
                stroke="#d9ec9a"
                strokeWidth="2"
              />
              {values.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="#d9ec9a" />
              ))}
              {axes.map(([, label], i) => {
                const [x, y] = point(i, 148);
                return (
                  <text
                    key={label}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#163d2c"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          ) : (
            <div className="summary-incomplete">
              Biểu đồ sẽ xuất hiện khi đủ 5 thông số hành trình. Xem các thông
              tin đã xác minh bên dưới.
            </div>
          )}
          <p className="small muted">
            Xa tâm hơn = chỉ số lớn hơn. Không phải điểm an toàn hoặc xác nhận
            đủ sức khỏe.
          </p>
        </div>
        <dl className="summary-facts">
          {[
            ["Thời lượng", duration(tour)],
            ["Quy mô tối đa", shown(tour.maxCapacity, "khách")],
            ["Tháng khuyến nghị", shown(p.recommendedMonths)],
            [
              "Tỷ lệ hỗ trợ dự kiến",
              p.customersPerGuide
                ? `${p.customersPerGuide} khách : 1 hướng dẫn viên`
                : "Chưa cập nhật",
            ],
            ["Đón khách", shown(p.pickupNotes)],
            ["Điểm tập kết", shown(p.assemblyPoint)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <dl className="summary-metrics">
        {axes.map(([key, label, unit]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{shown(p[key], unit)}</dd>
          </div>
        ))}
      </dl>
      {p.medicalAccessNotes && (
        <p className="small">
          <strong>Ước tính tiếp cận y tế: </strong>
          {p.medicalAccessNotes}. Thời gian thực tế phụ thuộc vị trí, thời tiết
          và phương tiện.
        </p>
      )}
      <details>
        <summary>Cách đọc biểu đồ và nguồn thông tin</summary>
        <p>
          Thang 1–5 phục vụ so sánh tour, không phải ngưỡng y khoa. Giá trị tại
          ngưỡng thuộc mức thấp hơn; vượt ngưỡng cuối là mức 5.
        </p>
        <ul>
          {axes.map(([, label, unit, limits]) => (
            <li key={label}>
              {label}: ngưỡng {limits.join(" / ")} {unit}.
            </li>
          ))}
        </ul>
        <p>
          {p.sourceNote || "Chưa có nguồn xác minh."}{" "}
          {p.verifiedOn && `Cập nhật: ${dateLabel(p.verifiedOn)}`}
        </p>
        <p>
          Tháng khuyến nghị không bảo đảm thời tiết; tỷ lệ hỗ trợ dự kiến không
          thay thế danh sách hướng dẫn viên được phân công.
        </p>
      </details>
      <div className="summary-requirements">
        <h3>Yêu cầu tham gia & hỗ trợ</h3>
        <p className="preserve-lines">
          {p.participationRequirements ||
            "Liên hệ nhà tổ chức để xác nhận yêu cầu vận động và khả năng hỗ trợ của tour."}
        </p>
        <p className="small muted">
          Nếu có tình trạng sức khỏe cần lưu ý, trao đổi với người phụ trách và
          chuyên gia y tế phù hợp trước chuyến đi. AI không xác nhận đủ sức khỏe
          tham gia.
        </p>
      </div>
    </section>
  );
}
