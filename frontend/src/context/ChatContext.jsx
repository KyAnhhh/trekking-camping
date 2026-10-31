import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { chatService } from '../api/chatService';

const ChatContext = createContext(null);

export const DEFAULT_MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (Mặc định · Siêu nhanh)', enabled: true, visible: true, verified: true },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', enabled: true, visible: true, verified: true },
];

const welcome = [{ sender: 'ai', text: 'Xin chào! Tôi có thể tư vấn tour, lịch trình và trang bị trekking cho bạn.' }];
const key = 'trek-chat-session';

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState(welcome);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [selection, setSelection] = useState({ modelId: 'gemini-3.5-flash-lite', revision: 0 });
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [retry, setRetry] = useState(null);

  const credentials = useRef(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const controller = useRef(null);
  const choice = useRef(selection);

  const applySelection = (s) => {
    choice.current = s;
    setSelection(s);
  };

  const fetchModels = useCallback(async (retryCount = 0) => {
    try {
      const { data } = await chatService.models();
      const list = data.data?.models || [];
      if (list.length > 0) {
        setModels(list);
        const def = data.data.defaultModel || list.find(m => m.id === 'gemini-3.5-flash-lite')?.id || list[0]?.id || 'gemini-3.5-flash-lite';
        if (!choice.current.modelId || !list.some(m => m.id === choice.current.modelId)) {
          applySelection({ modelId: def, revision: 0 });
        }
        setError((prev) => (prev.includes('danh sách model') ? '' : prev));
      }
    } catch (err) {
      // Keep DEFAULT_MODELS so the chat UI is never locked out
      setModels(prev => (prev.length > 0 ? prev : DEFAULT_MODELS));
      if (!choice.current.modelId) {
        applySelection({ modelId: 'gemini-3.5-flash-lite', revision: 0 });
      }
      // Auto-retry up to 3 times with 2.5s intervals when backend is booting up
      if (retryCount < 3) {
        setTimeout(() => fetchModels(retryCount + 1), 2500);
      } else {
        // If still failing after retries, keep default models and show subtle hint
        setError('Đang dùng cấu hình AI mặc định. Bạn có thể trò chuyện bình thường.');
      }
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    fetchModels(0);

    const reset = () => {
      generation.current++;
      controller.current?.abort();
      credentials.current = null;
      busy.current = false;
      setLoading(false);
      setMessages(welcome);
      setError('');
      setDraft('');
      setRetry(null);
      applySelection({ modelId: 'gemini-3.5-flash-lite', revision: 0 });
      sessionStorage.removeItem(key);
    };

    const restore = async () => {
      const version = generation.current;
      try {
        const stored = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (!stored?.sessionId || !stored?.sessionToken) return;
        busy.current = true;
        setLoading(true);
        const [history, state] = await Promise.all([
          chatService.history(stored),
          chatService.state(stored.sessionId, stored.sessionToken),
        ]);
        if (disposed || version !== generation.current) return;
        credentials.current = stored;
        const serverModel = state.data.data?.modelId || 'gemini-3.5-flash-lite';
        applySelection({ ...state.data.data, modelId: serverModel });
        setMessages(
          history.data.data.length
            ? history.data.data.map((m) => ({
                sender: m.sender === 'USER' ? 'user' : 'ai',
                text: m.message,
                modelId: m.modelId,
                sources: m.sources,
                historical: true,
              }))
            : welcome
        );
      } catch {
        if (!disposed && version === generation.current) {
          sessionStorage.removeItem(key);
          credentials.current = null;
        }
      } finally {
        if (!disposed && version === generation.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    };

    restore();

    ['auth:changed', 'auth:expired', 'chat:reset'].forEach((e) =>
      window.addEventListener(e, reset)
    );

    return () => {
      disposed = true;
      generation.current++;
      controller.current?.abort();
      ['auth:changed', 'auth:expired', 'chat:reset'].forEach((e) =>
        window.removeEventListener(e, reset)
      );
    };
  }, [fetchModels]);

  async function ensureSession(version) {
    if (!credentials.current || credentials.current.sessionId?.startsWith('local-')) {
      try {
        const { data } = await chatService.createSession();
        if (version !== generation.current) return null;
        credentials.current = data.data;
        sessionStorage.setItem(key, JSON.stringify(data.data));
        const def = choice.current.modelId || models[0]?.id || 'gemini-3.5-flash-lite';
        applySelection({ modelId: def, revision: 0 });
      } catch (err) {
        if (!credentials.current) {
          const localCreds = {
            sessionId: 'local-' + crypto.randomUUID(),
            sessionToken: 'token-' + crypto.randomUUID(),
          };
          credentials.current = localCreds;
          sessionStorage.setItem(key, JSON.stringify(localCreds));
        }
      }
    }
    return credentials.current;
  }

  async function syncSelection(version) {
    const c = credentials.current;
    if (!c || c.sessionId?.startsWith('local-')) return;
    try {
      const { data } = await chatService.state(c.sessionId, c.sessionToken);
      if (version === generation.current) applySelection(data.data);
    } catch {
      /* preserve error */
    }
  }

  async function changeModel(modelId) {
    if (busy.current) return;
    const version = generation.current;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const targetModel = modelId || 'gemini-3.5-flash-lite';
      applySelection({ ...choice.current, modelId: targetModel });
      const c = await ensureSession(version);
      if (!c || c.sessionId?.startsWith('local-')) return;
      const { data } = await chatService.select(c.sessionId, {
        sessionToken: c.sessionToken,
        modelId: targetModel,
        revision: choice.current.revision,
      });
      if (version === generation.current) applySelection(data.data);
    } catch (e) {
      if (version === generation.current) {
        await syncSelection(version);
      }
    } finally {
      if (version === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }

  async function sendMessage(input, isRetry = false) {
    const message = input.trim();
    if (!message || busy.current) return;

    const activeModelId =
      choice.current.modelId ||
      models.find((m) => m.id === 'gemini-3.5-flash-lite')?.id ||
      models[0]?.id ||
      'gemini-3.5-flash-lite';

    if (!choice.current.modelId) {
      applySelection({ ...choice.current, modelId: activeModelId });
    }

    const version = generation.current;
    busy.current = true;
    setLoading(true);
    setError('');
    setRetry(null);

    if (!isRetry) setMessages((old) => [...old, { sender: 'user', text: message }]);

    // Add initial placeholder streaming message
    setMessages((old) => [
      ...old,
      {
        sender: 'ai',
        text: '',
        userPrompt: message,
        streaming: true,
        status: 'Đang kết nối...',
        modelId: choice.current.modelId || 'gemini-3.5-flash-lite',
      },
    ]);

    try {
      const c = await ensureSession(version);
      if (!c) return;
      controller.current = new AbortController();

      await chatService.streamMessage({
        message,
        sessionId: c.sessionId,
        sessionToken: c.sessionToken,
        settingsRevision: choice.current.revision,
        signal: controller.current.signal,
        onDelta: (delta) => {
          if (version !== generation.current) return;
          setMessages((old) => {
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
          setMessages((old) => {
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
          setMessages((old) => {
            const copy = [...old];
            const last = copy[copy.length - 1];
            if (last && last.sender === 'ai') {
              copy[copy.length - 1] = {
                sender: 'ai',
                text: data.reply || last.text,
                userPrompt: last.userPrompt || message,
                sources: data.sources,
                tours: data.tours,
                proposal: data.proposal,
                notices: data.notices,
                modelId: data.modelId,
                streaming: false,
                status: null,
              };
            }
            return copy;
          });
        },
      });
    } catch (e) {
      if (version !== generation.current) return;
      if (e.name === 'AbortError' || e.code === 'ERR_CANCELED' || !e.response) {
        setMessages((old) => {
          const copy = [...old];
          const last = copy[copy.length - 1];
          if (last && last.sender === 'ai' && last.streaming) {
            copy[copy.length - 1] = {
              ...last,
              streaming: false,
              status: null,
              text: last.text
                ? last.text + '\n\n*(Đã dừng trả lời)*'
                : '*(Chưa kết nối được với máy chủ Backend. Bạn hãy đảm bảo file run-backend.bat đang chạy nhé!)*',
            };
          }
          return copy;
        });
        setError('Chưa kết nối được máy chủ Backend (Port 8080). Vui lòng kiểm tra tiến trình backend.');
      } else {
        setMessages((old) => {
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
        if (e.response?.status === 404) {
          credentials.current = null;
          sessionStorage.removeItem(key);
        }
      }
    } finally {
      if (version === generation.current) {
        busy.current = false;
        setLoading(false);
        controller.current = null;
      }
    }
  }

  return (
    <ChatContext.Provider
      value={{
        messages,
        loading,
        sendMessage,
        models,
        selection,
        changeModel,
        reloadModels: () => fetchModels(0),
        error,
        retry,
        retryMessage: () => retry && sendMessage(retry, true),
        stop: () => controller.current?.abort(),
        draft,
        setDraft,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
