import { useEffect, useRef } from 'react';
import { ArrowUp, Compass } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import ModelSelector from './ModelSelector';
export default function ChatPanel({ compact = false, initialQuestion = '' }) {
  const { messages, loading, sendMessage, models, selection, error, retry, retryMessage, stop, draft: input, setDraft: setInput } = useChat();
  const list = useRef(null);
  useEffect(() => {
    if (initialQuestion) setInput(initialQuestion);
  }, [initialQuestion]);
  useEffect(() => {
    if (compact) document.getElementById('widget-message')?.focus();
  }, [compact]);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, loading]);
  async function submit(event) {
    event.preventDefault();
    if (!input.trim() || loading || !models.some(m => m.id === selection.modelId)) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  }
  return (
    <div className={'chat-panel' + (compact ? ' compact' : '')}>
      <button className="btn btn-small btn-outline" disabled={loading} onClick={() => window.dispatchEvent(new Event('chat:reset'))}>Cuộc trò chuyện mới</button>
      {error && <div className="notice" role="alert">{error}{retry && <button type="button" disabled={loading} onClick={retryMessage}>Thử lại</button>}</div>}
      {loading && <button type="button" className="btn btn-small btn-outline" onClick={stop}>Dừng chờ</button>}
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
        <ModelSelector />
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
          disabled={loading || !input.trim() || !models.some(m => m.id === selection.modelId)}
          aria-label="Gửi câu hỏi"
        >
          <ArrowUp size={20} />
        </button>
      </form>
      {!compact && (
        <p className="chat-disclaimer">
          Thông tin từ AI có thể chưa chính xác. Hãy xác nhận lịch khởi hành và yêu cầu an toàn
          trước khi đặt tour. Không nhập bệnh sử hoặc thông tin liên hệ riêng tư vào chat.
        </p>
      )}
    </div>
  );
}
