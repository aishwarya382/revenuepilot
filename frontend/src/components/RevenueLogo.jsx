import React, { useState } from 'react';

export default function RevenueLogo({ size = 64, withGlow = true, animated = true, className = '' }) {
  const [isHovered, setIsHovered] = useState(false);
  const width = size;
  const height = (size * 60) / 64;

  return (
    <div
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        flexShrink: 0,
        cursor: 'pointer'
      }}
    >
      {/* 1. ULTRA-LUMINOUS MULTI-LAYER NEON GLOW */}
      {withGlow && (
        <>
          {/* Deep Ambient Aurora Bloom */}
          <div
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(99, 102, 241, 0.3) 40%, rgba(56, 189, 248, 0.15) 65%, transparent 80%)',
              filter: 'blur(16px)',
              opacity: isHovered ? 1 : 0.8,
              transform: isHovered ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.4s ease',
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />

          {/* Focal Cyan Ray at the Arrow Tip */}
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-4px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.8) 0%, rgba(168, 85, 247, 0.3) 60%, transparent 80%)',
              filter: 'blur(8px)',
              opacity: isHovered ? 1 : 0.7,
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        </>
      )}

      {/* 2. HYPER-STYLISH VECTOR R + PHOTON GROWTH ARROW */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 84 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'relative',
          zIndex: 1,
          overflow: 'visible',
          filter: isHovered
            ? 'drop-shadow(0 8px 24px rgba(147, 51, 234, 0.5)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.4))'
            : 'drop-shadow(0 4px 14px rgba(124, 58, 237, 0.32)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12))',
          transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <defs>
          {/* Main "R" Body Gradient - Iridescent Velvet Orchid to Electric Violet */}
          <linearGradient id="ultraRBodyGrad" x1="8" y1="12" x2="60" y2="66" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e9d5ff" />
            <stop offset="25%" stopColor="#c084fc" />
            <stop offset="60%" stopColor="#9333ea" />
            <stop offset="90%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Glass Specular Rim Light Gradient */}
          <linearGradient id="specularRimGrad" x1="14" y1="12" x2="56" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="80%" stopColor="#c084fc" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Upward Growth Photon Beam Shaft Gradient */}
          <linearGradient id="ultraShaftGrad" x1="20" y1="60" x2="76" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="25%" stopColor="#d946ef" />
            <stop offset="55%" stopColor="#8b5cf6" />
            <stop offset="85%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>

          {/* Arrowhead High-Velocity Gradient */}
          <linearGradient id="ultraHeadGrad" x1="58" y1="20" x2="82" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="45%" stopColor="#6366f1" />
            <stop offset="80%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Sparkle Node Star Gradient */}
          <linearGradient id="starNodeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Shadow Filter for 3D Overlapping Depth */}
          <filter id="layerDepth" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="1" dy="3" stdDeviation="2.5" floodColor="#1e1b4b" floodOpacity="0.38" />
          </filter>
        </defs>

        {/* ================= 1. THE GEOMETRIC "R" MONOGRAM ARCHITECTURE ================= */}
        <g id="r-frame-group">
          {/* Main Outer Ribbon Body */}
          <path
            d="M 18 13 
               L 42 13 
               C 53 13 60 19.5 60 29 
               C 60 38.5 53 45 42 45 
               L 26 45 
               L 26 36.5 
               L 41 36.5 
               C 47 36.5 51 33 51 29 
               C 51 25 47 21.5 41 21.5 
               L 23 21.5 
               L 13 62 
               L 4 62 
               L 15 16 
               C 15.6 14.2 16.6 13 18 13 
               Z"
            fill="url(#ultraRBodyGrad)"
            filter="url(#layerDepth)"
          />

          {/* Precision Glass Bevel Top Highlight (Glossy Specular Reflection) */}
          <path
            d="M 18 13.5 L 42 13.5 C 51.5 13.5 58 19 59.2 27.5 C 58.2 20.5 52 15 42 15 L 18 15 C 16.8 15 16 15.8 15.5 17 L 15 16 C 15.6 14.2 16.6 13.5 18 13.5 Z"
            fill="url(#specularRimGrad)"
          />

          {/* Inner Loop Glass Highlight Arc */}
          <path
            d="M 23 21.5 L 41 21.5 C 46 21.5 49.5 24 50.2 27.5 C 49 24.5 45.5 22.8 41 22.8 L 23 22.8 Z"
            fill="#ffffff"
            fillOpacity="0.5"
          />

          {/* Sleek Left Spine Edge Glow Accent */}
          <path
            d="M 15 16 L 4.5 61 L 6.5 61 L 16.5 16.5 Z"
            fill="#ffffff"
            fillOpacity="0.25"
          />
        </g>

        {/* ================= 2. THE DYNAMIC RISING GROWTH ARROW (PHOTON BEAM) ================= */}
        <g id="rising-arrow-group">
          {/* Main Ascending Checkmark Shaft */}
          <path
            d="M 24 38 
               L 33 53 
               C 33.8 54.4 35.8 54.4 36.6 53 
               L 64 15 
               L 70 19 
               L 37.8 60 
               C 36 62.4 32.8 62.4 31 60 
               L 18 39.5 
               Z"
            fill="url(#ultraShaftGrad)"
            filter="url(#layerDepth)"
          />

          {/* Photon Core Laser Reflection Stripe inside shaft */}
          <path
            d="M 23.5 39.5 L 34.5 56.5 C 34.8 57 35.4 57 35.7 56.5 L 66 17 L 64.5 16 L 35.2 55.2 L 24.5 39 Z"
            fill="#ffffff"
            fillOpacity="0.65"
          />

          {/* Aerodynamic Multi-Faceted Arrowhead (Chevron / Pilot Fin ↗) */}
          <path
            d="M 80 4 
               L 56 10.5 
               L 64 18 
               L 76 30 
               Z"
            fill="url(#ultraHeadGrad)"
            filter="url(#layerDepth)"
          />

          {/* Arrowhead Top Gloss Bevel Facet */}
          <path
            d="M 80 4 L 56 10.5 L 64 18 Z"
            fill="#ffffff"
            fillOpacity="0.4"
          />

          {/* Arrowhead Core Hotspot Point */}
          <circle cx="79.5" cy="4.5" r="2.2" fill="#ffffff" filter="drop-shadow(0 0 6px #38bdf8)" />

          {/* Ambient Intelligence Micro-Sparkle Star 1 */}
          <path
            d="M 72 2 C 72 4.5 70.8 5.5 68 5.5 C 70.8 5.5 72 6.5 72 9 C 72 6.5 73.2 5.5 76 5.5 C 73.2 5.5 72 4.5 72 2 Z"
            fill="url(#starNodeGrad)"
            filter="drop-shadow(0 0 4px #67e8f9)"
          />

          {/* Micro-Sparkle Star 2 */}
          <circle cx="81" cy="16" r="1.2" fill="#e0f2fe" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
}
