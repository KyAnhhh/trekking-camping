import React from "react";
import { Sparkles, CheckCircle2, Compass, X, AlertTriangle, RefreshCw, Star, Ban } from "lucide-react";
import { useBookingSocket } from "../../hooks/useBookingSocket";
import "../../styles/realtime-toast.css";

export default function RealtimeBookingToast() {
  const { toasts, dismissToast } = useBookingSocket();

  if (!toasts || toasts.length === 0) return null;

  const renderIcon = (type) => {
    switch (type) {
      case "PAYMENT_SUCCESS":
        return <Sparkles size={18} />;
      case "PAYMENT_FAILED":
        return <AlertTriangle size={18} />;
      case "PAYMENT_REFUND_REQUIRED":
        return <RefreshCw size={18} />;
      case "NEW_REVIEW":
        return <Star size={18} />;
      case "BOOKING_APPROVED":
        return <CheckCircle2 size={18} />;
      case "BOOKING_CANCELLED":
        return <Ban size={18} />;
      default:
        return <Compass size={18} />;
    }
  };

  const getStyleClass = (type) => {
    switch (type) {
      case "PAYMENT_SUCCESS":
        return "type-payment";
      case "PAYMENT_FAILED":
        return "type-failed";
      case "PAYMENT_REFUND_REQUIRED":
        return "type-refund";
      case "NEW_REVIEW":
        return "type-review";
      case "BOOKING_APPROVED":
        return "type-approved";
      case "BOOKING_CANCELLED":
        return "type-cancel";
      default:
        return "type-booking";
    }
  };

  return (
    <div className="realtime-toast-container" aria-live="polite">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`realtime-toast-card ${getStyleClass(item.type)}`}
        >
          <div className="realtime-toast-icon-wrap">
            {renderIcon(item.type)}
          </div>
          <div className="realtime-toast-content">
            <div className="realtime-toast-title">{item.title}</div>
            <p className="realtime-toast-msg">{item.message}</p>
            <div className="realtime-toast-time">Vừa xong</div>
          </div>
          <button
            type="button"
            className="realtime-toast-close"
            onClick={() => dismissToast(item.id)}
            aria-label="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
