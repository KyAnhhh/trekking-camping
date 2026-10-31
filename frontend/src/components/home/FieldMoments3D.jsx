import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Mountain,
  MapPin,
  Thermometer,
  Navigation,
  ArrowRight,
  Flame,
  CloudSun,
  Eye,
} from 'lucide-react';
import use3DTilt from '../../hooks/use3DTilt';
import './field-moments.css';

const REAL_EXP_DATA = [
  {
    id: 'ta-nang',
    category: 'mountain',
    title: 'Tà Năng - Phan Dũng',
    subtitle: 'Đại ngàn đồi cỏ & rừng thông Lâm Viên',
    location: 'Lâm Đồng – Bình Thuận',
    altitude: '1.100m',
    duration: '2N1Đ / 3N2Đ',
    difficulty: 'Cấp 2 · Trung bình',
    temp: '17°C - 24°C',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85',
    tags: ['Đồi cỏ cháy', 'Hoàng hôn thung lũng', 'Rừng thông'],
    quote: 'Những triền đồi cỏ xanh ngút tầm mắt nối liền cao nguyên Lâm Đồng xuống miền cát trắng Bình Thuận.',
    highlights: ['Điểm ngắm hoàng hôn đỉnh đồi cỏ', 'Bữa tiệc BBQ bên bếp lửa trại', 'Băng qua suối mát rừng Phan Dũng'],
  },
  {
    id: 'ta-xua',
    category: 'cloud',
    title: 'Săn Mây Tà Xùa',
    subtitle: 'Sống lưng khủng long giữa đại dương mây',
    location: 'Bắc Yên, Sơn La',
    altitude: '2.865m',
    duration: '2N1Đ',
    difficulty: 'Cấp 2 · Trung bình',
    temp: '12°C - 19°C',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85',
    tags: ['Biển mây', 'Sống lưng khủng long', 'Tây Bắc'],
    quote: 'Biển mây trắng muốt bồng bềnh cuộn trào dưới chân, ngỡ như chỉ cần vươn tay là chạm vào bầu trời.',
    highlights: ['Đón bình minh trên sống lưng gió lộng', 'Thưởng thức cà phê săn mây sớm', 'Gặp gỡ bản làng người H\'Mông'],
  },
  {
    id: 'bidoup',
    category: 'forest',
    title: 'Rừng Rêu Bidoup - Núi Bà',
    subtitle: 'Khu rừng nguyên sinh cổ tích ma mị',
    location: 'Lạc Dương, Lâm Đồng',
    altitude: '2.287m',
    duration: '2N1Đ',
    difficulty: 'Cấp 2 · Thể lực tốt',
    temp: '14°C - 20°C',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85',
    tags: ['Rừng rêu cổ', 'Cây Pơ-mu 1.300 năm', 'Đa dạng sinh học'],
    quote: 'Thảm thực vật rêu phong phủ kín từng thân cây cổ thụ, sương giăng mờ ảo tạo nên khung cảnh huyền bí.',
    highlights: ['Cây Pơ-mu di sản ngàn năm', 'Vượt dốc Đòn Gánh ngoạn mục', 'Cắm trại giữa rừng sương sớm'],
  },
  {
    id: 'cuc-dong',
    category: 'coastal',
    title: 'Mũi Đôi Cực Đông',
    subtitle: 'Đón tia bình minh đầu tiên trên đất liền',
    location: 'Vạn Ninh, Khánh Hòa',
    altitude: 'Mặt biển - 150m',
    duration: '2N1Đ',
    difficulty: 'Cấp 2 · Sức bền cát',
    temp: '25°C - 31°C',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85',
    tags: ['Đón bình minh', 'Băng đồi cát', 'Biển Bãi Rạng'],
    quote: 'Những tia nắng đầu tiên chiếu rọi lên mảnh đất hình chữ S, phía trước là muôn trùng sóng biếc.',
    highlights: ['Băng qua sa mạc cát mênh mông', 'Nhảy ghềnh đá chạm chóp inox', 'Cắm trại ngắm sao bên sóng biển'],
  },
  {
    id: 'tuyen-lam',
    category: 'camp',
    title: 'Cắm Trại Hồ Tuyền Lâm',
    subtitle: 'Hoàng hôn bên hồ và thông reo tĩnh lặng',
    location: 'Đà Lạt, Lâm Đồng',
    altitude: '1.500m',
    duration: '2N1Đ cuối tuần',
    difficulty: 'Cấp 1 · Thư giãn',
    temp: '15°C - 22°C',
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=85',
    tags: ['Chèo SUP', 'Lửa trại BBQ', 'Cắm trại hồ'],
    quote: 'Gác lại ồn ào thành phố, nhấp ngụm trà nóng thơm mùi khói gỗ bên bờ hồ mù sương tuyệt đẹp.',
    highlights: ['Chèo thuyền SUP sớm đón sương hồ', 'Lửa trại nướng khoai bắp và BBQ', 'Lều tiện nghi ven rừng thông'],
  },
  {
    id: 'fansipan',
    category: 'mountain',
    title: 'Chinh Phục Đỉnh Fansipan',
    subtitle: 'Nóc nhà Đông Dương hùng vĩ ngút ngàn',
    location: 'Sa Pa, Lào Cai',
    altitude: '3.143m',
    duration: '2N1Đ / 3N2Đ',
    difficulty: 'Cấp 3 · Mạo hiểm',
    temp: '6°C - 15°C',
    image: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=85',
    tags: ['Nóc nhà Đông Dương', 'Hoàng Liên Sơn', 'Rừng đỗ quyên'],
    quote: 'Chạm tay vào cột mốc 3.143m kiêu hãnh giữa ngàn mây cuồn cuộn là giấc mơ của mọi trekker.',
    highlights: ['Vượt đèo Trạm Tôn kỳ vĩ', 'Băng rừng tre trúc và đỗ quyên', 'Khoảnh khắc chạm đỉnh vinh quang'],
  },
];

