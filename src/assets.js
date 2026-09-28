// Backgrounds — keyed by the exact page/background names from the spec.
import homePageBg from './assets/screen bg/home pg bg.jpeg'
import timerBg from './assets/screen bg/timer bg.PNG'
import mainGameBg from './assets/screen bg/main game bg.jpg'
import finalBg from './assets/screen bg/final bg.jpg'

// Kill animation sprites (black backgrounds removed -> transparent PNGs).
import killer from './assets/kill animation/killer.png'
import lost from './assets/kill animation/lost.png'
import fire from './assets/kill animation/fire.png'

// w/h are the native pixel sizes; UI overlays are positioned in % of these.
export const BACKGROUNDS = {
  'home page bg': { src: homePageBg, w: 1600, h: 900 },
  'timer bg': { src: timerBg, w: 1672, h: 941 },
  // keepTop: on wide screens, never trim more than this fraction off the top (keeps the painted sign visible)
  'main game bg': { src: mainGameBg, w: 1536, h: 1024, keepTop: 0.06 },
  'final bg': { src: finalBg, w: 1536, h: 1024 },
}

export const SPRITES = { killer, lost, fire }

export const ALL_IMAGES = [
  ...Object.values(BACKGROUNDS).map((b) => b.src),
  killer,
  lost,
  fire,
]
