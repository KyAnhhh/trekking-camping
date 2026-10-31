import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { operationsService } from '../../api/operationsService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import AdminPager from '../../components/common/AdminPager';
import Modal from '../../components/common/Modal';
import { money, errorMessage } from '../../utils/tour';
const labels = { ALL: 'Tất cả', PENDING: 'Chưa có kết quả cuối', SUCCESS: 'Thành công', FAILED: 'Thất bại', EXPIRED: 'Hết hạn đã xác minh', REFUND_REQUIRED: 'Cần xử lý hoàn tiền' };
export default function AdminPayments() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'PENDING', page = Math.max(0, Number(params.get('page')) || 0);
  const load = useCallback(async () => (await operationsService.payments(status, page)).data.data, [status, page]);
  const { data, loading, error, reload } = useResource(load);
  const [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [notice, setNotice] = useState('');
  async function reconcile() {
    if (busy) return;
    setBusy(true); setFailure(''); setNotice('');
    try {
      const result = (await operationsService.reconcile(selected.id)).data.data;
      setNotice(result.status === 'PENDING' ? 'Cổng thanh toán chưa trả kết quả cuối. Giao dịch vẫn chờ xác minh; chưa ghi nhận thanh toán thành công.' : 'Kết quả đối soát: ' + (labels[result.status] || result.status));
      setSelected(null); reload();
    } catch (e) { setFailure(errorMessage(e)); } finally { setBusy(false); }
  }
  async function handleManualResolve(targetStatus) {
    if (busy) return;
    setBusy(true); setFailure(''); setNotice('');
    try {
      const result = (await operationsService.resolve(selected.id, targetStatus)).data.data;
      setNotice('Đã cập nhật trạng thái giao dịch: ' + (labels[result.status] || result.status));
      setSelected(null); reload();
    } catch (e) { setFailure(errorMessage(e)); } finally { setBusy(false); }
  }
  return <>
    <header className="page-heading"><p className="eyebrow">KIỂM SOÁT THANH TOÁN</p><h1>Giao dịch & đối soát.</h1><p>Đối soát truy vấn cổng thanh toán và chỉ cập nhật kết quả được backend xác minh.</p></header>
    <div className="list-toolbar"><label>Trạng thái giao dịch <select disabled={busy} value={status} onChange={e => setParams({ status: e.target.value, page: '0' })}>{Object.entries(labels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><button className="btn btn-outline btn-small" disabled={busy || loading} onClick={reload}>Tải lại</button></div>
    {notice && <p className="notice" role="status">{notice}</p>}
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được giao dịch" description={error} onRetry={reload} /> : <>
      {!data?.items.length ? <EmptyState title="Không có giao dịch trong bộ lọc này" /> : <div className="bookings-list">{data.items.map(p => <article className="booking-card" key={p.id}>
        <div className="booking-card-top"><Link className="text-link" to={'/admin/bookings/' + p.bookingId}>{p.bookingCode}</Link><span className="status-badge">{labels[p.status] || p.status}</span></div>
        <p className="break-word">{p.orderId}</p><p>{p.method} · <strong>{money(p.amount)}</strong></p>
        {p.checkoutExpired === true && <p className="notice">Phiên mở cổng đã hết hạn nhưng chưa có kết quả cuối. Cần đối soát trước khi thanh toán lại hoặc hủy đơn.</p>}
        {p.status === 'REFUND_REQUIRED' && <p className="notice notice-error">Cần xử lý hoàn tiền với cổng thanh toán và kiểm tra chứng từ. Chức năng này chưa thực hiện hoàn tiền tự động.</p>}
        {p.canReconcile && <button className="btn btn-outline btn-small" disabled={busy} onClick={() => { setSelected(p); setFailure(''); }}>Đối soát với cổng thanh toán</button>}
      </article>)}</div>}
      <AdminPager data={data} busy={busy} onPage={p => setParams({ status, page: String(p) })} />
    </>}
    {selected && <Modal title="Đối soát giao dịch" onClose={() => { if (!busy) setSelected(null); }}>
      <p className="break-word"><strong>Mã giao dịch:</strong> {selected.orderId}</p>
      <p>Kiểm tra kết quả tại cổng cho đơn <strong>{selected.bookingCode}</strong> ({money(selected.amount)}). Thao tác không tạo thanh toán mới.</p>
      {failure && (
        <div style={{ margin: '12px 0' }}>
          <p role="alert" className="notice notice-error">{failure}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted, #666)', marginTop: '6px' }}>
            Nếu cổng thanh toán không phản hồi (502 Bad Gateway) hoặc đây là giao dịch kiểm thử/sao kê chuyển khoản trực tiếp, bạn có thể chọn xác nhận trạng thái trực tiếp bằng các nút bên dưới:
          </p>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
        <button className="btn" disabled={busy} onClick={reconcile}>
          {busy ? 'Đang kiểm tra cổng thanh toán…' : 'Kiểm tra tự động với cổng thanh toán'}
        </button>
        <div style={{ borderTop: '1px solid var(--line, #e2e8f0)', paddingTop: '12px', marginTop: '6px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--forest, #1d4034)', marginBottom: '8px' }}>
            Đối soát thủ công / Xác nhận trực tiếp (Admin):
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-lime btn-small"
              disabled={busy}
              onClick={() => handleManualResolve('SUCCESS')}
              title="Xác nhận giao dịch thành công và cập nhật đơn đặt sang CONFIRMED"
            >
              ✓ Xác nhận thành công (SUCCESS)
            </button>
            <button
              type="button"
              className="btn btn-danger btn-small"
              disabled={busy}
              onClick={() => handleManualResolve('FAILED')}
              title="Đánh dấu giao dịch thất bại"
            >
              ✕ Đánh dấu thất bại (FAILED)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={busy}
              onClick={() => handleManualResolve('EXPIRED')}
              title="Đánh dấu giao dịch hết hạn thanh toán"
            >
              ⏰ Đánh dấu hết hạn (EXPIRED)
            </button>
          </div>
        </div>
      </div>
    </Modal>}
  </>;
}
