import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { mediaUrl } from "../../utils/tour";
export default function GuideTeam({ members = [], legacyName }) {
  if (!members.length)
    return (
      <p className="small muted">
        {legacyName
          ? `Người phụ trách: ${legacyName} · Hồ sơ đang cập nhật`
          : "Hướng dẫn viên đang được cập nhật."}
      </p>
    );
  return (
    <div className="guide-team">
      {members.map(({ guide, role, phone, responseStatus, responseReason }) => (
        <article className="guide-card" key={guide.id}>
          {guide.avatarUrl ? (
            <img
              src={mediaUrl(guide.avatarUrl)}
              alt={guide.fullName}
              loading="lazy"
            />
          ) : (
            <span className="guide-avatar">
              <Users size={24} />
            </span>
          )}
          <div>
            <small className="eyebrow">
              {role === "LEAD" ? "Trưởng đoàn" : "Hỗ trợ đoàn"}
            </small>
            <Link className="text-link" to={`/guides/${guide.id}`}>
              {guide.fullName}
            </Link>
            {guide.specialties && (
              <p className="small muted">{guide.specialties}</p>
            )}
            {responseStatus && <p className="small">{({PENDING:'Chờ hướng dẫn viên nhận lịch',ACCEPTED:'Đã nhận lịch',DECLINED:'Đã từ chối',LEGACY:'Phân công cũ — chưa ghi nhận phản hồi'})[responseStatus] || responseStatus}</p>}
            {responseReason && <p className="small">Lý do: {responseReason}</p>}
            {phone && (
              <a className="small text-link" href={`tel:${phone}`}>
                {phone}
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
