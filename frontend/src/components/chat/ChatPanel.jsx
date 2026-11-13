import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Camera, Compass, Sparkles, Calendar, BookmarkCheck, ArrowRight, ChevronDown, ChevronUp, X, Lightbulb, MapPin } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import ModelSelector from './ModelSelector';
import GearVisionCheck from './GearVisionCheck';
import Modal from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';

const PROMPTS = {
  vi: {
    general: [
      '🌲 Tour cho người mới bắt đầu',
      '⛰️ Săn mây Tà Năng - Phan Dũng',
      '🎒 Cần chuẩn bị những gì khi đi tour?',
      '⛺ Tour cắm trại cuối tuần 2 ngày',
      '💰 Tour chi phí tiết kiệm nhất',
    ],
    planner: [
      '🏕️ Lịch trình cắm trại Đà Lạt 2N1Đ cuối tuần',
      '⛰️ Lên kế hoạch trekking Tà Năng - Phan Dũng 2 ngày',
      '🌲 Lịch trình Bidoup Núi Bà 3N2Đ thể lực vừa',
      '🌊 Trekking Cực Đông đón bình minh đầu tiên',
      '💰 Gợi ý lịch trình trekking tiết kiệm dưới 2 triệu',
    ],
  },
  en: {
    general: [
      '🌲 Beginner-friendly trekking tours',
      '⛰️ Cloud hunting in Ta Nang - Phan Dung',
      '🎒 Essential gear checklist for hiking',
      '⛺ Weekend 2-day camping getaways',
      '💰 Most budget-friendly expeditions',
    ],
    planner: [
      '🏕️ Da Lat 2D1N weekend camping plan',
      '⛰️ 2-day Ta Nang - Phan Dung trek itinerary',
      '🌲 Bidoup Nui Ba 3D2N moderate fitness trek',
      '🌊 Mui Doi East Pole sunrise expedition',
      '💰 Budget trek plan under 2M VND',
    ],
  },
};

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
    activeTourContext,
    clearTourContext,
  } = useChat();

  const userMessageCount = messages.filter((m) => m.sender === 'user').length;
  const hasExistingConversation = userMessageCount > 0;

  const [promptsDismissed, setPromptsDismissed] = useState(false);
  const [promptsCollapsed, setPromptsCollapsed] = useState(hasExistingConversation);
  const [visionOpen, setVisionOpen] = useState(false);

  const list = useRef(null);

  const { language } = useLanguage();
  const isEn = language === 'en';
  const langPrompts = PROMPTS[language] || PROMPTS.vi;
  const defaultPrompts = plannerMode ? langPrompts.planner : langPrompts.general;

  const dynamicTourPrompts = activeTourContext
    ? (isEn ? [
        '🌤️ Weather & safety',
        '⚖️ Compare with other trails',
        '📅 Detailed itinerary',
        '🎒 Gear checklist',
        '💰 Pricing & services',
      ] : [
        '🌤️ Thời tiết & an toàn',
        '⚖️ So sánh với cung khác',
        '📅 Lịch trình chi tiết',
        '🎒 Cần chuẩn bị gì?',
        '💰 Chi phí & dịch vụ',
      ])
    : null;

  const activePrompts = dynamicTourPrompts || defaultPrompts;

  function shortenTourTitle(title) {
    if (!title) return '';
    const firstPart = title.split(/[:–—\-]/)[0].trim();
    const clean = firstPart.replace(/^(Trekking|Khám phá|Chinh phục|Hành trình|Tour)\s+/i, '').trim();
    const finalName = clean || firstPart;
    return finalName.length > 22 ? finalName.slice(0, 20) + '…' : finalName;
  }

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

  const latestAiMessageWithPills = [...messages]
    .reverse()
    .find((m) => m.sender === 'ai' && m.quickPills && m.quickPills.length > 0);
  const contextualPills = latestAiMessageWithPills?.quickPills || null;

  return (
    <div className={'chat-panel' + (compact ? ' compact' : '') + (plannerMode ? ' planner-chat-mode' : '')}>
      {plannerMode && (
        <div className="planner-chat-mode-pill-top">
          <Calendar size={13} />
          <span>Chế độ: Trợ lý Lập lịch trình</span>
        </div>
      )}

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
            onPromptClick={handleQuickPrompt}
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

      {/* Initial Quick Prompts: single-line horizontal scroll, no frame box, no title */}
      {userMessageCount === 0 && !promptsDismissed && (
        <div className="chat-initial-prompts-row">
          <div className="chat-initial-prompts-scroll">
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

      {visionOpen && (
        <Modal
          title={isEn ? 'AI Gear Vision Check' : 'AI Kiểm tra Hành trang qua Ảnh'}
          onClose={() => setVisionOpen(false)}
        >
          <GearVisionCheck inModal onClose={() => setVisionOpen(false)} />
        </Modal>
      )}

      <form className="chat-composer" onSubmit={submit}>
        <div className="chat-composer-input-row">
          <label className="sr-only" htmlFor={compact ? 'widget-message' : 'page-message'}>
            {isEn ? 'Your question' : 'Câu hỏi của bạn'}
          </label>
          <textarea
            id={compact ? 'widget-message' : 'page-message'}
            className="chat-composer-textarea"
            rows={1}
            maxLength={4000}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading && input.trim()) {
                  submit(e);
                  e.target.style.height = 'auto';
                }
              }
            }}
            placeholder={
              plannerMode
                ? (isEn
                    ? 'Ask AI to plan a 2D1N Da Lat camping trip for 2 people...'
                    : 'Ví dụ: Lên lịch trình cắm trại Đà Lạt 2N1Đ cho 2 người, ngân sách 3 triệu...')
                : (isEn
                    ? 'Ask Trek & Camp AI about trails, gear, weather...'
                    : 'Hỏi Trek & Camp AI về cung đường, kinh nghiệm trekking, trang bị...')
            }
          />
        </div>

        <div className="chat-composer-toolbar">
          <div className="chat-composer-tools">
            <button
              type="button"
              className={`chat-tool-btn ${visionOpen ? 'is-active' : ''}`}
              onClick={() => setVisionOpen((v) => !v)}
              aria-pressed={visionOpen}
              title={isEn ? 'Inspect gear photo with AI' : 'Kiểm tra ảnh hành trang bằng AI'}
              aria-label={isEn ? 'AI Gear Vision' : 'Kiểm tra ảnh hành trang'}
            >
              <Camera size={16} />
              {!compact && (
                <span>{isEn ? 'Gear Vision' : 'Kiểm tra ảnh'}</span>
              )}
            </button>

            {activeTourContext && (
              <span className="chat-composer-context-pill" title={activeTourContext.title}>
                <MapPin size={12} className="chat-context-icon" />
                <span className="chat-context-name">
                  {shortenTourTitle(activeTourContext.title)}
                </span>
                <button
                  type="button"
                  className="chat-context-clear-btn"
                  onClick={clearTourContext}
                  title={isEn ? 'Clear tour context' : 'Bỏ chọn tour'}
                  aria-label="Bỏ chọn ngữ cảnh tour"
                >
                  <X size={11} />
                </button>
              </span>
            )}
          </div>

          <div className="chat-composer-actions">
            <ModelSelector />
            <button
              className="icon-btn send-btn"
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={isEn ? 'Send question' : 'Gửi câu hỏi'}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </form>

      {!compact && (
        <p className="chat-disclaimer">
          {plannerMode
            ? (isEn
                ? 'AI-suggested itinerary based on real field knowledge. Click "Save to Itinerary" to manage in your profile.'
                : 'Lịch trình do AI đề xuất dựa trên kinh nghiệm trekking thực tế. Bạn có thể nhấn "Lưu thành Lịch trình" để quản lý trong danh sách cá nhân.')
            : (isEn
                ? 'AI assistant provides insights based on verified database. Please check departure dates and fitness requirements before booking.'
                : 'Trợ lý AI hỗ trợ tư vấn dựa trên dữ liệu hệ thống. Vui lòng đối chiếu lịch khởi hành và yêu cầu thể lực trước khi tạo đơn.')}
        </p>
      )}
    </div>
  );
}
