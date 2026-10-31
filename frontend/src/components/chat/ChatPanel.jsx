import { useEffect, useRef } from 'react';
import { ArrowUp, Compass, Sparkles, Calendar, BookmarkCheck, ArrowRight } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import ModelSelector from './ModelSelector';

const GENERAL_QUICK_PROMPTS = [
  '🌲 Tour cho người mới bắt đầu',
  '⛰️ Săn mây Tà Năng - Phan Dũng',
  '🎒 Cần chuẩn bị những gì khi đi tour?',
  '⛺ Tour cắm trại cuối tuần 2 ngày',
  '💰 Tour chi phí tiết kiệm nhất',
];

const PLANNER_QUICK_PROMPTS = [
  '🏕️ Lịch trình cắm trại Đà Lạt 2N1Đ cuối tuần',
  '⛰️ Lên kế hoạch trekking Tà Năng - Phan Dũng 2 ngày',
  '🌲 Lịch trình Bidoup Núi Bà 3N2Đ thể lực vừa',
  '🌊 Trekking Cực Đông đón bình minh đầu tiên',
  '💰 Gợi ý lịch trình trekking tiết kiệm dưới 2 triệu',
];

export default function ChatPanel({
  compact = false,
  plannerMode = false,
  initialQuestion = '',
  onSaveCurrentPlan = null,
  onSwitchToForm = null,
}) {
  const {
    messages,
    loading,
    sendMessage,
    models,
    selection,
    error,
    retry,
    retryMessage,
    stop,
    draft: input,
    setDraft: setInput,
  } = useChat();

  const list = useRef(null);

  const activePrompts = plannerMode ? PLANNER_QUICK_PROMPTS : GENERAL_QUICK_PROMPTS;

  useEffect(() => {
    if (initialQuestion) setInput(initialQuestion);
  }, [initialQuestion, setInput]);

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

  async function handleQuickPrompt(promptText) {
    if (loading) return;
    const cleanPrompt = promptText.replace(/^[^\w\s\u00C0-\u1EF9]+/i, '').trim();
    setInput('');
    await sendMessage(cleanPrompt);
  }

  const hasItineraryDiscussion = messages.some(
    (m) =>
      m.sender === 'ai' &&
      (m.text?.toLowerCase().includes('lịch trình') ||
        m.text?.toLowerCase().includes('ngày 1') ||
        m.text?.toLowerCase().includes('kế hoạch'))
  );

  return (
    <div className={'chat-panel' + (compact ? ' compact' : '') + (plannerMode ? ' planner-chat-mode' : '')}>
      <div className="chat-panel-top-bar">
        <button
          className="btn btn-small btn-outline"
          disabled={loading}
          onClick={() => window.dispatchEvent(new Event('chat:reset'))}
        >
          Cuộc trò chuyện mới
        </button>
        {plannerMode && (
          <span className="planner-chat-mode-pill">
            <Calendar size={13} />
            Chế độ: Trợ lý Lập lịch trình
          </span>
        )}
      </div>

      {error && (
        <div className="notice" role="alert">
          {error}
          {retry && (
            <button type="button" disabled={loading} onClick={retryMessage}>
              Thử lại
            </button>
          )}
        </div>
      )}

      {loading && (
        <button type="button" className="btn btn-small btn-outline chat-stop-btn" onClick={stop}>
          Dừng chờ
        </button>
      )}

      <div
        className="chat-messages"
        ref={list}
        role="log"
        aria-label="Nội dung hội thoại"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message}
            previousMessage={index > 0 ? messages[index - 1] : null}
          />
        ))}
        {loading && !messages.some((m) => m.streaming) && (
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

      {/* Action shortcuts for planner mode when user has discussed a plan */}
      {plannerMode && hasItineraryDiscussion && (
        <div className="planner-chat-action-bar">
          {onSaveCurrentPlan && (
            <button
              type="button"
              className="btn btn-small btn-primary planner-action-btn"
              onClick={onSaveCurrentPlan}
              disabled={loading}
            >
              <BookmarkCheck size={14} />
              Lưu thành Lịch trình chính thức
            </button>
          )}
          {onSwitchToForm && (
            <button
              type="button"
              className="btn btn-small btn-outline planner-action-btn"
              onClick={onSwitchToForm}
              disabled={loading}
            >
              <span>Điền vào biểu mẫu</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* Quick Prompt Suggestions Pills (inspired by UngDungQuanLyQuanCaFe) */}
      {messages.length <= 2 && (
        <div className="chat-quick-prompts">
          <div className="chat-quick-prompts-label">
            <Sparkles size={13} />
            <span>{plannerMode ? 'Gợi ý yêu cầu lịch trình:' : 'Gợi ý câu hỏi nhanh:'}</span>
          </div>
          <div className="chat-quick-prompts-list">
            {activePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chat-prompt-pill"
                disabled={loading}
                onClick={() => handleQuickPrompt(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
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
          placeholder={
            plannerMode
              ? 'Ví dụ: Lên lịch trình cắm trại Đà Lạt 2N1Đ cho 2 người, ngân sách 3 triệu...'
              : 'Hỏi về tour, kinh nghiệm trekking, trang bị...'
          }
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
          {plannerMode
            ? 'Lịch trình do AI đề xuất dựa trên kinh nghiệm trekking thực tế. Bạn có thể nhấn "Lưu thành Lịch trình" để quản lý trong danh sách cá nhân.'
            : 'Trợ lý AI hỗ trợ tư vấn dựa trên dữ liệu hệ thống. Vui lòng đối chiếu lịch khởi hành và yêu cầu thể lực trước khi tạo đơn.'}
        </p>
      )}
    </div>
  );
}
