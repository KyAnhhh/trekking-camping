import { Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { groupDestinations } from '../../utils/destinations';
import { tourImage, landscape } from '../../utils/tour';
import EmptyState from '../common/EmptyState';
import use3DTilt from '../../hooks/use3DTilt';
import { useLanguage } from '../../context/LanguageContext';

export default function DestinationGrid({ tours, limit }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const groups = groupDestinations(tours).slice(0, limit);

  if (!groups.length) {
    return (
      <EmptyState
        title={isEn ? 'Destinations updating' : 'Điểm đến đang được cập nhật'}
        description={
          isEn
            ? 'When tours announce location information, regions will appear here.'
            : 'Khi tour có thông tin địa điểm, bạn sẽ tìm thấy các khu vực tại đây.'
        }
      />
    );
  }
  return (
    <div className="destination-grid">
      {groups.map((group) => (
        <DestinationCard key={group.key} group={group} isEn={isEn} />
      ))}
    </div>
  );
}

function DestinationCard({ group: { label, tours: items }, isEn }) {
  const cardRef = useRef(null);
  use3DTilt(cardRef, { maxTilt: 7, scale: 1.025 });

  const cover = items.find((tour) => tour.bannerUrl) || items[0];
  const source = tourImage(cover);
  const [failedImage, setFailedImage] = useState(null);
  const fallback = !cover.bannerUrl || failedImage === source;

  return (
    <Link
      ref={cardRef}
      className="destination-card"
      to={`/tours?${new URLSearchParams({ q: label })}`}
    >
      <img
        src={fallback ? landscape : source}
        alt=""
        loading="lazy"
        decoding="async"
        width="640"
        height="480"
        onError={() => {
          if (!fallback) setFailedImage(source);
        }}
      />
      {fallback && (
        <span className="destination-image-note">
          {isEn ? 'Illustration photo' : 'Ảnh minh họa'}
        </span>
      )}
      <div className="destination-card-content">
        <span>
          <MapPin size={15} aria-hidden="true" />
          {items.length} {isEn ? (items.length === 1 ? 'tour available' : 'tours available') : 'tour trong danh sách'}
        </span>
        <h3>{label}</h3>
        <span className="destination-link">
          {isEn ? 'View expeditions' : 'Xem các tour'} <ArrowUpRight size={16} aria-hidden="true" />
        </span>
      </div>
      <div className="card-glare" aria-hidden="true" />
    </Link>
  );
}
