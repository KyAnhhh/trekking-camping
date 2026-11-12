import { Link } from "react-router-dom";
import { UserRound, CalendarDays, ShieldCheck, LogOut, Bell, Compass } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function AccountMenu({ user, onNavigate, onLogout, loggingOut, logoutError }) {
  const { t } = useLanguage();
  const name = user.fullName || user.username || user.email || t("nav.account_menu");

  return (
    <section className="account-dropdown" id="account-navigation" aria-label={t("nav.account_menu")}>
      <div className="account-dropdown-identity">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={name}
            className="account-menu-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="account-menu-avatar-fallback">
            <UserRound size={22} aria-hidden="true" />
          </div>
        )}
        <div className="account-dropdown-info">
          <strong>{name}</strong>
          {user.email && user.email !== name && <span>{user.email}</span>}
        </div>
      </div>
      <nav aria-label="Điều hướng tài khoản" onClick={(event) => {
        if (event.target.closest("a")) onNavigate();
      }}>
        <Link to="/favorites"><Compass size={18} aria-hidden="true" />{t("nav.favorites")}</Link>
        <Link to="/profile"><UserRound size={18} aria-hidden="true" />{t("nav.profile")}</Link>
        <Link to="/my-bookings"><CalendarDays size={18} aria-hidden="true" />{t("nav.my_bookings")}</Link>
        <Link to={["ROLE_ADMIN", "ADMIN"].includes(user.role) ? "/admin/notifications" : "/notifications"}>
          <Bell size={18} aria-hidden="true" />{t("nav.notifications")}
        </Link>
        {["ROLE_GUIDE", "GUIDE"].includes(user.role) && (
          <Link to="/guide-workspace"><Compass size={18} aria-hidden="true" />Lịch dẫn đoàn</Link>
        )}
        {["ROLE_ADMIN", "ADMIN"].includes(user.role) && (
          <Link to="/admin"><ShieldCheck size={18} aria-hidden="true" />{t("nav.admin")}</Link>
        )}
      </nav>
      <div className="account-dropdown-footer">
        <button type="button" onClick={onLogout} disabled={loggingOut}>
          <LogOut size={18} aria-hidden="true" />
          {loggingOut ? t("nav.logging_out") : t("nav.logout")}
        </button>
        {logoutError && <p role="alert">{logoutError}</p>}
      </div>
    </section>
  );
}
