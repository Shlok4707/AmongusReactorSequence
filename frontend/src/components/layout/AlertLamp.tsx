interface AlertLampProps {
  active: boolean;
}

export function AlertLamp({ active }: AlertLampProps) {
  return (
    <div className="relative flex h-[100px] w-[100px] items-center justify-center">
      {/* ambient glow bleeding onto the surrounding wall */}
      <div
        className="pointer-events-none absolute -inset-10 rounded-full transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle, rgba(255,35,35,0.55) 0%, rgba(255,35,35,0.15) 45%, transparent 75%)',
          opacity: active ? 1 : 0.35,
          filter: 'blur(2px)',
        }}
      />

      {/* mounting bracket / pipe stub with a flanged collar */}
      <div className="pipe absolute -right-3 top-1/2 h-2.5 w-6 -translate-y-1/2 translate-x-full" />
      <div
        className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-[calc(100%+2px)] rounded-full border border-black/70"
        style={{ background: 'radial-gradient(circle at 35% 30%, #6a6e74 0%, #303336 55%, #0a0a0a 100%)' }}
      />

      {/* lamp housing */}
      <div
        className="relative h-full w-full rounded-full border-[3px] border-black/70"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #4a1414 0%, #1a0505 65%, #0a0202 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8), 0 4px 10px rgba(0,0,0,0.6)',
        }}
      >
        {/* glass bulb */}
        <div
          className={`absolute inset-[14%] rounded-full transition-shadow duration-500 ${active ? 'glow-red' : ''}`}
          style={{
            background: active
              ? 'radial-gradient(circle at 38% 32%, #ffb3b3 0%, #ff2323 40%, #8f0f0f 85%)'
              : 'radial-gradient(circle at 38% 32%, #6b2020 0%, #451414 45%, #250b0b 90%)',
          }}
        />
        {/* wire cage: horizontal bars */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-90"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #16171a 0 2px, transparent 2px 11px)',
            mixBlendMode: 'multiply',
          }}
        />
        {/* wire cage: vertical bars */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-90"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, #16171a 0 2px, transparent 2px 11px)',
            mixBlendMode: 'multiply',
          }}
        />
        {/* rim highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-full border border-white/10" />
      </div>
    </div>
  );
}
