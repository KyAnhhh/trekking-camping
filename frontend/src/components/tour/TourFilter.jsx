import { Search, SlidersHorizontal } from 'lucide-react';
export default function TourFilter({ query, difficulty, length, sort, onChange, onReset }) {
  return (
    <div className="filter-bar">
      <label className="search-field">
        <Search size={19} />
        <span className="sr-only">Tên tour hoặc địa điểm</span>
        <input
          value={query}
          onChange={(e) => onChange('q', e.target.value)}
          placeholder="Tên tour, địa điểm bạn muốn đến..."
        />
      </label>
      <label>
        <span className="sr-only">Độ khó</span>
        <select value={difficulty} onChange={(e) => onChange('difficulty', e.target.value)}>
          <option value="">Mọi độ khó</option>
          <option value="1">Dễ · Người mới</option>
          <option value="2">Trung bình</option>
          <option value="3">Mạo hiểm</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Thời gian</span>
        <select value={length} onChange={(e) => onChange('duration', e.target.value)}>
          <option value="">Mọi thời lượng</option>
          <option value="short">1–2 ngày</option>
          <option value="long">Từ 3 ngày</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Sắp xếp</span>
        <select value={sort} onChange={(e) => onChange('sort', e.target.value)}>
          <option value="">Sắp xếp mặc định</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </select>
      </label>
      {(query || difficulty || length || sort) && (
        <button className="text-btn" onClick={onReset}>
          <SlidersHorizontal size={15} />
          Đặt lại
        </button>
      )}
    </div>
  );
}
