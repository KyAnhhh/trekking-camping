import axiosClient from "./axiosClient";

export const aiVisionService = {
  checkGear: ({ file, tourId, bookingId, notes, language = "vi" }) => {
    const formData = new FormData();
    formData.append("file", file);
    if (tourId) formData.append("tourId", String(tourId));
    if (bookingId) formData.append("bookingId", String(bookingId));
    if (notes && notes.trim()) formData.append("notes", notes.trim());
    formData.append("language", language || "vi");
    return axiosClient.post("/api/ai/gear-check", formData, {
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData && headers) {
            delete headers["Content-Type"];
          }
          return data;
        },
      ],
    });
  },
};
