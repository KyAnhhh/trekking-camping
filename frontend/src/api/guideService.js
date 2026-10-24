import axiosClient from "./axiosClient";
export const guideService = {
  importGuides: (file) => {
    const body = new FormData();
    body.append("file", file);
    return axiosClient.post("/api/admin/guides/import", body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: () => axiosClient.get("/api/admin/guides"),
  profile: (id) => axiosClient.get(`/api/guides/${id}`),
  create: (data) => axiosClient.post("/api/admin/guides", data),
  update: (id, data) => axiosClient.put(`/api/admin/guides/${id}`, data),
  team: (id) => axiosClient.get(`/api/admin/schedules/${id}/guides`),
  assign: (id, data, reason) =>
    axiosClient.put(`/api/admin/schedules/${id}/guides`, data, { params: { reason } }),
  bookingTeam: (id, admin = false) =>
    axiosClient.get(`/api/${admin ? "admin/" : ""}bookings/${id}/guides`),
  upload: (id, file) => {
    const body = new FormData();
    body.append("file", file);
    return axiosClient.post(`/api/admin/guides/${id}/avatar`, body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
