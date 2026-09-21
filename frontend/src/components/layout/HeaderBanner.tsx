import { CrewmateIcon } from '../shared/CrewmateIcon';
import { CornerBolts } from '../shared/CornerBolts';

export function HeaderBanner() {
  return (
    <div className="relative flex w-full items-stretch overflow-hidden rounded-md border border-black/80 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <div className="hazard-stripe w-10 shrink-0" />
      <div
        className="relative flex flex-1 flex-col items-center justify-center gap-1.5 px-6 py-5"
        style={{
          background:
            'radial-gradient(120% 160% at 50% -20%, rgba(57,255,20,0.06) 0%, transparent 55%), linear-gradient(180deg, var(--color-header-bg) 0%, var(--color-header-bg-dark) 100%)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <CornerBolts inset={8} />
        <div className="flex items-center gap-4">
          <h1 className="title-engraved text-[54px] font-black uppercase leading-none tracking-[0.08em]">
            Reactor Sequence
          </h1>
          <CrewmateIcon className="h-11 w-11 shrink-0 text-[#e8e8e6] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />
        </div>
        <p className="text-[15px] font-semibold uppercase tracking-[0.35em] text-neon-green [text-shadow:0_0_8px_rgba(57,255,20,0.6)]">
          — Memorize and repeat the pattern —
        </p>
      </div>
      <div className="hazard-stripe w-10 shrink-0" />
    </div>
  );
}
