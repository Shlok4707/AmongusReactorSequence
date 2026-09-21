/** Purely decorative background pipe routing, matching the reference image's cabling along the frame edges. */
export function PipeRouting() {
  const leftPath = 'M60 130 C 20 170, 20 260, 60 320 C 100 380, 40 430, 40 520 L 40 760';
  const rightPath = 'M1540 140 C 1575 190, 1575 260, 1540 310 C 1505 360, 1560 420, 1560 500 L 1560 760';

  return (
    <svg
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-95"
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#565a60" />
          <stop offset="55%" stopColor="#26282b" />
          <stop offset="100%" stopColor="#0c0d0e" />
        </linearGradient>
        <radialGradient id="collarGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#6a6e74" />
          <stop offset="55%" stopColor="#303336" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
      </defs>

      {[leftPath, rightPath].map((d) => (
        <g key={d}>
          {/* black outline edge, drawn wider and behind the fill */}
          <path d={d} fill="none" stroke="#000" strokeOpacity="0.7" strokeWidth="18" strokeLinecap="round" />
          {/* pipe body */}
          <path d={d} fill="none" stroke="url(#pipeGrad)" strokeWidth="14" strokeLinecap="round" />
          {/* directional highlight, offset toward the (top-left) light source */}
          <g transform="translate(-3,-3)">
            <path d={d} fill="none" stroke="#9a9ea4" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
          </g>
          {/* warm ambient tint from the alert lamp / switch */}
          <path d={d} fill="none" stroke="#8a2020" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
        </g>
      ))}

      {/* flanged collar joints */}
      {[
        [60, 130],
        [60, 320],
        [40, 520],
        [1540, 140],
        [1540, 310],
        [1560, 500],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="15" fill="url(#collarGrad)" stroke="#000" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="9" fill="none" stroke="#0a0a0a" strokeWidth="2" />
          {/* bolt heads around the collar rim */}
          {[0, 90, 180, 270].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const bx = cx + Math.cos(rad) * 12;
            const by = cy + Math.sin(rad) * 12;
            return <circle key={angle} cx={bx} cy={by} r="1.6" fill="#8d9096" />;
          })}
        </g>
      ))}
    </svg>
  );
}
