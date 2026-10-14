import { useEffect, useState } from 'react';
import { nextClockCheck, timeThemeAt } from '../utils/timeTheme';

export default function useTimeTheme() {
  const [mode, setMode] = useState('auto');
  const [localTheme, setLocalTheme] = useState(() => timeThemeAt(new Date()));
  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      setLocalTheme(timeThemeAt(now));
      if (!document.hidden) timer = setTimeout(update, nextClockCheck(now));
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
  return { mode, setMode, theme: mode === 'auto' ? localTheme : mode };
}
