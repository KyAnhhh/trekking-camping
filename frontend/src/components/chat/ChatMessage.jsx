import ReactMarkdown from 'react-markdown';
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
  return (
    <div className={'chat-message ' + (message.sender === 'user' ? 'from-user' : 'from-ai')}>
      {message.sender !== 'user' && (
        <span className="chat-avatar">
          <Compass size={19} />
        </span>
      )}
      <div className="chat-bubble">
        {message.sender === 'user' ? (
          <p>{message.text}</p>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ChatLink }}>
            {message.text}
          </ReactMarkdown>
        )}
        {message.notices?.map((notice, i) => <p className="notice" key={i}>{notice}</p>)}
        {!!message.sources?.length && <details><summary>Nguồn đã truy xuất</summary>
          <ul>{message.sources.map((s) => <li key={s.id}>[{s.id}] {s.label} · {s.updatedAt}</li>)}</ul>
        </details>}
        {message.tours?.map((tour) => <ChatBookingCard key={tour.scheduleId} tour={tour}
          suggestedPeople={message.proposal?.scheduleId === tour.scheduleId ? message.proposal.people : 1} />)}
      </div>
    </div>
  );
}
