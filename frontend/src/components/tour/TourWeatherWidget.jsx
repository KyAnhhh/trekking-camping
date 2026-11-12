import { useEffect, useState } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, Thermometer, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import "./tour-weather.css";

const LOCATION_COORDINATES = {
  "sa pa": { lat: 22.3364, lon: 103.8438, name: "Sa Pa, Lào Cai" },
  "lào cai": { lat: 22.3364, lon: 103.8438, name: "Lào Cai" },
  "fansipan": { lat: 22.3033, lon: 103.7750, name: "Đỉnh Fansipan" },
  "hà giang": { lat: 22.8233, lon: 104.9839, name: "Hà Giang" },
  "đồng văn": { lat: 23.2789, lon: 105.3622, name: "Cao nguyên đá Đồng Văn" },
  "tà xùa": { lat: 21.2833, lon: 104.4667, name: "Tà Xùa, Sơn La" },
  "sơn la": { lat: 21.3283, lon: 103.9148, name: "Sơn La" },
  "yên bái": { lat: 21.7229, lon: 104.5711, name: "Yên Bái" },
  "mù cang chải": { lat: 21.8486, lon: 104.0847, name: "Mù Cang Chải" },
  "đà lạt": { lat: 11.9404, lon: 108.4583, name: "Đà Lạt, Lâm Đồng" },
  "lâm đồng": { lat: 11.9404, lon: 108.4583, name: "Lâm Đồng" },
  "bidoup": { lat: 12.1833, lon: 108.6500, name: "Vườn quốc gia Bidoup" },
  "quảng bình": { lat: 17.5898, lon: 106.2829, name: "Quảng Bình" },
  "phong nha": { lat: 17.5898, lon: 106.2829, name: "Phong Nha - Kẻ Bàng" },
  "cát bà": { lat: 20.8000, lon: 107.0500, name: "Đảo Cát Bà, Hải Phòng" },
  "bà đen": { lat: 11.3667, lon: 106.1667, name: "Núi Bà Đen, Tây Ninh" },
  "tây ninh": { lat: 11.3667, lon: 106.1667, name: "Tây Ninh" },
  "bạch mộc": { lat: 22.5000, lon: 103.6000, name: "Bạch Mộc Lương Tử" },
  "pù luông": { lat: 20.5000, lon: 105.1500, name: "Pù Luông, Thanh Hóa" },
  "trị an": { lat: 11.1667, lon: 107.0500, name: "Hồ Trị An, Đồng Nai" },
  "măng đen": { lat: 14.6000, lon: 108.2833, name: "Măng Đen, Kon Tum" },
};

function resolveCoords(locationText = "", titleText = "") {
  const query = `${locationText} ${titleText}`.toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (query.includes(key)) {
      return coords;
    }
  }
  // Default to mountain region near Sa Pa / Fansipan
  return { lat: 22.3364, lon: 103.8438, name: locationText || "Vùng núi dã ngoại" };
}

function interpretWeather(code, isDay, lang) {
  const isEn = lang === "en";
  if (code === 0) {
    return {
      label: isEn ? "Clear Sky" : "Trời quang mây tạnh",
      icon: Sun,
      isRain: false,
    };
  }
  if (code >= 1 && code <= 3) {
    return {
      label: isEn ? "Partly Cloudy" : "Mây rải rác / Trời dịu",
      icon: Cloud,
      isRain: false,
    };
  }
  if (code === 45 || code === 48) {
    return {
      label: isEn ? "Mountain Fog & Mist" : "Sương mù vùng cao",
      icon: Cloud,
      isRain: false,
    };
  }
  if (code >= 51 && code <= 67) {
    return {
      label: isEn ? "Light / Moderate Rain" : "Có mưa rào / mưa phùn",
      icon: CloudRain,
      isRain: true,
    };
  }
  if (code >= 80 && code <= 99) {
    return {
      label: isEn ? "Showers / Mountain Storm" : "Mưa giông vùng cao",
      icon: CloudRain,
      isRain: true,
    };
  }
  return {
    label: isEn ? "Pleasant Outdoors" : "Thời tiết dịu mát",
    icon: Cloud,
    isRain: false,
  };
}

export default function TourWeatherWidget({ location, title }) {
  const { language, t } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coordsInfo, setCoordsInfo] = useState(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = resolveCoords(location, title);
      setCoordsInfo(coords);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FHo_Chi_Minh`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Không thể kết nối trạm khí tượng");
      const data = await res.json();
      setWeather(data.current);
    } catch (err) {
      setError(err.message || "Lỗi tải thời tiết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [location, title]);

  const condition = weather ? interpretWeather(weather.weather_code, weather.is_day, language) : null;
  const ConditionIcon = condition?.icon || Cloud;

  let advice = t("weather.ideal");
  let adviceType = "good";

  if (weather) {
    if (weather.precipitation > 0 || condition?.isRain) {
      advice = t("weather.rain_warn");
      adviceType = "warning";
    } else if (weather.temperature_2m < 14) {
      advice = t("weather.cold_warn");
      adviceType = "warning";
    } else if (weather.temperature_2m > 32) {
      advice = t("weather.sunny_warn");
      adviceType = "warning";
    }
  }

  return (
    <div className="tour-weather-widget card" aria-label={t("weather.title")}>
      <div className="weather-header">
        <div className="weather-header-title">
          <Cloud size={18} className="weather-icon-lead" />
          <div>
            <h4>{t("weather.title")}</h4>
            <span className="weather-location">{coordsInfo?.name || location}</span>
          </div>
        </div>
        <button
          type="button"
          className="weather-refresh-btn"
          onClick={fetchWeather}
          disabled={loading}
          title={t("common.retry")}
          aria-label={t("common.retry")}
        >
          <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="weather-loading">
          <div className="weather-skeleton-pulse" />
          <span>{t("weather.loading")}</span>
        </div>
      ) : error ? (
        <div className="weather-fallback">
          <span>{coordsInfo?.name}: Khí hậu mát mẻ, thích hợp dã ngoại ngoài trời.</span>
        </div>
      ) : weather ? (
        <div className="weather-body">
          <div className="weather-main-row">
            <div className="weather-temp-badge">
              <ConditionIcon size={32} className="weather-status-icon" />
              <div>
                <span className="temp-number">{Math.round(weather.temperature_2m)}°C</span>
                <span className="temp-feels">
                  {t("weather.temp")}: {Math.round(weather.apparent_temperature)}°C
                </span>
              </div>
            </div>

            <div className="weather-details-grid">
              <div className="weather-detail-pill">
                <Wind size={15} />
                <span>{weather.wind_speed_10m} km/h</span>
              </div>
              <div className="weather-detail-pill">
                <Droplets size={15} />
                <span>{weather.relative_humidity_2m}%</span>
              </div>
            </div>
          </div>

          <div className={`weather-advice ${adviceType}`}>
            {adviceType === "good" ? (
              <CheckCircle2 size={16} className="advice-icon" />
            ) : (
              <AlertCircle size={16} className="advice-icon" />
            )}
            <p>{advice}</p>
          </div>

          <div className="weather-footer">
            <small>{t("weather.powered_by")}</small>
          </div>
        </div>
      ) : null}
    </div>
  );
}
