import { useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { tourApi } from '../../api/tourService';
import useResource from '../../hooks/useResource';
import TourCard from '../../components/tour/TourCard';
import TourFilter from '../../components/tour/TourFilter';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';
const loadTours = async () => (await tourApi.getAllTours()).data.data;
export default function TourList() {
  const { data, loading, error, reload } = useResource(loadTours);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '',
    difficulty = params.get('difficulty') || '',
    length = params.get('duration') || '',
    sort = params.get('sort') || '';
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };
  const tours = (data || []).filter(
    (tour) =>
      (!difficulty || String(tour.difficultyLevel) === difficulty) &&
      (!query ||
        ((tour.title || '') + ' ' + (tour.location || ''))
          .toLocaleLowerCase('vi')
          .includes(query.trim().toLocaleLowerCase('vi'))) &&
      (!length || (length === 'short' ? tour.durationDays <= 2 : tour.durationDays >= 3)),
  );
  if (sort)
    tours.sort((a, b) =>
      sort === 'price-asc' ? a.pricePerPax - b.pricePerPax : b.pricePerPax - a.pricePerPax,
    );
  return (
    <div className="container page-space">
      <header className="page-heading">
        <p className="eyebrow">KHÁM PHÁ CÙNG TREK & CAMP</p>
        <h1>Tìm cung đường của bạn.</h1>
        <p>Từ bước chân đầu tiên đến những đỉnh cao mới — chọn hành trình phù hợp với mình.</p>
      </header>
      <TourFilter
        query={query}
        difficulty={difficulty}
        length={length}
        sort={sort}
        onChange={change}
        onReset={() => setParams({})}
      />
      {loading ? (
        <LoadingSpinner label="Đang tải danh sách tour..." />
      ) : error ? (
        <EmptyState error title="Chưa tải được tour" description={error} onRetry={reload} />
      ) : (
        <>
          <div className="results-heading">
            <p>
              <strong>{tours.length}</strong> hành trình phù hợp
            </p>
            <Link className="text-link" to="/chat">
              Cần giúp chọn tour? <ArrowUpRight size={16} />
            </Link>
          </div>
          {tours.length ? (
            <div className="tour-grid">
              {tours.map((tour) => (
                <TourCard tour={tour} key={tour.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa tìm thấy hành trình phù hợp"
              description="Thử đổi địa điểm hoặc mở rộng độ khó và thời gian."
            >
              <button className="btn btn-outline" onClick={() => setParams({})}>
                Xóa bộ lọc
              </button>
            </EmptyState>
          )}
        </>
      )}
      <Reveal className="destination-guidance">
        <div><p className="eyebrow">CHỌN TOUR CÓ CHUẨN BỊ</p><h2>Đọc kỹ trước khi chọn ngày.</h2></div>
        <div><p>So sánh thời gian vận động, quãng đường và yêu cầu tham gia trong tổng quan từng tour. Giá trong danh sách là thông tin tham khảo của tour; lịch và chi phí hiện tại được kiểm tra khi đặt.</p><div className="content-links"><Link className="text-link" to="/handbook">Cẩm nang trekking <ArrowUpRight size={16} /></Link><Link className="text-link" to="/destinations">Khám phá theo điểm đến <ArrowUpRight size={16} /></Link></div></div>
      </Reveal>
    </div>
  );
}
