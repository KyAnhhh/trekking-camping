export const TIME_THEMES = [
  {
    id: 'morning',
    label: 'Bình minh',
    hours: '05:00–10:59',
    greeting: 'Khởi đầu ngày mới',
    note: 'Một khởi đầu trong lành cùng ánh nắng sớm',
    accentColor: '#fcd34d',
  },
  {
    id: 'noon',
    label: 'Ban trưa',
    hours: '11:00–14:59',
    greeting: 'Trời xanh rực rỡ',
    note: 'Theo những khoảng trời xanh ngút ngàn',
    accentColor: '#bef264',
  },
  {
    id: 'afternoon',
    label: 'Hoàng hôn',
    hours: '15:00–18:59',
    greeting: 'Nắng chiều buông nhẹ',
    note: 'Chậm lại cùng ánh hoàng hôn ấm áp',
    accentColor: '#fdba74',
  },
  {
    id: 'night',
    label: 'Ban đêm',
    hours: '19:00–04:59',
    greeting: 'Đêm ngàn sao',
    note: 'Bầu trời đêm huyền ảo bên ánh lửa trại',
    accentColor: '#c7d2fe',
  },
];

// Returns the active theme based on browser device local time
export function timeThemeAt(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 15) return 'noon';
  if (hour >= 15 && hour < 19) return 'afternoon';
  return 'night';
}

export function nextClockCheck(date = new Date()) {
  return 60000 - (date.getSeconds() * 1000 + date.getMilliseconds());
}
