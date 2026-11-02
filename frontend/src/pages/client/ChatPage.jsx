import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Compass,
  Mountain,
  Backpack,
  ArrowUpRight,
  PanelLeft,
  PanelLeftClose,
  Scale,
  CloudSun,
  ShieldCheck,
} from 'lucide-react';
import ChatPanel from '../../components/chat/ChatPanel';

export default function ChatPage() {
  const [params] = useSearchParams();
  const tour = params.get('tour');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`chat-page-container ${sidebarOpen ? 'with-sidebar' : 'full-width'}`}>
      {sidebarOpen && (
        <aside className="chat-intro-drawer">
          <div className="chat-intro-header">
            <span className="feature-icon">
              <Compass size={24} />
            </span>
            <button
              type="button"
              className="chat-sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              title="Thu gọn thanh bên"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          <p className="eyebrow">NGƯỜI BẠN TRƯỚC CHUYẾN ĐI</p>
          <h2 style={{ fontSize: '1.4rem', margin: '8px 0 12px', fontWeight: 700 }}>
            Cùng tìm hướng đi.
          </h2>
          <p className="muted" style={{ fontSize: '0.82rem', lineHeight: 1.5, margin: '0 0 16px' }}>
            Trợ lý AI giúp bạn giải đáp độ khó, chuẩn bị hành trang, so sánh tour và cập nhật thời tiết thực địa.
          </p>
          <div className="chat-topics">
            <span>
              <Backpack size={16} />
              Hành trang chuẩn bị & thuê đồ
            </span>
            <span>
              <Scale size={16} />
              So sánh đối chiếu cung đường
            </span>
            <span>
              <Mountain size={16} />
              Lịch trình chi tiết từng ngày
            </span>
            <span>
              <CloudSun size={16} />
              Khí tượng & cảnh báo an toàn
            </span>
          </div>
          <Link className="text-link" to="/tours" style={{ marginTop: 'auto', paddingTop: '16px' }}>
            Tự khám phá các tour <ArrowUpRight size={16} />
          </Link>
        </aside>
      )}

      <section className="chat-page-window">
        <header className="chat-page-header">
          <button
            type="button"
            className="chat-sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Thu gọn thanh bên' : 'Mở thanh thông tin & chủ đề'}
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeft size={17} />}
            <span className="toggle-text">{sidebarOpen ? 'Ẩn thanh bên' : 'Chủ đề & Hướng dẫn'}</span>
          </button>

          <div className="chat-page-header-info">
            <span className="chat-avatar">
              <Compass size={20} />
            </span>
            <div>
              <h2>Trợ lý Trek & Camp</h2>
              <p>Trực tuyến · Tư vấn hành trang, so sánh tour & thời tiết thực địa</p>
            </div>
          </div>

          <div className="chat-page-header-actions">
            <span className="ai-label">
              <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
              AI Assistant
            </span>
          </div>
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
