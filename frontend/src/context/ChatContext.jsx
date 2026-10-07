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
  const sending = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const reset = () => {
      generation.current++;
      sessionId.current = null;
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
    return () => {
      window.removeEventListener("auth:changed", reset);
      window.removeEventListener("auth:expired", reset);
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
      const response = await chatService.sendMessage(
        message,
        sessionId.current,
      );
      const data = response.data.data;
      if (turnGeneration !== generation.current) return;
      if (typeof data?.reply !== "string" || !data.sessionId)
        throw new Error("Invalid chat response");
      sessionId.current = data.sessionId;
      setMessages((current) => [
        ...current,
        { sender: "ai", text: data.reply },
      ]);
    } catch (error) {
      if (turnGeneration !== generation.current) return;
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
