import { defineStore } from 'pinia'
import type { PokeType } from '~/types/api'
import type { AdventureMon, AdvNode, AdvTrainer, BattleRound } from '~/types/domain'
import { useBattleStore } from '~/stores/battle'

// ─── Spin / Aventure (rogue-lite scénarisé) ──────────────────────────────────
// Un run = un périple : on traverse des scènes (dresseurs du Conseil des 4 avec
// dialogues, coffres animés, repos), chaque combat se joue en plein écran. Gagner
// le Champion → récompense ; un légendaire caché se tente une fois par run.
//
// PHASE 1.5 : moteur + scène + données MOCKÉES. Dresseurs = silhouettes stylisées
// (portraits réels branchables via `portraitUrl`). PHASE 2 : endpoints /spin/* +
// pokédex + vrais personnages.

export type SpinPhase = 'idle' | 'map' | 'gameover' | 'victory'
export const SPIN_REWARD_COINS = 250

const TYPE_HEX: Partial<Record<PokeType, string>> = {
  Glace: '#7fd0e0', Électrik: '#f2c94c', Feu: '#f0895e', Psy: '#e88bb6',
  Plante: '#7fc98a', Eau: '#6db6e6', Roche: '#cbb083', Dragon: '#8b7fd6'
}
function themeFor(m: AdventureMon | undefined): string {
  return (m && TYPE_HEX[m.type]) || '#8b5cc4'
}

// Sprites mock via le proxy /images.
const MON = {
  articuno: { num: 144, name: 'Artikodin', imageUrl: '/images/articuno.webp', type: 'Glace' },
  zapdos: { num: 145, name: 'Électhor', imageUrl: '/images/zapdos.webp', type: 'Électrik' },
  moltres: { num: 146, name: 'Sulfura', imageUrl: '/images/moltres.webp', type: 'Feu' },
  mew: { num: 151, name: 'Mew', imageUrl: '/images/mew.webp', type: 'Psy' },
  mewtwo: { num: 150, name: 'Mewtwo', imageUrl: '/images/mewtwo.webp', type: 'Psy' }
} satisfies Record<string, AdventureMon>

// Portraits de dresseurs auto-hébergés (public/trainers/*, sprites Pokémon
// Showdown récupérés au build — pas de hotlink). PHASE 2 : vrais personnages.
const SD = '/trainers/'

// Conseil des 4 (noms classiques de Kanto) + leurs dialogues (ton classique).
const COUNCIL: AdvTrainer[] = [
  {
    name: 'Olga', title: 'Maîtresse des Glaces', portraitUrl: SD + 'olga.png', ace: MON.articuno,
    intro: ['Bienvenue au Conseil des 4, dresseur.', 'Je suis Olga. Mon Artikodin va geler tes espoirs — montre-moi ta valeur !'],
    concede: 'Impressionnant… la glace a fondu devant toi. Poursuis ta route.',
    taunt: 'Le froid a eu raison de toi. Reviens quand tu seras prêt.'
  },
  {
    name: 'Aldo', title: 'Maître de la Foudre', portraitUrl: SD + 'aldo.png', ace: MON.zapdos,
    intro: ['Peu de dresseurs arrivent jusqu\'à moi.', 'Je suis Aldo. Que la foudre juge ton courage !'],
    concede: 'Tu as encaissé l\'orage sans faillir. Le respect est tien.',
    taunt: 'La foudre t\'a foudroyé. Entraîne-toi davantage.'
  },
  {
    name: 'Agatha', title: 'Maîtresse de l\'Esprit', portraitUrl: SD + 'agatha.png', ace: MON.mew,
    intro: ['Hé hé… un jeunot plein d\'ambition.', 'Je suis Agatha. Voyons si ton âme résiste à mes mystères.'],
    concede: 'Tu as l\'étoffe d\'un grand. File, avant que je change d\'avis.',
    taunt: 'Ton esprit a vacillé. Ce n\'était pas encore ton heure.'
  },
  {
    name: 'Peter', title: 'Maître des Flammes', portraitUrl: SD + 'peter.png', ace: MON.moltres,
    intro: ['Te voilà au dernier rempart du Conseil.', 'Je suis Peter. Mon Sulfura réduira ta route en cendres !'],
    concede: 'Quelle ardeur… tu mérites d\'affronter le Champion. Va !',
    taunt: 'Les flammes t\'ont consumé. Reviens plus brûlant.'
  }
]
const CHAMPION: AdvTrainer = {
  name: 'Blue', title: 'Champion de la Ligue', portraitUrl: SD + 'blue.png', ace: MON.mew,
  intro: ['Alors c\'est toi qui as vaincu le Conseil des 4.', 'Je suis Blue, le Champion. Personne ne m\'a jamais battu — et ça ne changera pas aujourd\'hui !'],
  concede: 'Impossible… tu m\'as battu ? Tu es le nouveau Champion. Chapeau.',
  taunt: 'Il en faut plus pour détrôner un Champion. Reviens me défier.'
}
const LEGENDARY = MON.articuno // rencontre cachée (mock ; réutilise un sprite)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j] as T, a[i] as T]
  }
  return a
}

