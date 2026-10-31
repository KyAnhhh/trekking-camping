import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpRight, Compass, Mountain, MapPin, Calendar, Sun, CloudRain } from 'lucide-react';
import { tourApi } from '../../api/tourService';
import useResource from '../../hooks/useResource';
import DestinationGrid from '../../components/tour/DestinationGrid';
import FieldMoments3D from '../../components/home/FieldMoments3D';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';

const REGIONS_DATA = [
  {
    region: 'Tây Bắc & Đông Bắc',
    tag: 'Mây Ngàn & Núi Cao',
    desc: 'Thiên đường của những đỉnh núi trên 2.000m, thung lũng lúa bậc thang và biển mây bồng bềnh.',
    bestSeason: 'Tháng 9 – Tháng 4 (Mùa mây & hoa đỗ quyên)',
    spots: ['Fansipan (Lào Cai)', 'Tà Xùa (Sơn La)', 'Y Tý (Lào Cai)', 'Bạch Mộc Lương Tử (Lai Châu)'],
    badge: 'Chinh phục & Săn mây',
  },
  {
    region: 'Tây Nguyên & Duyên Hải Nam Trung Bộ',
    tag: 'Đồi Cỏ & Rừng Thông',
    desc: 'Những cánh rừng rêu cổ tích, cung đồi cỏ cháy bao la và bờ biển hoang sơ đón bình minh sớm.',
    bestSeason: 'Tháng 11 – Tháng 5 (Mùa khô ráo, đồi cỏ đẹp nhất)',
    spots: ['Tà Năng - Phan Dũng (Lâm Đồng)', 'Bidoup - Núi Bà (Đà Lạt)', 'Mũi Đôi Cực Đông (Khánh Hòa)', 'Hồ Tuyền Lâm'],
    badge: 'Đồi cỏ & Rừng rêu',
  },
  {
    region: 'Đông Nam Bộ & Miền Tây',
    tag: 'Rèn Luyện & Cuối Tuần',
    desc: 'Điểm đến lý tưởng cho những chuyến trekking 1 - 2 ngày giải tỏa căng thẳng sau tuần làm việc bận rộn.',
    bestSeason: 'Quanh năm (Lý tưởng nhất tháng 11 – Tháng 4)',
    spots: ['Núi Bà Đen (Tây Ninh)', 'Núi Chứa Chan (Đồng Nai)', 'Núi Dinh (Bà Rịa)', 'Cát Tiên'],
    badge: 'Cuối tuần & Người mới',
  },
];

const loadTours = async () => (await tourApi.getAllTours()).data.data;

export default function Destinations() {
  const { data, loading, error, reload } = useResource(loadTours, {
    key: 'tours',
    ttl: 300000,
    persist: true,
  });

  const [query, setQuery] = useState('');
  const tours = (data || []).filter((tour) =>
    (tour.location || '').toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))
  );

  return (
    <div className="container page-space destinations-page">
      <header className="page-heading">
        <p className="eyebrow">
          <Compass size={16} /> BẮT ĐẦU TỪ MỘT ĐIỂM ĐẾN
        </p>
        <h1>Bạn muốn đi về phía nào?</h1>
        <p>
          Các vùng đất trekking & camping kỳ vĩ khắp 3 miền Việt Nam. Chọn một nơi để xem hành trình, lịch trình chi tiết và thông tin khởi hành thực tế.
        </p>
      </header>

      {/* Search Input */}
      <label className="search-field destination-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Tìm điểm đến</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm khu vực bạn quan tâm (ví dụ: Lâm Đồng, Sa Pa, Tây Ninh, Khánh Hòa...)"
          type="search"
        />
      </label>

      {/* Dynamic Tours Destination Grid */}
      {loading ? (
        <LoadingSpinner label="Đang tìm các điểm đến..." />
      ) : error ? (
        <EmptyState error title="Chưa tải được điểm đến" description={error} onRetry={reload} />
      ) : !tours.length && query ? (
        <EmptyState
          title="Chưa tìm thấy khu vực phù hợp"
          description="Thử tên địa điểm khác hoặc xóa từ khóa để xem toàn bộ danh sách."
        >
          <button className="btn btn-outline" onClick={() => setQuery('')}>
            Xóa tìm kiếm
          </button>
        </EmptyState>
      ) : (
        <DestinationGrid tours={tours} />
      )}

      {/* 3D Real Content Showcase */}
      <Reveal>
        <FieldMoments3D />
      </Reveal>

      {/* Regional Guide Cards */}
      <Reveal className="regional-guide-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CẨM NANG ĐỊA HÌNH THEO VÙNG</p>
            <h2>Thời Điểm & Khí Hậu Từng Cung Đường</h2>
          </div>
          <p className="heading-note">
            Hiểu đặc điểm thời tiết từng vùng giúp bạn chuẩn bị trang phục và chọn đúng mùa đẹp nhất.
          </p>
        </div>

        <div className="regional-cards-grid">
          {REGIONS_DATA.map((reg, idx) => (
            <div key={idx} className="regional-card">
              <div className="regional-card-header">
                <span className="regional-badge">{reg.badge}</span>
                <h3>{reg.region}</h3>
                <p className="regional-tag">{reg.tag}</p>
              </div>

              <p className="regional-desc">{reg.desc}</p>

              <div className="regional-season-box">
                <Calendar size={15} color="#2d7a46" />
                <div>
                  <small>Thời điểm lý tưởng nhất</small>
                  <strong>{reg.bestSeason}</strong>
                </div>
              </div>

              <div className="regional-spots">
                <small>Điểm đến tiêu biểu:</small>
                <ul>
                  {reg.spots.map((spot, sIdx) => (
                    <li key={sIdx}>
                      <MapPin size={13} /> {spot}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="destination-guidance">
        <div>
          <p className="eyebrow">HIỂU NƠI MÌNH ĐẾN</p>
          <h2>
            Cùng một khu vực,
            <br />
            nhiều cách trải nghiệm.
          </h2>
        </div>
        <div>
          <p>
            Địa điểm chưa nói hết độ khó. Hãy so sánh quãng đường, thời lượng, độ cao và yêu cầu tham gia của từng tour trước khi chọn ngày đi.
          </p>
          <p>
            Số tour trong một khu vực không phải số lịch đang còn chỗ. Mở chi tiết hành trình để kiểm tra lịch khởi hành mới nhất.
          </p>
          <Link className="text-link" to="/handbook">
            Chuẩn bị trước chuyến đi <ArrowUpRight size={18} />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
