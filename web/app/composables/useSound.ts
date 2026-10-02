import type { CelebrationTier } from '~/types/domain'

// Port du moteur chiptune Web Audio (synthèse square-wave, zéro asset).
// Singleton AudioContext créé au 1er geste ; volume/mute via le store preferences.

let ctx: AudioContext | null = null
let master: GainNode | null = null

function ensureCtx(volume: number, muted: boolean): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  if (master) master.gain.value = muted ? 0 : volume
  return ctx
}

// Arpège de N notes (fanfare) — plus la rareté est haute, plus il est long.
function arc(a: AudioContext, out: GainNode, freqs: number[], vol: number, dur: number, gap: number) {
  freqs.forEach((freq, i) => {
    const t = a.currentTime + i * gap
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    g.gain.setValueAtTime(vol, t)
    g.gain.setValueAtTime(vol, t + dur - 0.003)
    g.gain.linearRampToValueAtTime(0, t + dur)
    osc.connect(g)
    g.connect(out)
    osc.start(t)
    osc.stop(t + dur + 0.01)
  })
}

const FANFARES: Record<CelebrationTier, number[]> = {
  'common': [392, 523],
  'rare': [262, 330, 392, 523],
  'epic': [262, 330, 392, 523, 659, 784],
  'legendary': [262, 330, 392, 523, 659, 784, 1047],
  'shiny': [262, 330, 392, 523, 659, 784, 1047, 1319],
  'shiny-legendary': [262, 330, 392, 523, 659, 784, 1047, 1319, 1568]
}

export function useSound() {
  const prefs = usePreferencesStore()

  function resume() {
    ensureCtx(prefs.volume, prefs.muted)
  }

  function tick() {
    const a = ensureCtx(prefs.volume, prefs.muted)
    if (!a || !master) return
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = 'square'
    osc.frequency.value = 1100
    const t = a.currentTime
    g.gain.setValueAtTime(0.12, t)
    g.gain.setValueAtTime(0.12, t + 0.007)
    g.gain.linearRampToValueAtTime(0, t + 0.01)
    osc.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + 0.02)
  }

  function fanfare(tier: CelebrationTier) {
    const a = ensureCtx(prefs.volume, prefs.muted)
    if (!a || !master) return
    arc(a, master, FANFARES[tier], 0.11, 0.1, 0.065)
  }

  function coin() {
    const a = ensureCtx(prefs.volume, prefs.muted)
    if (!a || !master) return
    arc(a, master, [523, 659, 784], 0.08, 0.08, 0.08)
  }

  return { resume, tick, fanfare, coin }
}
