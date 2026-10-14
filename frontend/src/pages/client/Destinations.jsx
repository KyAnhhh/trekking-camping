import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpRight } from 'lucide-react';
import { tourApi } from '../../api/tourService';
import useResource from '../../hooks/useResource';
import DestinationGrid from '../../components/tour/DestinationGrid';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';

const loadTours = async () => (await tourApi.getAllTours()).data.data;
export default function Destinations() {
  const { data, loading, error, reload } = useResource(loadTours);
  const [query, setQuery] = useState('');
  const tours = (data || []).filter((tour) => (tour.location || '').toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  return <div className="container page-space">
    <header className="page-heading"><p className="eyebrow">BẮT ĐẦU TỪ MỘT ĐIỂM ĐẾN</p><h1>Bạn muốn đi về phía nào?</h1><p>Các khu vực được nhóm từ địa điểm trong danh sách tour. Chọn một nơi để xem hành trình, lịch trình và thông tin khởi hành.</p></header>
    <label className="search-field destination-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Tìm điểm đến</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khu vực bạn quan tâm..." type="search" /></label>
    {loading ? <LoadingSpinner label="Đang tìm các điểm đến..." /> : error ? <EmptyState error title="Chưa tải được điểm đến" description={error} onRetry={reload} /> : !tours.length && query ? <EmptyState title="Chưa tìm thấy khu vực phù hợp" description="Thử tên địa điểm khác hoặc xem toàn bộ danh sách."><button className="btn btn-outline" onClick={() => setQuery('')}>Xóa tìm kiếm</button></EmptyState> : <DestinationGrid tours={tours} />}
    <Reveal className="destination-guidance">
      <div><p className="eyebrow">HIỂU NƠI MÌNH ĐẾN</p><h2>Cùng một khu vực,<br />nhiều cách trải nghiệm.</h2></div>
      <div><p>Địa điểm chưa nói hết độ khó. Hãy so sánh quãng đường, thời lượng, độ cao và yêu cầu tham gia của từng tour trước khi chọn ngày đi.</p><p>Số tour trong một khu vực không phải số lịch đang còn chỗ. Mở chi tiết hành trình để kiểm tra lịch khởi hành mới nhất.</p><Link className="text-link" to="/handbook">Chuẩn bị trước chuyến đi <ArrowUpRight size={18} /></Link></div>
    </Reveal>
  </div>;
}
