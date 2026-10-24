import { useCallback, useState } from "react";
import { reviewService } from "../../api/reviewService";
import useResource from "../../hooks/useResource";
import { errorMessage } from "../../utils/tour";
import LoadingSpinner from "../common/LoadingSpinner";
import EmptyState from "../common/EmptyState";
import ReviewPhotos from './ReviewPhotos';
export default function BookingReview({ bookingId }) {
  const load = useCallback(
    async () => (await reviewService.eligibility(bookingId)).data.data,
    [bookingId],
  );
  const { data, loading, error, reload } = useResource(load);
  const [rating, setRating] = useState(5),
    [comment, setComment] = useState(""),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      await reviewService.create(bookingId, {
        rating: Number(rating),
        comment,
      });
      reload();
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel review-section">
      <h2>Đánh giá chuyến đi</h2>
      {data?.review?.id && <ReviewPhotos reviewId={data.review.id} mode="owner" />}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState
          error
          title="Chưa tải được đánh giá"
          description={error}
          onRetry={reload}
        />
      ) : (
        <>
          {data?.review ? (
            <div role="status">
              <strong>Đã gửi · {data.review.rating}/5 sao</strong>
              <p>{data.review.comment}</p>
            </div>
          ) : (
            <p className="muted">{data?.message}</p>
          )}
          {data?.canReview && (
            <form className="form-stack" onSubmit={submit}>
              <fieldset disabled={busy} className="form-stack">
                <label className="field">
                  Mức độ hài lòng
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} sao
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Trải nghiệm của bạn
                  <textarea
                    required
                    maxLength={2000}
                    rows="4"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <p className="small muted">
                  Họ tên và nhận xét sẽ hiển thị công khai trên trang tour. Mỗi
                  đơn gửi một đánh giá.
                </p>
                {failure && (
                  <p className="notice notice-error" role="alert">
                    {failure}
                  </p>
                )}
                <button className="btn">
                  {busy ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </fieldset>
            </form>
          )}
        </>
      )}
    </section>
  );
}
