export default function NeonButton({ children, onClick, style, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap rounded-[0.9cqw]
        border-[0.22cqw] border-cyan-300 bg-cyan-400/15 px-[3.4cqw] py-[1cqw]
        font-display text-[2cqw] font-extrabold uppercase tracking-[0.18em] text-cyan-50
        [text-shadow:0_0_1cqw_rgba(34,211,238,0.9)] backdrop-blur-sm
        animate-[glow-pulse_2.2s_ease-in-out_infinite]
        transition-[transform,background-color] duration-150
        hover:scale-105 hover:bg-cyan-400/30 active:scale-95
        focus-visible:outline-[0.25cqw] focus-visible:outline-offset-[0.4cqw] focus-visible:outline-white
        ${className}`}
    >
      {children}
    </button>
  )
}
