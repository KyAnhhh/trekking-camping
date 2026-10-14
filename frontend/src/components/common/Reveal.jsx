import { useEffect, useRef } from 'react';

export default function Reveal({ as: Tag = 'section', className = '', children, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!node || !('IntersectionObserver' in window) || reduced.matches) return;
    // Visible by default: no JS, unsupported observers or initial above-fold content stay readable.
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    node.classList.add('reveal-pending');
    const show = () => { node.classList.remove('reveal-pending'); observer.disconnect(); };
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) show(); }, { threshold: 0.06 });
    observer.observe(node);
    node.addEventListener('focusin', show);
    reduced.addEventListener('change', show);
    return () => { observer.disconnect(); node.classList.remove('reveal-pending'); node.removeEventListener('focusin', show); reduced.removeEventListener('change', show); };
  }, []);
  return <Tag ref={ref} className={`reveal-section ${className}`} {...props}>{children}</Tag>;
}
