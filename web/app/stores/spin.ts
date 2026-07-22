import { defineStore } from 'pinia'
import type { PokeType } from '~/types/api'
import type { AdventureMon, AdvNode, BattleRound } from '~/types/domain'
import { useBattleStore } from '~/stores/battle'

// ─── Spin / Aventure (rogue-lite) ────────────────────────────────────────────
// Un run = un parcours de nœuds menant au Champion. Chaque combat se joue en
// plein écran (BattleScene). Gagner le Champion → récompense ; perdre → fin du
// run (rejouable). Un légendaire caché se tente une fois par run.
//
// PHASE 1 : moteur + données MOCKÉES (vrais sprites via le proxy /images) pour
// valider l'expérience sans toucher au backend. PHASE 2 : câblage des endpoints
// /spin/{start,claim,legendary-attempt,defeat,renew} + pokédex réel.

export type SpinPhase = 'idle' | 'map' | 'gameover' | 'victory'
export const SPIN_REWARD_COINS = 250

// Roster mock : les 5 sprites légendaires déjà servis par /images.
const M = {
  articuno: { num: 144, name: 'Artikodin', imageUrl: '/images/articuno.webp', type: 'Glace' },
  zapdos: { num: 145, name: 'Électhor', imageUrl: '/images/zapdos.webp', type: 'Électrik' },
  moltres: { num: 146, name: 'Sulfura', imageUrl: '/images/moltres.webp', type: 'Feu' },
  mew: { num: 151, name: 'Mew', imageUrl: '/images/mew.webp', type: 'Psy' },
  mewtwo: { num: 150, name: 'Mewtwo', imageUrl: '/images/mewtwo.webp', type: 'Psy' }
} satisfies Record<string, AdventureMon>

const TYPE_HEX: Partial<Record<PokeType, string>> = {
  Glace: '#7fd0e0', Électrik: '#f2c94c', Feu: '#f0895e', Psy: '#e88bb6',
  Plante: '#7fc98a', Eau: '#6db6e6', Roche: '#cbb083', Dragon: '#8b7fd6'
}
function themeFor(m: AdventureMon): string {
  return TYPE_HEX[m.type] ?? '#8b5cc4'
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j] as T, a[i] as T]
  }
  return a
}

// Construit le parcours : Conseil des 4 (cotes décroissantes) ponctué de
// trésors, puis le Champion, puis la rencontre légendaire.
function buildNodes(): AdvNode[] {
  // Mock : starter = Mew (exclu du pool d'adversaires). Le Champion et le
  // légendaire réutilisent un sprite faute d'en avoir 6 distincts (Phase 2 :
  // vraies données → aucun doublon).
  const elites = shuffle([M.articuno, M.zapdos, M.moltres, M.mewtwo])
  const bases = [74, 69, 64, 59]
  const nodes: AdvNode[] = [{ kind: 'start', title: 'Départ' }]
  elites.forEach((op, i) => {
    nodes.push({ kind: 'elite', title: `Conseil ${i + 1}`, opponent: op, baseWinChance: bases[i] })
    if (i === 1) nodes.push({ kind: 'treasure', title: 'Trésor' })
  })
  nodes.push({ kind: 'treasure', title: 'Repos' })
  nodes.push({ kind: 'champion', title: 'Champion', opponent: M.articuno, baseWinChance: 54 })
  nodes.push({ kind: 'legendary', title: 'Légendaire', opponent: M.zapdos })
  return nodes
}

export const useSpinStore = defineStore('spin', {
  state: () => ({
    phase: 'idle' as SpinPhase,
    starter: null as AdventureMon | null,
    nodes: [] as AdvNode[],
    index: 0, // nœud courant (validé) ; on progresse vers index+1
    edge: 0, // bonus de cote cumulé (trésors)
    consecutiveLosses: 0, // pity légendaire (mock)
    lastTreasure: '' as string,
    rewardCoins: 0,
    legendaryResult: null as { captured: boolean, transferred: boolean, mon: AdventureMon } | null,
    busy: false
  }),

  getters: {
    current: state => state.nodes[state.index] ?? null,
    next: state => state.nodes[state.index + 1] ?? null,
    done: state => state.index >= state.nodes.length - 1,
    // Cote effective du prochain combat (base + trésors), bornée.
    nextChance(state): number {
      const n = state.nodes[state.index + 1]
      if (!n?.baseWinChance) return 0
      return Math.min(92, Math.max(20, n.baseWinChance + state.edge))
    }
  },

  actions: {
    start() {
      this.starter = M.mew
      this.nodes = buildNodes()
      this.index = 0
      this.edge = 0
      this.lastTreasure = ''
      this.rewardCoins = 0
      this.legendaryResult = null
      this.phase = 'map'
    },

    // Avance sur le nœud suivant et le résout selon son type.
    async advance() {
      if (this.busy) return
      const node = this.nodes[this.index + 1]
      if (!node) return
      this.busy = true
      try {
        if (node.kind === 'treasure') {
          this.index++
          this.openTreasure()
        } else if (node.kind === 'elite' || node.kind === 'champion') {
          const won = await this.fight(node)
          if (won) {
            this.index++
            if (node.kind === 'champion') this.rewardCoins = SPIN_REWARD_COINS
          } else {
            this.consecutiveLosses++
            this.phase = 'gameover'
          }
        } else if (node.kind === 'legendary') {
          this.index++
          await this.attemptLegendary(node)
          this.phase = 'victory'
        }
      } finally {
        this.busy = false
      }
    },

    openTreasure() {
      const boost = [10, 12, 15][Math.floor(Math.random() * 3)] ?? 12
      this.edge += boost
      this.lastTreasure = `+${boost}% de chances au prochain combat`
    },

    // Combat plein écran (BattleScene). Issue tirée au sort selon la cote.
    async fight(node: AdvNode): Promise<boolean> {
      const battle = useBattleStore()
      const op = node.opponent
      const me = this.starter
      if (!op || !me) return false
      const chance = Math.min(92, Math.max(20, (node.baseWinChance ?? 55) + this.edge))
      const won = Math.random() * 100 < chance
      const rounds: BattleRound[] = [{
        round: 1,
        player: { name: me.name, imageUrl: me.imageUrl },
        champion: { name: op.name, imageUrl: op.imageUrl },
        winProbability: Math.round(chance),
        playerWon: won
      }]
      const champ = node.kind === 'champion'
      await battle.present({
        rounds,
        won,
        themeColor: themeFor(op),
        title: champ ? `Champion — ${op.name}` : `Conseil des 4 — ${op.name}`,
        winTitle: champ ? 'Champion vaincu ! 👑' : 'Victoire !',
        winSub: champ ? `+${SPIN_REWARD_COINS} 🪙 — un légendaire t'attend encore.` : `${op.name} est battu — en avant !`,
        loseSub: 'Ton aventure s\'arrête ici… mais tu peux retenter.'
      })
      return won
    },

    // Capture du légendaire (mock) : taux de base + pity (+5 %/défaite).
    async attemptLegendary(node: AdvNode) {
      const mon = node.opponent ?? M.articuno
      const rate = Math.min(80, 25 + this.consecutiveLosses * 5)
      const captured = Math.random() * 100 < rate
      const transferred = captured && Math.random() * 100 < 10
      this.legendaryResult = { captured, transferred, mon }
    },

    renew() {
      this.start()
    },

    reset() {
      this.phase = 'idle'
      this.nodes = []
      this.index = 0
      this.legendaryResult = null
    }
  }
})
