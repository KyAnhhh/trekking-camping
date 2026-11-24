import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Leaf,
  MapPin,
  Mountain,
  Search,
  Sparkles,
  TentTree,
  Zap,
} from 'lucide-react';
import { tourApi } from '../../api/tourService';
import useResource from '../../hooks/useResource';
import TourCard from '../../components/tour/TourCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { campsite, forest } from '../../utils/tour';
import TimeHero from '../../components/home/TimeHero';
import HomeReviews from '../../components/home/HomeReviews';
import DestinationGrid from '../../components/tour/DestinationGrid';
import FieldMoments3D from '../../components/home/FieldMoments3D';
import Reveal from '../../components/common/Reveal';
import TravelFaq from '../../components/common/TravelFaq';
import useTimeTheme from '../../hooks/useTimeTheme';
import use3DTilt from '../../hooks/use3DTilt';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/home.css';

function ExperienceCardItem({ to, img, alt, eyebrow, title, desc }) {
  const cardRef = useRef(null);
  use3DTilt(cardRef, { maxTilt: 6, scale: 1.02 });
  return (
    <Link ref={cardRef} className="experience-card" to={to}>
      <img src={img} alt={alt} loading="lazy" />
      <div>
        <span className="eyebrow light">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      <div className="card-glare" aria-hidden="true" />
      <ArrowUpRight className="experience-arrow" />
    </Link>
  );
}

const loadTours = async () => (await tourApi.getAllTours()).data.data;

