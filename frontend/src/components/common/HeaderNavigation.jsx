import { NavLink } from "react-router-dom";
import { Compass } from "lucide-react";

export default function HeaderNavigation({ open, onNavigate }) {
  return (
    <nav id="main-navigation" className={`header-navigation${open ? " is-open" : ""}`}
      aria-label="Điều hướng chính" onClick={(event) => {
        if (event.target.closest("a")) onNavigate();
      }}>
      <NavLink to="/tours">Khám phá tour</NavLink>
      <NavLink to="/destinations">Điểm đến</NavLink>
      <NavLink to="/planner">Lập lịch trình</NavLink>
      <NavLink to="/handbook">Cẩm nang</NavLink>
      <NavLink to="/about">Về chúng tôi</NavLink>
      <NavLink to="/chat" className="header-ai-link">
        <Compass size={18} aria-hidden="true" />Hỏi AI
      </NavLink>
    </nav>
  );
}
