import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { guideService } from "../../api/guideService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { mediaUrl } from "../../utils/tour";
export default function GuideProfile() {
  const { id } = useParams();
  const loader = useCallback(
    async () => (await guideService.profile(id)).data.data,
    [id],
  );
  const { data, loading, error, reload } = useResource(loader);
  return (
    <div className="container page-space">
      <Link className="back-link" to="/tours">
        ← Khám phá các chuyến đi
      </Link>
      {loading ? (
        <LoadingSpinner />
      ) : error || !data ? (
        <EmptyState
          error
          title="Chưa tải được hồ sơ"
          description={error}
          onRetry={reload}
        />
      ) : (
        <article className="guide-profile panel">
          <div className="guide-portrait">
            {data.avatarUrl ? (
              <img src={mediaUrl(data.avatarUrl)} alt={data.fullName} />
            ) : (
              <Users size={72} />
            )}
          </div>
          <div>
            <p className="eyebrow">NGƯỜI ĐỒNG HÀNH TRÊN CUNG ĐƯỜNG</p>
            <h1>{data.fullName}</h1>
            {data.experienceSince && (
              <p className="status-badge">
                Đồng hành từ {data.experienceSince}
              </p>
            )}
            <h2>Giới thiệu</h2>
            <p className="preserve-lines">
              {data.bio || "Thông tin giới thiệu đang được cập nhật."}
            </p>
            <h2>Chuyên môn</h2>
            <p>{data.specialties || "Đang cập nhật"}</p>
            <h2>Ngôn ngữ</h2>
            <p>{data.languages || "Đang cập nhật"}</p>
            <p className="small muted">
              Người dẫn đoàn được phân công riêng cho từng ngày khởi hành. Xem
              lịch của tour để biết đội ngũ đồng hành.
            </p>
          </div>
        </article>
      )}
    </div>
  );
}
