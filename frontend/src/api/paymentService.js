import axiosClient from "./axiosClient";

export const paymentService = {
  start: (bookingId) =>
    axiosClient.post("/api/payments/vnpay/start", { bookingId }),
  refresh: (orderId) => {
    const provider = orderId?.startsWith?.("MM") ? "momo" : "vnpay";
    return axiosClient.post(
      `/api/payments/${provider}/${encodeURIComponent(orderId)}/refresh`,
    );
  },
};

