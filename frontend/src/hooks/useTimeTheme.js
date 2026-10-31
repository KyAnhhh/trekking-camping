import { useEffect, useState } from 'react';
import { TIME_THEMES, timeThemeAt, nextClockCheck } from '../utils/timeTheme';

function formatTimeString(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function useTimeTheme() {
  const [theme, setTheme] = useState(() => timeThemeAt(new Date()));
  const [timeString, setTimeString] = useState(() => formatTimeString(new Date()));

  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      setTheme(timeThemeAt(now));
      setTimeString(formatTimeString(now));
      if (!document.hidden) {
        timer = setTimeout(update, nextClockCheck(now));
      }
    };

    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, []);

  const currentTheme = TIME_THEMES.find((item) => item.id === theme) || TIME_THEMES[3];

  return {
    theme,
    timeString,
    currentTheme,
    isNight: theme === 'night',
  };
}
