import { defineStore } from 'pinia'
import type { PokeType } from '~/types/api'
import type { AdventureMon, AdvNode, AdvTrainer, BattleRound } from '~/types/domain'
import { useBattleStore } from '~/stores/battle'

// ─── Spin / Aventure (rogue-lite « Choix & Croissance ») ─────────────────────
// Un run = un périple à nœuds : combats (Conseil des 4, dresseurs, Champion),
// carrefours, feux de camp, autel d'évolution… Le starter GRANDIT au fil du run
// (XP → niveau → évolution) et chaque nœud pose un vrai choix. Une seule équation
// de cote, nourrie de plusieurs leviers lisibles :
//   cote = base + niveau + évolution + objet + avantage de type + élan
//
// PHASE 1.5 : moteur + données MOCKÉES (starter = Salamèche, sprites auto-hébergés).
// PHASE 2 : vrai starter (collection), endpoints /spin/*, vraies récompenses.

export type SpinPhase = 'idle' | 'map' | 'gameover' | 'victory'
export const SPIN_REWARD_COINS = 250
const XP_PER_LEVEL = 100
const START_LEVEL = 5

// Récompense révélée « en grand » avant de continuer (coffre, repos, XP, objet).
export interface AdvReward {
  kind: 'treasure' | 'rest' | 'xp' | 'item'
  title: string
  amount: string
  sub: string
}
export interface HeldItem { name: string, bonus: number }

const TYPE_HEX: Partial<Record<PokeType, string>> = {
  Glace: '#7fd0e0', Électrik: '#f2c94c', Feu: '#f0895e', Psy: '#e88bb6',
  Plante: '#7fc98a', Eau: '#6db6e6', Roche: '#cbb083', Dragon: '#8b7fd6'
}
function themeFor(m: AdventureMon | undefined): string {
  return (m && TYPE_HEX[m.type]) || '#8b5cc4'
}

// Avantage de type (mini-table) : +12 si super efficace, −12 si vulnérable.
const SUPER: Partial<Record<PokeType, PokeType[]>> = {
  Feu: ['Plante', 'Glace'], Eau: ['Feu', 'Roche'], Plante: ['Eau', 'Roche'],
  Électrik: ['Eau'], Glace: ['Plante', 'Dragon'], Roche: ['Feu', 'Glace'], Dragon: ['Dragon']
}
function typeMod(atk?: PokeType, def?: PokeType): number {
  if (!atk || !def) return 0
  if (SUPER[atk]?.includes(def)) return 12
  if (SUPER[def]?.includes(atk)) return -12
  return 0
}
const clampChance = (v: number) => Math.min(95, Math.max(20, Math.round(v)))
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T

// Chaîne d'évolution du starter (sprites Showdown auto-hébergés, /mons/*).
const CHARM = [
  { num: 4, name: 'Salamèche', imageUrl: '/mons/charmander.png', type: 'Feu' },
  { num: 5, name: 'Reptincel', imageUrl: '/mons/charmeleon.png', type: 'Feu' },
  { num: 6, name: 'Dracaufeu', imageUrl: '/mons/charizard.png', type: 'Feu' }
] satisfies AdventureMon[]

// Adversaires de dresseurs de route (types variés → l'avantage de type compte).
const WILDMON = [
  { num: 2, name: 'Herbizarre', imageUrl: '/mons/ivysaur.png', type: 'Plante' },
  { num: 8, name: 'Carabaffe', imageUrl: '/mons/wartortle.png', type: 'Eau' },
  { num: 75, name: 'Gravalanch', imageUrl: '/mons/graveler.png', type: 'Roche' },
  { num: 26, name: 'Raichu', imageUrl: '/mons/raichu.png', type: 'Électrik' }
] satisfies AdventureMon[]

// Aces du Conseil / Champion (sprites via le proxy /images).
const MON = {
  articuno: { num: 144, name: 'Artikodin', imageUrl: '/images/articuno.webp', type: 'Glace' },
  zapdos: { num: 145, name: 'Électhor', imageUrl: '/images/zapdos.webp', type: 'Électrik' },
  moltres: { num: 146, name: 'Sulfura', imageUrl: '/images/moltres.webp', type: 'Feu' },
  mew: { num: 151, name: 'Mew', imageUrl: '/images/mew.webp', type: 'Psy' }
} satisfies Record<string, AdventureMon>

const SD = '/trainers/'
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
const LEGENDARY = MON.articuno

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j] as T, a[i] as T]
  }
  return a
}

