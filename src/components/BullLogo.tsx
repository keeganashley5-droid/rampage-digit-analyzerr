import React, { useState } from 'react';

interface BullLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
  borderStyle?: 'gold' | 'subtle' | 'none';
}

/**
 * Official RAMPAGE TRADERS Golden Bull Emblem.
 * Employs the authentic gold medallion artwork with polished metallic border,
 * subtle warm ambient glow, and high-fidelity fallback rendering.
 */
export const BullLogo: React.FC<BullLogoProps> = ({
  className = 'w-9 h-9',
  size,
  glow = true,
  borderStyle = 'gold',
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const logoSrc = '/assets/aistudio/IMG-20260901-WA0076_f88edee2.jpg';

  const dimensionStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  const glowClass = glow
    ? 'shadow-[0_0_20px_rgba(245,158,11,0.45)] drop-shadow-[0_0_12px_rgba(234,179,8,0.5)]'
    : '';

  const borderClass =
    borderStyle === 'gold'
      ? 'ring-2 ring-amber-400/80 border border-yellow-300/60'
      : borderStyle === 'subtle'
      ? 'ring-1 ring-amber-500/30 border border-slate-700/60'
      : '';

  if (imageFailed) {
    // Elegant gold geometric fallback
    return (
      <div
        style={dimensionStyle}
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-amber-600 via-amber-950 to-slate-950 ${borderClass} ${glowClass} ${className}`}
      >
        <span className="font-mono font-black text-amber-300 text-xs tracking-wider">RT</span>
      </div>
    );
  }

  return (
    <div
      style={dimensionStyle}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden transition-transform duration-200 select-none ${borderClass} ${glowClass} ${className}`}
    >
      <img
        src={logoSrc}
        alt="RAMPAGE TRADERS - Gold Bull Logo"
        onError={() => setImageFailed(true)}
        className="w-full h-full object-cover object-center rounded-full transform scale-[1.03] transition-all"
        loading="eager"
      />
      {/* Subtle liquid gold rim shine overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-amber-400/10 to-transparent pointer-events-none" />
    </div>
  );
};
