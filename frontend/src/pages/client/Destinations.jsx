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
import { useLanguage } from '../../context/LanguageContext';

const REGIONS_DATA = {
  vi: [
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
  ],
  en: [
    {
      region: 'Northwest & Northeast Peaks',
      tag: 'Endless Clouds & Alpine Summits',
      desc: 'High-altitude peaks over 2,000m, terraced valleys, and ocean-like seas of mountain clouds.',
      bestSeason: 'September – April (Cloud chasing & blooming rhododendrons)',
      spots: ['Fansipan (Lao Cai)', 'Ta Xua (Son La)', 'Y Ty (Lao Cai)', 'Bach Moc Luong Tu (Lai Chau)'],
      badge: 'Summits & Cloud Chasing',
    },
    {
      region: 'Central Highlands & Coastline',
      tag: 'Pine Forests & Grassy Ridges',
      desc: 'Ancient mossy cloud forests, sweeping golden grass plateaus, and pristine coastal sunrises.',
      bestSeason: 'November – May (Dry season, golden grass at peak)',
      spots: ['Ta Nang - Phan Dung', 'Bidoup - Nui Ba (Da Lat)', 'Mui Doi East Pole', 'Tuyen Lam Lake'],
      badge: 'Mossy Forests & Ridges',
    },
    {
      region: 'Southeast & Southern Escapes',
      tag: 'Endurance & Weekend Getaways',
      desc: 'Accessible 1–2 day trails to refresh stamina and unwind from bustling city life.',
      bestSeason: 'Year-round (Best from November to April)',
      spots: ['Ba Den Mountain (Tay Ninh)', 'Chua Chan Mountain', 'Dinh Mountain', 'Cat Tien Jungle'],
      badge: 'Weekend & Beginners',
    },
  ],
};

const loadTours = async () => (await tourApi.getAllTours()).data.data;

export default function Destinations() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const { data, loading, error, reload } = useResource(loadTours, {
    key: 'tours',
    ttl: 300000,
    persist: true,
  });

  const [query, setQuery] = useState('');
  const tours = (data || []).filter((tour) =>
    (tour.location || '').toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))
  );

  const regions = REGIONS_DATA[language] || REGIONS_DATA.vi;

  return (
    <div className="container page-space destinations-page">
      <header className="page-heading">
        <p className="eyebrow">
          <Compass size={16} /> {isEn ? 'BEGIN WITH A DESTINATION' : 'BẮT ĐẦU TỪ MỘT ĐIỂM ĐẾN'}
        </p>
        <h1>{isEn ? 'Where is your spirit heading?' : 'Bạn muốn đi về phía nào?'}</h1>
        <p>
          {isEn
            ? 'Magnificent trekking & camping terrains across Vietnam. Choose a region to inspect routes, detailed itineraries, and departures.'
            : 'Các vùng đất trekking & camping kỳ vĩ khắp 3 miền Việt Nam. Chọn một nơi để xem hành trình, lịch trình chi tiết và thông tin khởi hành thực tế.'}
        </p>
      </header>

      {/* Search Input */}
      <label className="search-field destination-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">{isEn ? 'Search destinations' : 'Tìm điểm đến'}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isEn ? 'Search destination (e.g. Sapa, Da Lat, Tay Ninh...)' : 'Tìm khu vực bạn quan tâm (ví dụ: Lâm Đồng, Sa Pa, Tây Ninh, Khánh Hòa...)'}
          type="search"
        />
      </label>

      {/* Dynamic Tours Destination Grid */}
      {loading ? (
        <LoadingSpinner label={isEn ? 'Finding destinations...' : 'Đang tìm các điểm đến...'} />
      ) : error ? (
        <EmptyState error title={isEn ? 'Unable to load destinations' : 'Chưa tải được điểm đến'} description={error} onRetry={reload} />
      ) : !tours.length && query ? (
        <EmptyState
          title={isEn ? 'No matching destinations found' : 'Chưa tìm thấy khu vực phù hợp'}
          description={isEn ? 'Try different keywords or clear the search to view all.' : 'Thử tên địa điểm khác hoặc xóa từ khóa để xem toàn bộ danh sách.'}
        >
          <button className="btn btn-outline" onClick={() => setQuery('')}>
            {isEn ? 'Clear search' : 'Xóa tìm kiếm'}
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
            <p className="eyebrow">{isEn ? 'REGIONAL TERRAIN HANDBOOK' : 'CẨM NANG ĐỊA HÌNH THEO VÙNG'}</p>
            <h2>{isEn ? 'Seasons & Microclimates Across Trails' : 'Thời Điểm & Khí Hậu Từng Cung Đường'}</h2>
          </div>
          <p className="heading-note">
            {isEn
              ? 'Understanding local climates ensures optimal gear packing and experiencing trails at their peak beauty.'
              : 'Hiểu đặc điểm thời tiết từng vùng giúp bạn chuẩn bị trang phục và chọn đúng mùa đẹp nhất.'}
          </p>
        </div>

        <div className="regional-cards-grid">
          {regions.map((reg, idx) => (
            <div key={idx} className="regional-card">
              <div className="regional-card-header">
                <span className="regional-badge">{reg.badge}</span>
                <h3>{reg.region}</h3>
                <p className="regional-tag">{reg.tag}</p>
              </div>

              <p className="regional-desc">{reg.desc}</p>

              <div className="regional-season">
                <Calendar size={16} />
                <span>
                  <strong>{isEn ? 'Best season:' : 'Mùa lý tưởng:'}</strong> {reg.bestSeason}
                </span>
              </div>

              <div className="regional-spots">
                <p className="spots-title">
                  <MapPin size={15} /> {isEn ? 'Featured Peaks & Trails:' : 'Các đỉnh & cung đường tiêu biểu:'}
                </p>
                <ul>
                  {reg.spots.map((spot, sIdx) => (
                    <li key={sIdx}>
                      <Mountain size={13} /> {spot}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Direct AI Consultation CTA */}
      <Reveal className="container ai-banner">
        <div>
          <p className="eyebrow">{isEn ? 'LOCAL WEATHER & TERRAIN CONSULTATION' : 'TƯ VẤN THỜI TIẾT & ĐỊA HÌNH'}</p>
          <h2>{isEn ? 'Planning a trek this weekend?' : 'Bạn muốn đi cuối tuần này?'}</h2>
          <p>
            {isEn
              ? 'Our AI assistant tracks seasonal trail conditions and weather forecasts across all 3 regions.'
              : 'Hỏi trợ lý AI để nắm thời tiết, độ trơn trượt của dốc đá và lượng mưa dự kiến trước khi xuất phát.'}
          </p>
        </div>
        <Link className="btn btn-lime" to="/chat">
          {isEn ? 'Ask AI for Forecast' : 'Hỏi AI dự báo'} <ArrowUpRight size={18} />
        </Link>
      </Reveal>
    </div>
  );
}
