import { useCallback, useState } from "react";
import { reviewService } from "../../api/reviewService";
import useResource from "../../hooks/useResource";
import LoadingSpinner from "../common/LoadingSpinner";
import EmptyState from "../common/EmptyState";
import ReviewPhotos from './ReviewPhotos';
export default function TourReviews({ tourId }) {
  const [page, setPage] = useState(0);
  const load = useCallback(
    async (signal) => (await reviewService.list(tourId, page, signal)).data.data,
    [tourId, page],
  );
  const { data, loading, error, reload } = useResource(load, {
    key: ["reviews", tourId, page],
    ttl: 180000,
    persist: false,
  });
  return (
    <section className="panel review-section">
      <h2>Trải nghiệm từ người đã đi</h2>
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState
          error
          title="Chưa tải được đánh giá"
          description={error}
          onRetry={reload}
        />
      ) : !data?.total ? (
        <p className="muted">
          Chưa có đánh giá. Khách có đơn đã hoàn thành có thể chia sẻ trải
          nghiệm từ trang đơn đặt tour.
        </p>
      ) : (
        <>
          <p>
            <strong>{data.average}/5 sao</strong> · {data.total} đánh giá sau
            chuyến đi
          </p>
          {data.items.map((r) => (
            <article className="review-item" key={r.id}>
              <ReviewPhotos reviewId={r.id} initialPhotos={r.photos} />
              <h3>
                {r.author} · {r.rating}/5 sao
              </h3>
              <p className="small muted">
                {new Date(r.createdAt).toLocaleDateString("vi-VN")} ·{" "}
                {r.verified ? "Đã tham gia chuyến đi" : "Đánh giá"}
              </p>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {r.comment}
              </p>
            </article>
          ))}
          <div className="payment-actions">
            <button
              className="btn btn-outline btn-small"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </button>
            <span>Trang {page + 1}</span>
            <button
              className="btn btn-outline btn-small"
              disabled={(page + 1) * 20 >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
    </section>
  );
}