// ─── Constructeurs de nœuds ──────────────────────────────────────────────────
function wildNode(): AdvNode {
  const mon = pick(WILDMON)
  return {
    kind: 'wild', title: 'Dresseur sur la route', opponent: mon, baseWinChance: 80,
    optional: true, themeColor: themeFor(mon),
    narration: ['Un dresseur te barre la route !', `« En garde ! » — il envoie son ${mon.name}.`]
  }
}
function campNode(): AdvNode {
  return { kind: 'camp', title: 'Feu de camp', themeColor: '#5bbf82', narration: ['Un feu de camp crépite. Comment profites-tu de ce répit ?'] }
}
function treasureNode(): AdvNode {
  return { kind: 'treasure', title: 'Coffre ancien', themeColor: '#e0a92e', narration: ['Un coffre scellé repose dans l\'ombre…'] }
}
function evolveNode(): AdvNode {
  return { kind: 'evolve', title: 'Autel d\'Évolution', themeColor: '#b57ee0', narration: ['Un autel ancien pulse d\'une lumière étrange…'] }
}
function fork(narration: string, a: AdvNode, aLabel: string, aIcon: string, aDesc: string, b: AdvNode, bLabel: string, bIcon: string, bDesc: string): AdvNode {
  return {
    kind: 'fork', title: 'Carrefour', themeColor: '#8b7fd6', narration: [narration],
    paths: [
      { label: aLabel, icon: aIcon, desc: aDesc, node: a },
      { label: bLabel, icon: bIcon, desc: bDesc, node: b }
    ]
  }
}

// Construit le périple : spine fixe (Conseil des 4 + Champion + Légendaire),
// ponctué de dresseurs de route, carrefours, feu de camp et autel d'évolution.
function buildNodes(): AdvNode[] {
  const council = shuffle(COUNCIL)
  const bases = [74, 69, 64, 59]
  const elite = (i: number): AdvNode => {
    const t = council[i] ?? (COUNCIL[0] as AdvTrainer)
    return { kind: 'elite', title: `Conseil ${i + 1}`, trainer: t, opponent: t.ace, baseWinChance: bases[i] ?? 60, themeColor: themeFor(t.ace) }
  }
  return [
    { kind: 'start', title: 'Le seuil du Conseil', themeColor: '#8b5cc4', narration: ['Les portes du Conseil des 4 s\'ouvrent devant toi…', 'Quatre Maîtres t\'attendent. Au bout : le Champion.'] },
    elite(0),
    wildNode(),
    fork('La route se sépare. Quel chemin prends-tu ?',
      wildNode(), 'Sentier périlleux', 'i-lucide-swords', 'Un dresseur t\'y attend — de l\'XP, mais un combat.',
      campNode(), 'Route tranquille', 'i-lucide-tent', 'Un campement paisible — récupère sans risque.'),
    elite(1),
    campNode(),
    evolveNode(),
    elite(2),
    fork('Deux voies s\'offrent à toi.',
      wildNode(), 'Piste du bandit', 'i-lucide-swords', 'Un dresseur costaud — risqué mais payant.',
      treasureNode(), 'Grotte au trésor', 'i-lucide-gem', 'Un coffre scellé t\'attend, sans combat.'),
    elite(3),
    { kind: 'champion', title: 'Le Champion', trainer: CHAMPION, opponent: CHAMPION.ace, baseWinChance: 54, themeColor: themeFor(CHAMPION.ace) },
    { kind: 'legendary', title: 'Présence légendaire', opponent: LEGENDARY, themeColor: '#8b5cc4', narration: ['Une aura ancienne emplit les lieux…', `Un ${LEGENDARY.name} légendaire apparaît devant toi !`] }
  ]
}

