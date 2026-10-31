import { useEffect } from 'react';
import gsap from 'gsap';

/**
 * Custom hook to add GSAP-powered interactive 3D perspective tilt and thumbnail parallax to an element.
 * Automatically respects prefers-reduced-motion and touch screens.
 */
export default function use3DTilt(elementRef, options = {}) {
  const {
    maxTilt = 7,
    scale = 1.018,
    perspective = 900,
    parallaxImg = true,
  } = options;

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Skip on touch-only devices or reduced motion
    const isTouch = window.matchMedia('(hover: none)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || reducedMotion) return;

    let rect = el.getBoundingClientRect();

    const onMouseEnter = () => {
      rect = el.getBoundingClientRect();
    };

    const onMouseMove = (e) => {
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

      gsap.to(el, {
        rotationY: x * maxTilt * 2,
        rotationX: -y * maxTilt * 2,
        scale: scale,
        transformPerspective: perspective,
        transformOrigin: 'center center',
        ease: 'power2.out',
        duration: 0.35,
        overwrite: 'auto',
      });

      if (parallaxImg) {
        const img = el.querySelector('img');
        if (img) {
          gsap.to(img, {
            x: x * 8,
            y: y * 8,
            scale: 1.06,
            ease: 'power2.out',
            duration: 0.35,
            overwrite: 'auto',
          });
        }
      }
    };

    const onMouseLeave = () => {
      gsap.to(el, {
        rotationY: 0,
        rotationX: 0,
        scale: 1,
        ease: 'power3.out',
        duration: 0.6,
        overwrite: 'auto',
      });

      if (parallaxImg) {
        const img = el.querySelector('img');
        if (img) {
          gsap.to(img, {
            x: 0,
            y: 0,
            scale: 1,
            ease: 'power3.out',
            duration: 0.6,
            overwrite: 'auto',
          });
        }
      }
    };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
      gsap.killTweensOf(el);
      const img = el.querySelector('img');
      if (img) gsap.killTweensOf(img);
    };
  }, [elementRef, maxTilt, scale, perspective, parallaxImg]);
}
