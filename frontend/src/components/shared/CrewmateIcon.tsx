interface CrewmateIconProps {
  className?: string;
  variant?: 'outline' | 'filled';
}

/**
 * Classic Among Us crewmate silhouette: a true "bean" body (bezier path,
 * not a rounded rect), an offset visor with a two-stroke reflection sheen,
 * a rear backpack, and two legs - clean, uniform-weight outline strokes
 * throughout, matching the reference's proportions.
 */
export function CrewmateIcon({ className, variant = 'outline' }: CrewmateIconProps) {
  const isFilled = variant === 'filled';
  const fill = isFilled ? 'currentColor' : 'none';

  return (
    <svg viewBox="0 0 100 132" className={className} fill="none">
      {/* backpack (rear) */}
      <path
        d="M6 52c0-6 5-10 11-10h6v38h-6c-6 0-11-4-11-10V52Z"
        fill={fill}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* legs */}
      <path
        d="M30 100h16v16a8 8 0 0 1-8 8 8 8 0 0 1-8-8v-16Z"
        fill={fill}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M54 100h16v16a8 8 0 0 1-8 8 8 8 0 0 1-8-8v-16Z"
        fill={fill}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* bean-shaped body: rounded dome top, gentle belly curve, flat-ish base */}
      <path
        d="M20 66
           C20 34 30 8 52 8
           C74 8 82 30 82 52
           C82 70 78 84 72 92
           C66 100 56 104 46 104
           C34 104 24 98 20 86
           C18 80 19 72 20 66 Z"
        fill={fill}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* visor - offset toward the top-right, overlapping the body outline */}
      <path
        d="M40 30
           C40 18 50 10 62 10
           C76 10 86 20 86 33
           C86 44 78 51 66 51
           C52 51 40 43 40 30 Z"
        fill="#0b0f0e"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* visor sheen: two soft reflection strokes */}
      <path d="M48 26c2-7 9-12 17-13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
      <path d="M50 34c1-3 3-6 6-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}
