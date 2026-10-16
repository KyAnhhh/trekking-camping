import { Link } from "react-router-dom";
import { UserRound, CalendarDays, ShieldCheck, LogOut, Bell, Compass } from "lucide-react";

export default function AccountMenu({ user, onNavigate, onLogout, loggingOut, logoutError }) {
  const name = user.fullName || user.username || user.email || "Tài khoản của tôi";
  return (
    <section className="account-dropdown" id="account-navigation" aria-label="Tài khoản">
      <div className="account-dropdown-identity">
        <strong>{name}</strong>
        {user.email && user.email !== name && <span>{user.email}</span>}
      </div>
      <nav aria-label="Điều hướng tài khoản" onClick={(event) => {
        if (event.target.closest("a")) onNavigate();
      }}>
        <Link to="/profile"><UserRound size={18} aria-hidden="true" />Hồ sơ cá nhân</Link>
        <Link to="/my-bookings"><CalendarDays size={18} aria-hidden="true" />Chuyến đi của tôi</Link>
        <Link to={["ROLE_ADMIN", "ADMIN"].includes(user.role) ? "/admin/notifications" : "/notifications"}><Bell size={18} aria-hidden="true" />Thông báo</Link>
        {["ROLE_GUIDE", "GUIDE"].includes(user.role) && <Link to="/guide-workspace"><Compass size={18} aria-hidden="true" />Lịch dẫn đoàn</Link>}
        {["ROLE_ADMIN", "ADMIN"].includes(user.role) && (
          <Link to="/admin"><ShieldCheck size={18} aria-hidden="true" />Quản trị</Link>
        )}
      </nav>
      <div className="account-dropdown-footer">
        <button type="button" onClick={onLogout} disabled={loggingOut}>
          <LogOut size={18} aria-hidden="true" />{loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
        {logoutError && <p role="alert">{logoutError}</p>}
      </div>
    </section>
  );
}
