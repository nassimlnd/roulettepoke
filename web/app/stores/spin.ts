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

// Récompense révélée « en grand » avant de continuer.
export interface AdvReward {
  kind: 'treasure' | 'rest' | 'xp' | 'item' | 'life' | 'ally' | 'coins'
  title: string
  amount: string
  sub: string
}
export interface HeldItem { name: string, bonus: number }

// Coûts de l'économie de run (pièces internes, distinctes du gain hebdo).
const COST = { heal: 30, train: 40, item: 45, potion: 25, bag: 35, catch: 15 }
const COVERAGE_BONUS = 8 // % si un allié couvre le type adverse

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
// Un allié (Hautes Herbes) super efficace contre l'adversaire → bonus de couverture.
function coverageMod(allies: PokeType[], def?: PokeType): number {
  if (!def) return 0
  return allies.some(a => SUPER[a]?.includes(def)) ? COVERAGE_BONUS : 0
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
function centerNode(): AdvNode {
  return { kind: 'center', title: 'Centre Pokémon', themeColor: '#ef6a7e', narration: ['Le Centre Pokémon t\'accueille, lumières chaudes et musique douce.', 'L\'Infirmière Joëlle te sourit. « Que puis-je faire pour toi ? »'] }
}
function merchantNode(): AdvNode {
  return { kind: 'merchant', title: 'Marchand ambulant', themeColor: '#3f9bd6', narration: ['Un marchand déballe un étal couvert de babioles.', '« Approche, approche ! J\'ai ce qu\'il te faut. »'] }
}
function grassNode(): AdvNode {
  const mon = pick(WILDMON)
  return { kind: 'grass', title: 'Hautes herbes', opponent: mon, baseWinChance: 82, themeColor: themeFor(mon), narration: ['Les hautes herbes s\'agitent devant toi…', `Un ${mon.name} sauvage en surgit !`] }
}

// Rencontres (dilemmes narratifs, ton Pokémon). Les options `evt:*` sont
// résolues par le store (certaines sont un pari à l'issue aléatoire).
const EVENTS: { narration: string[], options: { key: string, label: string, icon: string, desc: string }[] }[] = [
  {
    narration: ['Une source chaude fume au bord du chemin.', 'Un vieux dresseur t\'invite d\'un signe de tête.'],
    options: [
      { key: 'evt:bathe', label: 'Se baigner', icon: 'i-lucide-droplets', desc: '+1 niveau — récupère tes forces' },
      { key: 'evt:search', label: 'Fouiller les rochers', icon: 'i-lucide-search', desc: '50 % : un objet · 50 % : une embuscade (−10 %)' },
      { key: 'evt:pass', label: 'Passer ton chemin', icon: 'i-lucide-footprints', desc: 'Ne rien risquer' }
    ]
  },
  {
    narration: ['Un marchand louche surgit de l\'ombre.', '« Ton flair contre une surprise… on parie ? »'],
    options: [
      { key: 'evt:gamble', label: 'Tenter le pari', icon: 'i-lucide-dices', desc: '50 % : gros objet · 50 % : rien' },
      { key: 'evt:coins', label: 'Vendre un secret', icon: 'i-lucide-coins', desc: '+40 🪙, sans risque' },
      { key: 'evt:pass', label: 'Refuser', icon: 'i-lucide-x', desc: 'Poursuivre ta route' }
    ]
  },
  {
    narration: ['Un Pokémon sauvage blessé gît sur le sentier, tremblant.'],
    options: [
      { key: 'evt:help', label: 'Le soigner', icon: 'i-lucide-heart-pulse', desc: 'Il te suivra — allié de couverture' },
      { key: 'evt:rest', label: 'Camper à ses côtés', icon: 'i-lucide-tent', desc: '+10 % au prochain combat' },
      { key: 'evt:pass', label: 'Continuer', icon: 'i-lucide-footprints', desc: 'Ne rien faire' }
    ]
  }
]
function eventNode(): AdvNode {
  const e = pick(EVENTS)
  return { kind: 'event', title: 'Rencontre', themeColor: '#c79a5a', narration: e.narration, choices: e.options }
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
    treasureNode(),
    grassNode(),
    elite(1),
    fork('La route se sépare. Quel chemin prends-tu ?',
      wildNode(), 'Sentier périlleux', 'i-lucide-swords', 'Un dresseur t\'y attend — de l\'XP et des pièces, mais un combat.',
      centerNode(), 'Vers le Centre Pokémon', 'i-lucide-plus', 'Souffler, soigner, s\'équiper — sans risque.'),
    campNode(),
    evolveNode(),
    elite(2),
    eventNode(),
    merchantNode(),
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
    runCoins: 0, // pièces internes au run (Centre / Marchand)
    lives: 0, // Rappels : survit à une défaite tant que > 0
    allies: [] as PokeType[], // couverture de type (Hautes Herbes)
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
        const cov = coverageMod(this.allies, node.opponent?.type)
        return clampChance(node.baseWinChance + lvl + stg + item + t + cov + this.edge)
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
      this.runCoins = 0
      this.lives = 0
      this.allies = []
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

    // Combat plein écran (BattleScene). Renvoie l'issue : victoire, Rappel
    // (survit à la défaite), ou défaite (game over).
    async fight(node: AdvNode): Promise<'win' | 'revive' | 'loss'> {
      const battle = useBattleStore()
      const op = node.opponent
      const me = this.starter
      if (!op || !me) return 'loss'
      const chance = this.chanceFor(node)
      const won = Math.random() * 100 < chance
      const willRevive = !won && this.lives > 0
      const champ = node.kind === 'champion'
      const minor = node.kind === 'wild' || node.kind === 'grass'
      const rounds: BattleRound[] = [{
        round: 1,
        player: { name: me.name, imageUrl: me.imageUrl },
        champion: { name: op.name, imageUrl: op.imageUrl },
        winProbability: chance,
        playerWon: won
      }]
      await battle.present({
        rounds,
        won,
        themeColor: node.themeColor,
        title: champ ? `Champion — ${op.name}` : minor ? `Dresseur — ${op.name}` : `Conseil des 4 — ${op.name}`,
        winTitle: champ ? 'Champion vaincu ! 👑' : 'Victoire !',
        winSub: champ ? `+${SPIN_REWARD_COINS} 🪙 — un légendaire t'attend encore.` : `${op.name} est battu — en avant !`,
        loseSub: willRevive ? 'Ton Pokémon tombe… mais un Rappel le relève !' : 'Ton aventure s\'arrête ici… mais tu peux retenter.'
      })
      if (won) {
        this.index++
        this.gainXp(champ ? 90 : minor ? 45 : 60)
        this.runCoins += champ ? 60 : minor ? 25 : 40
        this.edge = 0 // l'élan est consommé
        if (champ) this.rewardCoins = SPIN_REWARD_COINS
        return 'win'
      }
      if (willRevive) {
        this.lives--
        this.index++ // survit et avance
        this.edge = 0
        return 'revive'
      }
      this.consecutiveLosses++
      this.lostTo = node.trainer ?? null
      this.phase = 'gameover'
      return 'loss'
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

    // ─── Centre Pokémon ───
    centerHeal() {
      if (this.runCoins < COST.heal) return
      this.runCoins -= COST.heal
      this.lives++
      this.lastReward = { kind: 'life', title: 'Rappel obtenu', amount: '+1 vie', sub: 'tu survivras à une défaite' }
    },
    centerTrain() {
      if (this.runCoins < COST.train) return
      this.runCoins -= COST.train
      this.level++
      this.lastReward = { kind: 'xp', title: 'Entraînement intensif', amount: `Niveau ${this.level}`, sub: '+2 % de cote (permanent)' }
    },

    // ─── Marchand ambulant ───
    merchantItem() {
      if (this.runCoins < COST.item) return
      this.runCoins -= COST.item
      this.heldItem = this.heldItem ? { name: this.heldItem.name, bonus: this.heldItem.bonus + 3 } : { name: 'Bandeau du Combat', bonus: 4 }
      this.lastReward = { kind: 'item', title: this.heldItem.name, amount: `+${this.heldItem.bonus} %`, sub: 'objet tenu (permanent)' }
    },
    merchantPotion() {
      if (this.runCoins < COST.potion) return
      this.runCoins -= COST.potion
      this.edge += 12
      this.lastReward = { kind: 'rest', title: 'Potion d\'élan', amount: '+12 %', sub: 'de chances au prochain combat' }
    },
    merchantBag() {
      if (this.runCoins < COST.bag) return
      this.runCoins -= COST.bag
      const roll = Math.random()
      if (roll < 0.35) {
        this.heldItem = this.heldItem ? { name: this.heldItem.name, bonus: this.heldItem.bonus + 4 } : { name: 'Amulette rare', bonus: 6 }
        this.lastReward = { kind: 'item', title: `Sac mystère — ${this.heldItem.name}`, amount: `+${this.heldItem.bonus} %`, sub: 'quelle chance !' }
      } else if (roll < 0.6) {
        this.lives++
        this.lastReward = { kind: 'life', title: 'Sac mystère — Rappel', amount: '+1 vie', sub: 'un filet de sécurité' }
      } else if (roll < 0.85) {
        this.runCoins += 50
        this.lastReward = { kind: 'coins', title: 'Sac mystère — Magot', amount: '+50 🪙', sub: 'tu te refais !' }
      } else {
        this.edge += 15
        this.lastReward = { kind: 'rest', title: 'Sac mystère — Dynamo', amount: '+15 %', sub: 'au prochain combat' }
      }
    },

    // ─── Hautes herbes ───
    grassCatch() {
      if (this.runCoins < COST.catch) return
      this.runCoins -= COST.catch
      const mon = this.current?.opponent
      if (mon) this.allies.push(mon.type)
      this.lastReward = { kind: 'ally', title: `${mon?.name ?? 'Allié'} capturé !`, amount: `Couverture ${mon?.type ?? ''}`, sub: `+${COVERAGE_BONUS} % contre les types qu'il domine` }
    },

    // ─── Rencontre ───
    applyEvent(key: string) {
      const k = key.slice(4) // 'evt:xxx' → 'xxx'
      if (k === 'bathe') {
        this.level++
        this.lastReward = { kind: 'xp', title: 'Bain revigorant', amount: `Niveau ${this.level}`, sub: 'tes forces reviennent' }
      } else if (k === 'search') {
        if (Math.random() < 0.5) {
          this.heldItem = this.heldItem ? { name: this.heldItem.name, bonus: this.heldItem.bonus + 3 } : { name: 'Relique', bonus: 5 }
          this.lastReward = { kind: 'item', title: `Trouvaille — ${this.heldItem.name}`, amount: `+${this.heldItem.bonus} %`, sub: 'cachée sous les rochers' }
        } else {
          this.edge = Math.max(0, this.edge - 10)
          this.lastReward = { kind: 'rest', title: 'Embuscade !', amount: '−10 %', sub: 'tu perds l\'avantage… aïe' }
        }
      } else if (k === 'gamble') {
        if (Math.random() < 0.5) {
          this.heldItem = this.heldItem ? { name: this.heldItem.name, bonus: this.heldItem.bonus + 5 } : { name: 'Talisman', bonus: 7 }
          this.lastReward = { kind: 'item', title: `Le pari paie — ${this.heldItem.name}`, amount: `+${this.heldItem.bonus} %`, sub: 'bien joué !' }
        } else {
          this.lastReward = { kind: 'coins', title: 'Marché de dupe', amount: '—', sub: 'il file avec… rien pour toi' }
        }
      } else if (k === 'coins') {
        this.runCoins += 40
        this.lastReward = { kind: 'coins', title: 'Secret vendu', amount: '+40 🪙', sub: 'de quoi faire des emplettes' }
      } else if (k === 'help') {
        const t = pick(WILDMON).type
        this.allies.push(t)
        this.lastReward = { kind: 'ally', title: 'Un allié reconnaissant', amount: `Couverture ${t}`, sub: `+${COVERAGE_BONUS} % contre les types qu'il domine` }
      } else if (k === 'rest') {
        this.edge += 10
        this.lastReward = { kind: 'rest', title: 'Campement', amount: '+10 %', sub: 'au prochain combat' }
      }
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
      this.runCoins = 0
      this.lives = 0
      this.allies = []
    }
  }
})
