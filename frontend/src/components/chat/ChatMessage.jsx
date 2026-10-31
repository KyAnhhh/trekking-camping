import ReactMarkdown from 'react-markdown';
import { useId, useState } from 'react';
import remarkGfm from 'remark-gfm';
import { Compass, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatBookingCard from './ChatBookingCard';
import { mediaUrl, landscape, parsePeopleCount } from '../../utils/tour';
import './chat-booking.css';

function ChatLink({ href = '', children }) {
  if (href.startsWith('/') && !href.startsWith('//')) return <Link to={href}>{children}</Link>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function ChatImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  const finalSrc = failed ? landscape : mediaUrl(src);
  return (
    <figure className="chat-inline-figure">
      <img
        src={finalSrc}
        alt={alt || "Ảnh minh họa tour"}
        loading="lazy"
        className="chat-inline-img"
        onError={() => setFailed(true)}
      />
      {alt && <figcaption className="chat-inline-caption">{alt}</figcaption>}
    </figure>
  );
}

export default function ChatMessage({ message, previousMessage }) {
  const panelId = useId();
  const [selected, setSelected] = useState(null);
  const sources = message.sources || [];

  // Only transform plain text: preserve code, existing links and markdown structure.
  function citations() {
    return tree => {
      function walk(node) {
        if (!node.children || ['link', 'code', 'inlineCode'].includes(node.type)) return;
        node.children = node.children.flatMap(child => {
          if (child.type !== 'text') { walk(child); return [child]; }
          const parts = []; let start = 0;
          for (const match of child.value.matchAll(/\[(S\d+)\]/g)) {
            if (!sources.some(s => s.id === match[1])) continue;
            parts.push({ type: 'text', value: child.value.slice(start, match.index) });
            parts.push({ type: 'link', url: '#source-' + match[1], children: [{ type: 'text', value: match[0] }] });
            start = match.index + match[0].length;
          }
          parts.push({ type: 'text', value: child.value.slice(start) }); return parts;
        });
      }
      walk(tree);
    };
  }

  function sourceLink(props) {
    const id = props.href?.match(/^#source-(S\d+)$/)?.[1];
    if (id && sources.some(s => s.id === id)) {
      return (
        <button
          type="button"
          className="chat-citation"
          aria-controls={panelId}
          aria-expanded={selected === id}
          onClick={() => setSelected(selected === id ? null : id)}
        >
          {props.children}
        </button>
      );
    }
    return <ChatLink {...props} />;
  }

  return (
    <div className={'chat-message ' + (message.sender === 'user' ? 'from-user' : 'from-ai')}>
      {message.sender !== 'user' && (
        <span className="chat-avatar">
          <Compass size={19} />
        </span>
      )}
      <div className="chat-bubble">
        {message.sender === 'user' ? (
          <p className="chat-user-message-text">{message.text}</p>
        ) : (
          <>
            {/* When AI is connecting / thinking and text hasn't arrived yet */}
            {message.streaming && !message.text ? (
              <div className="chat-ai-loading-indicator">
                <span className="chat-ai-spinner">
                  <Compass size={15} className="spin-icon" />
                </span>
                <span className="chat-ai-loading-text">
                  {message.status || 'Trợ lý AI đang soạn câu trả lời...'}
                </span>
                <span className="chat-ai-typing-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : (
              <>
                {message.text && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, citations]}
                    components={{ a: sourceLink, img: ChatImage }}
                  >
                    {message.text}
                  </ReactMarkdown>
                )}
                {message.streaming && (
                  <span className="streaming-cursor" aria-label="Đang gõ">▍</span>
                )}
              </>
            )}
          </>
        )}
        {message.notices?.map((notice, i) => <p className="notice" key={i}>{notice}</p>)}
        {!!sources.length && <section className="chat-sources" id={panelId} aria-label="Nguồn tham khảo">
          <p className="muted">Mã trích dẫn hợp lệ không bảo đảm mọi nhận định được nguồn chứng minh. Nội dung không dẫn nguồn chưa được xác minh.</p>
          {message.historical && <p className="notice">Nguồn được lưu tại thời điểm trả lời, chưa kiểm tra lại tính cập nhật khi tải lịch sử.</p>}
          {[true, false].map(cited => sources.some(s => !!s.cited === cited) && <div key={String(cited)}>
            <strong>{cited ? 'Nguồn AI dẫn trong câu trả lời' : 'Tài liệu truy xuất khác'}</strong>
            {sources.filter(s => !!s.cited === cited).map(s => <div key={s.id}>
              <button type="button" className="chat-source-toggle" aria-expanded={selected === s.id} onClick={() => setSelected(selected === s.id ? null : s.id)}>[{s.id}] {s.label}</button>
              {selected === s.id && <div className="chat-source-excerpt">
                <small>{s.kind === 'TOUR_SNAPSHOT' ? 'Bản chụp thông tin tour' : 'Tài liệu kho tri thức'} · Nạp vào kho: {s.updatedAt || 'Chưa rõ'}</small>
                {s.excerpt ? <blockquote>{s.excerpt}</blockquote> : <p>Đoạn trích chưa được phép công khai.</p>}
              </div>}
            </div>)}
          </div>)}
        </section>}
        {!!message.tours?.length && (
          <div className="chat-tours-container">
            <p className="chat-tours-header">
              <span>Hành trình phù hợp dành cho bạn</span>
            </p>
            <div className="chat-tours-grid">
              {message.tours.map((tour) => {
                const detectedPeople =
                  message.proposal?.people ||
                  parsePeopleCount(message.userPrompt) ||
                  parsePeopleCount(previousMessage?.text) ||
                  parsePeopleCount(message.text) ||
                  1;
                return (
                  <ChatBookingCard
                    key={tour.scheduleId || tour.tourId}
                    tour={tour}
                    suggestedPeople={detectedPeople}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
