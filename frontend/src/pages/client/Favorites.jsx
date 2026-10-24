import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../../context/FavoritesContext';
import { favoriteService } from '../../api/favoriteService';
import TourCard from '../../components/tour/TourCard';
import { errorMessage } from '../../utils/tour';

export default function Favorites() {
  const { revision } = useFavorites();
  const [page, setPage] = useState(0), [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    favoriteService.list(page, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (!data.data.items.length && page > 0) setPage(page - 1);
      else setResult(data.data);
    }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [page, revision, retry]);
  return <section className="container favorites-page">
    <p className="eyebrow">DÀNH CHO CHUYẾN ĐI TIẾP THEO</p>
    <h1>Tour yêu thích</h1>
    <p>Lưu những hành trình bạn muốn khám phá. Giá và lịch khởi hành được kiểm tra lại khi đặt tour.</p>
    {error ? <div role="alert"><p>{error}</p><button className="btn" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>
      : !result ? <p role="status">Đang tải tour đã lưu…</p>
      : !result.items.length ? <div><p>Bạn chưa lưu tour nào đang mở công khai.</p><Link className="btn" to="/tours">Khám phá tour</Link></div>
      : <><p>{result.totalElements} tour đang công khai</p><div className="favorites-grid">{result.items.map(tour => <TourCard key={tour.id} tour={tour} />)}</div>
        <nav className="favorites-pagination" aria-label="Phân trang yêu thích">
          <button className="favorite-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
          <span>Trang {page + 1}</span>
          <button className="favorite-button" disabled={(page + 1) * 12 >= result.totalElements} onClick={() => setPage(page + 1)}>Sau</button>
        </nav></>}
    <p className="muted">Tour tạm ngừng công khai sẽ được ẩn khỏi danh sách này.</p>
  </section>;
}
