import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Backpack,
  Compass,
  Leaf,
  Map,
  CheckSquare,
  Square,
  ShieldAlert,
  Tent,
  Flashlight,
  Layers,
} from "lucide-react";
import use3DTilt from "../../hooks/use3DTilt";
import "../../styles/editorial.css";
import { useLanguage } from "../../context/LanguageContext";

const GEARS_DATA = {
  vi: [
    {
      title: "Giày Trekking Chuyên Dụng",
      category: "Bảo vệ đôi chân",
      desc: "Đế gai cao su Vibram bám đất sét và đá trơn, đệm mắt cá chân trợ lực, chất liệu thoáng khí.",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
      icon: Layers,
      note: "Không bao giờ mang giày mới mua đi tour dài ngày. Hãy làm mềm giày ít nhất 1 tuần.",
    },
    {
      title: "Balo Trợ Lực 30L – 45L",
      category: "Phân bổ trọng lượng",
      desc: "Hệ thống đai hông trợ lực giúp dồn 70% tải trọng xuống xương chậu, giảm mỏi vai và lưng.",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
      icon: Backpack,
      note: "Đồ nặng để sát lưng và ở giữa balo; đồ khẩn cấp (áo mưa, đèn) để ngăn trên cùng.",
    },
    {
      title: "Lều Cắm Trại 2 Lớp Chống Mưa",
      category: "Nơi trú ẩn ban đêm",
      desc: "Chỉ số chống nước PU 3000mm, khung nhôm siêu nhẹ chịu gió núi, lưới chống côn trùng mịn.",
      image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80",
      icon: Tent,
      note: "Luôn căng bạt phủ ngoài căng đều, chọn bãi đất cao ráo tránh trũng nước khi mưa đêm.",
    },
    {
      title: "Đèn Pin Đội Đầu & Nước Sạch",
      category: "An toàn thiết yếu",
      desc: "Đèn LED 300 Lumens giải phóng hai tay khi di chuyển đêm; viên lọc nước & bù điện giải Oresol.",
      image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=600&q=80",
      icon: Flashlight,
      note: "Mang theo pin dự phòng. Luôn có ít nhất 1.5L nước dự trữ trước khi bắt đầu chặng mới.",
    },
  ],
  en: [
    {
      title: "Trail-Ready Trekking Boots",
      category: "Foot Protection",
      desc: "Deep lug rubber sole for wet clay and slick rock, ergonomic ankle support, and breathable membranes.",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
      icon: Layers,
      note: "Never break in brand-new boots on multi-day treks. Wear them casually for at least a week prior.",
    },
    {
      title: "Ergonomic Pack 30L – 45L",
      category: "Load Distribution",
      desc: "Supportive padded hip belt transferring 70% of weight to the pelvis, relieving shoulders and spine.",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
      icon: Backpack,
      note: "Heavy gear goes close to your spine in the mid-pack; rain gear and headlamps stay in the top lid.",
    },
    {
      title: "2-Layer Waterproof Tent",
      category: "Shelter & Camp",
      desc: "PU 3000mm hydrostatic rating, wind-resistant aluminum poles, and micro-mesh bug protection.",
      image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80",
      icon: Tent,
      note: "Keep the rainfly taut and stake out guylines. Pitch on elevated ground avoiding rainwater runoffs.",
    },
    {
      title: "Headlamp & Hydration",
      category: "Vital Safety",
      desc: "Hands-free 300-lumen headlamp with red night mode; water purification tablets & electrolyte packs.",
      image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=600&q=80",
      icon: Flashlight,
      note: "Carry spare batteries or powerbank. Maintain at least 1.5L reserves before tackling next ridgeline.",
    },
  ],
};

