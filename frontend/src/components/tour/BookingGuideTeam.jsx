import { useCallback } from "react";
import { guideService } from "../../api/guideService";
import useResource from "../../hooks/useResource";
import GuideTeam from "./GuideTeam";
export default function BookingGuideTeam({ bookingId, admin }) {
  const loader = useCallback(
    async () => (await guideService.bookingTeam(bookingId, admin)).data.data,
    [bookingId, admin],
  );
  const { data, loading, error, reload } = useResource(loader);
  return (
    <section className="booking-guide-team">
      <h3>Đội ngũ đồng hành</h3>
      {loading ? (
        <p>Đang tải hướng dẫn viên...</p>
      ) : error ? (
        <p className="notice notice-error" role="alert">
          {error}{" "}
          <button className="text-btn" onClick={reload}>
            Thử lại
          </button>
        </p>
      ) : (
        data && (
          <>
            <GuideTeam
              members={data.guides}
              legacyName={data.legacyGuideName}
            />
            {data.legacyGuidePhone && (
              <p>
                Liên hệ người phụ trách:{" "}
                <a className="text-link" href={`tel:${data.legacyGuidePhone}`}>
                  {data.legacyGuidePhone}
                </a>
              </p>
            )}
          </>
        )
      )}
    </section>
  );
}
