import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareQuote } from 'lucide-react';
import { reviewService } from '../../api/reviewService';
import useResource from '../../hooks/useResource';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';

function ReviewList({ tours }) {
  const load = useCallback(async () => {
    const selected = tours.slice(0, 3);
    const responses = await Promise.allSettled(selected.map((tour) => reviewService.list(tour.id)));
    return {
      partial: responses.some((r) => r.status === 'rejected'),
      items: responses.flatMap((r, i) => r.status === 'fulfilled' ? (r.value.data.data?.items || []).slice(0, 1).map((review) => ({ ...review, tour: selected[i] })) : []),
    };
  }, [tours]);
  const { data, loading, error, reload } = useResource(load, {
    key: ["home-reviews", (tours || []).map((t) => t.id).join(",")],
    ttl: 180000,
    persist: false,
  });
  if (loading) return <LoadingSpinner label="Đang tải chia sẻ từ các chuyến đi..." />;
  if (error || (data?.partial && !data.items.length)) return <EmptyState error title="Chưa tải được đánh giá" description="Bạn có thể thử lại hoặc xem đánh giá trong trang tour." onRetry={reload} />;
  if (!data?.items.length) return <EmptyState title="Chờ những câu chuyện sau chuyến đi" description="Các tour đang giới thiệu chưa có đánh giá. Khách có đơn hoàn tất có thể chia sẻ từ Chuyến đi của tôi."><Link to="/my-bookings" className="text-link">Chuyến đi của tôi</Link></EmptyState>;
  return <>
    {data.partial && <p role="status" className="notice">Một số đánh giá chưa tải được. <button type="button" className="text-btn" onClick={reload}>Thử lại</button></p>}
    <div className="home-review-grid">{data.items.map((review) => <article key={`${review.tour.id}-${review.id}`} className="home-review">
      <MessageSquareQuote size={24} aria-hidden="true" />
      <p className="review-score">{review.rating}/5 sao</p>
      <blockquote>{review.comment || 'Khách đã gửi điểm đánh giá cho chuyến đi.'}</blockquote>
      <p className="review-author">{review.author || 'Khách hàng'}</p>
      <Link to={`/tours/${review.tour.slug}`}>Xem tour {review.tour.title}</Link>
    </article>)}</div>
  </>;
}

export default function HomeReviews({ tours }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setReady(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setReady(true); observer.disconnect(); } }, { rootMargin: '300px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div className="home-reviews-content" ref={ref}>{ready ? <ReviewList tours={tours} /> : <p className="muted">Chia sẻ từ khách của các tour đang giới thiệu.</p>}</div>;
}
