// Sizes are separate classes (not overrides) so Tailwind never has two competing values.
const SIZES = {
  md: 'rounded-[0.9cqw] border-[0.22cqw] px-[3.4cqw] py-[1cqw] text-[2cqw]',
  sm: 'rounded-[0.7cqw] border-[0.18cqw] px-[2.2cqw] py-[0.7cqw] text-[1.3cqw]',
}

export default function NeonButton({ children, onClick, style, size = 'md' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap
        ${SIZES[size]} border-cyan-300 bg-cyan-400/15
        font-display font-extrabold uppercase tracking-[0.18em] text-cyan-50
        [text-shadow:0_0_1cqw_rgba(34,211,238,0.9)] backdrop-blur-sm
        animate-[glow-pulse_2.2s_ease-in-out_infinite]
        transition-[transform,background-color] duration-150
        hover:scale-105 hover:bg-cyan-400/30 active:scale-95
        focus-visible:outline-[0.25cqw] focus-visible:outline-offset-[0.4cqw] focus-visible:outline-white`}
    >
      {children}
    </button>
  )
}
