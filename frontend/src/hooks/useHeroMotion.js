import { useEffect } from 'react';

export default function useHeroMotion(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 801px)');
    let visible = true;
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (!visible || document.hidden || reduced.matches || !desktop.matches) return;
      const offset = Math.max(-18, Math.min(18, -node.getBoundingClientRect().top * 0.035));
      node.style.setProperty('--hero-parallax', `${offset}px`);
    };
    const update = () => {
      node.dataset.motion = visible && !document.hidden && !reduced.matches ? 'running' : 'paused';
      if (reduced.matches || !desktop.matches) node.style.setProperty('--hero-parallax', '0px');
      if (!frame && visible && !document.hidden && !reduced.matches && desktop.matches) frame = requestAnimationFrame(paint);
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }) : null;
    observer?.observe(node);
    window.addEventListener('scroll', update, { passive: true });
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    desktop.addEventListener('change', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', update);
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener('change', update);
      desktop.removeEventListener('change', update);
    };
  }, [ref]);
}