function FieldCard3D({ item, onSelect }) {
  const cardRef = useRef(null);
  use3DTilt(cardRef, { maxTilt: 8, scale: 1.025 });

  return (
    <div
      ref={cardRef}
      className="field-3d-card"
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(item);
      }}
    >
      <div className="field-3d-img-container">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="field-3d-img"
        />
        <div className="field-3d-overlay" />
        <div className="card-glare" aria-hidden="true" />

        {/* Floating 3D Badges */}
        <div className="field-floating-badge badge-top-left">
          <Mountain size={13} />
          <span>{item.altitude}</span>
        </div>
        <div className="field-floating-badge badge-top-right">
          <Thermometer size={13} />
          <span>{item.temp}</span>
        </div>
      </div>

      <div className="field-3d-content">
        <div className="field-loc-row">
          <span className="field-location">
            <MapPin size={13} />
            {item.location}
          </span>
          <span className="field-duration-pill">{item.duration}</span>
        </div>

        <h3 className="field-title">{item.title}</h3>
        <p className="field-subtitle">{item.subtitle}</p>

        <div className="field-tags">
          {item.tags.map((t) => (
            <span key={t} className="field-tag-chip">
              #{t}
            </span>
          ))}
        </div>

        <div className="field-card-footer">
          <span className="field-diff-badge">{item.difficulty}</span>
          <span className="field-view-action">
            Xem chi tiết <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FieldMoments3D() {
  const [filter, setFilter] = useState('all');
  const [selectedModal, setSelectedModal] = useState(null);

  const filtered =
    filter === 'all'
      ? REAL_EXP_DATA
      : REAL_EXP_DATA.filter((item) => item.category === filter);

  return (
    <section className="container field-moments-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Compass size={15} /> GÓC NHÌN THỰC ĐỊA 3D
          </p>
          <h2>Những Cung Đường Thực Tế Đẹp Nhất Việt Nam</h2>
          <p className="muted">
            Hình ảnh chân thực từ thực địa. Di chuyển chuột để trải nghiệm hiệu ứng chiều sâu 3D trên từng hành trình.
          </p>
        </div>
        <Link className="text-link" to="/destinations">
          Khám phá tất cả <ArrowRight size={16} />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="field-filter-bar">
        <button
          type="button"
          className={`field-filter-pill ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tất cả cung đường
        </button>
        <button
          type="button"
          className={`field-filter-pill ${filter === 'mountain' ? 'active' : ''}`}
          onClick={() => setFilter('mountain')}
        >
          <Mountain size={14} /> Núi cao & Trekking
        </button>
        <button
          type="button"
          className={`field-filter-pill ${filter === 'cloud' ? 'active' : ''}`}
          onClick={() => setFilter('cloud')}
        >
          <CloudSun size={14} /> Săn mây Tây Bắc
        </button>
        <button
          type="button"
          className={`field-filter-pill ${filter === 'forest' ? 'active' : ''}`}
          onClick={() => setFilter('forest')}
        >
          <Navigation size={14} /> Rừng nguyên sinh
        </button>
        <button
          type="button"
          className={`field-filter-pill ${filter === 'camp' ? 'active' : ''}`}
          onClick={() => setFilter('camp')}
        >
          <Flame size={14} /> Cắm trại & BBQ
        </button>
      </div>

      {/* 3D Cards Grid */}
      <div className="field-3d-grid">
        {filtered.map((item) => (
          <FieldCard3D
            key={item.id}
            item={item}
            onSelect={(selected) => setSelectedModal(selected)}
          />
        ))}
      </div>

      {/* Interactive Detail Modal */}
      {selectedModal && (
        <div
          className="field-modal-backdrop"
          onClick={() => setSelectedModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="field-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="field-modal-img-wrap">
              <img src={selectedModal.image} alt={selectedModal.title} />
              <button
                type="button"
                className="field-modal-close"
                onClick={() => setSelectedModal(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
              <div className="field-modal-img-caption">
                <span className="caption-badge">{selectedModal.altitude}</span>
                <h3>{selectedModal.title}</h3>
                <p>{selectedModal.location}</p>
              </div>
            </div>

            <div className="field-modal-body">
              <blockquote className="field-modal-quote">
                "{selectedModal.quote}"
              </blockquote>

              <div className="field-modal-meta-grid">
                <div className="meta-box">
                  <small>Thời lượng gợi ý</small>
                  <strong>{selectedModal.duration}</strong>
                </div>
                <div className="meta-box">
                  <small>Mức độ thể lực</small>
                  <strong>{selectedModal.difficulty}</strong>
                </div>
                <div className="meta-box">
                  <small>Nhiệt độ trung bình</small>
                  <strong>{selectedModal.temp}</strong>
                </div>
              </div>

              <h4>Điểm nhấn nổi bật trong chuyến đi:</h4>
              <ul className="field-highlights-list">
                {selectedModal.highlights.map((h, idx) => (
                  <li key={idx}>
                    <Eye size={15} color="#2d7a46" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="field-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSelectedModal(null)}
                >
                  Đóng
                </button>
                <Link
                  className="btn btn-lime"
                  to={`/tours?q=${encodeURIComponent(selectedModal.title.split(' - ')[0])}`}
                >
                  Tìm tour đi {selectedModal.title.split(' - ')[0]} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