const CHECKLIST_ITEMS = {
  vi: [
    { id: 1, text: "Giày trekking có độ bám tốt (đã đi quen chân)", checked: true },
    { id: 2, text: "Balo có đai trợ lực + bọc chống nước cho balo", checked: true },
    { id: 3, text: "2 bộ quần áo thể thao mau khô (dry-fit), quần dài chống gai/vắt", checked: false },
    { id: 4, text: "Áo khoác gió nhẹ hoặc áo ấm cho ban đêm (nhiệt độ núi giảm nhanh)", checked: false },
    { id: 5, text: "Đèn pin đội đầu + pin sạc dự phòng cho điện thoại", checked: false },
    { id: 6, text: "1.5L – 2L nước uống + 2 viên sủi bù khoáng điện giải", checked: false },
    { id: 7, text: "Áo mưa cánh dơi hoặc bộ áo mưa chuyên dụng", checked: false },
    { id: 8, text: "Bộ sơ cứu cá nhân: băng cá nhân, thuốc hạ sốt, xịt chống muỗi/vắt", checked: false },
    { id: 9, text: "Thanh năng lượng / socola / lương khô nạp năng lượng nhanh", checked: false },
  ],
  en: [
    { id: 1, text: "Well-broken-in trekking shoes with grippy lugs", checked: true },
    { id: 2, text: "Ergonomic backpack with padded hip-belt + waterproof rain cover", checked: true },
    { id: 3, text: "2 sets of quick-dry athletic apparel + long trail pants for thorns/leeches", checked: false },
    { id: 4, text: "Windbreaker or thermal fleece for cold mountain nights", checked: false },
    { id: 5, text: "Hands-free headlamp + reliable power bank for mobile phone", checked: false },
    { id: 6, text: "1.5L – 2L drinking water + electrolyte hydration effervescent tabs", checked: false },
    { id: 7, text: "Packable rain poncho or technical 2-piece rain suit", checked: false },
    { id: 8, text: "Personal first-aid kit: blister bandages, pain relievers, insect repellent", checked: false },
    { id: 9, text: "Nutrient energy bars, trail mix, or dark chocolate for instant stamina", checked: false },
  ],
};

function GearCard3D({ gear }) {
  const cardRef = useRef(null);
  use3DTilt(cardRef, { maxTilt: 7, scale: 1.02 });
  const Icon = gear.icon;

  return (
    <div ref={cardRef} className="handbook-gear-card">
      <div className="gear-card-img-wrap">
        <img src={gear.image} alt={gear.title} loading="lazy" />
        <div className="gear-card-badge">
          <Icon size={14} />
          <span>{gear.category}</span>
        </div>
      </div>
      <div className="gear-card-content">
        <h3>{gear.title}</h3>
        <p className="gear-desc">{gear.desc}</p>
        <div className="gear-note">
          <ShieldAlert size={14} color="#2d7a46" />
          <small>{gear.note}</small>
        </div>
      </div>
    </div>
  );
}

