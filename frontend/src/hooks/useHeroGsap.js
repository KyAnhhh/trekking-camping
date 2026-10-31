import { useEffect } from 'react';
import gsap from 'gsap';

/**
 * Advanced GSAP hook for the Hero section:
 * 1. Staggered entrance timeline for typography, CTA, 3D camp scene, and celestial orb.
 * 2. Interactive 3D mouse parallax tracking cursor across the hero.
 * 3. Continuous ambient floating physics.
 */
export default function useHeroGsap({
  heroRef,
  contentRef,
  campRef,
  orbRef,
  landscapeRef,
  mistRef,
}) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;

    // Use GSAP Context for React 18 safe cleanup
    const ctx = gsap.context(() => {
      if (reducedMotion) {
        // Simple instant/fast reveal for accessibility
        gsap.set(hero.querySelectorAll('.hero-anim-item'), { opacity: 1, y: 0 });
        if (campRef.current) gsap.set(campRef.current, { opacity: 1, scale: 1 });
        if (orbRef.current) gsap.set(orbRef.current, { opacity: 1, scale: 1 });
        return;
      }

      // --- 1. HERO ENTRANCE TIMELINE ---
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Stagger elements in content
      const liveBadge = hero.querySelector('.hero-live-pill');
      const eyebrow = hero.querySelector('.eyebrow');
      const titleLines = hero.querySelectorAll('#home-title > *');
      const desc = hero.querySelector('.hero-description');
      const cta = hero.querySelector('.hero-cta-group');

      if (liveBadge) {
        tl.fromTo(
          liveBadge,
          { opacity: 0, y: -15, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7 }
        );
      }

      if (eyebrow) {
        tl.fromTo(
          eyebrow,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4'
        );
      }

      if (titleLines && titleLines.length) {
        tl.fromTo(
          titleLines,
          { opacity: 0, y: 35 },
          { opacity: 1, y: 0, duration: 0.85, stagger: 0.15 },
          '-=0.3'
        );
      } else {
        const title = hero.querySelector('#home-title');
        if (title) {
          tl.fromTo(title, { opacity: 0, y: 35 }, { opacity: 1, y: 0, duration: 0.85 }, '-=0.3');
        }
      }

      if (desc) {
        tl.fromTo(
          desc,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.75 },
          '-=0.5'
        );
      }

      if (cta) {
        tl.fromTo(
          cta,
          { opacity: 0, scale: 0.9, y: 15 },
          { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.6)' },
          '-=0.4'
        );
      }

      // Celestial Orb Entrance
      if (orbRef.current) {
        tl.fromTo(
          orbRef.current,
          { opacity: 0, scale: 0.6, y: -25 },
          { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: 'elastic.out(1, 0.75)' },
          0.2
        );
      }

      // 3D Camp Scene Entrance
      if (campRef.current) {
        tl.fromTo(
          campRef.current,
          { opacity: 0, scale: 0.82, y: 40, rotationX: 10 },
          { opacity: 1, scale: 1, y: 0, rotationX: 0, duration: 1.2, ease: 'power3.out' },
          0.35
        );
      }

      // --- 2. AMBIENT CONTINUOUS FLOATING ---
      if (campRef.current) {
        gsap.to(campRef.current, {
          y: '-=7px',
          duration: 3.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 1.5,
        });
      }

      if (orbRef.current) {
        gsap.to(orbRef.current, {
          y: '+=6px',
          duration: 4.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 1.8,
        });
      }

      // --- 3. INTERACTIVE 3D MOUSE PARALLAX ---
      if (!isTouch) {
        let heroBounds = hero.getBoundingClientRect();

        const onResize = () => {
          heroBounds = hero.getBoundingClientRect();
        };

        const onPointerMove = (e) => {
          const x = (e.clientX - heroBounds.left) / heroBounds.width - 0.5; // -0.5 to 0.5
          const y = (e.clientY - heroBounds.top) / heroBounds.height - 0.5; // -0.5 to 0.5

          // 3D Camp scene perspective tilt + translation
          if (campRef.current) {
            gsap.to(campRef.current, {
              rotationY: x * 15,
              rotationX: -y * 10,
              x: x * 22,
              y: y * 14,
              transformPerspective: 900,
              transformOrigin: 'center bottom',
              duration: 0.7,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }

          // Celestial orb sky parallax
          if (orbRef.current) {
            gsap.to(orbRef.current, {
              x: x * 32,
              y: y * 20,
              duration: 0.9,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }

          // Landscape mountain subtle counter-shift
          if (landscapeRef.current) {
            gsap.to(landscapeRef.current, {
              x: -x * 14,
              y: -y * 8,
              duration: 1.1,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }

          // Mist drift
          if (mistRef.current) {
            gsap.to(mistRef.current, {
              x: x * 18,
              y: y * 10,
              duration: 1.4,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }
        };

        const onPointerLeave = () => {
          if (campRef.current) {
            gsap.to(campRef.current, {
              rotationY: 0,
              rotationX: 0,
              x: 0,
              y: 0,
              duration: 1,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          }
          if (orbRef.current) {
            gsap.to(orbRef.current, {
              x: 0,
              y: 0,
              duration: 1.2,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          }
          if (landscapeRef.current) {
            gsap.to(landscapeRef.current, {
              x: 0,
              y: 0,
              duration: 1.2,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          }
          if (mistRef.current) {
            gsap.to(mistRef.current, {
              x: 0,
              y: 0,
              duration: 1.4,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          }
        };

        hero.addEventListener('pointermove', onPointerMove);
        hero.addEventListener('pointerleave', onPointerLeave);
        window.addEventListener('resize', onResize);

        return () => {
          hero.removeEventListener('pointermove', onPointerMove);
          hero.removeEventListener('pointerleave', onPointerLeave);
          window.removeEventListener('resize', onResize);
        };
      }
    }, hero);

    return () => {
      ctx.revert();
    };
  }, [heroRef, contentRef, campRef, orbRef, landscapeRef, mistRef]);
}
