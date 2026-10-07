import { useContext, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Mountain, Menu, X, ArrowUpRight, LogOut } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";

export function Brand({ admin = false }) {
  return (
    <Link
      className="brand"
      to={admin ? "/admin" : "/"}
      aria-label="Trek & Camp - Trang chủ"
    >
      <span className="brand-icon">
        <Mountain size={25} strokeWidth={1.6} />
      </span>
      <span>
        TREK<span className="brand-and">&</span>CAMP
        <small>{admin ? "KHÔNG GIAN QUẢN TRỊ" : "BƯỚC RA THIÊN NHIÊN"}</small>
      </span>
    </Link>
  );
}
export default function Navbar() {
  const { user, logout, loggingOut, logoutError } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  return (
    <header className="site-header">
      <div className="container nav-shell">
        <Brand />
        <button
          className="icon-btn mobile-toggle"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-controls="main-navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-navigation"
          className={"main-nav" + (open ? " is-open" : "")}
          aria-label="Điều hướng chính"
        >
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          <NavLink to="/tours">Khám phá tour</NavLink>
          <NavLink to="/chat">Trợ lý hành trình</NavLink>
          {user && <NavLink to="/my-bookings">Chuyến đi của tôi</NavLink>}
          <div className="nav-account">
            {user ? (
              <>
                {["ROLE_ADMIN", "ADMIN"].includes(user.role) && (
                  <Link className="btn btn-small btn-outline" to="/admin">
                    Quản trị <ArrowUpRight size={15} />
                  </Link>
                )}
                <span
                  className="user-label"
                  title={user.fullName || user.email}
                >
                  {user.fullName || user.email}
                </span>
                <button
                  className="btn btn-small btn-outline"
                  onClick={logout}
                  disabled={loggingOut}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut size={18} />{" "}
                  {loggingOut ? "Đang thoát..." : "Đăng xuất"}
                </button>
                {logoutError && (
                  <span role="alert" className="small danger-text">
                    {logoutError}
                  </span>
                )}
              </>
            ) : (
              <Link className="btn btn-small" to="/login">
                Đăng nhập <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
