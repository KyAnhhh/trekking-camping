import axiosClient from "./axiosClient";

export const chatService = {
  sendMessage: (message, sessionId) =>
    axiosClient.post("/api/chat", { message, sessionId }, { timeout: 100000 }),
};