export default function Home() {
  const { theme, timeString } = useTimeTheme();
  const { t } = useLanguage();
  const { data: tours, loading, error, reload } = useResource(loadTours, {
    key: 'tours',
    ttl: 300000,
    persist: true,
  });
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const navigate = useNavigate();

  function search(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (difficulty) params.set('difficulty', difficulty);
    navigate('/tours?' + params);
  }

  return (
    <div className="home-page" data-time-theme={theme}>
      <TimeHero theme={theme} timeString={timeString} />
      <div className="container search-dock">
        <form className="trip-search" onSubmit={search}>
          <label>
            <span>
              <MapPin size={16} /> {t('search.destination_label')}
            </span>
            <input
              placeholder={t('search.destination_placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span>
              <Mountain size={16} /> {t('search.difficulty_label')}
            </span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">{t('search.all_difficulties')}</option>
              <option value="1">{t('search.easy')}</option>
              <option value="2">{t('search.medium')}</option>
              <option value="3">{t('search.hard')}</option>
            </select>
          </label>
          <button className="btn" type="submit">
            <Search size={19} />
            {t('search.submit')}
          </button>
        </form>
      </div>

      <Reveal className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('home.featured_eyebrow')}</p>
            <h2>
              {t('home.featured_title')}
            </h2>
            <p className="muted">{t('home.featured_desc')}</p>
          </div>
          <Link className="text-link" to="/tours">
            {t('home.view_all_tours')} <ArrowRight size={18} />
          </Link>
        </div>
        {loading ? (
          <LoadingSpinner label={t('home.loading_tours')} />
        ) : error ? (
          <EmptyState
            error
            title="Chưa tải được các chuyến đi"
            description={error}
            onRetry={reload}
          />
        ) : !tours?.length ? (
          <EmptyState
            title={t('home.no_tours')}
            description={t('home.no_tours_desc')}
          >
            <Link className="btn btn-outline" to="/chat">
              {t('home.ask_ai_btn')}
            </Link>
          </EmptyState>
        ) : (
          <div className="tour-grid">
            {tours.slice(0, 3).map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
      </Reveal>

      <Reveal className="container section" aria-labelledby="home-destinations">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('home.destinations_eyebrow')}</p>
            <h2 id="home-destinations">{t('home.destinations_title')}</h2>
            <p className="muted">{t('home.destinations_desc')}</p>
          </div>
          <Link className="text-link" to="/destinations">
            {t('home.all_destinations')} <ArrowRight size={18} />
          </Link>
        </div>
        {loading ? (
          <LoadingSpinner label={t('home.loading_destinations')} />
        ) : error ? (
          <p className="notice">Điểm đến sẽ xuất hiện khi danh sách tour tải thành công.</p>
        ) : (
          <DestinationGrid tours={tours || []} limit={4} />
        )}
      </Reveal>

      <Reveal>
        <FieldMoments3D />
      </Reveal>

      <Reveal className="experience-section">
        <div className="container section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t('home.rhythm_eyebrow')}</p>
              <h2>{t('home.rhythm_title')}</h2>
            </div>
            <p className="heading-note">
              {t('home.rhythm_desc')}
            </p>
          </div>
          <div className="experience-grid">
            <ExperienceCardItem
              to="/tours?difficulty=1"
              img={forest}
              alt="Lối đi giữa cánh rừng xanh"
              eyebrow={t('home.card1_eyebrow')}
              title={t('home.card1_title')}
              desc={t('home.card1_desc')}
            />
            <ExperienceCardItem
              to="/tours?duration=short"
              img={campsite}
              alt="Lều cắm trại giữa thiên nhiên"
              eyebrow={t('home.card2_eyebrow')}
              title={t('home.card2_title')}
              desc={t('home.card2_desc')}
            />
          </div>
        </div>
      </Reveal>

      <Reveal className="container section">
        <div className="approach-grid">
          <div>
            <p className="eyebrow">{t('home.why_eyebrow')}</p>
            <h2>
              {t('home.why_title')}
            </h2>
            <Link className="text-link" to="/chat">
              {t('home.why_cta')} <ArrowRight size={18} />
            </Link>
          </div>
          <div className="principles">
            <article>
              <Mountain />
              <div>
                <h3>{t('home.p1_title')}</h3>
                <p>{t('home.p1_desc')}</p>
              </div>
            </article>
            <article>
              <TentTree />
              <div>
                <h3>{t('home.p2_title')}</h3>
                <p>{t('home.p2_desc')}</p>
              </div>
            </article>
            <article>
              <Leaf />
              <div>
                <h3>{t('home.p3_title')}</h3>
                <p>{t('home.p3_desc')}</p>
              </div>
            </article>
          </div>
        </div>
      </Reveal>

      <Reveal className="container section" aria-labelledby="booking-steps-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('home.steps_eyebrow')}</p>
            <h2 id="booking-steps-title">{t('home.steps_title')}</h2>
          </div>
          <Link className="text-link" to="/contact">
            {t('home.need_help')} <ArrowRight size={18} />
          </Link>
        </div>
        <ol className="booking-steps">
          <li>
            <span>01</span>
            <h3>{t('home.step1_title')}</h3>
            <p>{t('home.step1_desc')}</p>
          </li>
          <li>
            <span>02</span>
            <h3>{t('home.step2_title')}</h3>
            <p>{t('home.step2_desc')}</p>
          </li>
          <li>
            <span>03</span>
            <h3>{t('home.step3_title')}</h3>
            <p>{t('home.step3_desc')}</p>
          </li>
          <li>
            <span>04</span>
            <h3>{t('home.step4_title')}</h3>
            <p>{t('home.step4_desc')}</p>
          </li>
        </ol>
      </Reveal>

      {/* AI Gear Vision Spotlight Banner */}
      <Reveal className="container section">
        <div className="home-ai-vision-banner">
          <div className="home-ai-vision-content">
            <div className="home-ai-vision-tags">
              <span className="ai-tag tag-edge">
                <Zap size={13} /> Edge YOLO26 AI · 0 Token
              </span>
              <span className="ai-tag tag-tech">8 Danh mục Dã ngoại</span>
            </div>
            <h2>Chụp ảnh balo, AI thẩm định an toàn tức thì</h2>
            <p>
              Tải lên hình ảnh giày trekking, gậy leo núi, balo hay lều cắm trại.
              Mô hình thị giác máy tính cục bộ sẽ tự động phát hiện vật thể, đo lường độ sẵn sàng và đối chiếu với độ khó của cung đường trước giờ khởi hành.
            </p>
            <div className="home-ai-vision-actions">
              <Link to="/gear-check" className="btn btn-lime">
                <Camera size={16} /> Thử ngay AI Soát Đồ →
              </Link>
              <Link to="/chat" className="btn btn-outline home-ai-ghost-btn">
                <Sparkles size={16} /> Hỏi Trợ lý Gemini
              </Link>
            </div>
          </div>
          <div className="home-ai-vision-visual" aria-hidden="true">
            <div className="ai-vision-demo-card">
              <div className="demo-card-badge">
                <span className="demo-dot"></span>
                <span>YOLO26 Detection · NMS-Free</span>
                <strong className="demo-score">92% Ready</strong>
              </div>
              <div className="demo-items-list">
                <div className="demo-item">
                  <span>🥾 Giày trekking bám đá</span>
                  <span className="demo-conf">94%</span>
                </div>
                <div className="demo-item">
                  <span>🦯 Gậy leo núi trợ lực</span>
                  <span className="demo-conf">91%</span>
                </div>
                <div className="demo-item">
                  <span>⛺ Lều cắm trại 2 lớp</span>
                  <span className="demo-conf">89%</span>
                </div>
              </div>
              <div className="demo-card-footer">
                ⚡ Tốc độ suy luận: ~25ms · 0 Token tiêu tốn
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="home-stories">
        <div className="container section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t('home.reviews_eyebrow')}</p>
              <h2>{t('home.reviews_title')}</h2>
              <p className="muted">{t('home.reviews_desc')}</p>
            </div>
          </div>
          {!loading && !error && tours?.length ? (
            <HomeReviews tours={tours} />
          ) : (
            <EmptyState
              title="Chưa có đánh giá để hiển thị"
              description="Hãy quay lại khi danh sách tour và chia sẻ của khách được cập nhật."
            />
          )}
        </div>
      </Reveal>

      <Reveal className="container section home-faq" aria-labelledby="home-faq-title">
        <div>
          <p className="eyebrow">{t('home.faq_eyebrow')}</p>
          <h2 id="home-faq-title">{t('home.faq_title')}</h2>
          <Link className="text-link" to="/handbook">
            {t('home.read_handbook')} <ArrowRight size={18} />
          </Link>
        </div>
        <TravelFaq />
      </Reveal>

      <Reveal className="container ai-banner">
        <div className="ai-banner-icon">
          <Sparkles size={34} strokeWidth={1.3} />
        </div>
        <div>
          <p className="eyebrow">{t('home.ai_eyebrow')}</p>
          <h2>{t('home.ai_title')}</h2>
          <p>{t('home.ai_desc')}</p>
        </div>
        <Link className="btn btn-lime" to="/chat">
          {t('home.ai_cta')} <ArrowUpRight size={20} />
        </Link>
      </Reveal>
    </div>
  );
}
