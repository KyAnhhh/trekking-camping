import { memo } from 'react';

/**
 * Celestial Orb: Realistic Moon with craters & ethereal lunar corona for Night;
 * Radiant Sun with corona for Morning, Noon, and Afternoon.
 */
function CelestialOrb({ theme = 'night' }) {
  const isNight = theme === 'night';
  const isMorning = theme === 'morning';
  const isAfternoon = theme === 'afternoon';
  const isNoon = theme === 'noon';

  return (
    <div className={`time-orb-container theme-${theme}`} aria-hidden="true">
      {/* Outer Ethereal Halo Bloom */}
      <div className="celestial-halo" />

      {isNight ? (
        /* Detailed Moon with Crater Shading */
        <div className="moon-orb">
          <svg viewBox="0 0 100 100" fill="none" className="moon-svg">
            <defs>
              <radialGradient id="moonGrad" cx="38%" cy="38%" r="62%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="45%" stopColor="#e2e8f0" />
                <stop offset="85%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </radialGradient>
              <linearGradient id="craterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#64748b" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#334155" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            {/* Moon Sphere */}
            <circle cx="50" cy="50" r="48" fill="url(#moonGrad)" />

            {/* Subtle Lunar Maria / Craters */}
            <g opacity="0.32">
              <ellipse cx="38" cy="36" rx="9" ry="7" fill="url(#craterGrad)" />
              <ellipse cx="62" cy="42" rx="13" ry="11" fill="url(#craterGrad)" />
              <ellipse cx="44" cy="62" rx="14" ry="10" fill="url(#craterGrad)" />
              <circle cx="68" cy="66" r="6" fill="url(#craterGrad)" />
              <circle cx="30" cy="54" r="5" fill="url(#craterGrad)" />
              <circle cx="52" cy="24" r="4" fill="url(#craterGrad)" />
            </g>

            {/* Crescent Rim Highlight */}
            <circle cx="50" cy="50" r="47.5" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
          </svg>
        </div>
      ) : (
        /* Radiant Sun */
        <div className="sun-orb">
          <div className="sun-core" />
          <div className="sun-rays" />
        </div>
      )}
    </div>
  );
}

export default memo(CelestialOrb);
