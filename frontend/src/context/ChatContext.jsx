import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { chatService } from "../api/chatService";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Xin chào! Tôi có thể tư vấn tour, lịch trình và trang bị trekking cho bạn.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(null);
  const sessionToken = useRef(null);
  const sending = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const reset = () => {
      generation.current++;
      sessionId.current = null;
      sessionToken.current = null;
      sessionStorage.removeItem("trek-chat-session");
      sending.current = false;
      setLoading(false);
      setMessages([
        {
          sender: "ai",
          text: "Xin chào! Tôi có thể tư vấn tour, lịch trình và trang bị trekking cho bạn.",
        },
      ]);
    };
    window.addEventListener("auth:changed", reset);
    window.addEventListener("auth:expired", reset);
    window.addEventListener("chat:reset", reset);
    // Session credentials only; no contact details or conversation text are stored in the browser.
    const initialGeneration = generation.current;
    try {
      const stored = JSON.parse(sessionStorage.getItem("trek-chat-session") || "null");
      if (stored?.sessionId && stored?.sessionToken) {
        sending.current = true;
        setLoading(true);
        chatService.history(stored).then(({ data }) => {
          if (initialGeneration !== generation.current) return;
          sessionId.current = stored.sessionId;
          sessionToken.current = stored.sessionToken;
          if (data.data?.length) setMessages(data.data.map((m) => ({ sender: m.sender === "USER" ? "user" : "ai", text: m.message })));
        }).catch(() => {
          if (initialGeneration === generation.current) sessionStorage.removeItem("trek-chat-session");
        }).finally(() => {
          if (initialGeneration === generation.current) { sending.current = false; setLoading(false); }
        });
      }
    } catch { sessionStorage.removeItem("trek-chat-session"); }
    return () => {
      generation.current++;
      window.removeEventListener("auth:changed", reset);
      window.removeEventListener("auth:expired", reset);
      window.removeEventListener("chat:reset", reset);
    };
  }, []);

  const sendMessage = async (input) => {
    const message = input.trim();
    if (!message || sending.current) return;
    sending.current = true;
    const turnGeneration = generation.current;
    setLoading(true);
    setMessages((current) => [...current, { sender: "user", text: message }]);
    try {
      if (!sessionId.current) {
        const { data } = await chatService.createSession();
        if (turnGeneration !== generation.current) return;
        sessionId.current = data.data.sessionId;
        sessionToken.current = data.data.sessionToken;
        sessionStorage.setItem("trek-chat-session", JSON.stringify(data.data));
      }
      const response = await chatService.sendMessage(
        message,
        sessionId.current,
        sessionToken.current,
      );
      const data = response.data.data;
      if (turnGeneration !== generation.current) return;
      if (typeof data?.reply !== "string" || !data.sessionId)
        throw new Error("Invalid chat response");
      sessionId.current = data.sessionId;
      setMessages((current) => [
        ...current,
        { sender: "ai", text: data.reply, sources: data.sources, tours: data.tours, proposal: data.proposal, notices: data.notices },
      ]);
    } catch (error) {
      if (turnGeneration !== generation.current) return;
      if (error.response?.status === 404) {
        sessionId.current = null;
        sessionToken.current = null;
        sessionStorage.removeItem("trek-chat-session");
      }
      setMessages((current) => [
        ...current,
        {
          sender: "ai",
          text:
            error.response?.data?.message ||
            "Không thể kết nối trợ lý AI. Vui lòng thử lại.",
        },
      ]);
    } finally {
      if (turnGeneration === generation.current) {
        sending.current = false;
        setLoading(false);
      }
    }
  };

  return (
    <ChatContext.Provider value={{ messages, loading, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
