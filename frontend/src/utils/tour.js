export function formatDifficulty(level) {
  return { 1: "Dễ", 2: "Trung Bình", 3: "Mạo Hiểm" }[level] || "Chưa cập nhật";
}
export const money = (value) =>
  value == null
    ? "Đang cập nhật"
    : Number(value).toLocaleString("vi-VN") + " ₫";
export const duration = (tour) =>
  (tour.durationDays || 0) + " ngày " + (tour.durationNights || 0) + " đêm";
export const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN").format(new Date(value + "T12:00:00"))
    : "Đang cập nhật";
export const todayInVietnam = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return get("year") + "-" + get("month") + "-" + get("day");
};
export const isBookable = (schedule) =>
  schedule.status === "OPEN" &&
  schedule.availableSlots > 0 &&
  schedule.departureDate > todayInVietnam();
export const landscape =
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=85";
export const campsite =
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80";
export const forest =
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80";
export const mediaUrl = (url) =>
  url?.startsWith("/api/media/")
    ? (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(
        /\/$/,
        "",
      ) + url
    : url;
export const tourImage = (tour) => mediaUrl(tour.bannerUrl) || landscape;
export const errorMessage = (error) =>
  error.response?.data?.message ||
  "Không thể thực hiện thao tác. Vui lòng thử lại.";
