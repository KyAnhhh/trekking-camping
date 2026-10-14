export const TIME_THEMES = [
  { id: 'morning', label: 'Sáng', hours: '05:00–10:59', note: 'Một khởi đầu trong lành' },
  { id: 'noon', label: 'Trưa', hours: '11:00–14:59', note: 'Theo những khoảng trời xanh' },
  { id: 'afternoon', label: 'Chiều', hours: '15:00–18:59', note: 'Chậm lại cùng nắng cuối ngày' },
  { id: 'night', label: 'Tối', hours: '19:00–04:59', note: 'Một đêm gần hơn với thiên nhiên' },
];

// Browser-local time intentionally differs from the booking clock (Vietnam time).
export function timeThemeAt(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 15) return 'noon';
  if (hour >= 15 && hour < 19) return 'afternoon';
  return 'night';
}

export function nextClockCheck(date) {
  return 60000 - (date.getSeconds() * 1000 + date.getMilliseconds());
}
