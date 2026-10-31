import { memo } from 'react';

/**
 * 3D Isometric Camp & Campfire Scene
 * Rich geometric expedition tent with interior lantern glow,
 * natural stone fire pit, dancing campfire flames, and drifting ember sparks.
 */
function CampScene3D({ theme = 'night' }) {
  const isNight = theme === 'night';
  const isAfternoon = theme === 'afternoon';
  const isMorning = theme === 'morning';

  return (
    <div className={`camp-scene-3d theme-${theme}`} aria-hidden="true">
      <svg
        viewBox="0 0 380 270"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="camp-svg"
      >
        <defs>
          {/* Volumetric Radial Fire Glow */}
          <radialGradient id="campFireGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={isNight ? 0.75 : 0.4} />
            <stop offset="45%" stopColor="#ea580c" stopOpacity={isNight ? 0.35 : 0.15} />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>

          {/* Lantern Warm Interior Glow */}
          <radialGradient id="tentLanternGlow" cx="45%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity={isNight ? 0.95 : 0.6} />
            <stop offset="35%" stopColor="#fbbf24" stopOpacity={isNight ? 0.8 : 0.4} />
            <stop offset="70%" stopColor="#d97706" stopOpacity={isNight ? 0.4 : 0.15} />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>

          {/* Ground Mound Shadow */}
          <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#040b0e" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#051217" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#051217" stopOpacity="0" />
          </radialGradient>

          {/* Tent Left Shaded Canvas Face */}
          <linearGradient id="tentCanvasLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            {isNight ? (
              <>
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="50%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#451a03" />
              </>
            ) : isAfternoon ? (
              <>
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="50%" stopColor="#c2410c" />
                <stop offset="100%" stopColor="#7c2d12" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </>
            )}
          </linearGradient>

          {/* Tent Right Lit Canvas Face */}
          <linearGradient id="tentCanvasRight" x1="0%" y1="0%" x2="100%" y2="100%">
            {isNight ? (
              <>
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </>
            ) : isAfternoon ? (
              <>
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="60%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#9a3412" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#d97706" />
              </>
            )}
          </linearGradient>

          {/* Tent Side Wall (Isometric Depth) */}
          <linearGradient id="tentSideWall" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#291104" />
          </linearGradient>

          {/* Flame Gradients */}
          <linearGradient id="flameOuterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>

          <linearGradient id="flameInnerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Soft blur filter for atmospheric fire glow */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Ground Shadow & Earth Mound */}
        <ellipse cx="190" cy="225" rx="160" ry="32" fill="url(#groundShadow)" />

        {/* 2. Background Pine Trees for Layered Depth */}
        <g className="camp-pines" opacity="0.65">
          {/* Left Pine Tree */}
          <polygon points="58,165 42,205 74,205" fill="#14261f" />
          <polygon points="58,145 46,180 70,180" fill="#182e25" />
          <polygon points="58,125 50,155 66,155" fill="#1c372c" />

          {/* Mid Pine Tree behind Tent */}
          <polygon points="105,145 85,195 125,195" fill="#11221b" />
          <polygon points="105,120 90,165 120,165" fill="#162c23" />
          <polygon points="105,98 94,135 116,135" fill="#1e3a2f" />

          {/* Right Pine Tree */}
          <polygon points="330,155 312,200 348,200" fill="#13241d" />
          <polygon points="330,132 318,172 342,172" fill="#183027" />
          <polygon points="330,110 322,145 338,145" fill="#1e3c31" />
        </g>

        {/* 3. Volumetric Ground Fire Glow (Pulses gently at night) */}
        {(isNight || isAfternoon) && (
          <ellipse
            cx="275"
            cy="215"
            rx="85"
            ry="40"
            fill="url(#campFireGlow)"
            className="volumetric-fire-glow"
          />
        )}

        {/* 4. The 3D Expedition Tent */}
        <g className="camp-tent-group">
          {/* Guy ropes to stakes */}
          <line x1="168" y1="85" x2="72" y2="218" stroke="#f1f5f9" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.45" />
          <line x1="262" y1="92" x2="310" y2="185" stroke="#f1f5f9" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.45" />
          <circle cx="72" cy="218" r="2.5" fill="#a16207" />
          <circle cx="310" cy="185" r="2.5" fill="#a16207" />

          {/* Tent Isometric Side Wall (shadow facet) */}
          <polygon
            points="168,85 262,92 238,188 152,192"
            fill="url(#tentSideWall)"
            opacity="0.95"
          />

          {/* Front Entrance Opening (Interior cavity) */}
          <polygon
            points="168,85 106,208 178,198"
            fill="#120a05"
          />

          {/* Warm Interior Lantern Glow emanating from inside */}
          <ellipse
            cx="148"
            cy="165"
            rx="36"
            ry="30"
            fill="url(#tentLanternGlow)"
            className="tent-lantern-halo"
          />

          {/* Small Brass Lantern inside Tent */}
          <g className="tent-lantern" opacity={isNight ? 1 : 0.7}>
            <line x1="152" y1="120" x2="152" y2="148" stroke="#94a3b8" strokeWidth="1" />
            <rect x="147" y="148" width="10" height="14" rx="2" fill="#d97706" />
            <rect x="149" y="151" width="6" height="8" rx="1" fill="#fef08a" />
          </g>

          {/* Tent Front Left Canvas Flap (Angled facet) */}
          <polygon
            points="168,85 106,208 140,202 158,110"
            fill="url(#tentCanvasLeft)"
          />

          {/* Tent Front Right Canvas Flap (Illuminated facet) */}
          <polygon
            points="168,85 178,198 202,194 182,105"
            fill="url(#tentCanvasRight)"
          />

          {/* Ridge Pole highlight */}
          <line x1="168" y1="85" x2="262" y2="92" stroke="#fef08a" strokeWidth="1.5" opacity="0.4" />

          {/* Tent Base Floor Shadow */}
          <polygon
            points="106,208 178,198 238,188 244,194 176,204 104,212"
            fill="#091419"
            opacity="0.7"
          />
        </g>

        {/* 5. Natural Campfire & Fire Pit */}
        <g className="camp-fire-group">
          {/* Fire Pit River Stones in an arc */}
          <ellipse cx="254" cy="218" rx="7" ry="4.5" fill="#475569" />
          <ellipse cx="266" cy="222" rx="8" ry="5" fill="#334155" />
          <ellipse cx="282" cy="223" rx="8.5" ry="5.5" fill="#475569" />
          <ellipse cx="296" cy="219" rx="7.5" ry="4.5" fill="#334155" />
          <ellipse cx="292" cy="212" rx="6.5" ry="4" fill="#1e293b" />
          <ellipse cx="260" cy="213" rx="6" ry="3.5" fill="#1e293b" />

          {/* Crossed Cedar Firewood Logs */}
          <line x1="256" y1="222" x2="294" y2="212" stroke="#5c2e0b" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="292" y1="222" x2="258" y2="212" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
          <circle cx="275" cy="217" r="4" fill="#b45309" opacity="0.8" />

          {/* Dynamic Campfire Flames */}
          {(isNight || isAfternoon) ? (
            <g className="flames-container">
              {/* Outer Flame (Orange) */}
              <path
                d="M275,178 C283,190 292,198 290,214 C287,222 263,222 260,214 C258,198 267,192 275,178 Z"
                fill="url(#flameOuterGrad)"
                className="flame-outer"
              />

              {/* Mid/Inner Flame (Bright Yellow) */}
              <path
                d="M275,188 C280,196 286,204 284,215 C282,221 268,221 266,215 C264,204 270,198 275,188 Z"
                fill="url(#flameInnerGrad)"
                className="flame-inner"
              />

              {/* White-Hot Core Spark */}
              <ellipse
                cx="275"
                cy="212"
                rx="4.5"
                ry="6.5"
                fill="#ffffff"
                className="flame-core"
              />

              {/* Floating Glowing Sparks & Embers rising into the night */}
              <circle cx="273" cy="172" r="1.8" fill="#fde047" className="ember ember-1" />
              <circle cx="278" cy="165" r="1.4" fill="#fb923c" className="ember ember-2" />
              <circle cx="270" cy="155" r="1.6" fill="#fef08a" className="ember ember-3" />
              <circle cx="282" cy="148" r="1.2" fill="#f97316" className="ember ember-4" />
              <circle cx="274" cy="138" r="1" fill="#fffbeb" className="ember ember-5" />
            </g>
          ) : (
            /* Gentle Daytime/Morning Smoke Wisps */
            <g className="camp-smoke" opacity="0.35">
              <path d="M275,210 Q278,195 272,180 T276,155" stroke="#cbd5e1" strokeWidth="2.5" fill="none" strokeLinecap="round" className="smoke-path-1" />
              <path d="M278,212 Q284,198 280,185 T286,162" stroke="#e2e8f0" strokeWidth="1.8" fill="none" strokeLinecap="round" className="smoke-path-2" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

export default memo(CampScene3D);
