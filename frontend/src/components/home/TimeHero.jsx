import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { landscape } from '../../utils/tour';
import useHeroGsap from '../../hooks/useHeroGsap';
import { useLanguage } from '../../context/LanguageContext';

const HERO_BANNER_SRC = '/images/hero-banner.jpg';

export default function TimeHero({ theme = 'night' }) {
  const { t } = useLanguage();
  const [imgSrc, setImgSrc] = useState(HERO_BANNER_SRC);

  const heroRef = useRef(null);
  const contentRef = useRef(null);
  const campRef = useRef(null);
  const orbRef = useRef(null);
  const landscapeRef = useRef(null);
  const mistRef = useRef(null);

  useHeroGsap({
    heroRef,
    contentRef,
    campRef,
    orbRef,
    landscapeRef,
    mistRef,
  });

  return (
    <div className="container hero-outer-frame">
      <section className="hero time-hero hero-editorial-banner" ref={heroRef} aria-labelledby="home-title">
        {/* Main Panoramic Mountain Trekking & Camping Banner */}
        <div className="time-landscape" ref={landscapeRef} aria-hidden="true">
          <img
            className="hero-photo time-day-photo"
            src={imgSrc}
            alt=""
            width="1920"
            height="1080"
            fetchPriority="high"
            onError={() => {
              if (imgSrc !== landscape) setImgSrc(landscape);
            }}
          />
        </div>

        {/* Subtle Atmospheric Mist & Directional Contrast Shade */}
        <div className="time-mist" ref={mistRef} aria-hidden="true" />
        <div className="hero-shade" data-theme-tint={theme} aria-hidden="true" />

        {/* Centered-Left Editorial Typography (positioned harmoniously beside the hiker & above the valley) */}
        <div className="hero-content hero-editorial-content" ref={contentRef}>
          <p className="eyebrow light">
            <span className="tiny-line" /> {t('hero.eyebrow')}
          </p>

          <h1 id="home-title">
            <span className="hero-title-line">{t('hero.title_line1')}</span>
            <br />
            <span className="hero-title-line accent-gradient">{t('hero.title_line2')}</span>
          </h1>

          <p className="hero-description">
            {t('hero.description')}
          </p>

          <div className="hero-cta-group">
            <Link className="btn hero-cta-pill hero-btn" to="/tours">
              {t('hero.cta')} <ArrowUpRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
