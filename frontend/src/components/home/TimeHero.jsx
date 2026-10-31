import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { landscape } from '../../utils/tour';
import { TIME_THEMES } from '../../utils/timeTheme';
import useHeroGsap from '../../hooks/useHeroGsap';
import CampScene3D from './CampScene3D';
import CelestialOrb from './CelestialOrb';

export default function TimeHero({ theme = 'night', timeString }) {
  const heroRef = useRef(null);
  const contentRef = useRef(null);
  const campRef = useRef(null);
  const orbRef = useRef(null);
  const landscapeRef = useRef(null);
  const mistRef = useRef(null);

  // GSAP animations for entrance, 3D mouse parallax, and ambient floating
  useHeroGsap({
    heroRef,
    contentRef,
    campRef,
    orbRef,
    landscapeRef,
    mistRef,
  });

  const current = TIME_THEMES.find((item) => item.id === theme) || TIME_THEMES[3];

  return (
    <section className="hero time-hero" ref={heroRef} aria-labelledby="home-title">
      {/* Background Mountain Landscapes */}
      <div className="time-landscape" ref={landscapeRef} aria-hidden="true">
        <img
          className="hero-photo time-day-photo"
          src={landscape}
          alt=""
          width="1800"
          height="1200"
          fetchPriority="high"
        />
        <img
          className="hero-photo time-night-photo"
          src={landscape}
          alt=""
          width="1800"
          height="1200"
          decoding="async"
        />
      </div>

      {/* Atmospheric Skies & Gradients */}
      <div className="time-skies" aria-hidden="true">
        {TIME_THEMES.map(({ id }) => (
          <div key={id} className={`time-sky sky-${id}`} />
        ))}
      </div>

      {/* Night Starfield & Shooting Star */}
      {theme === 'night' && (
        <div className="time-stars" aria-hidden="true">
          <div className="shooting-star" />
        </div>
      )}

      {/* Celestial Orb (Moon or Sun with volumetric halo) */}
      <div className="time-orb-wrapper" ref={orbRef}>
        <CelestialOrb theme={theme} />
      </div>

      {/* Volumetric Mountain Mist */}
      <div className="time-mist" ref={mistRef} aria-hidden="true" />

      {/* 3D Isometric Camp & Campfire Vignette */}
      <div className="time-camp-wrapper" ref={campRef}>
        <CampScene3D theme={theme} />
      </div>

      {/* Hero Shade for Legibility */}
      <div className="hero-shade" />

      {/* Hero Content */}
      <div className="container hero-content" ref={contentRef}>
        {/* Subtle, refined live ambient badge (no manual toggle buttons) */}
        <div className="hero-live-pill" role="status" aria-label={`Bầu trời thời gian thực: ${current.label}`}>
          <span className="live-dot" />
          <span className="live-pill-text">
            Thời gian thực · {current.label} {timeString ? `(${timeString})` : ''}
          </span>
        </div>

        <p className="eyebrow light">
          <span className="tiny-line" /> NHỮNG CHUYẾN ĐI, NHỮNG KẾT NỐI MỚI
        </p>

        <h1 id="home-title">
          <span className="hero-title-line">Rời phố thị.</span>
          <br />
          <span className="hero-title-line accent-gradient">Chạm thiên nhiên.</span>
        </h1>

        <p className="hero-description">
          Tìm một cung đường, dành thời gian cho chính mình.
          <br className="desktop-only" /> Hành trình tiếp theo bắt đầu từ sự tò mò của bạn.
        </p>

        <div className="hero-cta-group">
          <Link className="btn btn-lime hero-btn" to="/tours">
            Khám phá những chuyến đi <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>

      <span className="hero-image-note">Phong cảnh minh họa</span>
    </section>
  );
}
