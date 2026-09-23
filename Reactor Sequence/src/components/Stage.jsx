import { BACKGROUNDS } from '../assets'

/**
 * Full-screen page wrapper.
 * The background image is shown whole (never cropped) inside a "stage" that keeps
 * the image's aspect ratio, so overlays can be placed in % of the artwork.
 * Any leftover screen space is filled with a blurred copy of the same image.
 * Children can size themselves with `cqw` / `cqh` units (stage = size container).
 */
export default function Stage({ name, children, className = '' }) {
  const bg = BACKGROUNDS[name]
  const ratio = bg.w / bg.h

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#02040c] select-none" data-page={name}>
      <img
        src={bg.src}
        alt=""
        aria-hidden="true"
        draggable="false"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
      />
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden shadow-[0_0_80px_40px_rgba(0,0,0,0.55)] ${className}`}
        style={{
          width: `min(100vw, calc(100dvh * ${ratio}))`,
          aspectRatio: `${bg.w} / ${bg.h}`,
          containerType: 'size',
          backgroundImage: `url("${bg.src}")`,
          backgroundSize: '100% 100%',
        }}
      >
        {children}
      </div>
    </div>
  )
}
