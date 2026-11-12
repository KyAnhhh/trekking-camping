import { Link } from 'react-router-dom';
import { ArrowUpRight, Leaf } from 'lucide-react';
import { Brand } from './Navbar';
import { useLanguage } from '../../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Brand />
            <p>
              {t('footer.slogan_1')}
              <br />
              {t('footer.slogan_2')}
            </p>
          </div>
          <div>
            <h3>{t('footer.col_explore')}</h3>
            <Link to="/tours">
              {t('footer.tours')} <ArrowUpRight size={14} />
            </Link>
            <Link to="/tours?difficulty=1">{t('footer.beginners')}</Link>
            <Link to="/tours?duration=short">{t('footer.short_trips')}</Link>
            <Link to="/destinations">{t('footer.destinations')}</Link>
          </div>
          <div>
            <h3>{t('footer.col_prep')}</h3>
            <Link to="/chat">{t('footer.ask_ai')}</Link>
            <Link to="/planner">{t('footer.planner')}</Link>
            <Link to="/handbook">{t('footer.handbook')}</Link>
          </div>
          <div>
            <h3>{t('footer.col_support')}</h3>
            <Link to="/about">{t('footer.about')}</Link>
            <Link to="/contact">{t('footer.contact')}</Link>
            <Link to="/my-bookings">{t('footer.my_bookings')}</Link>
            <Link to="/register">{t('footer.register')}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Trek & Camp</span>
          <span>
            <Leaf size={15} /> {t('footer.copyright_note')}
          </span>
        </div>
      </div>
    </footer>
  );
}
