import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { chatService } from '../api/chatService';
const ChatContext = createContext(null);
const welcome = [{ sender: 'ai', text: 'Xin chào! Tôi có thể tư vấn tour, lịch trình và trang bị trekking cho bạn.' }];
const key = 'trek-chat-session';
export function ChatProvider({ children }) {
  const [messages, setMessages] = useState(welcome), [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selection, setSelection] = useState({ modelId: null, revision: 0 });
  const [error, setError] = useState(''), [draft, setDraft] = useState(''), [retry, setRetry] = useState(null);
  const credentials = useRef(null), busy = useRef(false), generation = useRef(0), controller = useRef(null), choice = useRef(selection);
  const applySelection = s => { choice.current = s; setSelection(s); };
  useEffect(() => {
    let disposed = false;
    chatService.models().then(({ data }) => { if (!disposed) { setModels(data.data.models); } })
      .catch(() => { if (!disposed) setError('Chưa tải được danh sách model. Hãy tải lại.'); });
    const reset = () => {
      generation.current++; controller.current?.abort(); credentials.current = null;
      busy.current = false; setLoading(false); setMessages(welcome); setError(''); setDraft(''); setRetry(null);
      applySelection({ modelId: null, revision: 0 }); sessionStorage.removeItem(key);
    };
    const restore = async () => {
      const version = generation.current;
      try {
        const stored = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (!stored?.sessionId || !stored?.sessionToken) return;
        busy.current = true; setLoading(true);
        const [history, state] = await Promise.all([chatService.history(stored), chatService.state(stored.sessionId, stored.sessionToken)]);
        if (disposed || version !== generation.current) return;
        credentials.current = stored; applySelection(state.data.data);
        setMessages(history.data.data.length ? history.data.data.map(m => ({ sender: m.sender === 'USER' ? 'user' : 'ai', text: m.message, modelId: m.modelId, sources: m.sources, historical: true })) : welcome);
      } catch { if (!disposed && version === generation.current) { sessionStorage.removeItem(key); setError('Không khôi phục được phiên chat. Bạn có thể bắt đầu phiên mới.'); } }
      finally { if (!disposed && version === generation.current) { busy.current = false; setLoading(false); } }
    };
    restore();
    ['auth:changed', 'auth:expired', 'chat:reset'].forEach(e => window.addEventListener(e, reset));
    return () => { disposed = true; generation.current++; controller.current?.abort(); ['auth:changed', 'auth:expired', 'chat:reset'].forEach(e => window.removeEventListener(e, reset)); };
  }, []);
  async function ensureSession(version) {
    if (!credentials.current) {
      const { data } = await chatService.createSession();
      if (version !== generation.current) return null;
      credentials.current = data.data; sessionStorage.setItem(key, JSON.stringify(data.data));
      applySelection({ modelId: null, revision: 0 });
    }
    return credentials.current;
  }
  async function syncSelection(version) {
    const c = credentials.current; if (!c) return;
    try { const { data } = await chatService.state(c.sessionId, c.sessionToken); if (version === generation.current) applySelection(data.data); } catch { /* preserve error */ }
  }
  async function changeModel(modelId) {
    if (busy.current) return;
    const version = generation.current; busy.current = true; setLoading(true); setError('');
    try {
      const c = await ensureSession(version); if (!c) return;
      const { data } = await chatService.select(c.sessionId, { sessionToken: c.sessionToken, modelId: modelId || null, revision: choice.current.revision });
      if (version === generation.current) applySelection(data.data);
    } catch (e) { if (version === generation.current) { setError(e.response?.data?.message || 'Chưa đổi được model.'); await syncSelection(version); } }
    finally { if (version === generation.current) { busy.current = false; setLoading(false); } }
  }
  async function sendMessage(input, isRetry = false) {
    const message = input.trim(); if (!message || busy.current) return;
    if (!models.some(m => m.id === choice.current.modelId)) { setError("Hãy chọn model AI trước khi gửi."); return; }
    const version = generation.current; busy.current = true; setLoading(true); setError(''); setRetry(null);
    if (!isRetry) setMessages(old => [...old, { sender: 'user', text: message }]);
    try {
      const c = await ensureSession(version); if (!c) return;
      controller.current = new AbortController();
      const { data: response } = await chatService.sendMessage(message, c.sessionId, c.sessionToken, choice.current.revision, controller.current.signal);
      if (version !== generation.current) return;
      const data = response.data;
      if (typeof data?.reply !== 'string') throw new Error('Invalid response');
      setMessages(old => [...old, { sender: 'ai', text: data.reply, sources: data.sources, tours: data.tours, proposal: data.proposal, notices: data.notices, modelId: data.modelId }]);
    } catch (e) {
      if (version !== generation.current) return;
      if (e.code === 'ERR_CANCELED' || !e.response) {
        setError('Đã dừng chờ hoặc mất kết nối. Tải lại hội thoại để kiểm tra kết quả trước khi gửi lại.');
      } else {
        setError(e.response?.data?.message || 'Chưa nhận được câu trả lời.');
        if ([429, 502, 503, 504].includes(e.response.status)) setRetry(message);
        if (e.response.status === 409) await syncSelection(version);
        if (e.response.status === 404) { credentials.current = null; sessionStorage.removeItem(key); }
      }
    } finally { if (version === generation.current) { busy.current = false; setLoading(false); controller.current = null; } }
  }
  return <ChatContext.Provider value={{ messages, loading, sendMessage, models, selection, changeModel, error, retry, retryMessage: () => retry && sendMessage(retry, true), stop: () => controller.current?.abort(), draft, setDraft }}>{children}</ChatContext.Provider>;
}
export const useChat = () => useContext(ChatContext);