export default function Handbook() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS.vi);

  // Sync checklist items when language changes while preserving user checked states
  const currentLangItems = CHECKLIST_ITEMS[language] || CHECKLIST_ITEMS.vi;

  const toggleCheck = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const gears = GEARS_DATA[language] || GEARS_DATA.vi;
  const completedCount = checklist.filter((i) => i.checked).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="container field-journal">
      <header className="journal-heading">
        <p className="eyebrow">
          <Compass size={16} /> {isEn ? 'TREKKING & CAMPING HANDBOOK' : 'CẨM NANG TREKKING & CAMPING'}
        </p>
        <h1>
          {isEn ? 'Pack Smart.' : 'Chuẩn bị kỹ.'}
          <br />
          <span>{isEn ? 'Tread Lightly.' : 'Đi nhẹ lòng hơn.'}</span>
        </h1>
        <p>
          {isEn
            ? 'From selecting trail routes to double-checking backpack gear, field wisdom ensures every expedition is safe and deeply memorable.'
            : 'Từ việc chọn cung đường đến kiểm tra trang bị ba lô, những kinh nghiệm thực địa này giúp bạn bắt đầu một chuyến đi an toàn và trọn vẹn.'}
        </p>
      </header>

      {/* Interactive Visual Gear Showcase */}
      <section className="handbook-gears-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isEn ? 'ESSENTIAL EXPEDITION GEAR' : 'TRANG BỊ ĐỒ NGHỀ THỰC TẾ'}</p>
            <h2>{isEn ? '4 Indispensable Items on the Trail' : '4 Món Đồ Không Thể Thiếu Trong Rừng'}</h2>
          </div>
          <p className="heading-note">
            {isEn
              ? 'Investing in the right core equipment turns an arduous struggle into pure wilderness joy.'
              : 'Đầu tư đúng những trang bị cốt lõi sẽ biến một chuyến đi gian nan thành trải nghiệm tận hưởng.'}
          </p>
        </div>

        <div className="handbook-gears-grid">
          {gears.map((gear, idx) => (
            <GearCard3D key={idx} gear={gear} />
          ))}
        </div>
      </section>

      {/* Interactive Backpack Packing Checklist */}
      <section className="handbook-checklist-section">
        <div className="checklist-card">
          <div className="checklist-header">
            <div>
              <p className="eyebrow">{isEn ? 'INTERACTIVE PACKING CHECKLIST' : 'CHECKLIST TRỰC QUAN'}</p>
              <h2>{isEn ? 'Backpack Check Before Trailhead' : 'Kiểm Tra Ba Lô Trước Giờ Xuất Phát'}</h2>
            </div>
            <div className="checklist-progress-wrap">
              <span className="checklist-progress-label">
                {isEn
                  ? `Packed: ${completedCount}/${checklist.length} items (${progressPercent}%)`
                  : `Đã chuẩn bị: ${completedCount}/${checklist.length} món (${progressPercent}%)`}
              </span>
              <div className="checklist-progress-bar">
                <div
                  className="checklist-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="checklist-items-grid">
            {checklist.map((item, idx) => {
              const text = currentLangItems[idx]?.text || item.text;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`checklist-item-btn ${item.checked ? "checked" : ""}`}
                  onClick={() => toggleCheck(item.id)}
                >
                  {item.checked ? (
                    <CheckSquare size={19} color="#22c55e" />
                  ) : (
                    <Square size={19} color="#728c7b" />
                  )}
                  <span className="checklist-item-text">{text}</span>
                </button>
              );
            })}
          </div>

          <div className="checklist-footer">
            <span className="checklist-tip">
              💡 {isEn ? 'Click any item to toggle your packed gear.' : 'Bấm vào từng mục để đánh dấu món đồ bạn đã xếp vào ba lô.'}
            </span>
            <button
              type="button"
              className="btn btn-small btn-outline"
              onClick={() =>
                setChecklist((prev) =>
                  prev.map((item) => ({ ...item, checked: true }))
                )
              }
            >
              {isEn ? 'Mark All Packed' : 'Đánh dấu tất cả'}
            </button>
          </div>
        </div>
      </section>

      <div className="journal-layout">
        <aside className="journal-index">
          <p className="eyebrow">{isEn ? 'IN THIS HANDBOOK' : 'TRONG CẨM NANG NÀY'}</p>
          <nav aria-label="Mục lục cẩm nang">
            <a href="#chon-hanh-trinh">
              <Map size={18} aria-hidden="true" />
              {isEn ? 'Choosing Trails' : 'Chọn hành trình'}
            </a>
            <a href="#soan-ba-lo">
              <Backpack size={18} aria-hidden="true" />
              {isEn ? 'Packing Backpack' : 'Soạn ba lô'}
            </a>
            <a href="#truoc-khi-di">
              <Compass size={18} aria-hidden="true" />
              {isEn ? 'Before Heading Out' : 'Trước khi lên đường'}
            </a>
            <a href="#di-co-trach-nhiem">
              <Leaf size={18} aria-hidden="true" />
              {isEn ? 'Leave No Trace' : 'Đi có trách nhiệm'}
            </a>
          </nav>
        </aside>

        <div className="journal-articles">
          <article id="chon-hanh-trinh" aria-labelledby="choose-heading">
            <span className="journal-topic">{isEn ? 'UNDERSTAND THE TRAIL' : 'HIỂU CUNG ĐƯỜNG'}</span>
            <h2 id="choose-heading">{isEn ? 'Choose based on concrete trail parameters' : 'Chọn tour từ những thông số cụ thể'}</h2>
            <p>
              {isEn
                ? 'On each tour detail page, inspect elevation profiles and schedule pace. The difficulty tag is your starting point; physical metrics clarify expectations.'
                : 'Trong trang chi tiết tour, đọc phần tổng quan hành trình cùng lịch khởi hành. Nhãn độ khó là điểm bắt đầu; các thông số bên dưới giúp bạn đặt câu hỏi rõ hơn.'}
            </p>
            <dl className="journal-facts">
              <div>
                <dt>{isEn ? 'Distance & moving time' : 'Quãng đường & thời gian hoạt động'}</dt>
                <dd>{isEn ? 'Check daily kilometers, hiking hours, and elevation gains.' : 'Xem số kilômét, số giờ di chuyển mỗi ngày và thời gian nghỉ trong lịch trình.'}</dd>
              </div>
              <div>
                <dt>{isEn ? 'Elevation & gradient' : 'Độ cao & độ dốc'}</dt>
                <dd>{isEn ? 'Distinguish summit altitude from cumulative ascent. Two tours of equal length can require vastly different endurance.' : 'Phân biệt độ cao đỉnh với tổng độ cao phải leo. Hai tour cùng độ dài có thể đòi hỏi mức vận động khác nhau.'}</dd>
              </div>
              <div>
                <dt>{isEn ? 'Field support & guides' : 'Hỗ trợ trên hành trình'}</dt>
                <dd>{isEn ? 'Review medical access points, emergency protocols, and assigned certified guides.' : 'Đọc ghi chú tiếp cận y tế, yêu cầu tham gia và phân công hướng dẫn viên nếu đã được cập nhật.'}</dd>
              </div>
            </dl>
            <Link className="text-link" to="/tours">
              {isEn ? 'Explore all trails' : 'Xem các hành trình'} <ArrowUpRight size={17} />
            </Link>
          </article>
        </div>
      </div>
    </div>
  );
}
