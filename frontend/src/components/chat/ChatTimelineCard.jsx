import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarRange,
  Mountain,
  Footprints,
  Clock,
  MapPin,
  ArrowRight,
  Navigation,
  Utensils,
  Tent,
  Coffee,
  CheckCircle2,
} from 'lucide-react';
import './chat-timeline.css';

const ICON_MAP = {
  START: Navigation,
  LUNCH: Utensils,
  CAMP: Tent,
  SUMMIT: Mountain,
  TREK: Footprints,
  REST: Coffee,
};

export default function ChatTimelineCard({ data }) {
  if (!data || !data.days || data.days.length === 0) return null;

  const [activeDayNum, setActiveDayNum] = useState(data.days[0]?.dayNumber || 1);

  const currentDay = data.days.find((d) => d.dayNumber === activeDayNum) || data.days[0];

  return (
    <div className="chat-timeline-card">
      {/* Header with Title and Summary Stats */}
      <div className="chat-timeline-header">
        <div className="chat-timeline-title-row">
          <span className="chat-timeline-icon-badge">
            <CalendarRange size={18} />
          </span>
          <h3 className="chat-timeline-title">
            {data.title || 'Lịch trình chi tiết từng ngày'}
          </h3>
        </div>

        <div className="chat-timeline-meta-bar">
          {data.location && (
            <span className="chat-timeline-meta-tag">
              <MapPin size={11} /> {data.location}
            </span>
          )}
          {data.durationDays && (
            <span className="chat-timeline-meta-tag">
              <Clock size={11} /> {data.durationDays} ngày {Math.max(1, data.durationDays - 1)} đêm
            </span>
          )}
          {data.maxAltitudeM && (
            <span className="chat-timeline-meta-tag">
              <Mountain size={11} /> Đỉnh {Number(data.maxAltitudeM).toLocaleString()}m
            </span>
          )}
          {data.distanceKm && (
            <span className="chat-timeline-meta-tag">
              <Footprints size={11} /> Tổng cự ly {data.distanceKm} km
            </span>
          )}
        </div>
      </div>

      {/* Day Tabs */}
      {data.days.length > 1 && (
        <div className="chat-timeline-tabs">
          {data.days.map((day) => (
            <button
              key={day.dayNumber}
              type="button"
              className={`chat-timeline-tab-btn ${activeDayNum === day.dayNumber ? 'active' : ''}`}
              onClick={() => setActiveDayNum(day.dayNumber)}
            >
              <span>Ngày {day.dayNumber}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Day Summary Box */}
      {currentDay && (
        <div className="chat-timeline-day-summary">
          <h4 className="chat-timeline-day-title">{currentDay.title}</h4>
          {currentDay.summary && (
            <p className="chat-timeline-day-desc">{currentDay.summary}</p>
          )}
        </div>
      )}

      {/* Vertical Milestones Timeline */}
      {currentDay && currentDay.milestones && (
        <div className="chat-timeline-milestones">
          {currentDay.milestones.map((m, idx) => {
            const IconComponent = ICON_MAP[m.iconType] || Footprints;
            const markerType = m.iconType || 'TREK';

            return (
              <div key={idx} className="chat-timeline-milestone-item">
                <div className={`chat-timeline-marker marker-${markerType}`}>
                  <IconComponent size={12} />
                </div>

                <div className="chat-timeline-content">
                  <div className="chat-timeline-milestone-header">
                    <h5 className="chat-timeline-milestone-title">{m.title}</h5>
                    {m.time && (
                      <span className="chat-timeline-time-badge">{m.time}</span>
                    )}
                  </div>

                  {m.desc && <p className="chat-timeline-desc">{m.desc}</p>}

                  <div className="chat-timeline-badges-row">
                    {m.altitudeM && (
                      <span className="chat-timeline-altitude-pill">
                        <Mountain size={10} /> {m.altitudeM}m
                      </span>
                    )}
                    {m.distanceNotice && (
                      <span className="chat-timeline-distance-pill">
                        <Footprints size={10} /> {m.distanceNotice}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer CTA */}
      <div className="chat-timeline-footer">
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #6b7280)' }}>
          <CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px', color: '#10b981' }} />
          Lịch trình chuẩn bị cùng Leader & Porter bản địa
        </span>
        <Link
          to={`/tours/${data.slug || data.tourId || ''}`}
          className="chat-timeline-btn"
        >
          <span>Xem chi tiết tour</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
