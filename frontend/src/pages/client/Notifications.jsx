import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import NotificationInbox from '../../components/common/NotificationInbox';

export default function Notifications() {
  const { user } = useContext(AuthContext);
  const { search } = useLocation();
  if (['ROLE_ADMIN', 'ADMIN'].includes(user?.role)) {
    return <Navigate to={'/admin/notifications' + search} replace />;
  }
  return <NotificationInbox />;
}
