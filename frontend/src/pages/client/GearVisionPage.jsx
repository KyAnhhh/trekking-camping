import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  Compass,
  Cpu,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import GearVisionCheck from '../../components/chat/GearVisionCheck';
import { useLanguage } from '../../context/LanguageContext';
import './gear-vision-page.css';

const DETECTED_CLASSES = [
  {
    code: 'giay-leo-nui',
    icon: '🥾',
    nameVi: 'Giày Trekking / Hiking Boots',
    nameEn: 'Hiking Boots / Trail Shoes',
    descVi: 'Đế gai bám đá, hỗ trợ mắt cá chân, chống trơn trượt',
    descEn: 'High-traction lugged sole, ankle support, slip resistant',
  },
  {
    code: 'gay-trekking',
    icon: '🦯',
    nameVi: 'Gậy Trekking Trợ Lực',
    nameEn: 'Trekking Poles',
    descVi: 'Giảm tải 25% trọng lực lên khớp gối khi leo dốc',
    descEn: 'Reduces 25% joint impact on ascents and descents',
  },
  {
    code: 'leu-trai',
    icon: '⛺',
    nameVi: 'Lều Cắm Trại Dã Ngoại',
    nameEn: 'Camping Tent',
    descVi: 'Lều 2 lớp chống mưa gió, giữ ấm cho tour qua đêm',
    descEn: 'Weatherproof 2-layer tent for mountain overnight camps',
  },
  {
    code: 'hop-y-te',
    icon: '🩹',
    nameVi: 'Hộp Sơ Cứu / Túi Y Tế',
    nameEn: 'First-Aid Kit',
    descVi: 'Bông băng, xịt chống vắt, thuốc hạ sốt & điện giải',
    descEn: 'Bandages, antiseptic, insect repellent & rehydration',
  },
  {
    code: 'tas-gunung',
    icon: '🎒',
    nameVi: 'Balo Leo Núi Trợ Lực',
    nameEn: 'Expedition Backpack',
    descVi: 'Hệ thống đai hông trợ lực giúp dồn tải xuống hông',
    descEn: 'Ergonomic hip belt transfers load away from shoulders',
  },
  {
    code: 'alat-penerangan',
    icon: '🔦',
    nameVi: 'Đèn Pin Đội Đầu',
    nameEn: 'Headlamp & Illumination',
    descVi: 'Đèn LED đội đầu giải phóng hai tay khi đi đêm',
    descEn: 'Hands-free lighting with spare batteries for night safety',
  },
  {
    code: 'jaket',
    icon: '🧥',
    nameVi: 'Áo Khoác Gió & Giữ Nhiệt',
    nameEn: 'Warm Weatherproof Jacket',
    descVi: 'Chống sương muối, mưa phùn và giữ nhiệt ban đêm',
    descEn: 'Windproof, water-resistant & thermal insulation',
  },
  {
    code: 'air-mineral',
    icon: '💧',
    nameVi: 'Nước Uống & Bình Dã Ngoại',
    nameEn: 'Hydration Bladder / Bottle',
    descVi: 'Bình nước tối thiểu 1.5L hoặc túi nước luồn balo',
    descEn: 'Minimum 1.5L hydration capacity for rigorous trekking',
  },
];

