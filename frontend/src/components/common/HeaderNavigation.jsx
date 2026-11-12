import { NavLink } from "react-router-dom";
import { Compass } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function HeaderNavigation({ open, onNavigate }) {
  const { t } = useLanguage();

  return (
    <nav
      id="main-navigation"
      className={`header-navigation${open ? " is-open" : ""}`}
      aria-label="Điều hướng chính"
      onClick={(event) => {
        if (event.target.closest("a")) onNavigate();
      }}
    >
      <NavLink to="/tours">{t("nav.tours")}</NavLink>
      <NavLink to="/departures">{t("nav.departures")}</NavLink>
      <NavLink to="/destinations">{t("nav.destinations")}</NavLink>
      <NavLink to="/handbook">{t("nav.handbook")}</NavLink>
      <NavLink to="/about">{t("nav.about")}</NavLink>
      <NavLink to="/chat" className="header-ai-link">
        <Compass size={18} aria-hidden="true" />
        {t("nav.ask_ai")}
      </NavLink>
    </nav>
  );
}
