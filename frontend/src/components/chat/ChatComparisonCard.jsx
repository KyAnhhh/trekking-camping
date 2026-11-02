import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  Mountain,
  Footprints,
  Clock,
  Sparkles,
  MapPin,
  ArrowRight,
  ShieldAlert,
  Tent,
  Trees,
  CheckCircle,
} from 'lucide-react';
import { money, mediaUrl, landscape } from '../../utils/tour';
import './chat-comparison.css';

function TourColumn({ tour, label }) {
  const [imgFailed, setImgFailed] = useState(false);
  const bannerSrc = imgFailed || !tour.bannerUrl ? landscape : mediaUrl(tour.bannerUrl);

  const diffLevel = Math.min(Math.max(Number(tour.difficultyLevel) || 2, 1), 5);

  return (
    <div className="chat-comparison-col">
      <div className="chat-comparison-tour-banner">
        <img
          src={bannerSrc}
          alt={tour.title}
          className="chat-comparison-tour-img"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
        <span className="chat-comparison-tour-badge">{label}</span>
      </div>

      <div className="chat-comparison-tour-body">
        <h4 className="chat-comparison-tour-title">{tour.title}</h4>
        <div className="chat-comparison-location">
          <MapPin size={12} />
          <span>{tour.location || 'Miền Bắc'}</span>
        </div>

        {/* 4-cell Metrics Grid */}
        <div className="chat-comparison-metric-grid">
          <div className="chat-comparison-metric-item">
            <span className="chat-comparison-metric-label">
              <Mountain size={11} /> Độ cao đỉnh
            </span>
            <span className="chat-comparison-metric-val">
              {tour.maxAltitudeM ? `${Number(tour.maxAltitudeM).toLocaleString()}m` : 'Đang cập nhật'}
            </span>
          </div>

          <div className="chat-comparison-metric-item">
            <span className="chat-comparison-metric-label">
              <Footprints size={11} /> Cự ly trek
            </span>
            <span className="chat-comparison-metric-val">
              {tour.distanceKm ? `${tour.distanceKm} km` : 'Đang cập nhật'}
            </span>
          </div>

          <div className="chat-comparison-metric-item">
            <span className="chat-comparison-metric-label">
              <Clock size={11} /> Thời gian
            </span>
            <span className="chat-comparison-metric-val">
              {tour.durationDays ? `${tour.durationDays}N${Math.max(1, tour.durationDays - 1)}Đ` : '2N1Đ'}
              {tour.activeHoursPerDay ? ` · ~${tour.activeHoursPerDay}h/N` : ''}
            </span>
          </div>

          <div className="chat-comparison-metric-item">
            <span className="chat-comparison-metric-label">
              <ShieldAlert size={11} /> Cấp độ
            </span>
            <span className={`diff-badge diff-level-${diffLevel}`}>
              {tour.difficultyLabel || `Level ${diffLevel}`}
            </span>
          </div>
        </div>

        {/* Detailed Trail & Camp Conditions */}
        <div className="chat-comparison-details">
          {tour.terrainType && (
            <div className="chat-comparison-detail-row">
              <span className="chat-comparison-detail-key">
                <Trees size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                Địa hình:
              </span>
              <span className="chat-comparison-detail-desc">{tour.terrainType}</span>
            </div>
          )}

          {tour.campCondition && (
            <div className="chat-comparison-detail-row">
              <span className="chat-comparison-detail-key">
                <Tent size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                Hạ trại / Lán:
              </span>
              <span className="chat-comparison-detail-desc">{tour.campCondition}</span>
            </div>
          )}

          {tour.highlights && (
            <div className="chat-comparison-detail-row">
              <span className="chat-comparison-detail-key">
                <Sparkles size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                Điểm nhấn:
              </span>
              <span className="chat-comparison-detail-desc">{tour.highlights}</span>
            </div>
          )}

          {tour.suitableFor && (
            <div className="chat-comparison-detail-row">
              <span className="chat-comparison-detail-key">
                <CheckCircle size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                Phù hợp:
              </span>
              <span className="chat-comparison-detail-desc">{tour.suitableFor}</span>
            </div>
          )}
        </div>

        {/* Price & Action Button */}
        <div className="chat-comparison-footer-bar">
          <div className="chat-comparison-price-tag">
            {money(tour.pricePerPax)}
            <small style={{ fontSize: '0.68rem', fontWeight: 'normal', color: 'var(--text-muted, #6b7280)', marginLeft: '4px' }}>
              / khách
            </small>
          </div>
          <Link
            to={`/tours/${tour.slug || tour.tourId}`}
            className="chat-comparison-btn"
          >
            <span>Xem & Đặt tour này</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ChatComparisonCard({ data }) {
  if (!data || !data.tourA || !data.tourB) return null;

  return (
    <div className="chat-comparison-card">
      <div className="chat-comparison-header">
        <div className="chat-comparison-title-row">
          <span className="chat-comparison-icon-badge">
            <Scale size={18} />
          </span>
          <h3 className="chat-comparison-title">
            {data.title || 'So sánh đối chiếu cung đường'}
          </h3>
        </div>
      </div>

      {data.verdict && (
        <div className="chat-comparison-verdict">
          <Sparkles size={17} className="chat-comparison-verdict-icon" />
          <p className="chat-comparison-verdict-text">{data.verdict}</p>
        </div>
      )}

      <div className="chat-comparison-columns">
        <TourColumn tour={data.tourA} label="LỰA CHỌN A" />
        <TourColumn tour={data.tourB} label="LỰA CHỌN B" />
      </div>
    </div>
  );
}
