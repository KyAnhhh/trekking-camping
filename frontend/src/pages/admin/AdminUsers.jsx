import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Pencil, LockKeyhole, UnlockKeyhole, Trash2 } from 'lucide-react';
import { adminService } from '../../api/adminService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { errorMessage } from '../../utils/tour';

const loadUsers = async () => (await adminService.getUsers()).data.data;
const isAdmin = (user) => ['ROLE_ADMIN', 'ADMIN'].includes(user.role);
const roleLabel = (role) => ({ ROLE_ADMIN: 'Quản trị viên', ADMIN: 'Quản trị viên', ROLE_USER: 'Khách hàng', USER: 'Khách hàng', ROLE_GUIDE: 'Hướng dẫn viên', GUIDE: 'Hướng dẫn viên' }[role] || role || 'Chưa cập nhật');

function UserAction({ action, onClose, onSaved }) {
  const { user, kind } = action;
  const [fullName, setFullName] = useState(user.fullName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const active = user.active === true;
  const title = kind === 'edit' ? 'Sửa người dùng' : kind === 'delete' ? 'Xóa tài khoản' : active ? 'Khóa tài khoản' : 'Mở khóa tài khoản';
  async function submit(event) {
    event.preventDefault();
    if (busy || stale) return;
    setBusy(true);
    setError('');
    try {
      if (kind === 'edit') await adminService.updateUser(user.id, { fullName: fullName.trim(), phone: phone.trim(), updatedAt: user.updatedAt });
      else if (kind === 'delete') await adminService.deleteUser(user.id, user.updatedAt);
      else await adminService.setUserActive(user.id, { active: !active, updatedAt: user.updatedAt });
      onSaved(kind === 'edit' ? 'Đã cập nhật người dùng.' : kind === 'delete' ? 'Đã xóa tài khoản.' : active ? 'Đã khóa tài khoản và thu hồi các phiên đăng nhập cũ.' : 'Đã mở khóa. Người dùng cần đăng nhập lại.');
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure.response?.status === 409 || failure.response?.status === 404) setStale(true);
    } finally { setBusy(false); }
  }
  return (
    <Modal title={title} onClose={() => { if (!busy) onClose(); }}>
      <form className="form-stack admin-user-form" onSubmit={submit}>
        <p><strong>{user.fullName || user.email}</strong><br />{user.email}</p>
        {kind === 'edit' ? <>
          <label className="field">Họ tên<input required maxLength={150} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy || stale} /></label>
          <label className="field">Số điện thoại<input type="tel" minLength={6} maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={busy || stale} /></label>
          <p className="small muted">Email đăng nhập và vai trò được giữ nguyên. Hồ sơ hướng dẫn viên được quản lý riêng tại mục Hướng dẫn viên.</p>
        </> : <p>{kind === 'delete'
          ? 'Xóa vĩnh viễn tài khoản này? Chỉ tài khoản chưa có dữ liệu liên quan mới được xóa. Nếu đã có booking, lịch sử trò chuyện hoặc hồ sơ hướng dẫn viên, hãy dùng Khóa tài khoản.'
          : active ? 'Người dùng sẽ không thể đăng nhập hoặc dùng phiên đăng nhập cũ. Lịch sử booking và dữ liệu liên quan được giữ nguyên.'
            : 'Người dùng có thể đăng nhập lại bằng mật khẩu hiện tại. Các phiên cũ vẫn hết hiệu lực.'}</p>}
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>{stale ? 'Đóng và tải lại' : 'Hủy'}</button>
          <button type="submit" className={`btn ${kind === 'delete' ? 'btn-danger' : ''}`} disabled={busy || stale}>{busy ? 'Đang xử lý...' : title}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminUsers() {
  const { data, loading, error, reload } = useResource(loadUsers);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState('');
  const users = (data || []).filter((user) =>
    `${user.fullName || ''} ${user.email}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')),
  );
  const open = (user, kind) => { setNotice(''); setAction({ user, kind }); };
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">TÀI KHOẢN</p>
          <h1>Người dùng</h1>
          <p className="muted">Cập nhật liên hệ, khóa tài khoản và quản lý người dùng.</p>
        </div>
        <Users size={32} strokeWidth={1.3} />
      </header>
      <p className="small muted">Tài khoản quản trị được bảo vệ khỏi thao tác khóa và xóa. Để cấp quyền hướng dẫn viên, <Link className="text-link" to="/admin/guides">liên kết tài khoản với hồ sơ hướng dẫn viên</Link>.</p>
      {notice && <p className="notice notice-success" role="status">{notice}</p>}
      <label className="search-field standalone-search">
        <Search size={18} /><span className="sr-only">Tìm người dùng</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc email..." />
      </label>
      {loading ? <LoadingSpinner /> : error ? (
        <EmptyState error title="Chưa tải được người dùng" description={error} onRetry={reload} />
      ) : !users.length ? <EmptyState title="Không có tài khoản phù hợp" /> : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Danh sách người dùng</caption>
            <thead><tr><th>Họ tên</th><th>Email</th><th>Điện thoại</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.fullName || 'Chưa cập nhật'}</strong></td>
                <td>{user.email}</td><td>{user.phone || '—'}</td>
                <td><span className="status-badge">{roleLabel(user.role)}</span></td>
                <td><span className={`status-badge ${user.active ? '' : 'status-cancelled'}`}>{user.active ? 'Hoạt động' : 'Đã khóa'}</span></td>
                <td><div className="admin-user-actions">
                  <button className="btn btn-small btn-outline" onClick={() => open(user, 'edit')} aria-label={`Sửa ${user.email}`}><Pencil size={15} /> Sửa</button>
                  <button className="btn btn-small btn-outline" disabled={isAdmin(user)} title={isAdmin(user) ? 'Bảo vệ tài khoản quản trị' : undefined} onClick={() => open(user, 'active')} aria-label={`${user.active ? 'Khóa' : 'Mở khóa'} ${user.email}`}>{user.active ? <LockKeyhole size={15} /> : <UnlockKeyhole size={15} />}{user.active ? 'Khóa' : 'Mở khóa'}</button>
                  <button className="btn btn-small btn-danger" disabled={isAdmin(user)} title={isAdmin(user) ? 'Bảo vệ tài khoản quản trị' : undefined} onClick={() => open(user, 'delete')} aria-label={`Xóa ${user.email}`}><Trash2 size={15} /> Xóa</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {action && <UserAction key={`${action.user.id}-${action.kind}`} action={action} onClose={() => { setAction(null); reload(); }} onSaved={(message) => { setAction(null); setNotice(message); reload(); }} />}
    </>
  );
}
