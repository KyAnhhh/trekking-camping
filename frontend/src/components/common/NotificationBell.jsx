import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { notificationService } from '../../api/notificationService';
import '../../styles/workspace.css';
export default function NotificationBell() {
  const { user } = useContext(AuthContext);
  const [state, setState] = useState({ count: 0, error: false });
  const identity = user?.token;
  useEffect(() => {
    setState({ count: 0, error: false });
    if (!identity) return;
    let active = true, pending = false;
    const controller = new AbortController();
    const update = async () => {
      if (document.hidden || pending) return;
      pending = true;
      try { const response = await notificationService.count(controller.signal); if (active) setState({ count: Number(response.data.data) || 0, error: false }); }
      catch { if (active) setState(old => ({ ...old, error: true })); }
      finally { pending = false; }
    };
    update();
    const timer = setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('notifications:changed', update);
    return () => { active = false; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', update); window.removeEventListener('notifications:changed', update); };
  }, [identity]);
  if (!user) return null;
  return <Link className="notification-bell icon-btn" to={["ROLE_ADMIN", "ADMIN"].includes(user.role) ? '/admin/notifications' : '/notifications'} title={state.error ? 'Chưa cập nhật được thông báo' : 'Thông báo'}
    aria-label={state.error ? 'Thông báo, chưa cập nhật được số chưa đọc' : `Thông báo, ${state.count} chưa đọc`}>
    <Bell size={20} aria-hidden="true" />
    {(state.count > 0 || state.error) && <span className="notification-badge" aria-hidden="true">{state.error ? '!' : state.count > 99 ? '99+' : state.count}</span>}
  </Link>;
}
