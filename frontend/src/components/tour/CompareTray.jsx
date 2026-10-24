import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import './compare.css';
export default function CompareTray() {
  const { selected, remove, clear } = useCompare();
  const { pathname } = useLocation();
  const visible = ['/', '/tours', '/favorites', '/compare', '/destinations', '/departures'].includes(pathname)
    || /^\/tours\/[^/]+$/.test(pathname);
  if (!visible || !selected.length) return null;
  return <div className="compare-tray-space"><aside className="compare-tray" aria-label="Tour đang chọn so sánh">
    <div className="compare-tray-heading"><strong role="status">So sánh {selected.length}/3 tour</strong>
      <button type="button" onClick={clear}>Bỏ tất cả</button></div>
    <ul>{selected.map(row => <li key={row.slug}><span>{row.title}</span>
      <button type="button" aria-label={`Bỏ ${row.title} khỏi so sánh`} onClick={() => remove(row.slug)}><X size={16} /></button>
    </li>)}</ul>
    {selected.length >= 2 ? <Link className="btn" to="/compare">So sánh ngay</Link> : <span className="muted">Chọn thêm ít nhất 1 tour</span>}
  </aside></div>;
}
