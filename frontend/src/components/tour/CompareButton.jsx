import { Columns3 } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import './compare.css';
export default function CompareButton({ tour }) {
  const { selected, toggle } = useCompare();
  const checked = selected.some(row => row.slug === tour.slug);
  const full = !checked && selected.length >= 3;
  return <button type="button" className="compare-toggle" aria-pressed={checked}
    aria-label={`${checked ? 'Bỏ so sánh' : 'So sánh'} ${tour.title}`} disabled={full || !tour.slug}
    title={full ? 'Bỏ một tour trong thanh so sánh để chọn tour khác' : undefined} onClick={() => toggle(tour)}>
    <Columns3 size={16} aria-hidden="true" />{checked ? 'Đã chọn so sánh' : full ? 'Đã đủ 3 tour' : 'So sánh'}
  </button>;
}
