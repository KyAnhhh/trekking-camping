import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Leaf,
  MapPin,
  Mountain,
  Search,
  Sparkles,
  TentTree,
} from 'lucide-react';
import { tourApi } from '../../api/tourService';
import useResource from '../../hooks/useResource';
import TourCard from '../../components/tour/TourCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { landscape, campsite, forest } from '../../utils/tour';
const loadTours = async () => (await tourApi.getAllTours()).data.data;

export default function Home() {
  const { data: tours, loading, error, reload } = useResource(loadTours);
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
    <>
      <section className="hero">
        <img
          className="hero-photo"
          src={landscape}
          alt="Dãy núi trùng điệp dưới ánh sáng tự nhiên"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="container hero-content">
          <p className="eyebrow light">
            <span className="tiny-line" /> NHỮNG CHUYẾN ĐI, NHỮNG KẾT NỐI MỚI
          </p>
          <h1>
            Rời phố thị.
            <br />
            <span>Chạm thiên nhiên.</span>
          </h1>
          <p className="hero-description">
            Băng qua những cánh rừng. Thức giấc giữa núi đồi.
            <br className="desktop-only" /> Tìm hành trình dành riêng cho bước chân của bạn.
          </p>
          <Link className="btn btn-lime" to="/tours">
            Khám phá những chuyến đi <ArrowUpRight size={20} />
          </Link>
          <div className="hero-footnote">
            <Compass size={21} strokeWidth={1.3} />
            <span>
              Đi chậm một chút.
              <br />
              <strong>Thấy nhiều hơn.</strong>
            </span>
          </div>
        </div>
      </section>
      <div className="container search-dock">
        <form className="trip-search" onSubmit={search}>
          <label>
            <span>
              <MapPin size={16} /> Bạn muốn đi đâu?
            </span>
            <input
              placeholder="Tìm tên tour hoặc địa điểm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span>
              <Mountain size={16} /> Mức độ trải nghiệm
            </span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Tất cả độ khó</option>
              <option value="1">Dễ · Dành cho người mới</option>
              <option value="2">Trung bình</option>
              <option value="3">Mạo hiểm</option>
            </select>
          </label>
          <button className="btn" type="submit">
            <Search size={19} />
            Tìm chuyến đi
          </button>
        </form>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ĐI ĐÂU TIẾP THEO?</p>
            <h2>
              Mỗi cung đường,
              <br className="mobile-only" /> một câu chuyện.
            </h2>
            <p className="muted">Chọn một hành trình. Để thiên nhiên kể phần còn lại.</p>
          </div>
          <Link className="text-link" to="/tours">
            Xem tất cả tour <ArrowRight size={18} />
          </Link>
        </div>
        {loading ? (
          <LoadingSpinner label="Đang tìm những chuyến đi..." />
        ) : error ? (
          <EmptyState
            error
            title="Chưa tải được các chuyến đi"
            description={error}
            onRetry={reload}
          />
        ) : !tours?.length ? (
          <EmptyState
            title="Những hành trình mới đang được chuẩn bị"
            description="Bạn có thể hỏi trợ lý để tìm hiểu cách chuẩn bị cho chuyến đi đầu tiên."
          >
            <Link className="btn btn-outline" to="/chat">
              Hỏi trợ lý hành trình
            </Link>
          </EmptyState>
        ) : (
          <div className="tour-grid">
            {tours.slice(0, 3).map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
      </section>
      <section className="experience-section">
        <div className="container section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THEO NHỊP CỦA BẠN</p>
              <h2>Không chỉ là một điểm đến.</h2>
            </div>
            <p className="heading-note">
              Một khoảng nghỉ ngắn ngày hay một thử thách mới.
              <br />
              Bạn chọn cách tận hưởng thiên nhiên.
            </p>
          </div>
          <div className="experience-grid">
            <Link className="experience-card" to="/tours?difficulty=1">
              <img src={forest} alt="Lối đi giữa cánh rừng xanh" loading="lazy" />
              <div>
                <span className="eyebrow light">BẮT ĐẦU THẬT NHẸ NHÀNG</span>
                <h3>Bước đầu vào rừng</h3>
                <p>Các cung đường dễ cho người mới.</p>
              </div>
              <ArrowUpRight className="experience-arrow" />
            </Link>
            <Link className="experience-card" to="/tours?duration=short">
              <img src={campsite} alt="Lều cắm trại giữa thiên nhiên" loading="lazy" />
              <div>
                <span className="eyebrow light">DÀNH MỘT CHÚT THỜI GIAN CHO MÌNH</span>
                <h3>Cuối tuần ngoài trời</h3>
                <p>Tìm chuyến đi trong một đến hai ngày.</p>
              </div>
              <ArrowUpRight className="experience-arrow" />
            </Link>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="approach-grid">
          <div>
            <p className="eyebrow">CHUẨN BỊ ĐỂ ĐI XA HƠN</p>
            <h2>
              Hành trình đẹp
              <br />
              bắt đầu từ sự sẵn sàng.
            </h2>
            <Link className="text-link" to="/chat">
              Cùng chuẩn bị chuyến đi <ArrowRight size={18} />
            </Link>
          </div>
          <div className="principles">
            <article>
              <Mountain />
              <div>
                <h3>Chọn đúng sức mình</h3>
                <p>Xem độ khó, thời lượng và lịch trình trước khi quyết định.</p>
              </div>
            </article>
            <article>
              <TentTree />
              <div>
                <h3>Mang theo điều cần thiết</h3>
                <p>Kiểm tra trang bị được cung cấp và những món đồ cần tự chuẩn bị.</p>
              </div>
            </article>
            <article>
              <Leaf />
              <div>
                <h3>Trân trọng nơi mình đến</h3>
                <p>Đi theo lối mòn, mang rác về và giữ không gian yên bình cho thiên nhiên.</p>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="container ai-banner">
        <div className="ai-banner-icon">
          <Sparkles size={34} strokeWidth={1.3} />
        </div>
        <div>
          <p className="eyebrow">TRỢ LÝ HÀNH TRÌNH</p>
          <h2>Chưa biết bắt đầu từ đâu?</h2>
          <p>Kể về thời gian, thể lực và điều bạn muốn trải nghiệm. Cùng tìm hướng đi phù hợp.</p>
        </div>
        <Link className="btn btn-lime" to="/chat">
          Bắt đầu trò chuyện <ArrowUpRight size={20} />
        </Link>
      </section>
    </>
  );
}
