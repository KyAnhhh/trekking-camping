import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Camera, ChevronDown, Compass, Sparkles } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function HeaderNavigation({ open, onNavigate }) {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const location = useLocation();

  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const aiRef = useRef(null);
  const timeoutRef = useRef(null);

  const isAiActive =
    location.pathname === "/chat" ||
    location.pathname === "/gear-check" ||
    location.pathname === "/gear-vision";

  // Close dropdown on route change
  useEffect(() => {
    setAiMenuOpen(false);
  }, [location.pathname]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!aiMenuOpen) return;
    const handleOutsideClick = (event) => {
      if (aiRef.current && !aiRef.current.contains(event.target)) {
        setAiMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAiMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [aiMenuOpen]);

  const handleMouseEnter = () => {
    if (window.matchMedia("(max-width: 1200px)").matches) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAiMenuOpen(true);
  };

  const handleMouseLeave = () => {
    if (window.matchMedia("(max-width: 1200px)").matches) return;
    timeoutRef.current = setTimeout(() => {
      setAiMenuOpen(false);
    }, 150);
  };

  const toggleAiMenu = () => {
    setAiMenuOpen((prev) => !prev);
  };

  return (
    <nav
      id="main-navigation"
      className={`header-navigation${open ? " is-open" : ""}`}
      aria-label="Điều hướng chính"
      onClick={(event) => {
        if (event.target.closest("a:not(.header-ai-dropdown-trigger)")) {
          setAiMenuOpen(false);
          onNavigate?.();
        }
      }}
    >
      <NavLink to="/tours">{t("nav.tours")}</NavLink>
      <NavLink to="/departures">{t("nav.departures")}</NavLink>
      <NavLink to="/destinations">{t("nav.destinations")}</NavLink>
      <NavLink to="/handbook">{t("nav.handbook")}</NavLink>
      <NavLink to="/about">{t("nav.about")}</NavLink>

      {/* Cụm Trợ lý AI Thông Minh (AI Hub Dropdown) */}
      <div
        className={`header-ai-dropdown ${aiMenuOpen ? "is-open" : ""} ${isAiActive ? "is-active" : ""}`}
        ref={aiRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          className={`header-ai-btn ${isAiActive ? "active" : ""}`}
          onClick={toggleAiMenu}
          aria-expanded={aiMenuOpen}
          aria-haspopup="true"
          title={isEn ? "Trek & Camp AI Suite" : "Bộ công cụ Trợ lý AI"}
        >
          <Sparkles size={16} className="ai-btn-sparkle" aria-hidden="true" />
          <span>{isEn ? "AI Assistant" : "Trợ lý AI"}</span>
          <ChevronDown
            size={14}
            className={`ai-btn-arrow ${aiMenuOpen ? "is-rotated" : ""}`}
            aria-hidden="true"
          />
        </button>

        <div className="header-ai-menu" role="menu">
          <div className="header-ai-menu-inner">
            <NavLink
              to="/chat"
              className="ai-menu-item"
              role="menuitem"
              onClick={() => {
                setAiMenuOpen(false);
                onNavigate?.();
              }}
            >
              <div className="ai-menu-icon chat-icon">
                <Compass size={18} aria-hidden="true" />
              </div>
              <div className="ai-menu-text">
                <div className="ai-menu-title-row">
                  <strong>{isEn ? "Trip Planner & Chat" : "Tư vấn hành trình"}</strong>
                  <span className="ai-badge-gemini">Gemini</span>
                </div>
                <p className="ai-menu-desc">
                  {isEn
                    ? "Interactive trip planning, weather & tour advice"
                    : "Hỏi đáp lịch trình, thời tiết & tư vấn tour"}
                </p>
              </div>
            </NavLink>

            <NavLink
              to="/gear-check"
              className="ai-menu-item"
              role="menuitem"
              onClick={() => {
                setAiMenuOpen(false);
                onNavigate?.();
              }}
            >
              <div className="ai-menu-icon vision-icon">
                <Camera size={18} aria-hidden="true" />
              </div>
              <div className="ai-menu-text">
                <div className="ai-menu-title-row">
                  <strong>{isEn ? "Gear Vision Check" : "Soát đồ qua ảnh"}</strong>
                  <span className="ai-badge-yolo">YOLO26</span>
                </div>
                <p className="ai-menu-desc">
                  {isEn
                    ? "Detects 8 trekking items with zero tokens"
                    : "Nhận diện 8 loại trang bị & chấm điểm an toàn"}
                </p>
              </div>
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
