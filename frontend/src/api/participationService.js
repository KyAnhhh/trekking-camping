import client from "./axiosClient";
export const participationService = {
  get: (id, admin = false) =>
    client.get(`/api/${admin ? "admin/" : ""}bookings/${id}/participation`),
  submit: (id, body) => client.put(`/api/bookings/${id}/participation`, body),
  review: (id, body) =>
    client.post(`/api/admin/bookings/${id}/participation/review`, body),
  remove: (id) => client.delete(`/api/bookings/${id}/participation`),
};
