import axiosClient from "./axiosClient";

export const chatService = {
  createSession: () => axiosClient.post("/api/chat/sessions"),
  history: (credentials) => axiosClient.post("/api/chat/history", credentials),
  sendMessage: (message, sessionId, sessionToken) =>
    axiosClient.post("/api/chat", { message, sessionId, sessionToken }, { timeout: 100000 }),
  prepareBooking: (data) => axiosClient.post("/api/chat/booking-drafts", data),
  confirmBooking: (id, data) => axiosClient.post(`/api/chat/booking-drafts/${encodeURIComponent(id)}/confirm`, data),
};
