import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, X, Maximize2 } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

const ChatPanel = lazy(() => import('./ChatPanel'));

export default function ChatWidget() {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const focusInput = () => document.getElementById('widget-message')?.focus();
    focusInput();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const popupTitle = language === 'en' ? 'Trail Assistant' : 'Trợ lý hành trình';
  const openLabel = language === 'en' ? 'Ask AI' : 'Hỏi trợ lý';
  const closeLabel = language === 'en' ? 'Close Chat' : 'Đóng trò chuyện';

  return (
    <div className="chat-widget">
      {open && (
        <section
          id="chat-popup"
          className="chat-popup"
          role="dialog"
          aria-label={popupTitle}
        >
          <header>
            <span>
              <Compass size={21} />
              {popupTitle}
            </span>
            <div>
              <Link
                className="icon-btn"
                to="/chat"
                aria-label={language === 'en' ? 'Open full chat' : 'Mở trang trò chuyện'}
              >
                <Maximize2 size={17} />
              </Link>
              <button
                className="icon-btn"
                onClick={close}
                aria-label={language === 'en' ? 'Close chat window' : 'Đóng cửa sổ chat'}
              >
                <X size={19} />
              </button>
            </div>
          </header>
          <Suspense fallback={<LoadingSpinner label={language === 'en' ? 'Opening assistant...' : 'Đang mở trợ lý...'} />}>
            <ChatPanel compact />
          </Suspense>
        </section>
      )}
      <button
        ref={trigger}
        className="chat-trigger"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? closeLabel : openLabel}
        aria-expanded={open}
        aria-controls="chat-popup"
      >
        {open ? <X size={23} /> : <Compass size={23} />}
        <span>{open ? closeLabel : openLabel}</span>
      </button>
    </div>
  );
}
