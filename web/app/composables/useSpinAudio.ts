// ─── Audio chiptune procédural (Web Audio) ───────────────────────────────────
// Musique + bruitages générés à la volée (oscillateurs), sans aucun asset ni
// souci de droits. Deux thèmes bouclés (aventure / combat), un jingle de
// victoire, et des SFX courts. Un seul AudioContext partagé (singleton module),
// démarré au premier geste utilisateur (politique d'autoplay des navigateurs).

type TrackName = 'adventure' | 'battle'
interface Voice { bass: number[], arp: number[], mel: number[], perc?: number[] }
interface Track { bpm: number, steps: number, voice: Voice }

// Note → MIDI (C4 = 60). Ex. 'A4' = 69. 0 = silence.
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
function m(name: string): number {
  if (!name) return 0
  const s = name.match(/^([A-G])(#?)(-?\d)$/)
  if (!s) return 0
  return 12 + (SEMI[s[1] as string] as number) + (s[2] ? 1 : 0) + Number(s[3]) * 12
}
const seq = (str: string) => str.trim().split(/\s+/).map(m)

// Motifs (résolution croche). 32 pas = 4 mesures.
const ADVENTURE: Track = {
  bpm: 116, steps: 32,
  voice: {
    bass: seq('C2 . G2 . C2 . E2 .  G2 . D3 . G2 . B2 .  A2 . E3 . A2 . C3 .  F2 . C3 . F2 . A2 .'),
    arp: seq('C4 E4 G4 E4 C4 E4 G4 E4  D4 G4 B4 G4 D4 G4 B4 G4  E4 A4 C5 A4 E4 A4 C5 A4  F4 A4 C5 A4 F4 A4 C5 A4'),
    mel: seq('E5 . D5 . C5 . E5 .  D5 . B4 . D5 . G4 .  C5 . A4 . E5 . C5 .  A4 . C5 . F5 . A4 .')
  }
}
const BATTLE: Track = {
  bpm: 152, steps: 32,
  voice: {
    bass: seq('A2 A2 A2 A2 A2 A2 A2 A2  F2 F2 F2 F2 F2 F2 F2 F2  C2 C2 C2 C2 C2 C2 C2 C2  G2 G2 G2 G2 G2 G2 G2 G2'),
    arp: seq('A4 C5 E5 C5 A4 C5 E5 C5  F4 A4 C5 A4 F4 A4 C5 A4  C4 E4 G4 E4 C4 E4 G4 E4  G4 B4 D5 B4 G4 B4 D5 B4'),
    mel: seq('A5 . G5 A5 . E5 . .  F5 . E5 F5 . C5 . .  E5 . G5 E5 . C5 . .  D5 . B4 D5 . G5 . .'),
    perc: seq('K . H . K . H .  K . H . K . H .  K . H . K . H .  K . H . K . H .').map((_, i) => i)
  }
}
// La perc est décrite à part (K/H) : on regénère un masque simple.
const PERC = 'K . H . K . H .  K . H . K . H .  K . H . K . H .  K . H . K . H .'.trim().split(/\s+/)
const TRACKS: Record<TrackName, Track> = { adventure: ADVENTURE, battle: BATTLE }

// ── État singleton (partagé entre tous les appels du composable) ──
let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let timer: ReturnType<typeof setInterval> | null = null
let current: TrackName | null = null
let stepIdx = 0
let nextTime = 0
const muted = ref(false)
let hydrated = false

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

function ensure(): boolean {
  if (typeof window === 'undefined') return false
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return false
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted.value ? 0 : 0.5
    master.connect(ctx.destination)
    musicGain = ctx.createGain()
    musicGain.gain.value = 0.55
    musicGain.connect(master)
    sfxGain = ctx.createGain()
    sfxGain.gain.value = 0.9
    sfxGain.connect(master)
  }
  return true
}

// Une note synthétisée (oscillateur + enveloppe).
function tone(dest: GainNode, midi: number, start: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !midi) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq(midi)
  const a = 0.008
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(vol, start + a)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(dest)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

// Percussion bruitée courte (kick / hat).
function noise(start: number, dur: number, vol: number, hp: boolean) {
  if (!ctx || !sfxGain) return
  const n = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = hp ? 'highpass' : 'lowpass'
  f.frequency.value = hp ? 5000 : 400
  const g = ctx.createGain()
  g.gain.value = vol
  src.connect(f)
  f.connect(g)
  g.connect(musicGain as GainNode)
  src.start(start)
}

function scheduler() {
  if (!ctx || !current || !musicGain) return
  const track = TRACKS[current]
  const stepDur = 60 / track.bpm / 2 // croche
  while (nextTime < ctx.currentTime + 0.12) {
    const i = stepIdx % track.steps
    const v = track.voice
    tone(musicGain, v.bass[i] as number, nextTime, stepDur * 1.8, 'triangle', 0.5)
    tone(musicGain, v.arp[i] as number, nextTime, stepDur * 0.9, 'square', 0.14)
    tone(musicGain, v.mel[i] as number, nextTime, stepDur * 1.6, 'square', 0.22)
    if (current === 'battle') {
      const perc = PERC[i % PERC.length]
      if (perc === 'K') noise(nextTime, 0.12, 0.5, false)
      else if (perc === 'H') noise(nextTime, 0.04, 0.18, true)
    }
    nextTime += stepDur
    stepIdx++
  }
}

function playMusic(track: TrackName) {
  if (!ensure() || !ctx) return
  if (current === track && timer) return
  current = track
  stepIdx = 0
  nextTime = ctx.currentTime + 0.06
  if (!timer) timer = setInterval(scheduler, 25)
}
function stopMusic() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  current = null
}

