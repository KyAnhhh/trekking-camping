import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Compass } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
export default function ChatPanel({ compact = false, initialQuestion = '' }) {
  const { messages, loading, sendMessage } = useChat();
  const [input, setInput] = useState(initialQuestion);
  const list = useRef(null);
  useEffect(() => {
    setInput(initialQuestion);
  }, [initialQuestion]);
  useEffect(() => {
    if (compact) document.getElementById('widget-message')?.focus();
  }, [compact]);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, loading]);
  async function submit(event) {
    event.preventDefault();
    if (!input.trim() || loading) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  }
  return (
    <div className={'chat-panel' + (compact ? ' compact' : '')}>
      <div
        className="chat-messages"
        ref={list}
        role="log"
        aria-label="Nội dung hội thoại"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {loading && (
          <div className="chat-message from-ai">
            <span className="chat-avatar">
              <Compass size={19} />
            </span>
            <div className="chat-bubble">
              <span className="typing-dots" aria-label="Trợ lý đang trả lời">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        )}
      </div>
      {messages.length === 1 && (
        <div className="chat-suggestions">
          {[
            'Tôi mới trekking, nên chuẩn bị gì?',
            'Gợi ý chuyến đi 2 ngày',
            'Tôi cần mang theo những đồ gì?',
          ].map((question) => (
            <button key={question} disabled={loading} onClick={() => setInput(question)}>
              {question}
            </button>
          ))}
        </div>
      )}
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor={compact ? 'widget-message' : 'page-message'}>
          Câu hỏi của bạn
        </label>
        <input
          id={compact ? 'widget-message' : 'page-message'}
          maxLength={4000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Kể về chuyến đi bạn mong muốn..."
        />
        <button
          className="icon-btn send-btn"
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Gửi câu hỏi"
        >
          <ArrowUp size={20} />
        </button>
      </form>
      {!compact && (
        <p className="chat-disclaimer">
          Thông tin từ AI có thể chưa chính xác. Hãy xác nhận lịch khởi hành và yêu cầu an toàn
          trước khi đặt tour.
        </p>
      )}
    </div>
  );
}
