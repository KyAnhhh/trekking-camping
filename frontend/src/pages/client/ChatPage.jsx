import { useSearchParams, Link } from 'react-router-dom';
import { Compass, Mountain, Backpack, ArrowUpRight } from 'lucide-react';
import ChatPanel from '../../components/chat/ChatPanel';
export default function ChatPage() {
  const [params] = useSearchParams();
  const tour = params.get('tour');
  return (
    <div className="container chat-page">
      <aside className="chat-intro">
        <span className="feature-icon">
          <Compass size={27} />
        </span>
        <p className="eyebrow">NGƯỜI BẠN TRƯỚC CHUYẾN ĐI</p>
        <h1>
          Cùng tìm
          <br />
          hướng đi.
        </h1>
        <p className="muted">
          Chia sẻ điều bạn mong muốn. Trợ lý giúp bạn tìm hiểu tour và chuẩn bị cho hành trình.
        </p>
        <div className="chat-topics">
          <span>
            <Mountain size={18} />
            Độ khó & lịch trình
          </span>
          <span>
            <Backpack size={18} />
            Trang bị & chuẩn bị
          </span>
        </div>
        <Link className="text-link" to="/tours">
          Tự khám phá các tour <ArrowUpRight size={17} />
        </Link>
      </aside>
      <section className="chat-page-window">
        <header className="chat-page-header">
          <span className="chat-avatar">
            <Compass size={22} />
          </span>
          <div>
            <h2>Trợ lý Trek & Camp</h2>
            <p>Tư vấn trước mỗi hành trình</p>
          </div>
          <span className="ai-label">AI</span>
        </header>
        <ChatPanel
          initialQuestion={
            tour
              ? 'Tư vấn giúp tôi về tour ' + tour + ': độ khó, lịch trình và đồ cần chuẩn bị.'
              : ''
          }
        />
      </section>
    </div>
  );
}
