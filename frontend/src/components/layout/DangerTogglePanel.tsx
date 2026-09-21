import { CornerBolts } from '../shared/CornerBolts';

interface DangerTogglePanelProps {
  active: boolean;
}

export function DangerTogglePanel({ active }: DangerTogglePanelProps) {
  return (
    <div className="hazard-stripe w-[124px] rounded-lg p-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
      <div
        className="relative rounded-[6px] px-3 py-3 text-center"
        style={{
          background: 'linear-gradient(180deg, #3a0d0d 0%, var(--color-alert-red-dark) 60%, #180404 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <CornerBolts inset={5} />
        <p
          className="text-[11px] font-bold uppercase leading-tight tracking-wider text-[#ff5c5c]"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          Danger
          <br />
          Reactor
          <br />
          Online
        </p>

        {/* switch housing */}
        <div
          className="mx-auto mt-3 flex h-[44px] w-[44px] items-center justify-center rounded-full border border-black/70"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #2a2c2f 0%, #101112 70%)',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.85)',
          }}
        >
          {/* raised toggle lever */}
          <div
            className={`h-[62%] w-[62%] rounded-full border transition-all duration-200 ${
              active ? 'glow-red border-[#7a0f0f]' : 'border-black/60'
            }`}
            style={{
              background: active
                ? 'linear-gradient(155deg, #ff6b6b 0%, #d61818 45%, #7a0f0f 100%)'
                : 'linear-gradient(155deg, #4a1616 0%, #300c0c 60%, #1a0606 100%)',
              boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.25), inset 0 -3px 4px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