export default function GearVisionPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [searchParams] = useSearchParams();

  const tourId = searchParams.get('tourId');
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    document.title = isEn
      ? 'AI Gear Vision Check | Trek & Camp Expedition'
      : 'AI Soát Đồ & Thẩm Định Hành Trang | Trek & Camp';
  }, [isEn]);

  return (
    <div className="gear-page-wrap">
      {/* Hero Heading Section */}
      <section className="gear-page-hero">
        <div className="container">
          <nav className="gear-page-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">{isEn ? 'Home' : 'Trang chủ'}</Link>
            <span>/</span>
            <Link to="/chat">{isEn ? 'AI Assistant' : 'Trợ lý AI'}</Link>
            <span>/</span>
            <span className="current">{isEn ? 'AI Gear Vision' : 'AI Soát Đồ'}</span>
          </nav>

          <div className="gear-page-header-content">
            <div className="gear-page-tags">
              <span className="page-tag tag-yolo">
                <Zap size={13} />
                <span>YOLOv8 Edge AI (8 Classes · 0 Token)</span>
              </span>
              <span className="page-tag tag-gemini">
                <Sparkles size={13} />
                <span>Gemini Vision Fallback</span>
              </span>
              <span className="page-tag tag-safety">
                <ShieldCheck size={13} />
                <span>Expedition Trail Readiness</span>
              </span>
            </div>

            <h1 className="gear-page-title">
              {isEn ? 'AI Expedition Gear Inspection' : 'AI Thẩm Định & Soát Đồ Hành Trang'}
            </h1>
            <p className="gear-page-lead">
              {isEn
                ? 'Upload a photo of your trekking gear, backpack or footwear. Our lightweight Edge YOLOv8 AI detects equipment instantly with bounding boxes, cross-referencing expedition terrain safety before departure.'
                : 'Chụp hoặc tải lên hình ảnh giày trekking, balo, lều trại hay trang bị của bạn. Mô hình Edge AI YOLOv8 sẽ nhận diện tức thì và đối chiếu độ an toàn thực tế theo từng cung đường dã ngoại.'}
            </p>
          </div>
        </div>
      </section>

      {/* Main Core Inspection Workspace */}
      <section className="gear-page-workspace">
        <div className="container">
          <div className="gear-page-card-container">
            <GearVisionCheck
              isPage
              tourId={tourId ? Number(tourId) : null}
              bookingId={bookingId ? Number(bookingId) : null}
            />
          </div>
        </div>
      </section>

      {/* AI Tech & 8 Category Showcase Section */}
      <section className="gear-page-classes-section">
        <div className="container">
          <div className="gear-section-heading">
            <p className="eyebrow">
              <Cpu size={16} />
              {isEn ? 'EDGE COMPUTER VISION' : 'MÔ HÌNH THỊ GIÁC MÁY TÍNH CỤC BỘ'}
            </p>
            <h2>
              {isEn
                ? '8 Essential Trekking Categories Recognized by YOLOv8'
                : '8 Danh Mục Trang Bị Leo Núi Mô Hình Tự Động Nhận Diện'}
            </h2>
            <p className="small muted" style={{ maxWidth: 640 }}>
              {isEn
                ? 'Custom-trained YOLOv8 Nano architecture with specialized multi-class dataset, enabling sub-50ms inference with zero token consumption.'
                : 'Mô hình YOLOv8 Nano được huấn luyện chuyên sâu trên tập dữ liệu đồ dã ngoại thực tế, cho tốc độ phản hồi dưới 50ms và hoàn toàn không tiêu tốn token AI.'}
            </p>
          </div>

          <div className="gear-classes-grid">
            {DETECTED_CLASSES.map((item, idx) => (
              <div className="gear-class-card" key={idx}>
                <div className="class-card-top">
                  <span className="class-emoji">{item.icon}</span>
                  <span className="class-index">#{idx + 1}</span>
                </div>
                <h3 className="class-title">{isEn ? item.nameEn : item.nameVi}</h3>
                <p className="class-desc">{isEn ? item.descEn : item.descVi}</p>
                <div className="class-code-tag">yolo_cls: {item.code}</div>
              </div>
            ))}
          </div>

          {/* Architecture Benefits */}
          <div className="gear-arch-banner">
            <div className="arch-col">
              <div className="arch-icon-wrap">
                <Zap size={24} />
              </div>
              <div>
                <h4>{isEn ? 'Cascade 2-Tier AI Architecture' : 'Kiến Trúc AI Phân Tầng 2 Cấp'}</h4>
                <p className="small muted">
                  {isEn
                    ? 'Tier 1 runs lightweight local YOLOv8 detection for standard gear (0 Token). Tier 2 activates Gemini Multimodal Vision if uncommon items require deeper textual reasoning.'
                    : 'Tầng 1 sử dụng YOLOv8 xử lý tại chỗ siêu tốc giúp tiết kiệm 100% token. Tầng 2 tự động kích hoạt Gemini Multimodal Vision khi xuất hiện vật dụng phức tạp cần suy luận chuyên sâu.'}
                </p>
              </div>
            </div>
            <div className="arch-col">
              <div className="arch-icon-wrap">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4>{isEn ? 'Dynamic Safety Readiness Scoring' : 'Chỉ Số Đánh Giá Sẵn Sàng (Readiness Score)'}</h4>
                <p className="small muted">
                  {isEn
                    ? 'Algorithm verifies essential gear combinations against trail difficulty (e.g. boots + poles for grade 3+ peaks, waterproof tent for overnight tours).'
                    : 'Thuật toán tự động đối chiếu các trang bị thiết yếu với độ khó và thời gian tour (VD: giày bám đá cho tour cấp độ 3+, lều chống mưa cho tour cắm trại đêm).'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
