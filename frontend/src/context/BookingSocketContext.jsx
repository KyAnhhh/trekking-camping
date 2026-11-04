import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export const BookingSocketContext = createContext(null);

export function getBookingWebSocketUrl() {
  const raw = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080";
  const clean = String(raw).replace(/\/api\/?$/, "");
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    const url = new URL(clean);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}/ws/booking`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/booking`;
}

export function BookingSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const addToast = useCallback((toastData) => {
    const id = "toast_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    const newToast = { id, timestamp: Date.now(), ...toastData };
    setToasts((prev) => [newToast, ...prev].slice(0, 4)); // Keep maximum 4 active toasts

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const subscribe = useCallback((callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    let unmounted = false;
    let delay = 2000;

    function connect() {
      if (unmounted) return;
      try {
        const wsUrl = getBookingWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (unmounted) {
            ws.close();
            return;
          }
          setIsConnected(true);
          delay = 2000; // Reset backoff delay

          // Keep-alive ping every 30 seconds
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "PING" }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "PONG" || data.type === "CONNECTED") return;

            setLastEvent(data);

            // Notify custom listeners
            listenersRef.current.forEach((fn) => {
              try {
                fn(data);
              } catch (err) {
                console.error("Socket listener error:", err);
              }
            });

            // Social proof / activity toasts
            if (data.type === "NEW_BOOKING") {
              addToast({
                type: "NEW_BOOKING",
                title: "🎒 Vừa có khách đặt tour!",
                message: `${data.payload?.customerName || "Một du khách"} vừa đặt ${data.payload?.numberOfPax || 1} chỗ tour "${data.payload?.tourTitle || "Khám phá"}"`,
                link: `/my-bookings/${data.payload?.bookingId}`,
              });
            } else if (data.type === "PAYMENT_SUCCESS") {
              const amountStr = data.payload?.amount ? Number(data.payload.amount).toLocaleString("vi-VN") + " đ" : "";
              addToast({
                type: "PAYMENT_SUCCESS",
                title: "✨ Thanh toán thành công!",
                message: `Đơn ${data.payload?.bookingCode} vừa hoàn tất thanh toán ${amountStr} qua ${data.payload?.method || "VNPAY"}`,
                link: `/my-bookings/${data.payload?.bookingId}`,
              });
            } else if (data.type === "PAYMENT_FAILED") {
              addToast({
                type: "PAYMENT_FAILED",
                title: "⚠️ Thanh toán chưa hoàn tất",
                message: `Đơn ${data.payload?.bookingCode} ${data.payload?.status === 'EXPIRED' ? 'đã hết hạn phiên thanh toán.' : 'thanh toán không thành công.'}`,
                link: `/my-bookings/${data.payload?.bookingId}`,
              });
            } else if (data.type === "PAYMENT_REFUND_REQUIRED") {
              const amountStr = data.payload?.amount ? Number(data.payload.amount).toLocaleString("vi-VN") + " đ" : "";
              addToast({
                type: "PAYMENT_REFUND_REQUIRED",
                title: "🔄 Giao dịch cần hoàn tiền",
                message: `Đơn ${data.payload?.bookingCode} cần đối soát hoàn tiền (${amountStr})`,
                link: `/admin/payments?status=REFUND_REQUIRED`,
              });
            } else if (data.type === "NEW_REVIEW") {
              addToast({
                type: "NEW_REVIEW",
                title: `⭐ Đánh giá mới (${data.payload?.rating || 5} sao)`,
                message: `Khách ${data.payload?.authorName || "du lịch"} vừa đánh giá tour "${data.payload?.tourTitle}"`,
                link: `/admin/reviews`,
              });
            } else if (data.type === "BOOKING_APPROVED") {
              addToast({
                type: "BOOKING_APPROVED",
                title: "✅ Điều kiện tham gia đã duyệt",
                message: `Đơn ${data.payload?.bookingCode} đã sẵn sàng thanh toán!`,
                link: `/my-bookings/${data.payload?.bookingId}`,
              });
            } else if (data.type === "BOOKING_CANCELLED") {
              addToast({
                type: "BOOKING_CANCELLED",
                title: "❌ Đơn đặt tour đã hủy",
                message: `Đơn ${data.payload?.bookingCode} đã hủy. Số chỗ trống đã được hoàn lại.`,
                link: `/admin/bookings`,
              });
            }
          } catch (e) {
            console.warn("Error parsing WebSocket message:", e);
          }
        };

        ws.onerror = () => {
          // Handled by onclose
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          if (!unmounted) {
            reconnectTimeoutRef.current = setTimeout(() => {
              delay = Math.min(delay * 1.5, 20000);
              connect();
            }, delay);
          }
        };
      } catch (err) {
        if (!unmounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      unmounted = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [addToast]);

  return (
    <BookingSocketContext.Provider
      value={{
        isConnected,
        lastEvent,
        toasts,
        dismissToast,
        subscribe,
      }}
    >
      {children}
    </BookingSocketContext.Provider>
  );
}
