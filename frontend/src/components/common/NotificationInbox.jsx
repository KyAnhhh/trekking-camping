import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationService } from '../../api/notificationService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import AdminPager from '../../components/common/AdminPager';
import GuideNotificationDetail from './GuideNotificationDetail';
import EmailPreference from './EmailPreference';
import { errorMessage } from '../../utils/tour';
import '../../styles/workspace.css';
export default function NotificationInbox({ admin = false }) {
  const [params, setParams] = useSearchParams(), navigate = useNavigate();
  const page = Math.max(0, Number(params.get('page')) || 0);
  const load = useCallback(async () => (await notificationService.list(page)).data.data, [page]);
  const { data, loading, error, reload } = useResource(load);
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  const [expanded, setExpanded] = useState(null);
  const guideSchedule = item => admin && item.link === '/admin/guide-assignments'
    ? item.body?.match(/#(\d+)/)?.[1] : null;
  async function mark(item) {
    if (busy) return;
    setBusy(true); setFailure('');
    try {
      if (item) { if (!item.readAt) await notificationService.read(item.id); } else await notificationService.readAll();
      window.dispatchEvent(new Event('notifications:changed'));
      if (item && guideSchedule(item)) {
        setExpanded(current => current === item.id ? null : item.id);
        if (!item.readAt) reload();
        return;
      }
      if (item && /^\/(my-bookings\/\d+|admin\/bookings\/\d+|admin\/guide-assignments|admin\/guide-reports|guide-workspace(\/\d+)?|notifications|admin\/notifications)$/.test(item.link)) navigate(item.link);
      else reload();
    } catch (e) { setFailure(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className={admin ? 'admin-notifications' : 'container workspace-page'}>
    <EmailPreference />
    <header className="admin-page-heading"><div><p className="eyebrow">{admin ? 'QUẢN TRỊ / HỘP THƯ' : 'TREK & CAMP / HỘP THƯ'}</p><h1>{admin ? 'Thông báo quản trị' : 'Thông báo của bạn.'}</h1><p>{admin ? 'Theo dõi các cập nhật và đơn đặt tour cần bạn xử lý.' : 'Cập nhật về đơn đặt tour, chuyến đi và lịch phân công.'}</p></div><Bell size={32} aria-hidden="true" /></header>
    <div className="list-toolbar notification-toolbar"><span>{data ? `${data.unread} thông báo chưa đọc` : 'Thông báo cá nhân'}</span><div className="notification-actions"><button className="text-btn" disabled={busy || loading} onClick={reload}>Tải lại</button><button className="btn btn-outline btn-small" disabled={busy || loading || !data?.unread} onClick={() => mark()}><CheckCheck size={17} />Đánh dấu tất cả đã đọc</button></div></div>
    {failure && <p role="alert" className="notice notice-error">{failure}</p>}
    {loading ? <LoadingSpinner /> : error ? <EmptyState error title="Chưa tải được thông báo" description={error} onRetry={reload} /> : <>
      {!data?.items.length ? <EmptyState title="Bạn chưa có thông báo" description="Thông báo mới sẽ xuất hiện khi có cập nhật dành cho tài khoản của bạn." /> : <div className="workspace-list">{data.items.map(item => <article className={'panel notification-item' + (item.readAt ? '' : ' is-unread')} key={item.id}>
        <div><span className="small muted">{item.readAt ? 'Đã đọc' : 'Chưa đọc'} · {new Date(item.createdAt).toLocaleString('vi-VN')}</span><h2>{item.title}</h2><p>{item.body}</p></div>
        <button className="btn btn-outline btn-small" disabled={busy} aria-expanded={guideSchedule(item) ? expanded === item.id : undefined} aria-controls={guideSchedule(item) ? `notification-detail-${item.id}` : undefined} onClick={() => mark(item)}>{expanded === item.id ? 'Thu gọn ↑' : 'Xem chi tiết →'}</button>
        {expanded === item.id && guideSchedule(item) && <div id={`notification-detail-${item.id}`} className="notification-detail-container"><GuideNotificationDetail scheduleId={guideSchedule(item)} /></div>}
      </article>)}</div>}
      <div className="notification-pagination"><AdminPager data={data} busy={busy} onPage={p => { setExpanded(null); setParams({ page: String(p) }); }} /></div>
    </>}
  </div>;
}
