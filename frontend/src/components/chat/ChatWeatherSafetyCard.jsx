import { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  CloudSun,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Thermometer,
  Mountain,
  CloudRain,
  Wind,
  Cloud,
  Droplets,
  Backpack,
  ArrowRight,
  MapPin,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './chat-weather.css';

const METRIC_ICONS = {
  BASE_TEMP: Thermometer,
  SUMMIT_TEMP: Mountain,
  RAIN: CloudRain,
  WIND: Wind,
  CLOUD: Cloud,
  HUMIDITY: Droplets,
};

export default function ChatWeatherSafetyCard({ data }) {
  const { sendMessage } = useChat() || {};

  if (!data) return null;

  const isFavorable = data.safetyStatus === 'FAVORABLE';
  const isWarning = data.safetyStatus === 'WARNING';
  const badgeClass = isWarning ? 'badge-WARNING' : isFavorable ? 'badge-FAVORABLE' : 'badge-CAUTION';

  const StatusIcon = isWarning ? ShieldAlert : isFavorable ? CheckCircle2 : AlertTriangle;

  function handleTriggerPackingList() {
    if (sendMessage) {
      const target = data.tourTitle || data.destination || 'cung trekking này';
      sendMessage(`Cần chuẩn bị hành trang đồ dùng gì cho chuyến đi ${target}?`);
    }
  }

  return (
    <div className="chat-weather-card">
      {/* Header with Title and Safety Status Badge */}
      <div className="chat-weather-header">
        <div className="chat-weather-title-row">
          <div className="chat-weather-title-group">
            <span className="chat-weather-icon-badge">
              <CloudSun size={19} />
            </span>
            <div>
              <h3 className="chat-weather-title">
                Dự báo Khí tượng & An toàn: {data.tourTitle || data.destination}
              </h3>
            </div>
          </div>
          <span className={`chat-weather-safety-badge ${badgeClass}`}>
            <StatusIcon size={12} />
            <span>{data.safetyBadgeLabel || data.safetyStatus}</span>
          </span>
        </div>

        <div className="chat-weather-meta-bar">
          {data.destination && (
            <span className="chat-weather-meta-tag">
              <MapPin size={11} /> {data.destination}
            </span>
          )}
          {data.maxAltitudeM && (
            <span className="chat-weather-meta-tag">
              <Mountain size={11} /> Đỉnh {Number(data.maxAltitudeM).toLocaleString()}m
            </span>
          )}
          {data.forecastTime && (
            <span className="chat-weather-meta-tag">
              <Calendar size={11} /> Dự báo ngày {data.forecastTime}
            </span>
          )}
          {data.weatherDescription && (
            <span className="chat-weather-meta-tag">
              <Sparkles size={11} /> {data.weatherDescription}
            </span>
          )}
        </div>
      </div>

      {/* AI Guardian Summary Box */}
      {data.safetySummary && (
        <div className="chat-weather-summary-box">
          <div className="chat-weather-summary-title">
            <ShieldCheck size={14} style={{ color: isWarning ? '#dc2626' : '#0284c7' }} />
            <span>Đánh giá an toàn thực địa từ AI Guardian:</span>
          </div>
          <p className="chat-weather-summary-desc">{data.safetySummary}</p>
        </div>
      )}

      {/* 6-Cell Weather Metrics Grid */}
      {data.metrics && data.metrics.length > 0 && (
        <div className="chat-weather-grid">
          {data.metrics.map((m, idx) => {
            const IconComp = METRIC_ICONS[m.iconType] || Thermometer;
            const isSummitCell = m.iconType === 'SUMMIT_TEMP';
            const isCloudCell = m.iconType === 'CLOUD';
            const cellHighlight = isSummitCell ? 'cell-highlight-summit' : isCloudCell ? 'cell-highlight-cloud' : '';

            return (
              <div key={idx} className={`chat-weather-cell ${cellHighlight}`}>
                <span className="chat-weather-cell-label">
                  <IconComp size={11} /> {m.label}
                </span>
                <span className="chat-weather-cell-value">{m.value}</span>
                {m.subtext && <span className="chat-weather-cell-subtext">{m.subtext}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* AI Field Safety Alerts List */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="chat-weather-alerts">
          {data.alerts.map((alert, idx) => {
            const isAlertCaution = alert.severity === 'CAUTION' || alert.severity === 'DANGER';
            const AlertIcon = isAlertCaution ? AlertTriangle : Info;

            return (
              <div key={idx} className={`chat-weather-alert-card alert-${alert.severity || 'INFO'}`}>
                <AlertIcon size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div className="chat-weather-alert-title">{alert.title}</div>
                  <div className="chat-weather-alert-msg">{alert.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cross-card Quick Action Bar */}
      <div className="chat-weather-footer">
        <button
          type="button"
          className="chat-weather-cross-btn"
          onClick={handleTriggerPackingList}
          title="Kích hoạt thẻ danh mục hành trang tương tác phù hợp với thời tiết này"
        >
          <Backpack size={13} />
          <span>🎒 Xem đồ cần chuẩn bị cho thời tiết này</span>
        </button>

        {(data.slug || data.tourId) && (
          <Link
            to={`/tours/${data.slug || data.tourId}`}
            className="chat-weather-tour-btn"
          >
            <span>Đặt tour ngay</span>
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
