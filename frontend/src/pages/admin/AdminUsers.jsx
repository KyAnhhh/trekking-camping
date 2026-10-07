import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { adminService } from '../../api/adminService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
const loadUsers = async () => (await adminService.getUsers()).data.data;
export default function AdminUsers() {
  const { data, loading, error, reload } = useResource(loadUsers);
  const [query, setQuery] = useState('');
  const users = (data || []).filter((user) =>
    ((user.fullName || '') + ' ' + user.email).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">TÀI KHOẢN</p>
          <h1>Người dùng</h1>
          <p className="muted">Tra cứu thông tin liên hệ và vai trò tài khoản.</p>
        </div>
        <Users size={32} strokeWidth={1.3} />
      </header>
      <label className="search-field standalone-search">
        <Search size={18} />
        <span className="sr-only">Tìm người dùng</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc email..."
        />
      </label>
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState error title="Chưa tải được người dùng" description={error} onRetry={reload} />
      ) : !users.length ? (
        <EmptyState title="Không có tài khoản phù hợp" />
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Danh sách người dùng</caption>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Điện thoại</th>
                <th>Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.fullName || 'Chưa cập nhật'}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>
                    <span className="status-badge">
                      {['ROLE_ADMIN', 'ADMIN'].includes(user.role)
                        ? 'Quản trị viên'
                        : user.role === 'ROLE_USER' || user.role === 'USER'
                          ? 'Khách hàng'
                          : user.role || 'Chưa cập nhật'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
