import ReactMarkdown from 'react-markdown';
import { useId, useState } from 'react';
import remarkGfm from 'remark-gfm';
import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import ChatBookingCard from './ChatBookingCard';
import './chat-booking.css';
function ChatLink({ href = '', children }) {
  if (href.startsWith('/') && !href.startsWith('//')) return <Link to={href}>{children}</Link>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
export default function ChatMessage({ message }) {
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
    if (id && sources.some(s => s.id === id)) return <button type="button" className="chat-citation" aria-controls={panelId} aria-expanded={selected === id} onClick={() => setSelected(selected === id ? null : id)}>{props.children}</button>;
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
        {message.modelId && <small className="muted">{message.modelId}</small>}
        {message.sender === 'user' ? (
          <p>{message.text}</p>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm, citations]} components={{ a: sourceLink }}>
            {message.text}
          </ReactMarkdown>
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
        {!!message.tours?.length && <p className="muted">Thẻ tour từ dữ liệu hệ thống. Giá/chỗ cần kiểm tra lại khi đặt.</p>}
        {message.tours?.map((tour) => <ChatBookingCard key={tour.scheduleId} tour={tour}
          suggestedPeople={message.proposal?.scheduleId === tour.scheduleId ? message.proposal.people : 1} />)}
      </div>
    </div>
  );
}
