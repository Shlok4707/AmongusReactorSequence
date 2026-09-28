import { BACKGROUNDS } from '../assets'

/*
 * Full-screen page wrapper — sized ONLY with vw / vh, so every background fills any screen.
 *
 * The page is exactly 100vw x 100vh. Inside it, the artwork is sized to COVER the screen:
 *     width:  max(100vw, 100vh * ratio)
 *     height: max(100vh, 100vw / ratio)
 * Both use the image's own ratio, so it is never stretched or squashed; on screens with a
 * different shape the extra artwork simply runs past the screen edges.
 *
 * `children` are placed in % of the artwork (they stay glued to the painting) and can be
 * sized with `cqw` (1cqw = 1% of the artwork's rendered width).
 * `overlay` is pinned to the SCREEN (for HUD, titles, buttons) and positioned with vw / vh.
 *
 * Horizontally the artwork is always centred. Vertically it is centred too, except that a
 * background may set `keepTop` (e.g. 0.06) so wide screens never trim more than 6% off its top.
 */

const artHeight = (bg) => `max(100vh, calc(100vw * ${(bg.h / bg.w).toFixed(5)}))`
const artTop = (bg) => {
  const centred = `calc(50vh - ${artHeight(bg)} / 2)`
  return bg.keepTop ? `max(${centred}, calc(${artHeight(bg)} * ${-bg.keepTop}))` : centred
}
export default function Stage({ name, children, overlay }) {
  const bg = BACKGROUNDS[name]
  const ratio = bg.w / bg.h

  return (
    <div
      className="fixed left-0 top-0 overflow-hidden select-none bg-[#02040c]"
      style={{ width: '100vw', height: '100vh' }}
      data-page={name}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2"
        data-testid="stage"
        style={{
          top: artTop(bg),
          width: `max(100vw, calc(100vh * ${ratio}))`,
          height: `max(100vh, calc(100vw / ${ratio}))`,
          containerType: 'size',
          backgroundImage: `url("${bg.src}")`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {children}
      </div>

      {overlay && (
        <div className="pointer-events-none absolute left-0 top-0" style={{ width: '100vw', height: '100vh' }}>
          {overlay}
        </div>
      )}
    </div>
  )
}

/**
 * CSS (vw/vh only) for "the screen position of a point on the artwork", clamped so it never
 * leaves the screen. `f` = fraction of the artwork height (0 = top, 1 = bottom).
 *   artY(name, 0.9, { max: '93vh' })  -> never lower than 93vh
 *   artY(name, 0.13, { min: '7vh' })  -> never higher than 7vh
 */
export function artY(name, f, { min, max } = {}) {
  const bg = BACKGROUNDS[name]
  let y = `calc(${artTop(bg)} + ${artHeight(bg)} * ${f.toFixed(4)})`
  if (max) y = `min(${y}, ${max})`
  if (min) y = `max(${y}, ${min})`
  return y
}
