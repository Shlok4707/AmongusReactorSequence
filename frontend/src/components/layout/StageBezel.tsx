import type { ReactNode } from 'react';

/** Positions bolts along all 4 edges of a relatively-positioned parent, not just corners. */
function EdgeBolts() {
  const positions: Array<{ top?: string; bottom?: string; left?: string; right?: string }> = [
    { top: '14px', left: '14px' },
    { top: '14px', right: '14px' },
    { bottom: '14px', left: '14px' },
    { bottom: '14px', right: '14px' },
    { top: '14px', left: '50%' },
    { bottom: '14px', left: '50%' },
  ];
  return (
    <>
      {positions.map((pos, i) => (
        <span key={i} className="bolt absolute" style={pos} />
      ))}
    </>
  );
}

export function StageBezel({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative w-[1600px] rounded-2xl border-2 border-black/80 p-[3px]"
      style={{
        background: 'linear-gradient(155deg, #3a3d42 0%, #1a1c1e 40%, #0a0a0a 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <EdgeBolts />
      <div
        className="relative overflow-hidden rounded-[14px] border border-black/70"
        style={{
          background: 'radial-gradient(120% 90% at 50% 0%, #0c0d0e 0%, #020202 70%)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
