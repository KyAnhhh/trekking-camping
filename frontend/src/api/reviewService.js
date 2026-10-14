import client from "./axiosClient";
export const reviewService = {
  list: (tourId, page = 0) =>
    client.get(`/api/tours/${tourId}/reviews`, { params: { page } }),
  eligibility: (bookingId) => client.get(`/api/bookings/${bookingId}/review`),
  create: (bookingId, data) =>
    client.post(`/api/bookings/${bookingId}/review`, data),
};
