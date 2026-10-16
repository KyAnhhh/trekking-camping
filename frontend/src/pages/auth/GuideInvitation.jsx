import { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { guideInvitationService } from '../../api/guideInvitationService';
import { AuthContext } from '../../context/AuthContext';
import AuthShell from '../../components/common/AuthShell';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import useResource from '../../hooks/useResource';
import { errorMessage } from '../../utils/tour';

export default function GuideInvitation() {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [linkVersion, setLinkVersion] = useState(0);
  const load = useCallback(async () => token ? (await guideInvitationService.preview(token)).data.data : null, [token, linkVersion]);
  const { data, loading, error, reload } = useResource(load);
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [done, setDone] = useState(false);
  const { clearSession } = useContext(AuthContext);
  useEffect(() => {
    const clearFragment = () => window.history.replaceState(window.history.state, '', window.location.pathname);
    const receiveLink = () => {
      const next = new URLSearchParams(window.location.hash.slice(1)).get('token');
      if (!next) return;
      setToken(next); setLinkVersion(value => value + 1); setDone(false); setFailure(''); setPassword(''); setConfirm(''); clearFragment();
    };
    clearFragment(); window.addEventListener('hashchange', receiveLink);
    return () => window.removeEventListener('hashchange', receiveLink);
  }, []);
  async function accept(event) {
    event.preventDefault(); if (busy) return;
    if (password !== confirm) { setFailure('Hai mật khẩu chưa trùng khớp.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setFailure('Mật khẩu tối đa 72 byte.'); return; }
    setBusy(true); setFailure('');
    try { await guideInvitationService.accept(token, password); setPassword(''); setConfirm(''); clearSession(); setDone(true); }
    catch (e) { setFailure(errorMessage(e)); } finally { setBusy(false); }
  }
  return <AuthShell>
    <p className="eyebrow">GIA NHẬP ĐỘI NGŨ DẪN ĐOÀN</p><h1>{done ? 'Tài khoản đã sẵn sàng.' : 'Chào mừng người dẫn đường.'}</h1>
    {done ? <><p className="notice notice-success" role="status">Đã tạo tài khoản và liên kết hồ sơ hướng dẫn viên. Đăng nhập để xem lịch được phân công.</p><Link className="btn" to="/login">Đăng nhập</Link></> : loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa mở được lời mời" description={error} onRetry={reload} /> : !data ? <p className="notice">Mở liên kết trong email lời mời. Nếu liên kết đã hết hạn, hãy nhờ admin gửi lại.</p> : <>
      <p><strong>{data.guideName}</strong><br /><span className="break-word">{data.email}</span></p>
      <p className="muted">Tạo mật khẩu riêng từ 8 ký tự. Lời mời hết hạn lúc {new Date(data.expiresAt).toLocaleString('vi-VN')}.</p>
      <form className="form-stack" onSubmit={accept}>
        <label className="field">Mật khẩu mới<input name="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
        <label className="field">Nhập lại mật khẩu<input name="confirm" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} /></label>
        {failure && <p className="notice notice-error" role="alert">{failure}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Đang tạo tài khoản…' : 'Chấp nhận lời mời'}</button>
      </form>
    </>}
  </AuthShell>;
}
