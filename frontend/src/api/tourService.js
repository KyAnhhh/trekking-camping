import axiosClient from "./axiosClient";

export const tourApi = {
  adminList: () => axiosClient.get("/api/admin/tours"),
  adminDetail: (slug) =>
    axiosClient.get(`/api/admin/tours/${encodeURIComponent(slug)}`),
  update: (id, data) => axiosClient.put(`/api/admin/tours/${id}`, data),
  setActive: (id, active) =>
    axiosClient.put(`/api/admin/tours/${id}/active`, { active }),
  updateSchedule: (tourId, id, data) =>
    axiosClient.put(`/api/admin/tours/${tourId}/schedules/${id}`, data),
  adminImages: (id) => axiosClient.get(`/api/admin/tours/${id}/images`),
  importTours: (file) => {
    const data = new FormData();
    data.append("file", file);
    return axiosClient.post("/api/admin/tours/import", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getImages: (tourId) => axiosClient.get(`/api/tours/${tourId}/images`),
  uploadImage: (tourId, file) => {
    const data = new FormData();
    data.append("file", file);
    return axiosClient.post(`/api/tours/${tourId}/images`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  setCover: (tourId, imageId) =>
    axiosClient.post(`/api/tours/${tourId}/images/${imageId}/cover`),
  deleteImage: (tourId, imageId) =>
    axiosClient.delete(`/api/tours/${tourId}/images/${imageId}`),
  // 1. Tạo Tour mới
  createTour: (tourData) => axiosClient.post("/api/tours", tourData),

  // 2. Lấy danh sách tất cả Tour
  getAllTours: () => axiosClient.get("/api/tours"),

  // 3. Lấy thông tin Tour theo Slug
  getTourBySlug: (slug, signal) => axiosClient.get(`/api/tours/${encodeURIComponent(slug)}`, { signal }),

  // 4. Thêm & Lấy Lịch trình (Itinerary)
  addItinerary: (tourId, data) =>
    axiosClient.post(`/api/tours/${tourId}/itineraries`, data),
  getItineraries: (tourId) =>
    axiosClient.get(`/api/tours/${tourId}/itineraries`),

  // 5. Thêm & Lấy Lịch khởi hành (Schedule)
  addSchedule: (tourId, data) =>
    axiosClient.post(`/api/tours/${tourId}/schedules`, data),
  getSchedules: (tourId, signal) => axiosClient.get(`/api/tours/${tourId}/schedules`, { signal }),

  // 6. Thêm & Lấy Trang thiết bị (Gear)
  addGear: (tourId, data) =>
    axiosClient.post(`/api/tours/${tourId}/gears`, data),
  getGears: (tourId) => axiosClient.get(`/api/tours/${tourId}/gears`),
};
