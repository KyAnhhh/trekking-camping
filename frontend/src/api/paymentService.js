import axiosClient from "./axiosClient";

export const paymentService = {
  start: (bookingId) =>
    axiosClient.post("/api/payments/vnpay/start", { bookingId }),
  refresh: (orderId) =>
    // Keep reconciliation of existing MoMo transactions available during migration.
    orderId.startsWith("MM-")
      ? axiosClient.post(
          `/api/payments/momo/${encodeURIComponent(orderId)}/refresh`,
        )
      : axiosClient.post(
          `/api/payments/vnpay/${encodeURIComponent(orderId)}/refresh`,
        ),
};
