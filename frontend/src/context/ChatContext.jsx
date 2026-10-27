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
    chatService.models().then(({ data }) => {
      if (!disposed) {
        const list = data.data.models || [];
        const def = data.data.defaultModel || (list.find(m => m.id === 'gemini-3.5-flash-lite')?.id) || list[0]?.id || 'gemini-3.5-flash-lite';
        setModels(list);
        if (!choice.current.modelId) {
          applySelection({ modelId: def, revision: 0 });
        }
      }
    })
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
        credentials.current = stored;
        const serverModel = state.data.data?.modelId || 'gemini-3.5-flash-lite';
        applySelection({ ...state.data.data, modelId: serverModel });
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
      const def = choice.current.modelId || models.find(m => m.id === 'gemini-3.5-flash-lite')?.id || models[0]?.id || 'gemini-3.5-flash-lite';
      applySelection({ modelId: def, revision: 0 });
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
    const activeModelId = choice.current.modelId || models.find(m => m.id === 'gemini-3.5-flash-lite')?.id || models[0]?.id || 'gemini-3.5-flash-lite';
    if (!models.some(m => m.id === activeModelId)) {
      if (models.length > 0) {
        applySelection({ ...choice.current, modelId: models[0].id });
      } else {
        setError("Hãy chọn model AI trước khi gửi.");
        return;
      }
    } else if (!choice.current.modelId) {
      applySelection({ ...choice.current, modelId: activeModelId });
    }
    const version = generation.current; busy.current = true; setLoading(true); setError(''); setRetry(null);
    if (!isRetry) setMessages(old => [...old, { sender: 'user', text: message }]);

    // Add initial placeholder streaming message
    setMessages(old => [...old, {
      sender: 'ai',
      text: '',
      streaming: true,
      status: 'Đang kết nối...',
      modelId: choice.current.modelId
    }]);

    try {
      const c = await ensureSession(version); if (!c) return;
      controller.current = new AbortController();

      await chatService.streamMessage({
        message,
        sessionId: c.sessionId,
        sessionToken: c.sessionToken,
        settingsRevision: choice.current.revision,
        signal: controller.current.signal,
        onDelta: (delta) => {
          if (version !== generation.current) return;
          setMessages(old => {
            const copy = [...old];
            const last = copy[copy.length - 1];
            if (last && last.sender === 'ai' && last.streaming) {
              copy[copy.length - 1] = { ...last, text: last.text + delta, status: null };
            }
            return copy;
          });
        },
        onStatus: (status) => {
          if (version !== generation.current) return;
          setMessages(old => {
            const copy = [...old];
            const last = copy[copy.length - 1];
            if (last && last.sender === 'ai' && last.streaming) {
              copy[copy.length - 1] = { ...last, status };
            }
            return copy;
          });
        },
        onDone: (data) => {
          if (version !== generation.current) return;
          setMessages(old => {
            const copy = [...old];
            const last = copy[copy.length - 1];
            if (last && last.sender === 'ai') {
              copy[copy.length - 1] = {
                sender: 'ai',
                text: data.reply || last.text,
                sources: data.sources,
                tours: data.tours,
                proposal: data.proposal,
                notices: data.notices,
                modelId: data.modelId,
                streaming: false,
                status: null
              };
            }
            return copy;
          });
        }
      });
    } catch (e) {
      if (version !== generation.current) return;
      if (e.name === 'AbortError' || e.code === 'ERR_CANCELED' || !e.response) {
        setMessages(old => {
          const copy = [...old];
          const last = copy[copy.length - 1];
          if (last && last.sender === 'ai' && last.streaming) {
            copy[copy.length - 1] = {
              ...last,
              streaming: false,
              status: null,
              text: last.text ? last.text + '\n\n*(Đã dừng trả lời)*' : '*(Đã dừng chờ)*'
            };
          }
          return copy;
        });
        setError('Đã dừng chờ hoặc mất kết nối. Tải lại hội thoại để kiểm tra kết quả trước khi gửi lại.');
      } else {
        setMessages(old => {
          const copy = [...old];
          const last = copy[copy.length - 1];
          if (last && last.sender === 'ai' && last.streaming && !last.text) {
            return copy.slice(0, -1);
          } else if (last && last.sender === 'ai' && last.streaming) {
            copy[copy.length - 1] = { ...last, streaming: false, status: null };
          }
          return copy;
        });
        setError(e.response?.data?.message || e.message || 'Chưa nhận được câu trả lời.');
        if ([429, 502, 503, 504].includes(e.response?.status)) setRetry(message);
        if (e.response?.status === 409) await syncSelection(version);
        if (e.response?.status === 404) { credentials.current = null; sessionStorage.removeItem(key); }
      }
    } finally {
      if (version === generation.current) {
        busy.current = false;
        setLoading(false);
        controller.current = null;
      }
    }
  }
  return <ChatContext.Provider value={{ messages, loading, sendMessage, models, selection, changeModel, error, retry, retryMessage: () => retry && sendMessage(retry, true), stop: () => controller.current?.abort(), draft, setDraft }}>{children}</ChatContext.Provider>;
}
export const useChat = () => useContext(ChatContext);
