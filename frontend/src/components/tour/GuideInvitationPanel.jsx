import { useCallback, useState } from 'react';
import { guideInvitationService } from '../../api/guideInvitationService';
import useResource from '../../hooks/useResource';
import { errorMessage } from '../../utils/tour';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

const labels = { NONE: 'Chưa gửi lời mời', PENDING: 'Đang chờ chấp nhận', EXPIRED: 'Đã hết hạn', REVOKED: 'Đã thu hồi', ACCEPTED: 'Đã chấp nhận' };
export default function GuideInvitationPanel({ guideId, disabled, onBusyChange }) {
  const loader = useCallback(async () => (await guideInvitationService.status(guideId)).data.data, [guideId]);
  const { data, loading, error, reload } = useResource(loader);
  const [email, setEmail] = useState(''), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [failure, setFailure] = useState('');
  async function act(revoke = false) {
    if (disabled || busy || !revoke && !confirmed) return;
    setBusy(true); onBusyChange(true); setFailure(''); setNotice('');
    try {
      if (revoke) await guideInvitationService.revoke(guideId);
      else await guideInvitationService.send(guideId, email.trim());
      setNotice(revoke ? 'Đã thu hồi liên kết lời mời.' : 'Đã gửi lời mời qua email. Người nhận có 24 giờ để đặt mật khẩu.');
      setConfirmed(false); reload();
    } catch (e) { setFailure(errorMessage(e)); }
    finally { setBusy(false); onBusyChange(false); }
  }
  return <section className="guide-invitation-panel">
    <h3>Chưa có tài khoản? Gửi lời mời</h3>
    <p className="small muted">Người nhận tự đặt mật khẩu. Gửi lại sẽ vô hiệu liên kết cũ; tối đa 5 lần/giờ, cách nhau ít nhất 60 giây.</p>
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được lời mời" description={error} onRetry={reload} /> : <>
      <p><span className="status-badge">{labels[data?.status] || data?.status}</span></p>
      {data?.email && <p className="break-word">Gửi đến: {data.email}{data.expiresAt && <><br />Hạn dùng: {new Date(data.expiresAt).toLocaleString('vi-VN')}</>}</p>}
      <form className="form-stack" onSubmit={e => { e.preventDefault(); act(); }}>
        <label className="field">Email nhận lời mời<input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={disabled || busy} /></label>
        <label className="checkbox-field"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={disabled || busy} />Tôi xác nhận email này thuộc hướng dẫn viên của hồ sơ.</label>
        <button className="btn btn-outline" disabled={disabled || busy || !confirmed}>{busy ? 'Đang xử lý…' : 'Gửi lời mời qua email'}</button>
      </form>
      {data?.status === 'PENDING' && <button className="text-btn" disabled={disabled || busy} onClick={() => act(true)}>Thu hồi lời mời hiện tại</button>}
    </>}
    {notice && <p className="notice notice-success" role="status">{notice}</p>}
    {failure && <p className="notice notice-error" role="alert">{failure}</p>}
  </section>;
}
