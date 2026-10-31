import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
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
import { campsite, forest } from '../../utils/tour';
import TimeHero from '../../components/home/TimeHero';
import HomeReviews from '../../components/home/HomeReviews';
import DestinationGrid from '../../components/tour/DestinationGrid';
import FieldMoments3D from '../../components/home/FieldMoments3D';
import Reveal from '../../components/common/Reveal';
import TravelFaq from '../../components/common/TravelFaq';
import useTimeTheme from '../../hooks/useTimeTheme';
import use3DTilt from '../../hooks/use3DTilt';
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
      <Reveal className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TOUR ĐỂ BẠN BẮT ĐẦU KHÁM PHÁ</p>
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
      </Reveal>
      <Reveal className="container section" aria-labelledby="home-destinations">
        <div className="section-heading">
          <div><p className="eyebrow">ĐIỂM ĐẾN TRONG DANH SÁCH TOUR</p><h2 id="home-destinations">Tìm nơi bạn muốn dừng chân.</h2><p className="muted">Khám phá theo khu vực được công bố trên từng hành trình.</p></div>
          <Link className="text-link" to="/destinations">Tất cả điểm đến <ArrowRight size={18} /></Link>
        </div>
        {loading ? <LoadingSpinner label="Đang tải điểm đến..." /> : error ? <p className="notice">Điểm đến sẽ xuất hiện khi danh sách tour tải thành công.</p> : <DestinationGrid tours={tours || []} limit={4} />}
      </Reveal>
      <Reveal>
        <FieldMoments3D />
      </Reveal>
      <Reveal className="experience-section">
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
            <ExperienceCardItem
              to="/tours?difficulty=1"
              img={forest}
              alt="Lối đi giữa cánh rừng xanh"
              eyebrow="BẮT ĐẦU THẬT NHẸ NHÀNG"
              title="Bước đầu vào rừng"
              desc="Các cung đường dễ cho người mới."
            />
            <ExperienceCardItem
              to="/tours?duration=short"
              img={campsite}
              alt="Lều cắm trại giữa thiên nhiên"
              eyebrow="DÀNH MỘT CHÚT THỜI GIAN CHO MÌNH"
              title="Cuối tuần ngoài trời"
              desc="Tìm chuyến đi trong một đến hai ngày."
            />
          </div>
        </div>
      </Reveal>
      <Reveal className="container section">
        <div className="approach-grid">
          <div>
            <p className="eyebrow">VÌ SAO TÌM TOUR CÙNG TREK & CAMP?</p>
            <h2>
              Hiểu rõ hơn.
              <br />
              Chọn chủ động hơn.
            </h2>
            <Link className="text-link" to="/chat">
              Cùng chuẩn bị chuyến đi <ArrowRight size={18} />
            </Link>
          </div>
          <div className="principles">
            <article>
              <Mountain />
              <div>
                <h3>Thông tin hành trình cụ thể</h3>
                <p>Đối chiếu độ khó, thời lượng và thông số được công bố trước khi quyết định.</p>
              </div>
            </article>
            <article>
              <TentTree />
              <div>
                <h3>Chuẩn bị theo từng tour</h3>
                <p>Kiểm tra trang bị được cung cấp và những món đồ cần tự chuẩn bị.</p>
              </div>
            </article>
            <article>
              <Leaf />
              <div>
                <h3>Bạn là người xác nhận</h3>
                <p>AI hỗ trợ tìm hiểu; bạn kiểm tra lịch, giá và thông tin trước khi tạo đơn.</p>
              </div>
            </article>
          </div>
        </div>
      </Reveal>
      <Reveal className="container section" aria-labelledby="booking-steps-title">
        <div className="section-heading"><div><p className="eyebrow">TỪ TÌM HIỂU ĐẾN ĐẶT CHỖ</p><h2 id="booking-steps-title">Từng bước, thật rõ ràng.</h2></div><Link className="text-link" to="/contact">Bạn cần hỗ trợ? <ArrowRight size={18} /></Link></div>
        <ol className="booking-steps">
          <li><span>01</span><h3>Chọn hành trình</h3><p>Xem lịch trình, độ khó, thông số và lịch khởi hành của tour bạn quan tâm.</p></li>
          <li><span>02</span><h3>Kiểm tra & tạo đơn</h3><p>Đăng nhập, chọn số khách và xác nhận thông tin liên hệ cùng chi phí.</p></li>
          <li><span>03</span><h3>Hoàn tất yêu cầu tham gia</h3><p>Khai báo theo yêu cầu của đơn và theo dõi kết quả xem xét từ người phụ trách.</p></li>
          <li><span>04</span><h3>Theo dõi & chuẩn bị</h3><p>Thanh toán khi đủ điều kiện, kiểm tra trạng thái đơn và chuẩn bị cho ngày lên đường.</p></li>
        </ol>
      </Reveal>
      <Reveal className="home-stories">
        <div className="container section">
          <div className="section-heading"><div><p className="eyebrow">GÓC NHÌN TỪ KHÁCH HÀNG</p><h2>Những chia sẻ sau hành trình.</h2><p className="muted">Đánh giá của các tour đang giới thiệu trên trang chủ.</p></div></div>
          {!loading && !error && tours?.length ? <HomeReviews tours={tours} /> : <EmptyState title="Chưa có đánh giá để hiển thị" description="Hãy quay lại khi danh sách tour và chia sẻ của khách được cập nhật." />}
        </div>
      </Reveal>
      <Reveal className="container section home-faq" aria-labelledby="home-faq-title">
        <div><p className="eyebrow">TRƯỚC KHI BẠN QUYẾT ĐỊNH</p><h2 id="home-faq-title">Một vài điều<br />bạn có thể đang hỏi.</h2><Link className="text-link" to="/handbook">Đọc cẩm nang <ArrowRight size={18} /></Link></div>
        <TravelFaq />
      </Reveal>
      <Reveal className="container ai-banner">
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
      </Reveal>
    </div>
  );
}
