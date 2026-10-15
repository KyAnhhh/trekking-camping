export default function AdminPager({ data, onPage, busy = false }) {
  if (!data) return null;
  return <nav className="list-toolbar" aria-label="Phân trang">
    <span>{data.totalElements} kết quả · Trang {data.page + 1}/{Math.max(1, data.totalPages)}</span>
    <button className="btn btn-outline btn-small" disabled={busy || data.page <= 0} onClick={() => onPage(data.page - 1)}>Trang trước</button>
    <button className="btn btn-outline btn-small" disabled={busy || data.page + 1 >= data.totalPages} onClick={() => onPage(data.page + 1)}>Trang sau</button>
  </nav>;
}
