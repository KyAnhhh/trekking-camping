import client from "./axiosClient";
import { invalidateCache } from "../utils/cache";

export const reviewService = {
  list: (tourId, page = 0, signal) =>
    client.get(`/api/tours/${tourId}/reviews`, { params: { page }, signal }),
  eligibility: (bookingId) => client.get(`/api/bookings/${bookingId}/review`),
  create: (bookingId, data) =>
    client.post(`/api/bookings/${bookingId}/review`, data).then((res) => {
      invalidateCache("reviews");
      invalidateCache("home-reviews");
      return res;
    }),
};
