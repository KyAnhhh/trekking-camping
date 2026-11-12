import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function TourFilter({
  query,
  difficulty,
  length,
  sort,
  semanticMode = true,
  onToggleSemantic,
  onChange,
  onReset,
}) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  return (
    <div className="filter-bar">
      <label className="search-field">
        <Search size={19} />
        <span className="sr-only">{isEn ? 'Tour title or natural query' : 'Tên tour hoặc mô tả nhu cầu'}</span>
        <input
          value={query}
          onChange={(e) => onChange('q', e.target.value)}
          placeholder={
            semanticMode
              ? isEn
                ? 'e.g. easy cloud-hunting weekend trek for beginners...'
                : 'VD: đi săn mây nhẹ nhàng cuối tuần cho người mới...'
              : isEn
                ? 'Search tour name, location...'
                : 'Tên tour, địa điểm bạn muốn đến...'
          }
        />
      </label>
      {onToggleSemantic && (
        <button
          type="button"
          className={`semantic-toggle-btn ${semanticMode ? 'is-active' : ''}`}
          onClick={onToggleSemantic}
          aria-pressed={semanticMode}
          title={
            isEn
              ? 'Hybrid AI Semantic Search understands intent & natural descriptions'
              : 'Tìm kiếm ngữ nghĩa AI hiểu ý định và mô tả tự nhiên'
          }
        >
          <Sparkles size={15} />
          <span>{isEn ? 'AI Semantic' : 'Tìm AI Ngữ nghĩa'}</span>
        </button>
      )}
      <label>
        <span className="sr-only">{isEn ? 'Difficulty' : 'Độ khó'}</span>
        <select value={difficulty} onChange={(e) => onChange('difficulty', e.target.value)}>
          <option value="">{isEn ? 'All Difficulties' : 'Mọi độ khó'}</option>
          <option value="1">{isEn ? 'Easy · Beginner' : 'Dễ · Người mới'}</option>
          <option value="2">{isEn ? 'Moderate' : 'Trung bình'}</option>
          <option value="3">{isEn ? 'Adventurous' : 'Mạo hiểm'}</option>
        </select>
      </label>
      <label>
        <span className="sr-only">{isEn ? 'Duration' : 'Thời gian'}</span>
        <select value={length} onChange={(e) => onChange('duration', e.target.value)}>
          <option value="">{isEn ? 'All Durations' : 'Mọi thời lượng'}</option>
          <option value="short">{isEn ? '1–2 days' : '1–2 ngày'}</option>
          <option value="long">{isEn ? 'From 3 days' : 'Từ 3 ngày'}</option>
        </select>
      </label>
      <label>
        <span className="sr-only">{isEn ? 'Sorting' : 'Sắp xếp'}</span>
        <select value={sort} onChange={(e) => onChange('sort', e.target.value)}>
          <option value="">{isEn ? 'Default sorting' : 'Sắp xếp mặc định'}</option>
          <option value="price-asc">{isEn ? 'Price: Low to High' : 'Giá tăng dần'}</option>
          <option value="price-desc">{isEn ? 'Price: High to Low' : 'Giá giảm dần'}</option>
        </select>
      </label>
      {(query || difficulty || length || sort) && (
        <button className="text-btn" type="button" onClick={onReset}>
          <SlidersHorizontal size={15} />
          {isEn ? 'Reset' : 'Đặt lại'}
        </button>
      )}
    </div>
  );
}
