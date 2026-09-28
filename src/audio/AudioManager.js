/*
 * AudioManager — the ONLY place the game plays sound.
 *
 *   playSequenceSound()  tile lights up during pattern playback   → src/assets/sounds/sequence-flash.mp3
 *   playButtonSound()    player taps a keypad tile                → src/assets/sounds/button-press.mp3
 *   playCountdownBeep()  3 / 2 / 1                                → src/assets/sounds/countdown beep.wav
 *   playCountdownGo()    game starts                              → src/assets/sounds/countdown go.wav
 *   playKillSound()      2 s kill animation (returns stop())      → src/assets/kill animation/kill sound.wav
 *
 * Design:
 * - Web Audio API (not <audio>): starts within a few ms, so sound lands on the same frame as
 *   the visual, and dozens of plays in a long sequence never lag or pile up.
 * - PRELOADED at startup: every file is fetched + decoded as soon as this module loads (with an
 *   OfflineAudioContext, which browsers allow before any click). The playback context is
 *   created/unlocked on the first user gesture (initAudio on Start Game).
 * - MP3 files carry encoder padding (silence) at the start; it is detected and trimmed at load,
 *   so the first audible sample plays immediately.
 * - One "voice" per UI sound: a new tile/button sound quickly fades out the previous one
 *   (6 ms) instead of stacking, so rapid taps never click, clip or glitch.
 * - Master volume for tile sounds ≈ 45%.
 */
// All sound files live in src/assets and are bundled by Vite.
import killSoundUrl from '../assets/kill animation/kill sound.wav'
import countdownBeepUrl from '../assets/sounds/countdown beep.wav'
import countdownGoUrl from '../assets/sounds/countdown go.wav'
import sequenceFlashUrl from '../assets/sounds/sequence-flash.mp3'
import buttonPressUrl from '../assets/sounds/button-press.mp3'

const SOUNDS = {
  sequence: { url: sequenceFlashUrl, volume: 0.45, voice: 'sequence' },
  button: { url: buttonPressUrl, volume: 0.45, voice: 'button' },
  countdownBeep: { url: countdownBeepUrl, volume: 0.8 },
  countdownGo: { url: countdownGoUrl, volume: 0.8 },
  kill: { url: killSoundUrl, volume: 1, skipLatency: true },
}

const buffers = {} // name -> AudioBuffer
const startOffset = {} // name -> seconds of leading silence to skip
const pending = {} // name -> raw ArrayBuffer awaiting decode by the live context (fallback)
const voices = {} // voice -> { src, gain }
let ctx = null

const decodeWith = (context, data) => new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject))

function leadingSilence(buf) {
  const data = buf.getChannelData(0)
  const limit = Math.min(data.length, Math.floor(buf.sampleRate * 0.1)) // look at most 100 ms in
  for (let i = 0; i < limit; i++) if (Math.abs(data[i]) > 0.002) return i / buf.sampleRate
  return 0
}

// ---- preload at startup ----
const OAC = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext)
const decoder = OAC ? new OAC(2, 1, 44100) : null

function store(name, buf) {
  buffers[name] = buf
  startOffset[name] = leadingSilence(buf)
}

export const audioReady = Promise.all(
  Object.entries(SOUNDS).map(([name, { url }]) =>
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => {
        pending[name] = data.slice(0)
        return decoder ? decodeWith(decoder, data) : null
      })
      .then((buf) => {
        if (buf) {
          store(name, buf)
          delete pending[name]
        }
      })
      .catch(() => {}),
  ),
)

/** Create/unlock the playback context. Call from a user gesture; safe to call repeatedly. */
export function initAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      ctx = new AC({ latencyHint: 'interactive' })
    }
    if (ctx.state === 'suspended') ctx.resume()
    // Fallback: decode anything the offline decoder could not handle, with the live context.
    Object.keys(pending).forEach((name) => {
      const data = pending[name]
      delete pending[name]
      decodeWith(ctx, data)
        .then((buf) => store(name, buf))
        .catch(() => {})
    })
  } catch {
    /* no audio support: the game still works silently */
  }
}

function play(name) {
  initAudio()
  const cfg = SOUNDS[name]
  const buf = buffers[name]
  if (!ctx || !buf) return () => {}
  const now = ctx.currentTime

  // one voice per UI sound: fade the previous instance out fast instead of stacking
  if (cfg.voice && voices[cfg.voice]) {
    const prev = voices[cfg.voice]
    try {
      prev.gain.gain.cancelScheduledValues(now)
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, now)
      prev.gain.gain.linearRampToValueAtTime(0, now + 0.006)
      prev.src.stop(now + 0.01)
    } catch {
      /* already finished */
    }
  }

  const src = ctx.createBufferSource()
  src.buffer = buf
  const gain = ctx.createGain()
  gain.gain.value = cfg.volume
  src.connect(gain).connect(ctx.destination)

  let offset = startOffset[name] || 0
  if (cfg.skipLatency) offset += Math.min(Math.max(ctx.outputLatency || ctx.baseLatency || 0, 0), 0.1)
  src.start(now, offset)

  if (cfg.voice) {
    const v = { src, gain }
    voices[cfg.voice] = v
    src.onended = () => {
      if (voices[cfg.voice] === v) delete voices[cfg.voice]
    }
  }
  return () => {
    try {
      src.stop()
    } catch {
      /* already stopped */
    }
  }
}

/** Tile lights up during pattern playback. */
export const playSequenceSound = () => play('sequence')
/** Player clicks/taps a keypad tile. */
export const playButtonSound = () => play('button')
export const playCountdownBeep = () => play('countdownBeep')
export const playCountdownGo = () => play('countdownGo')
/** Kill animation sound, offset for device output latency. Returns stop(). */
export const playKillSound = () => play('kill')
