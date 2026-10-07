import axiosClient from "./axiosClient";

export const bookingService = {
  createBooking: (bookingData) =>
    axiosClient.post("/api/bookings", bookingData),
  getMyBookings: () => axiosClient.get("/api/bookings/my-bookings"),
  getDetail: (id, admin = false) =>
    axiosClient.get(`/api/${admin ? "admin/" : ""}bookings/${id}`),
  cancel: (id, admin = false) =>
    axiosClient.post(`/api/${admin ? "admin/" : ""}bookings/${id}/cancel`),
  confirm: (id) => axiosClient.post(`/api/admin/bookings/${id}/confirm`),
  getAll: () => axiosClient.get("/api/admin/bookings"),
};
