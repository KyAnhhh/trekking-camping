import { useContext, useEffect, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Mountain,
  Users,
  BookOpen,
  CalendarDays,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { Brand } from "../components/common/Navbar";
const links = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/admin/tours", label: "Tour & lịch khởi hành", icon: Mountain },
  { to: "/admin/bookings", label: "Đơn đặt tour", icon: CalendarDays },
  { to: "/admin/users", label: "Người dùng", icon: Users },
  { to: "/admin/guides", label: "Hướng dẫn viên", icon: Users },
  { to: "/admin/knowledge", label: "Kho tri thức", icon: BookOpen },
];
export default function AdminLayout() {
  const { user, logout, loggingOut, logoutError } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-content">
        Đến nội dung quản trị
      </a>
      <header className="admin-mobile-bar">
        <Brand admin />
        <button
          className="icon-btn"
          aria-label={open ? "Đóng menu quản trị" : "Mở menu quản trị"}
          aria-expanded={open}
          aria-controls="admin-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <aside
        id="admin-navigation"
        className={"admin-sidebar" + (open ? " is-open" : "")}
      >
        <Brand admin />
        <p className="sidebar-label">KHÔNG GIAN LÀM VIỆC</p>
        <nav aria-label="Quản trị">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink to={to} key={to} end={end}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/">
            <ArrowUpRight size={18} />
            Xem website
          </Link>
          <button onClick={logout} disabled={loggingOut}>
            <LogOut size={18} />
            Đăng xuất
          </button>
          {logoutError && <p role="alert">{logoutError}</p>}
          <p>
            Quản trị viên<strong>{user.fullName || user.username}</strong>
          </p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span>
            Quản trị /{" "}
            {links.find(
              (item) => item.to !== "/admin" && pathname.startsWith(item.to),
            )?.label || "Tổng quan"}
          </span>
          <span className="status-badge">Quyền quản trị</span>
        </header>
        <main id="admin-content" className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
