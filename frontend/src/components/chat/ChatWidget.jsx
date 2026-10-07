import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, X, Maximize2 } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
const ChatPanel = lazy(() => import('./ChatPanel'));
export default function ChatWidget() {
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
  return (
    <div className="chat-widget">
      {open && (
        <section
          id="chat-popup"
          className="chat-popup"
          role="dialog"
          aria-label="Trợ lý hành trình"
        >
          <header>
            <span>
              <Compass size={21} />
              Trợ lý hành trình
            </span>
            <div>
              <Link className="icon-btn" to="/chat" aria-label="Mở trang trò chuyện">
                <Maximize2 size={17} />
              </Link>
              <button className="icon-btn" onClick={close} aria-label="Đóng cửa sổ chat">
                <X size={19} />
              </button>
            </div>
          </header>
          <Suspense fallback={<LoadingSpinner label="Đang mở trợ lý..." />}>
            <ChatPanel compact />
          </Suspense>
        </section>
      )}
      <button
        ref={trigger}
        className="chat-trigger"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? 'Đóng trò chuyện' : 'Hỏi trợ lý'}
        aria-expanded={open}
        aria-controls="chat-popup"
      >
        {open ? <X size={23} /> : <Compass size={23} />}
        <span>{open ? 'Đóng trò chuyện' : 'Hỏi trợ lý'}</span>
      </button>
    </div>
  );
}
