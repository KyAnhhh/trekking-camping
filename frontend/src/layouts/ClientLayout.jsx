import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ChatWidget from '../components/chat/ChatWidget';
export default function ClientLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return (
    <div className="client-site">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <Navbar />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
      {pathname !== '/chat' && <ChatWidget />}
    </div>
  );
}