// ── Bruitages ──
function at() {
  return ctx ? ctx.currentTime : 0
}
function blip(midis: number[], type: OscillatorType, step: number, dur: number, vol = 0.5) {
  if (!ensure() || !sfxGain) return
  const t0 = at()
  midis.forEach((mi, i) => tone(sfxGain as GainNode, mi, t0 + i * step, dur, type, vol))
}
const SFX: Record<string, () => void> = {
  select: () => blip([m('E5')], 'square', 0, 0.09, 0.35),
  confirm: () => blip([m('C5'), m('G5')], 'square', 0.07, 0.12, 0.4),
  reward: () => blip([m('C5'), m('E5'), m('G5')], 'square', 0.08, 0.14, 0.4),
  coin: () => blip([m('B5'), m('E6')], 'square', 0.06, 0.12, 0.4),
  badge: () => blip([m('G4'), m('C5'), m('E5'), m('G5')], 'square', 0.09, 0.18, 0.42),
  evolve: () => blip([m('C5'), m('E5'), m('G5'), m('C6'), m('E6')], 'triangle', 0.09, 0.22, 0.4),
  capture: () => {
    blip([m('A4'), m('A4'), m('A4')], 'sine', 0.16, 0.1, 0.3)
    blip([m('E5'), m('A5')], 'square', 0.1, 0.2, 0.4)
  },
  hit: () => {
    noise(at(), 0.1, 0.5, false)
    blip([m('A3')], 'square', 0, 0.1, 0.35)
  },
  faint: () => blip([m('G4'), m('E4'), m('C4'), m('G3')], 'triangle', 0.11, 0.2, 0.4),
  victory: () => blip([m('G4'), m('C5'), m('E5'), m('G5'), m('C6')], 'square', 0.12, 0.32, 0.42)
}
function sfx(name: keyof typeof SFX) {
  if (muted.value) return
  SFX[name]?.()
}

function resume() {
  if (!ensure() || !ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
}
function setMuted(v: boolean) {
  muted.value = v
  if (typeof localStorage !== 'undefined') localStorage.setItem('spin_muted', v ? '1' : '0')
  if (master && ctx) master.gain.setTargetAtTime(v ? 0 : 0.5, ctx.currentTime, 0.02)
}

export function useSpinAudio() {
  if (!hydrated) {
    hydrated = true
    if (typeof localStorage !== 'undefined') muted.value = localStorage.getItem('spin_muted') === '1'
  }
  return {
    muted,
    resume,
    playMusic,
    stopMusic,
    sfx,
    toggleMute: () => setMuted(!muted.value)
  }
}
