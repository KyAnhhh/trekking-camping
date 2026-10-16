import { useCallback, useState } from 'react';
import { guideWorkspaceService } from '../../api/guideWorkspaceService';
import useResource from '../../hooks/useResource';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import { errorMessage } from '../../utils/tour';
import '../../styles/workspace.css';
import GuideInvitationPanel from './GuideInvitationPanel';
export default function GuideAccountLink({ guide, onClose }) {
  const load = useCallback(async () => (await guideWorkspaceService.account(guide.id)).data.data, [guide.id]);
  const { data, loading, error, reload } = useResource(load);
  const [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [confirmed, setConfirmed] = useState(false);
  async function save(event) {
    event.preventDefault(); if (busy || !confirmed) return; setBusy(true); setFailure('');
    try { await guideWorkspaceService.link(guide.id, data?.userId ? null : email.trim()); setConfirmed(false); setEmail(''); reload(); }
    catch (e) { setFailure(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Modal title={'Tài khoản · ' + guide.fullName} onClose={() => { if (!busy) onClose(); }}>
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được liên kết" description={error} onRetry={reload} /> : <form className="guide-account-form" onSubmit={save}>
      {data?.userId ? <p>Đang liên kết: <strong className="break-word">{data.email}</strong></p> : <label>Email tài khoản đã đăng ký<input type="email" required maxLength="254" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>}
      <p className="notice">{data?.userId ? 'Gỡ liên kết sẽ thu hồi quyền hướng dẫn viên và đăng xuất các phiên hiện có của tài khoản này.' : 'Liên kết sẽ cấp quyền hướng dẫn viên. Người dùng cần đăng nhập lại để thấy lịch được phân công. Email hồ sơ liên hệ không tự tạo tài khoản đăng nhập.'}</p>
      <label className="checkbox-field"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} />Tôi xác nhận thay đổi quyền truy cập của tài khoản này.</label>
      {failure && <p role="alert" className="notice notice-error">{failure}</p>}
      <button className="btn" disabled={busy || !confirmed}>{busy ? 'Đang lưu…' : data?.userId ? 'Gỡ liên kết tài khoản' : 'Liên kết tài khoản'}</button>
    </form>}
    {!loading && !error && !data?.userId && <GuideInvitationPanel guideId={guide.id} disabled={busy} onBusyChange={setBusy} />}
  </Modal>;
}
