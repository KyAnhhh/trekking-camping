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
      {members.map(({ guide, role, phone }) => (
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
