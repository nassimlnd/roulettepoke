import type { DomainCard } from '~/types/domain'

// Port de l'algorithme de bande existant : 20 cartes, gagnante à l'index 16,
// décélération cubic-bezier 4 s, jitter ±40 px. Le moteur ne touche pas au DOM :
// il produit un offset (px) à binder en transform, et une durée.

const STRIP_SIZE = 20
const WIN_INDEX = 16
const SPIN_MS = 4000
const REDUCED_MS = 600
const JITTER_PX = 40

export interface RouletteEngineOptions {
  cardWidth: () => number // px, mesuré par le viewport (responsive)
  gap: () => number // px entre cartes
  viewportWidth: () => number
  reducedMotion: () => boolean
}

export type RouletteState = 'idle' | 'spinning' | 'revealed'

export function useRouletteEngine(opts: RouletteEngineOptions) {
  const strip = ref<DomainCard[]>([])
  const offset = ref(0)
  const durationMs = ref(0)
  const state = ref<RouletteState>('idle')

  // Construit la bande : le pool remplit les 19 leurres, la gagnante à WIN_INDEX.
  function buildStrip(winner: DomainCard, pool: DomainCard[]) {
    const cards: DomainCard[] = []
    const src = pool.length ? pool : [winner]
    for (let i = 0; i < STRIP_SIZE; i++) {
      cards.push(i === WIN_INDEX ? winner : src[i % src.length]!)
    }
    strip.value = cards
  }

  function pitch() {
    return opts.cardWidth() + opts.gap()
  }

  // Offset pour centrer la carte gagnante sous le pointeur (centre du viewport).
  function targetOffset(withJitter: boolean) {
    const pointer = opts.viewportWidth() / 2
    const winCenter = WIN_INDEX * pitch() + opts.cardWidth() / 2
    const jitter = withJitter ? (Math.random() - 0.5) * JITTER_PX : 0
    return pointer - winCenter + jitter
  }

  function spin(winner: DomainCard, pool: DomainCard[]): Promise<void> {
    return new Promise((resolve) => {
      buildStrip(winner, pool)
      state.value = 'spinning'
      // Position de départ : bande à 0.
      durationMs.value = 0
      offset.value = 0

      const reduced = opts.reducedMotion()
      // Laisse le rendu initial se poser avant d'animer.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          durationMs.value = reduced ? REDUCED_MS : SPIN_MS
          offset.value = targetOffset(!reduced)
          window.setTimeout(() => {
            state.value = 'revealed'
            resolve()
          }, durationMs.value + 60)
        })
      })
    })
  }

  function reset() {
    state.value = 'idle'
    durationMs.value = 0
    offset.value = 0
    strip.value = []
  }

  return { strip, offset, durationMs, state, spin, reset, WIN_INDEX }
}
