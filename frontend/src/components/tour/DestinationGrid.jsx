import { Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { groupDestinations } from '../../utils/destinations';
import { tourImage, landscape } from '../../utils/tour';
import EmptyState from '../common/EmptyState';
import use3DTilt from '../../hooks/use3DTilt';

export default function DestinationGrid({ tours, limit }) {
  const groups = groupDestinations(tours).slice(0, limit);
  if (!groups.length) {
    return (
      <EmptyState
        title="Điểm đến đang được cập nhật"
        description="Khi tour có thông tin địa điểm, bạn sẽ tìm thấy các khu vực tại đây."
      />
    );
  }
  return (
    <div className="destination-grid">
      {groups.map((group) => (
        <DestinationCard key={group.key} group={group} />
      ))}
    </div>
  );
}

function DestinationCard({ group: { label, tours: items } }) {
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
      {fallback && <span className="destination-image-note">Ảnh minh họa</span>}
      <div className="destination-card-content">
        <span>
          <MapPin size={15} aria-hidden="true" />
          {items.length} tour trong danh sách
        </span>
        <h3>{label}</h3>
        <span className="destination-link">
          Khám phá khu vực <ArrowUpRight size={18} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
