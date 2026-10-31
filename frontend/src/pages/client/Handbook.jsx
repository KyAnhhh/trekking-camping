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
  Sparkles,
  ShieldAlert,
  Tent,
  Flashlight,
  Droplets,
  Layers,
} from "lucide-react";
import use3DTilt from "../../hooks/use3DTilt";
import "../../styles/editorial.css";

const ESSENTIAL_GEARS = [
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
];

const INITIAL_CHECKLIST = [
  { id: 1, text: "Giày trekking có độ bám tốt (đã đi quen chân)", checked: true },
  { id: 2, text: "Balo có đai trợ lực + bọc chống nước cho balo", checked: true },
  { id: 3, text: "2 bộ quần áo thể thao mau khô (dry-fit), quần dài chống gai/vắt", checked: false },
  { id: 4, text: "Áo khoác gió nhẹ hoặc áo ấm cho ban đêm (nhiệt độ núi giảm nhanh)", checked: false },
  { id: 5, text: "Đèn pin đội đầu + pin sạc dự phòng cho điện thoại", checked: false },
  { id: 6, text: "1.5L – 2L nước uống + 2 viên sủi bù khoáng điện giải", checked: false },
  { id: 7, text: "Áo mưa cánh dơi hoặc bộ áo mưa chuyên dụng", checked: false },
  { id: 8, text: "Bộ sơ cứu cá nhân: băng cá nhân, thuốc hạ sốt, xịt chống muỗi/vắt", checked: false },
  { id: 9, text: "Thanh năng lượng / socola / lương khô nạp năng lượng nhanh", checked: false },
];

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
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);

  const toggleCheck = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const completedCount = checklist.filter((i) => i.checked).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="container field-journal">
      <header className="journal-heading">
        <p className="eyebrow">
          <Compass size={16} /> CẨM NANG TREKKING & CAMPING
        </p>
        <h1>
          Chuẩn bị kỹ.
          <br />
          <span>Đi nhẹ lòng hơn.</span>
        </h1>
        <p>
          Từ việc chọn cung đường đến kiểm tra trang bị ba lô, những kinh nghiệm thực địa này giúp bạn bắt đầu một chuyến đi an toàn và trọn vẹn.
        </p>
      </header>

      {/* Interactive Visual Gear Showcase */}
      <section className="handbook-gears-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TRANG BỊ ĐỒ NGHỀ THỰC TẾ</p>
            <h2>4 Món Đồ Không Thể Thiếu Trong Rừng</h2>
          </div>
          <p className="heading-note">
            Đầu tư đúng những trang bị cốt lõi sẽ biến một chuyến đi gian nan thành trải nghiệm tận hưởng.
          </p>
        </div>

        <div className="handbook-gears-grid">
          {ESSENTIAL_GEARS.map((gear, idx) => (
            <GearCard3D key={idx} gear={gear} />
          ))}
        </div>
      </section>

      {/* Interactive Backpack Packing Checklist */}
      <section className="handbook-checklist-section">
        <div className="checklist-card">
          <div className="checklist-header">
            <div>
              <p className="eyebrow">CHECKLIST TRỰC QUAN</p>
              <h2>Kiểm Tra Ba Lô Trước Giờ Xuất Phát</h2>
            </div>
            <div className="checklist-progress-wrap">
              <span className="checklist-progress-label">
                Đã chuẩn bị: <strong>{completedCount}/{checklist.length} món</strong> ({progressPercent}%)
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
            {checklist.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`checklist-item-btn ${item.checked ? "checked" : ""}`}
                onClick={() => toggleCheck(item.id)}
              >
                {item.checked ? (
                  <CheckSquare size={19} color="#1b6b3b" />
                ) : (
                  <Square size={19} color="#728c7b" />
                )}
                <span className="checklist-item-text">{item.text}</span>
              </button>
            ))}
          </div>

          <div className="checklist-footer">
            <span className="checklist-tip">
              💡 Bấm vào từng mục để đánh dấu món đồ bạn đã xếp vào ba lô.
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
              Đánh dấu tất cả
            </button>
          </div>
        </div>
      </section>

      <div className="journal-layout">
        <aside className="journal-index">
          <p className="eyebrow">TRONG CẨM NANG NÀY</p>
          <nav aria-label="Mục lục cẩm nang">
            <a href="#chon-hanh-trinh">
              <Map size={18} aria-hidden="true" />
              Chọn hành trình
            </a>
            <a href="#soan-ba-lo">
              <Backpack size={18} aria-hidden="true" />
              Soạn ba lô
            </a>
            <a href="#truoc-khi-di">
              <Compass size={18} aria-hidden="true" />
              Trước khi lên đường
            </a>
            <a href="#di-co-trach-nhiem">
              <Leaf size={18} aria-hidden="true" />
              Đi có trách nhiệm
            </a>
          </nav>
          <p>
            Mỗi cung đường có yêu cầu riêng. Hãy đối chiếu danh sách chuẩn bị của tour và trao đổi với người tổ chức.
          </p>
        </aside>

        <div className="journal-articles">
          <article id="chon-hanh-trinh" aria-labelledby="choose-heading">
            <span className="journal-topic">HIỂU CUNG ĐƯỜNG</span>
            <h2 id="choose-heading">Chọn tour từ những thông số cụ thể</h2>
            <p>
              Trong trang chi tiết tour, đọc phần tổng quan hành trình cùng lịch khởi hành. Nhãn độ khó là điểm bắt đầu; các thông số bên dưới giúp bạn đặt câu hỏi rõ hơn.
            </p>
            <dl className="journal-facts">
              <div>
                <dt>Quãng đường & thời gian hoạt động</dt>
                <dd>Xem số kilômét, số giờ di chuyển mỗi ngày và thời gian nghỉ trong lịch trình.</dd>
              </div>
              <div>
                <dt>Độ cao & độ dốc</dt>
                <dd>Phân biệt độ cao đỉnh với tổng độ cao phải leo. Hai tour cùng độ dài có thể đòi hỏi mức vận động khác nhau.</dd>
              </div>
              <div>
                <dt>Hỗ trợ trên hành trình</dt>
                <dd>Đọc ghi chú tiếp cận y tế, yêu cầu tham gia và phân công hướng dẫn viên nếu đã được cập nhật.</dd>
              </div>
            </dl>
            <p>
              Thông số chưa có thì cần hỏi lại. Một con số trong tổng quan tour không tự xác nhận chuyến đi phù hợp với mọi người.
            </p>
            <Link className="text-link" to="/tours">
              Xem các hành trình <ArrowUpRight size={17} />
            </Link>
          </article>

          <article id="soan-ba-lo" aria-labelledby="packing-heading">
            <span className="journal-topic">CHUẨN BỊ TRANG BỊ</span>
            <h2 id="packing-heading">Soạn theo nhu cầu của chuyến đi</h2>
            <p>
              Kiểm tra mục trang bị của tour để biết đồ được cung cấp, đồ có thể thuê và đồ cần tự mang. Đừng mặc định lều, túi ngủ hay đồ ăn đều đã bao gồm.
            </p>
            <ul className="journal-list">
              <li>Chuẩn bị bản đồ hoặc thông tin tuyến đường, điện thoại và nguồn điện dự phòng; biết cách sử dụng trước khi đi.</li>
              <li>Mang lớp áo phù hợp thời tiết, đồ che mưa và vật dụng chống nắng.</li>
              <li>Kiểm tra đèn cá nhân, pin, nước và thức ăn dự phòng phù hợp hành trình.</li>
              <li>Trao đổi với người tổ chức về đồ sơ cứu, dụng cụ sửa chữa và phương án trú tạm khi kế hoạch thay đổi.</li>
            </ul>
            <p className="journal-source">
              Tham khảo cách phân nhóm trang bị:{" "}
              <a href="https://www.nps.gov/articles/10essentials.htm" target="_blank" rel="noopener noreferrer">
                National Park Service — Ten Essentials (tiếng Anh)
              </a>
              . Đây là ghi chú khởi đầu, không phải danh sách đầy đủ cho mọi tour.
            </p>
          </article>

          <article id="truoc-khi-di" aria-labelledby="departure-heading">
            <span className="journal-topic">KIỂM TRA LẦN CUỐI</span>
            <h2 id="departure-heading">Chốt thông tin trước ngày khởi hành</h2>
            <ul className="journal-list">
              <li>Kiểm tra lại giờ, địa điểm đón và đầu mối liên hệ được người tổ chức xác nhận.</li>
              <li>Xem thông tin thời tiết, tình trạng tuyến đường và kế hoạch thay thế cùng người tổ chức.</li>
              <li>Chia sẻ lịch trình và thời gian dự kiến trở về với một người tin cậy.</li>
              <li>Đọc yêu cầu tham gia trong đơn đặt tour; gửi thông tin cá nhân cần thiết qua biểu mẫu riêng thay vì chat công khai.</li>
            </ul>
            <p>
              Khi dùng trợ lý AI, bạn có thể nêu điểm đến, ngày đi, số người và ngân sách. Trước khi đặt, kiểm tra lại lịch và giá trên thẻ tour hoặc bản tóm tắt đơn.
            </p>
            <p className="journal-source">
              Tham khảo chuẩn bị trước chuyến đi:{" "}
              <a href="https://www.nps.gov/articles/hiking-safety.htm" target="_blank" rel="noopener noreferrer">
                National Park Service — Hike Smart (tiếng Anh)
              </a>
              .
            </p>
          </article>

          <article id="di-co-trach-nhiem" aria-labelledby="responsible-heading">
            <span className="journal-topic">GIỮ GÌN NƠI MÌNH ĐẾN</span>
            <h2 id="responsible-heading">Mang kỷ niệm về, giữ thiên nhiên ở lại</h2>
            <p>
              Đi theo lối được hướng dẫn và chọn nơi cắm trại phù hợp để hạn chế tác động lên cây cỏ. Gom rác, kể cả thức ăn thừa, để mang đến nơi xử lý phù hợp.
            </p>
            <p>
              Quan sát động vật từ xa, không cho ăn; để đá, cây và những gì bạn tìm thấy ở nguyên vị trí. Giữ tiếng ồn vừa phải để những người khác cũng có thể tận hưởng không gian.
            </p>
            <p className="journal-source">
              Đọc thêm:{" "}
              <a href="https://lnt.org/why/7-principles/" target="_blank" rel="noopener noreferrer">
                Leave No Trace — The 7 Principles (tiếng Anh)
              </a>
              .
            </p>
          </article>
        </div>
      </div>

      <section className="journal-next" aria-labelledby="journal-next-heading">
        <div>
          <p className="eyebrow">TỪ CHUẨN BỊ ĐẾN HÀNH TRÌNH</p>
          <h2 id="journal-next-heading">Bạn đang nghĩ đến chuyến đi nào?</h2>
        </div>
        <div className="content-links">
          <Link className="btn" to="/chat">
            Hỏi AI <ArrowUpRight size={18} />
          </Link>
          <Link className="btn btn-outline" to="/contact">
            Liên hệ & hỗ trợ
          </Link>
        </div>
      </section>
    </div>
  );
}
