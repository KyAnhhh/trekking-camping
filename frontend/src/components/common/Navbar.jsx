import { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Mountain, Menu, X, UserRound, ChevronDown } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import AccountMenu from "./AccountMenu";
import HeaderNavigation from "./HeaderNavigation";
import NotificationBell from "./NotificationBell";

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
  const [open, setOpen] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const marker = useRef(null);
  const header = useRef(null);
  const accountTrigger = useRef(null);
  const navigationTrigger = useRef(null);
  const loginLink = useRef(null);
  const location = useLocation();
  const identity = user ? `${user.username || user.email}:${user.role}` : null;
  useEffect(() => setOpen(null), [location.key, identity]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(marker.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = open === "account" ? accountTrigger : navigationTrigger;
    const panel = header.current?.querySelector(
      open === "account" ? "#account-navigation" : "#main-navigation",
    );
    panel?.querySelector("a, button")?.focus();
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(null);
      trigger.current?.focus();
    };
    const onOutside = (event) => {
      if (!header.current?.contains(event.target)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1200px)");
    const close = () => setOpen(null);
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 1200px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const close = () => setOpen(null);
  const toggle = (name) => setOpen((current) => current === name ? null : name);
  const handleLogout = async () => {
    await logout();
    // On failure the account remains present and the error stays in the dropdown.
    requestAnimationFrame(() => loginLink.current?.focus());
  };
  return (
    <>
      <span ref={marker} className="header-scroll-marker" aria-hidden="true" />
      {open && <div className="header-backdrop" aria-hidden="true" onClick={close} />}
      <header className={`site-header${open ? " has-open-menu" : ""}${scrolled ? " is-scrolled" : ""}`} ref={header}>
        <div className="container header-shell">
          <div onClick={close}><Brand /></div>
          <HeaderNavigation open={open === "navigation"} onNavigate={close} />
          <div className="header-actions">
            <NotificationBell />
            {user ? (
              <div className="header-account">
                <button
                  ref={accountTrigger}
                  type="button"
                  className="header-account-trigger"
                  aria-label={open === "account" ? "Đóng menu tài khoản" : "Mở menu tài khoản"}
                  aria-controls="account-navigation"
                  aria-expanded={open === "account"}
                  onClick={() => toggle("account")}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setOpen("account");
                    }
                  }}
                >
                  <UserRound size={21} aria-hidden="true" />
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {open === "account" && <AccountMenu user={user} onNavigate={close}
                  onLogout={handleLogout} loggingOut={loggingOut} logoutError={logoutError} />}
              </div>
            ) : (
              <Link ref={loginLink} className="header-login" to="/login" onClick={close}
                state={location.pathname === "/login" ? location.state : { from: location.pathname + location.search }}
                aria-label="Đăng nhập">
                <UserRound size={21} aria-hidden="true" /><span>Đăng nhập</span>
              </Link>
            )}
            <button ref={navigationTrigger} type="button" className="header-menu-trigger"
              aria-label={open === "navigation" ? "Đóng menu" : "Mở menu"}
              aria-controls="main-navigation" aria-expanded={open === "navigation"}
              onClick={() => toggle("navigation")}>
              {open === "navigation" ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
