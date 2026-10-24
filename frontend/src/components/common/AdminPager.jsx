import './admin-pager.css';

export default function AdminPager({ data, onPage, busy = false }) {
  if (!data) return null;
  const hasTotal = Number.isFinite(data.totalPages);
  const hasNext = hasTotal ? data.page + 1 < data.totalPages : data.hasNext === true;
  return <nav className="admin-pager" aria-label="Phân trang" aria-busy={busy}>
    <span className="admin-pager-summary">{Number.isFinite(data.totalElements) && `${data.totalElements} kết quả · `}Trang {data.page + 1}{hasTotal && `/${Math.max(1, data.totalPages)}`}</span>
    <div className="admin-pager-actions">
      <button type="button" className="btn btn-outline btn-small" disabled={busy || data.page <= 0} onClick={() => onPage(data.page - 1)}>Trang trước</button>
      <button type="button" className="btn btn-outline btn-small" disabled={busy || !hasNext} onClick={() => onPage(data.page + 1)}>Trang sau</button>
    </div>
  </nav>;
}
