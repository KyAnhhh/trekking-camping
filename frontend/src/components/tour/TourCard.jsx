import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3, MapPin, Mountain } from 'lucide-react';
import { duration, formatDifficulty, money, tourImage, landscape } from '../../utils/tour';
export default function TourCard({ tour }) {
  return (
    <article className="tour-card">
      <Link className="tour-image" to={'/tours/' + tour.slug} tabIndex={-1} aria-hidden="true">
        <img
          loading="lazy"
          src={tourImage(tour)}
          alt=""
          onError={(e) => {
            if (e.currentTarget.src !== landscape) e.currentTarget.src = landscape;
          }}
        />
        <span className="image-badge">
          <Mountain size={13} />
          {formatDifficulty(tour.difficultyLevel)}
        </span>
        {!tour.bannerUrl && <span className="image-credit">Ảnh minh họa</span>}
      </Link>
      <div className="tour-card-body">
        <p className="eyebrow">
          <MapPin size={13} />
          {tour.location || 'Địa điểm đang cập nhật'}
        </p>
        <h3>
          <Link to={'/tours/' + tour.slug}>{tour.title}</Link>
        </h3>
        <p className="tour-summary">
          {tour.summary ||
            tour.description ||
            'Khám phá lịch trình và chuẩn bị cho chuyến đi của bạn.'}
        </p>
        <p className="tour-duration">
          <Clock3 size={15} />
          {duration(tour)}
        </p>
        <div className="tour-card-bottom">
          <div>
            <small>Giá mỗi người</small>
            <strong>{money(tour.pricePerPax)}</strong>
          </div>
          <Link
            className="icon-btn round-arrow"
            aria-label={'Xem tour ' + tour.title}
            to={'/tours/' + tour.slug}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