export const useSpinStore = defineStore('spin', {
  state: () => ({
    phase: 'idle' as SpinPhase,
    starter: null as AdventureMon | null,
    level: START_LEVEL,
    xp: 0,
    stage: 0,
    evolvesAt: [] as number[],
    evoChain: [] as AdventureMon[],
    heldItem: null as HeldItem | null,
    nodes: [] as AdvNode[],
    index: 0, // nœud courant
    edge: 0, // élan : bonus one-shot, consommé au prochain combat
    consecutiveLosses: 0, // pity légendaire (mock)
    lastReward: null as AdvReward | null,
    evolution: null as { from: AdventureMon, to: AdventureMon } | null, // révélation d'évolution
    rewardCoins: 0,
    legendaryResult: null as { captured: boolean, transferred: boolean, mon: AdventureMon } | null,
    lostTo: null as AdvTrainer | null,
    busy: false
  }),

  getters: {
    current: state => state.nodes[state.index] ?? null,
    total: state => state.nodes.length,
    xpPct: state => Math.round((state.xp / XP_PER_LEVEL) * 100),
    maxStage: state => Math.max(0, state.evoChain.length - 1),
    nextForm: state => state.evoChain[state.stage + 1] ?? null,
    canEvolve(): boolean {
      return this.stage < this.maxStage && this.level >= (this.evolvesAt[this.stage] ?? Number.POSITIVE_INFINITY)
    },
    chanceFor() {
      return (node: AdvNode): number => {
        if (!node?.baseWinChance) return 0
        const lvl = (this.level - START_LEVEL) * 2
        const stg = this.stage * 6
        const item = this.heldItem?.bonus ?? 0
        const t = typeMod(this.starter?.type, node.opponent?.type)
        return clampChance(node.baseWinChance + lvl + stg + item + t + this.edge)
      }
    },
    currentChance(): number {
      const n = this.current
      return n ? this.chanceFor(n) : 0
    }
  },

  actions: {
    start() {
      this.starter = CHARM[0] as AdventureMon // Salamèche
      this.level = START_LEVEL
      this.xp = 0
      this.stage = 0
      this.evolvesAt = [7, 10]
      this.evoChain = [...CHARM]
      this.heldItem = null
      this.nodes = buildNodes()
      this.index = 0
      this.edge = 0
      this.consecutiveLosses = 0
      this.lastReward = null
      this.evolution = null
      this.rewardCoins = 0
      this.legendaryResult = null
      this.lostTo = null
      this.phase = 'map'
    },

    gainXp(amount: number) {
      this.xp += amount
      while (this.xp >= XP_PER_LEVEL) {
        this.xp -= XP_PER_LEVEL
        this.level++
      }
    },

    // Combat plein écran (BattleScene). Met à jour la progression selon l'issue.
    async fight(node: AdvNode): Promise<boolean> {
      const battle = useBattleStore()
      const op = node.opponent
      const me = this.starter
      if (!op || !me) return false
      const chance = this.chanceFor(node)
      const won = Math.random() * 100 < chance
      const rounds: BattleRound[] = [{
        round: 1,
        player: { name: me.name, imageUrl: me.imageUrl },
        champion: { name: op.name, imageUrl: op.imageUrl },
        winProbability: chance,
        playerWon: won
      }]
      const champ = node.kind === 'champion'
      const wild = node.kind === 'wild'
      await battle.present({
        rounds,
        won,
        themeColor: node.themeColor,
        title: champ ? `Champion — ${op.name}` : wild ? `Dresseur — ${op.name}` : `Conseil des 4 — ${op.name}`,
        winTitle: champ ? 'Champion vaincu ! 👑' : 'Victoire !',
        winSub: champ ? `+${SPIN_REWARD_COINS} 🪙 — un légendaire t'attend encore.` : `${op.name} est battu — en avant !`,
        loseSub: 'Ton aventure s\'arrête ici… mais tu peux retenter.'
      })
      if (won) {
        this.index++
        this.gainXp(champ ? 90 : wild ? 45 : 60)
        this.edge = 0 // l'élan est consommé
        if (champ) this.rewardCoins = SPIN_REWARD_COINS
      } else {
        this.consecutiveLosses++
        this.lostTo = node.trainer ?? null
        this.phase = 'gameover'
      }
      return won
    },

    // Avance d'un nœud (scènes narratives, choix résolus, récompenses fermées).
    advancePast() {
      this.index++
    },

    // Carrefour : insère le nœud du chemin choisi juste après, puis avance.
    chooseFork(pathIndex: number) {
      const path = this.current?.paths?.[pathIndex]
      if (path) this.nodes.splice(this.index + 1, 0, path.node)
      this.index++
    },

    // Feu de camp — trois voies mutuellement exclusives.
    campRest() {
      this.edge += 8
      this.lastReward = { kind: 'rest', title: 'Repos', amount: '+8 %', sub: 'de chances au prochain combat' }
    },
    campTrain() {
      const before = this.level
      this.gainXp(50)
      const leveled = this.level > before
      this.lastReward = { kind: 'xp', title: 'Entraînement', amount: '+50 XP', sub: leveled ? `Niveau ${this.level} atteint !` : 'ton Pokémon gagne en expérience' }
    },
    campForge() {
      this.heldItem = this.heldItem
        ? { name: this.heldItem.name, bonus: this.heldItem.bonus + 2 }
        : { name: 'Bandeau du Combat', bonus: 4 }
      this.lastReward = { kind: 'item', title: this.heldItem.name, amount: `+${this.heldItem.bonus} %`, sub: 'objet tenu (bonus permanent)' }
    },

    // Autel d'Évolution.
    doEvolve() {
      const to = this.nextForm
      if (!to || !this.starter) return
      this.evolution = { from: this.starter, to }
      this.stage++
      this.starter = to
    },
    autelChannel() {
      this.edge += 12
      this.lastReward = { kind: 'rest', title: 'Énergie canalisée', amount: '+12 %', sub: 'de chances au prochain combat' }
    },

    // Coffre : prépare la récompense (l'avancée se fait après la révélation).
    openTreasure() {
      const boost = [10, 12, 15][Math.floor(Math.random() * 3)] ?? 12
      this.edge += boost
      this.lastReward = { kind: 'treasure', title: 'Trésor', amount: `+${boost} %`, sub: 'de chances au prochain combat' }
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
      this.lastReward = null
      this.evolution = null
    }
  }
})
