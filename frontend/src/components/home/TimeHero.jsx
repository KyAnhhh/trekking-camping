import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sunrise, Sun, Sunset, Moon, Clock3 } from 'lucide-react';
import { landscape } from '../../utils/tour';
import { TIME_THEMES } from '../../utils/timeTheme';
import useHeroMotion from '../../hooks/useHeroMotion';

const icons = { morning: Sunrise, noon: Sun, afternoon: Sunset, night: Moon };
export default function TimeHero({ theme, mode, setMode }) {
  const ref = useRef(null);
  useHeroMotion(ref);
  const current = TIME_THEMES.find((item) => item.id === theme);
  return (
    <section className="hero time-hero" ref={ref} aria-labelledby="home-title">
      <div className="time-landscape" aria-hidden="true">
        <img className="hero-photo time-day-photo" src={landscape} alt="" width="1800" height="1200" fetchPriority="high" />
        <img className="hero-photo time-night-photo" src={landscape} alt="" width="1800" height="1200" decoding="async" />
      </div>
      <div className="time-skies" aria-hidden="true">
        {TIME_THEMES.map(({ id }) => <div key={id} className={`time-sky sky-${id}`} />)}
      </div>
      <div className="time-stars" aria-hidden="true" />
      <div className="time-orb" aria-hidden="true" />
      <div className="time-mist" aria-hidden="true" />
      <div className="time-camp" aria-hidden="true"><span /></div>
      <div className="hero-shade" />
      <div className="container hero-content">
        <p className="eyebrow light"><span className="tiny-line" /> NHỮNG CHUYẾN ĐI, NHỮNG KẾT NỐI MỚI</p>
        <h1 id="home-title">Rời phố thị.<br /><span>Chạm thiên nhiên.</span></h1>
        <p className="hero-description">Tìm một cung đường, dành thời gian cho chính mình.<br className="desktop-only" /> Hành trình tiếp theo bắt đầu từ sự tò mò của bạn.</p>
        <Link className="btn btn-lime" to="/tours">Khám phá những chuyến đi <ArrowUpRight size={20} /></Link>
        <p className="hero-time-note">{current.note}</p>
        <div className="time-controls" role="group" aria-label="Xem giao diện theo thời điểm">
          <button type="button" aria-pressed={mode === 'auto'} onClick={() => setMode('auto')}><Clock3 size={16} aria-hidden="true" />Auto</button>
          {TIME_THEMES.map(({ id, label, hours }) => {
            const Icon = icons[id];
            return <button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id)} title={hours}><Icon size={16} aria-hidden="true" />{label}</button>;
          })}
        </div>
        <p className="time-mode-label" role="status">{mode === 'auto' ? `Theo giờ thiết bị · ${current.label}` : `Xem trước · ${current.label} · ${current.hours}`}</p>
      </div>
      <span className="hero-image-note">Phong cảnh minh họa</span>
    </section>
  );
}
