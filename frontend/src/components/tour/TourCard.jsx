import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import CompareButton from './CompareButton';
import { ArrowUpRight, Clock3, MapPin, Mountain, Sparkles } from 'lucide-react';
import { duration, formatDifficulty, money, tourImage, landscape } from '../../utils/tour';
import use3DTilt from '../../hooks/use3DTilt';
import { useLanguage } from '../../context/LanguageContext';
import { useChat } from '../../context/ChatContext';

export default function TourCard({ tour, aiMatch }) {
  const { language, t } = useLanguage();
  const { setTourContext } = useChat() || {};
  const cardRef = useRef(null);
  const hoverTimer = useRef(null);
  use3DTilt(cardRef, { maxTilt: 6, scale: 1.02 });

  const [failedImage, setFailedImage] = useState(null);
  const source = tourImage(tour);
  const fallback = !tour.bannerUrl || failedImage === source;

  const handleMouseEnter = () => {
    if (!setTourContext || !tour) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setTourContext(tour, 'hover');
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  return (
    <article
      className="tour-card"
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link className="tour-image" to={'/tours/' + tour.slug} tabIndex={-1} aria-hidden="true">
        <img
          loading="lazy"
          src={fallback ? landscape : source}
          alt=""
          decoding="async"
          onError={() => { if (!fallback) setFailedImage(source); }}
        />
        <span className="image-badge">
          <Mountain size={13} />
          {formatDifficulty(tour.difficultyLevel, language)}
        </span>
        {aiMatch && aiMatch.relevanceScore > 0 && (
          <span
            className="image-badge ai-match-badge"
            title={(aiMatch.matchedReasons || []).join(' · ')}
          >
            <Sparkles size={12} />
            {language === 'en'
              ? `AI ${Math.round(aiMatch.relevanceScore * 100)}%`
              : `AI ${Math.round(aiMatch.relevanceScore * 100)}%`}
          </span>
        )}
        {fallback && <span className="image-credit">{t('common.photo_credit')}</span>}
        <div className="card-glare" aria-hidden="true" />
      </Link>
      <div className="tour-card-body">
        <FavoriteButton tour={tour} />
        <CompareButton tour={tour} />
        <p className="eyebrow">
          <MapPin size={13} />
          {tour.location || (language === 'en' ? 'Location updating' : 'Địa điểm đang cập nhật')}
        </p>
        <h3>
          <Link to={'/tours/' + tour.slug}>{tour.title}</Link>
        </h3>
        <p className="tour-summary">
          {tour.summary ||
            tour.description ||
            (language === 'en'
              ? 'Discover itinerary details and prepare for your adventure.'
              : 'Khám phá lịch trình và chuẩn bị cho chuyến đi của bạn.')}
        </p>
        <p className="tour-duration">
          <Clock3 size={15} />
          {duration(tour, language)}
        </p>
        {aiMatch?.matchedReasons?.length > 0 && (
          <p className="tour-ai-reason">
            <Sparkles size={13} />
            <span>{aiMatch.matchedReasons[0]}</span>
          </p>
        )}
        <div className="tour-card-bottom">
          <div>
            <small>{t('common.price_per_pax')}</small>
            <strong>{money(tour.pricePerPax)}</strong>
          </div>
          <Link
            className="icon-btn round-arrow"
            aria-label={(language === 'en' ? 'View tour ' : 'Xem tour ') + tour.title}
            to={'/tours/' + tour.slug}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
