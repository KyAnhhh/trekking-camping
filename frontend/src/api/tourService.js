import axiosClient from "./axiosClient";
import { invalidateCache } from "../utils/cache";

export const tourApi = {
  adminList: () => axiosClient.get("/api/admin/tours"),
  adminDetail: (slug) =>
    axiosClient.get(`/api/admin/tours/${encodeURIComponent(slug)}`),
  update: (id, data) =>
    axiosClient.put(`/api/admin/tours/${id}`, data).then((res) => {
      invalidateCache("tours");
      invalidateCache("tour");
      return res;
    }),
  setActive: (id, active) =>
    axiosClient.put(`/api/admin/tours/${id}/active`, { active }).then((res) => {
      invalidateCache("tours");
      invalidateCache("tour");
      return res;
    }),
  updateSchedule: (tourId, id, data) =>
    axiosClient.put(`/api/admin/tours/${tourId}/schedules/${id}`, data).then((res) => {
      invalidateCache("tours");
      invalidateCache("tour");
      return res;
    }),
  adminImages: (id) => axiosClient.get(`/api/admin/tours/${id}/images`),
  importTours: (file) => {
    const data = new FormData();
    data.append("file", file);
    return axiosClient.post("/api/admin/tours/import", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => {
      invalidateCache("tours");
      invalidateCache("tour");
      return res;
    });
  },
  getImages: (tourId, signal) => axiosClient.get(`/api/tours/${tourId}/images`, { signal }),
  uploadImage: (tourId, file) => {
    const data = new FormData();
    data.append("file", file);
    return axiosClient.post(`/api/tours/${tourId}/images`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => {
      invalidateCache("tours");
      invalidateCache("tour");
      return res;
    });
  },
  setCover: (tourId, imageId) =>
    axiosClient.post(`/api/tours/${tourId}/images/${imageId}/cover`).then((res) => {
      invalidateCache("tours");
      invalidateCache("tour");
      return res;
    }),
  deleteImage: (tourId, imageId) =>
    axiosClient.delete(`/api/tours/${tourId}/images/${imageId}`).then((res) => {
      invalidateCache("tours");
      invalidateCache("tour");
      return res;
    }),
  // 1. Tạo Tour mới
  createTour: (tourData) =>
    axiosClient.post("/api/tours", tourData).then((res) => {
      invalidateCache("tours");
      return res;
    }),

  // 2. Lấy danh sách tất cả Tour
  getAllTours: (signal) => axiosClient.get("/api/tours", signal ? { signal } : undefined),

  // 3. Lấy thông tin Tour theo Slug
  getTourBySlug: (slug, signal) => axiosClient.get(`/api/tours/${encodeURIComponent(slug)}`, signal ? { signal } : undefined),

  // 4. Thêm & Lấy Lịch trình (Itinerary)
  addItinerary: (tourId, data) =>
    axiosClient.post(`/api/tours/${tourId}/itineraries`, data).then((res) => {
      invalidateCache("tour");
      return res;
    }),
  getItineraries: (tourId, signal) =>
    axiosClient.get(`/api/tours/${tourId}/itineraries`, signal ? { signal } : undefined),

  // 5. Thêm & Lấy Lịch khởi hành (Schedule)
  addSchedule: (tourId, data) =>
    axiosClient.post(`/api/tours/${tourId}/schedules`, data).then((res) => {
      invalidateCache("tour");
      return res;
    }),
  getSchedules: (tourId, signal) => axiosClient.get(`/api/tours/${tourId}/schedules`, signal ? { signal } : undefined),

  // 6. Thêm & Lấy Trang thiết bị (Gear)
  addGear: (tourId, data) =>
    axiosClient.post(`/api/tours/${tourId}/gears`, data).then((res) => {
      invalidateCache("tour");
      return res;
    }),
  getGears: (tourId, signal) => axiosClient.get(`/api/tours/${tourId}/gears`, signal ? { signal } : undefined),
};
