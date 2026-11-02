import axiosClient from "./axiosClient";
import { isTokenExpired, expireSession } from "./authSession.js";

const rawBaseURL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080';
const BASE_URL = String(rawBaseURL).replace(/\/api\/?$/, '').replace(/\/+$/, '');

export const chatService = {
  models: () => axiosClient.get('/api/chat/models'),
  state: (id, sessionToken) => axiosClient.post(`/api/chat/sessions/${encodeURIComponent(id)}/state`, { sessionToken }),
  select: (id, data) => axiosClient.patch(`/api/chat/sessions/${encodeURIComponent(id)}/settings`, data),
  createSession: () => axiosClient.post("/api/chat/sessions"),
  history: (credentials) => axiosClient.post("/api/chat/history", credentials),
  sendMessage: (message, sessionId, sessionToken, settingsRevision, signal) =>
    axiosClient.post("/api/chat", { message, sessionId, sessionToken, settingsRevision }, { timeout: 100000, signal }),
  streamMessage: async ({ message, sessionId, sessionToken, settingsRevision, onDelta, onStatus, onDone, signal }) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token && token !== 'undefined' && token !== 'null') {
      if (isTokenExpired(token)) {
        expireSession(token);
      } else {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, sessionId, sessionToken, settingsRevision }),
      signal
    });

    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch (_) {}
      if (res.status === 401 && headers.Authorization) {
        expireSession(token);
      }
      const err = new Error(errData.message || `Lỗi kết nối (${res.status})`);
      err.response = { status: res.status, data: errData };
      throw err;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let currentEvent = 'message';
    let currentData = '';

    const dispatchEvent = () => {
      if (!currentData) return;
      const eventToDispatch = currentEvent;
      const dataToDispatch = currentData;
      currentData = '';
      currentEvent = 'message';
      try {
        const data = JSON.parse(dataToDispatch);
        if (eventToDispatch === 'delta' && onDelta) onDelta(data.delta);
        else if (eventToDispatch === 'status' && onStatus) onStatus(data.message);
        else if (eventToDispatch === 'done' && onDone) onDone(data);
        else if (eventToDispatch === 'error') {
          const err = new Error(data.message || 'Lỗi xử lý');
          err.response = { status: 500, data };
          throw err;
        }
      } catch (jsonErr) {
        if (eventToDispatch === 'error') throw jsonErr;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data:')) {
            currentData = (currentData ? currentData + '\n' : '') + trimmed.slice(5).trim();
          }
        }
        dispatchEvent();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          dispatchEvent();
        } else if (trimmed.startsWith('event:')) {
          if (currentData) dispatchEvent();
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith('data:')) {
          const raw = trimmed.slice(5).trim();
          currentData = (currentData ? currentData + '\n' : '') + raw;
          try {
            JSON.parse(currentData);
            dispatchEvent();
          } catch (_) {
            // Wait for remaining chunk or empty delimiter line
          }
        }
      }
    }
  },
  prepareBooking: (data) => axiosClient.post("/api/chat/booking-drafts", data),
  confirmBooking: (id, data) => axiosClient.post(`/api/chat/booking-drafts/${encodeURIComponent(id)}/confirm`, data),
};
