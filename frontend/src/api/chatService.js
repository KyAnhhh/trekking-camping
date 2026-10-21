import axiosClient from "./axiosClient";

export const chatService = {
  models: () => axiosClient.get('/api/chat/models'),
  state: (id, sessionToken) => axiosClient.post(`/api/chat/sessions/${encodeURIComponent(id)}/state`, { sessionToken }),
  select: (id, data) => axiosClient.patch(`/api/chat/sessions/${encodeURIComponent(id)}/settings`, data),
  createSession: () => axiosClient.post("/api/chat/sessions"),
  history: (credentials) => axiosClient.post("/api/chat/history", credentials),
  sendMessage: (message, sessionId, sessionToken, settingsRevision, signal) =>
    axiosClient.post("/api/chat", { message, sessionId, sessionToken, settingsRevision }, { timeout: 100000, signal }),
  prepareBooking: (data) => axiosClient.post("/api/chat/booking-drafts", data),
  confirmBooking: (id, data) => axiosClient.post(`/api/chat/booking-drafts/${encodeURIComponent(id)}/confirm`, data),
};