// Construit le périple : Conseil des 4 (dresseurs, cotes décroissantes) ponctué
// de repos/trésors, puis le Champion, puis la rencontre légendaire.
function buildNodes(): AdvNode[] {
  const council = shuffle(COUNCIL)
  const bases = [74, 69, 64, 59]
  const nodes: AdvNode[] = [{ kind: 'start', title: 'Le seuil du Conseil', themeColor: '#8b5cc4', narration: ['Les portes du Conseil des 4 s\'ouvrent devant toi…', 'Quatre Maîtres t\'attendent. Au bout : le Champion.'] }]
  council.forEach((t, i) => {
    nodes.push({ kind: 'elite', title: `Conseil ${i + 1}`, trainer: t, opponent: t.ace, baseWinChance: bases[i], themeColor: themeFor(t.ace) })
    if (i === 1) nodes.push({ kind: 'treasure', title: 'Coffre ancien', themeColor: '#e0a92e', narration: ['Un coffre scellé repose dans l\'ombre…'] })
  })
  nodes.push({ kind: 'treasure', title: 'Feu de camp', themeColor: '#5bbf82', narration: ['Un feu de camp crépite. Un instant de répit avant l\'assaut final.'] })
  nodes.push({ kind: 'champion', title: 'Le Champion', trainer: CHAMPION, opponent: CHAMPION.ace, baseWinChance: 54, themeColor: themeFor(CHAMPION.ace) })
  nodes.push({ kind: 'legendary', title: 'Présence légendaire', opponent: LEGENDARY, themeColor: '#8b5cc4', narration: ['Une aura ancienne emplit les lieux…', `Un ${LEGENDARY.name} légendaire apparaît devant toi !`] })
  return nodes
}

export const useSpinStore = defineStore('spin', {
  state: () => ({
    phase: 'idle' as SpinPhase,
    starter: null as AdventureMon | null,
    nodes: [] as AdvNode[],
    index: 0, // nœud validé courant ; on affronte index+1
    edge: 0, // bonus de cote cumulé (trésors)
    consecutiveLosses: 0, // pity légendaire (mock)
    lastTreasure: '' as string,
    rewardCoins: 0,
    legendaryResult: null as { captured: boolean, transferred: boolean, mon: AdventureMon } | null,
    lostTo: null as AdvTrainer | null,
    busy: false
  }),

  getters: {
    current: state => state.nodes[state.index] ?? null,
    total: state => state.nodes.length,
    currentChance(state): number {
      const n = state.nodes[state.index]
      if (!n?.baseWinChance) return 0
      return Math.min(92, Math.max(20, n.baseWinChance + state.edge))
    }
  },

  actions: {
    start() {
      this.starter = MON.mewtwo
      this.nodes = buildNodes()
      this.index = 0
      this.edge = 0
      this.lastTreasure = ''
      this.rewardCoins = 0
      this.legendaryResult = null
      this.lostTo = null
      this.phase = 'map'
    },

    // Combat plein écran (BattleScene). Met à jour la progression selon l'issue.
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
        themeColor: node.themeColor,
        title: champ ? `Champion — ${op.name}` : `Conseil des 4 — ${op.name}`,
        winTitle: champ ? 'Champion vaincu ! 👑' : 'Victoire !',
        winSub: champ ? `+${SPIN_REWARD_COINS} 🪙 — un légendaire t'attend encore.` : `${op.name} est battu — en avant !`,
        loseSub: 'Ton aventure s\'arrête ici… mais tu peux retenter.'
      })
      if (won) {
        this.index++
        if (champ) this.rewardCoins = SPIN_REWARD_COINS
      } else {
        this.consecutiveLosses++
        this.lostTo = node.trainer ?? null
        this.phase = 'gameover'
      }
      return won
    },

    // Avance après une scène purement narrative (le seuil de départ).
    advancePast() {
      this.index++
    },

    // Applique le bonus d'un coffre/repos et avance (animation gérée par la scène).
    openTreasure() {
      const node = this.nodes[this.index]
      if (node?.title.includes('camp')) {
        this.edge += 8
        this.lastTreasure = 'Repos : +8 % de chances au prochain combat'
      } else {
        const boost = [10, 12, 15][Math.floor(Math.random() * 3)] ?? 12
        this.edge += boost
        this.lastTreasure = `Trésor : +${boost} % de chances au prochain combat`
      }
      this.index++
    },

    // Capture du légendaire (mock) : taux de base + pity (+5 %/défaite).
    async attemptLegendary(node: AdvNode) {
      const mon = node.opponent ?? LEGENDARY
      const rate = Math.min(80, 25 + this.consecutiveLosses * 5)
      const captured = Math.random() * 100 < rate
      const transferred = captured && Math.random() * 100 < 10
      this.legendaryResult = { captured, transferred, mon }
      this.phase = 'victory'
    },

    renew() {
      this.start()
    },

    reset() {
      this.phase = 'idle'
      this.nodes = []
      this.index = 0
      this.legendaryResult = null
      this.lostTo = null
    }
  }
})
