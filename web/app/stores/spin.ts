import { defineStore } from 'pinia'
import type { PokeType, SpinStatus } from '~/types/api'
import type { AdventureMon, AdvNode, AdvTrainer, BattleRound, GymGimmick } from '~/types/domain'
import { useBattleStore } from '~/stores/battle'
import { useWalletStore } from '~/stores/wallet'
import { spinRepo } from '~/repositories'

// ─── Spin / Aventure (rogue-lite « Choix & Croissance ») ─────────────────────
// Un run = un périple en 3 actes :
//   ACTE 1 — Circuit des Arènes (6 des 8 Champions, en rotation) : NON LÉTAL,
//            c'est la piste de croissance qui fait atterrir les évolutions.
//   ACTE 2 — Conseil des 4 : LÉTAL (les Rappels s'appliquent).
//   ACTE 3 — Champion + rencontre légendaire.
// Le starter GRANDIT (XP → niveau → évolution auto) et une seule équation de cote
// lisible relie tous les leviers :
//   cote = base + niveau + stade d'évolution + objet + avantage de type + couverture + élan
// (+ le gimmick de l'arène du moment). L'élan est un bonus one-shot plafonné,
// consommé au prochain combat. Les badges d'arène débloquent des jalons.
//
// STARTERS : 4 Kanto curatés (esprit Pokémon) avec évolution animée — choix de
// design, décorrélé du backend. ENDPOINTS /spin/* CÂBLÉS : start/renew (run
// serveur, sa liste de starters est ignorée), status (statut hebdo), claim
// (récompense), legendary-attempt (le serveur choisit ET capture le légendaire),
// defeat. Repli mock si hors-ligne. Arènes / Conseil restent des données locales.

export type SpinPhase = 'idle' | 'select' | 'map' | 'gameover' | 'victory'
export const SPIN_REWARD_COINS = 250
const XP_PER_LEVEL = 100
const START_LEVEL = 5
const EDGE_CAP = 20 // plafond de l'élan (empêche d'empiler un boss trivial)
const GYM_COUNT = 6 // arènes par run (tirées parmi les 8, en rotation)
export const BADGE_GOAL = GYM_COUNT

// Récompense révélée « en grand » avant de continuer.
export interface AdvReward {
  kind: 'treasure' | 'rest' | 'xp' | 'item' | 'life' | 'ally' | 'coins' | 'badge'
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
  Plante: '#7fc98a', Eau: '#6db6e6', Roche: '#cbb083', Dragon: '#8b7fd6',
  Poison: '#b57ed6', Sol: '#d8b46a'
}
function themeFor(m: AdventureMon | undefined): string {
  return (m && TYPE_HEX[m.type]) || '#8b5cc4'
}

// Avantage de type (mini-table) : +12 si super efficace, −12 si vulnérable.
const SUPER: Partial<Record<PokeType, PokeType[]>> = {
  Feu: ['Plante', 'Glace', 'Insecte'], Eau: ['Feu', 'Roche', 'Sol'],
  Plante: ['Eau', 'Roche', 'Sol'], Électrik: ['Eau', 'Vol'],
  Glace: ['Plante', 'Dragon', 'Sol', 'Vol'], Roche: ['Feu', 'Glace', 'Vol', 'Insecte'],
  Sol: ['Feu', 'Électrik', 'Roche', 'Poison'], Psy: ['Combat', 'Poison'],
  Poison: ['Plante', 'Fée'], Dragon: ['Dragon']
}
function typeMod(atk?: PokeType, def?: PokeType): number {
  if (!atk || !def) return 0
  if (SUPER[atk]?.includes(def)) return 12
  if (SUPER[def]?.includes(atk)) return -12
  return 0
}
// Un allié (Hautes Herbes) super efficace contre l'adversaire → bonus de couverture.
function covers(allies: PokeType[], def?: PokeType): boolean {
  return !!def && allies.some(a => SUPER[a]?.includes(def))
}
function coverageMod(allies: PokeType[], def?: PokeType): number {
  return covers(allies, def) ? COVERAGE_BONUS : 0
}
const clampChance = (v: number) => Math.min(95, Math.max(20, Math.round(v)))
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T

// Starters sélectionnables (vrais sprites animés PokeAPI). `evolvesAt` = niveaux
// des paliers d'évolution. PHASE 2 : remplacé par les Pokémon de base du joueur.
export interface StarterOption { id: string, chain: AdventureMon[], evolvesAt: number[] }
const STARTERS: StarterOption[] = [
  { id: 'bulbasaur', evolvesAt: [7, 9], chain: [
    { num: 1, name: 'Bulbizarre', imageUrl: '/mons/bulbasaur.gif', type: 'Plante' },
    { num: 2, name: 'Herbizarre', imageUrl: '/mons/ivysaur.gif', type: 'Plante' },
    { num: 3, name: 'Florizarre', imageUrl: '/mons/venusaur.gif', type: 'Plante' }
  ] },
  { id: 'charmander', evolvesAt: [7, 9], chain: [
    { num: 4, name: 'Salamèche', imageUrl: '/mons/charmander.gif', type: 'Feu' },
    { num: 5, name: 'Reptincel', imageUrl: '/mons/charmeleon.gif', type: 'Feu' },
    { num: 6, name: 'Dracaufeu', imageUrl: '/mons/charizard.gif', type: 'Feu' }
  ] },
  { id: 'squirtle', evolvesAt: [7, 9], chain: [
    { num: 7, name: 'Carapuce', imageUrl: '/mons/squirtle.gif', type: 'Eau' },
    { num: 8, name: 'Carabaffe', imageUrl: '/mons/wartortle.gif', type: 'Eau' },
    { num: 9, name: 'Tortank', imageUrl: '/mons/blastoise.gif', type: 'Eau' }
  ] },
  { id: 'pikachu', evolvesAt: [8], chain: [
    { num: 25, name: 'Pikachu', imageUrl: '/mons/pikachu.gif', type: 'Électrik' },
    { num: 26, name: 'Raichu', imageUrl: '/mons/raichu.gif', type: 'Électrik' }
  ] }
]

// Adversaires de dresseurs de route / hautes herbes (pool varié, tiré au hasard).
const WILDMON = [
  { num: 2, name: 'Herbizarre', imageUrl: '/mons/ivysaur.gif', type: 'Plante' },
  { num: 8, name: 'Carabaffe', imageUrl: '/mons/wartortle.gif', type: 'Eau' },
  { num: 75, name: 'Gravalanch', imageUrl: '/mons/graveler.gif', type: 'Roche' },
  { num: 26, name: 'Raichu', imageUrl: '/mons/raichu.gif', type: 'Électrik' },
  { num: 17, name: 'Roucoups', imageUrl: '/mons/pidgeotto.gif', type: 'Vol' },
  { num: 24, name: 'Arbok', imageUrl: '/mons/arbok.gif', type: 'Poison' },
  { num: 28, name: 'Sablaireau', imageUrl: '/mons/sandslash.gif', type: 'Sol' },
  { num: 53, name: 'Persian', imageUrl: '/mons/persian.gif', type: 'Normal' },
  { num: 57, name: 'Colossinge', imageUrl: '/mons/primeape.gif', type: 'Combat' },
  { num: 93, name: 'Spectrum', imageUrl: '/mons/haunter.gif', type: 'Spectre' }
] satisfies AdventureMon[]

// Légendaires — utilisés pour la SILHOUETTE mystère du nœud « Présence légendaire »
// (forme variée par run). Le vrai légendaire révélé à la capture est choisi par
// le serveur (/spin/legendary-attempt) ; on ne connaît son identité qu'au verdict.
const LEGENDARIES = [
  { num: 144, name: 'Artikodin', imageUrl: '/mons/articuno.gif', type: 'Glace' },
  { num: 145, name: 'Électhor', imageUrl: '/mons/zapdos.gif', type: 'Électrik' },
  { num: 146, name: 'Sulfura', imageUrl: '/mons/moltres.gif', type: 'Feu' },
  { num: 149, name: 'Dracolosse', imageUrl: '/mons/dragonite.gif', type: 'Dragon' },
  { num: 150, name: 'Mewtwo', imageUrl: '/mons/mewtwo.gif', type: 'Psy' },
  { num: 151, name: 'Mew', imageUrl: '/mons/mew.gif', type: 'Psy' }
] satisfies AdventureMon[]

// As des 8 Champions d'Arène (sprites animés PokeAPI).
const ACE = {
  onix: { num: 95, name: 'Onix', imageUrl: '/mons/onix.gif', type: 'Roche' },
  staross: { num: 121, name: 'Staross', imageUrl: '/mons/staross.gif', type: 'Eau' },
  raichu: { num: 26, name: 'Raichu', imageUrl: '/mons/raichu.gif', type: 'Électrik' },
  rafflesia: { num: 45, name: 'Rafflesia', imageUrl: '/mons/rafflesia.gif', type: 'Plante' },
  ectoplasma: { num: 94, name: 'Ectoplasma', imageUrl: '/mons/ectoplasma.gif', type: 'Poison' },
  alakazam: { num: 65, name: 'Alakazam', imageUrl: '/mons/alakazam.gif', type: 'Psy' },
  arcanin: { num: 59, name: 'Arcanin', imageUrl: '/mons/arcanin.gif', type: 'Feu' },
  rhinoferos: { num: 112, name: 'Rhinoféros', imageUrl: '/mons/rhinoferos.gif', type: 'Sol' }
} satisfies Record<string, AdventureMon>

// Aces légendaires du Conseil / Champion (artwork via le proxy /images).
const MON = {
  articuno: { num: 144, name: 'Artikodin', imageUrl: '/images/articuno.webp', type: 'Glace' },
  zapdos: { num: 145, name: 'Électhor', imageUrl: '/images/zapdos.webp', type: 'Électrik' },
  moltres: { num: 146, name: 'Sulfura', imageUrl: '/images/moltres.webp', type: 'Feu' },
  mew: { num: 151, name: 'Mew', imageUrl: '/images/mew.webp', type: 'Psy' }
} satisfies Record<string, AdventureMon>

// Gimmick d'arène (par type) : un modificateur d'UNE ligne, télégraphié sur la
// carte de combat, qui crée une mini-décision de préparation. Résolu dans
// `chanceFor` (numérique) et `fight` (drapeaux keepEdge / bonusXp).
const GIMMICK: Partial<Record<PokeType, GymGimmick>> = {
  Roche: { key: 'rock', tell: 'Armure de roche : ton objet tenu est ignoré ici.' },
  Eau: { key: 'water', tell: 'Marée haute : −10 %, sauf si un allié te couvre.' },
  Électrik: { key: 'electric', tell: 'Statique : ton élan ne compte qu\'à moitié.' },
  Plante: { key: 'grass', tell: 'Terrain sec : ton avantage de type est doublé.' },
  Poison: { key: 'poison', tell: 'Brume toxique : ta cote est plafonnée à 75 %.' },
  Psy: { key: 'psy', tell: 'Prescience : ton élan n\'est pas consommé si tu gagnes.' },
  Feu: { key: 'fire', tell: 'Fournaise : −8 %, mais +40 XP si tu gagnes.' },
  Sol: { key: 'ground', tell: 'Séisme : ton bonus de niveau est annulé ici.' }
}

const SD = '/trainers/'
// Les 8 Champions d'Arène (data mockée ; Phase 2 les câblera au backend).
const GYMS: { trainer: AdvTrainer, type: PokeType }[] = [
  { type: 'Roche', trainer: {
    name: 'Pierre', title: 'Arène d\'Argenta', portraitUrl: SD + 'pierre.png', ace: ACE.onix,
    intro: ['Je suis Pierre, le roc de la Ligue.', 'Mon Onix va tester ta ténacité !'],
    concede: 'Solide… tu as fissuré ma défense. Le badge Roche est à toi.',
    taunt: 'Trop tendre. Reviens quand tu seras plus dur que la pierre.'
  } },
  { type: 'Eau', trainer: {
    name: 'Ondine', title: 'Arène d\'Azuria', portraitUrl: SD + 'ondine.png', ace: ACE.staross,
    intro: ['Coucou ! Moi c\'est Ondine, la sirène.', 'Staross et moi allons te noyer de style !'],
    concede: 'Pfff… bien joué. Tu mérites le badge Cascade.',
    taunt: 'Trop lent ! La marée t\'a emporté.'
  } },
  { type: 'Électrik', trainer: {
    name: 'Major Bob', title: 'Arène de Carmin', portraitUrl: SD + 'majorbob.png', ace: ACE.raichu,
    intro: ['Attention, bleu ! Je suis Major Bob.', 'Mon Raichu va t\'électriser façon commando !'],
    concede: 'Décharge encaissée sans broncher. Respect, soldat. Prends le badge.',
    taunt: 'Grillé ! Retourne à l\'entraînement.'
  } },
  { type: 'Plante', trainer: {
    name: 'Erika', title: 'Arène de Céladopole', portraitUrl: SD + 'erika.png', ace: ACE.rafflesia,
    intro: ['Bienvenue… je suis Erika. *bâille*', 'Que le parfum de Rafflesia t\'endorme.'],
    concede: 'Oh… tu m\'as réveillée. Le badge Prisme te revient.',
    taunt: 'Zzz… le pollen a eu raison de toi.'
  } },
  { type: 'Poison', trainer: {
    name: 'Koga', title: 'Arène de Parmanie', portraitUrl: SD + 'koga.png', ace: ACE.ectoplasma,
    intro: ['Fou hahaha ! Je suis Koga, maître ninja.', 'Ectoplasma va dissoudre ton courage !'],
    concede: 'Impressionnant… tu as percé la brume. Le badge Âme est tien.',
    taunt: 'La toxine coule dans tes veines. Tu as perdu.'
  } },
  { type: 'Psy', trainer: {
    name: 'Morgane', title: 'Arène de Safrania', portraitUrl: SD + 'morgane.png', ace: ACE.alakazam,
    intro: ['J\'avais prévu ta venue. Je suis Morgane.', 'Alakazam lit déjà tes pensées…'],
    concede: 'Mon esprit n\'avait pas prévu ça. Le badge Marais t\'appartient.',
    taunt: 'Ton avenir était tracé : la défaite.'
  } },
  { type: 'Feu', trainer: {
    name: 'Auguste', title: 'Arène de Cramois\'Île', portraitUrl: SD + 'auguste.png', ace: ACE.arcanin,
    intro: ['Hé hé ! Une énigme brûlante t\'attend. Je suis Auguste.', 'Arcanin va t\'embraser !'],
    concede: 'Quelle fournaise tu opposes ! Le badge Volcan est à toi.',
    taunt: 'Réduit en cendres. La flamme t\'a vaincu.'
  } },
  { type: 'Sol', trainer: {
    name: 'Giovanni', title: 'Arène de Jadielle', portraitUrl: SD + 'giovanni.png', ace: ACE.rhinoferos,
    intro: ['Ainsi tu arrives jusqu\'à moi. Je suis Giovanni.', 'Rhinoféros va t\'engloutir sous la terre !'],
    concede: 'Inconcevable… tu m\'as vaincu ? Prends le badge Terre. Nous nous reverrons.',
    taunt: 'La terre a tremblé, et tu es tombé.'
  } }
]

const COUNCIL: AdvTrainer[] = [
  {
    name: 'Olga', title: 'Maîtresse des Glaces', portraitUrl: SD + 'olga.png', ace: MON.articuno,
    intro: ['Te voilà au Conseil des 4, dresseur.', 'Je suis Olga. Mon Artikodin va geler tes espoirs — montre-moi ta valeur !'],
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
  intro: ['Alors c\'est toi qui as franchi les arènes et le Conseil.', 'Je suis Blue, le Champion. Personne ne m\'a jamais battu — et ça ne changera pas aujourd\'hui !'],
  concede: 'Impossible… tu m\'as battu ? Tu es le nouveau Champion. Chapeau.',
  taunt: 'Il en faut plus pour détrôner un Champion. Reviens me défier.'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j] as T, a[i] as T]
  }
  return a
}

// ─── Constructeurs de nœuds (non-combat / préparation) ───────────────────────
function campNode(): AdvNode {
  return { kind: 'camp', title: 'Feu de camp', themeColor: '#5bbf82', narration: ['Un feu de camp crépite. Comment profites-tu de ce répit ?'] }
}
function treasureNode(): AdvNode {
  return { kind: 'treasure', title: 'Coffre ancien', themeColor: '#e0a92e', narration: ['Un coffre scellé repose dans l\'ombre…'] }
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
function wildNode(): AdvNode {
  const mon = pick(WILDMON)
  return {
    kind: 'wild', title: 'Dresseur sur la route', opponent: mon, baseWinChance: 80,
    optional: true, themeColor: themeFor(mon),
    narration: ['Un dresseur te barre la route !', `« En garde ! » — il envoie son ${mon.name}.`]
  }
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

// Construit le périple en 3 actes.
function buildNodes(leg: AdventureMon): AdvNode[] {
  // ── ACTE 1 : circuit de GYM_COUNT arènes tirées parmi les 8, difficulté ↑ ──
  const gyms = shuffle(GYMS).slice(0, GYM_COUNT)
  const gymBase = [86, 80, 73, 66, 58, 50]
  const gymNode = (g: { trainer: AdvTrainer, type: PokeType }, i: number): AdvNode => ({
    kind: 'gym', title: g.trainer.title, trainer: g.trainer, opponent: g.trainer.ace,
    baseWinChance: gymBase[i] ?? 60, themeColor: themeFor(g.trainer.ace),
    lethal: false, badge: i + 1, gimmick: GIMMICK[g.type]
  })
  const G = gyms.map(gymNode)

  // ── ACTE 2 : Conseil des 4, cotes recalibrées (le joueur arrive costaud) ──
  const council = shuffle(COUNCIL)
  const eBase = [42, 38, 34, 30]
  const elite = (i: number): AdvNode => {
    const t = council[i] ?? (COUNCIL[0] as AdvTrainer)
    return { kind: 'elite', title: `Conseil ${i + 1}`, trainer: t, opponent: t.ace, baseWinChance: eBase[i] ?? 30, themeColor: themeFor(t.ace), lethal: true }
  }

  return [
    { kind: 'start', title: 'L\'appel de la Ligue', themeColor: '#8b5cc4', narration: ['Ton périple commence. Huit Arènes se dressent avant le Conseil des 4…', 'Un starter t\'accompagne — il grandira à chaque victoire.'] },
    G[0] as AdvNode,
    grassNode(),
    G[1] as AdvNode,
    merchantNode(),
    G[2] as AdvNode,
    campNode(),
    G[3] as AdvNode,
    fork('La route se sépare. Quel chemin prends-tu ?',
      wildNode(), 'Sentier périlleux', 'i-lucide-swords', 'Un dresseur t\'y attend — de l\'XP et des pièces, mais un combat.',
      centerNode(), 'Vers le Centre Pokémon', 'i-lucide-plus', 'Souffler, soigner, s\'équiper — sans risque.'),
    G[4] as AdvNode,
    eventNode(),
    G[5] as AdvNode,
    { kind: 'threshold', title: 'Le seuil du Conseil', themeColor: '#8b5cc4', narration: ['Les six badges brillent à ta ceinture.', 'Au-delà de cette porte, plus de seconde chance : le Conseil des 4 t\'attend.'] },
    elite(0),
    treasureNode(),
    elite(1),
    centerNode(),
    elite(2),
    elite(3),
    { kind: 'champion', title: 'Le Champion', trainer: CHAMPION, opponent: CHAMPION.ace, baseWinChance: 25, themeColor: themeFor(CHAMPION.ace), lethal: true },
    { kind: 'legendary', title: 'Présence légendaire', opponent: leg, themeColor: themeFor(leg), narration: ['Une aura ancienne emplit les lieux…', 'Une silhouette légendaire surgit de la lumière !'] }
  ]
}

export const useSpinStore = defineStore('spin', {
  state: () => ({
    phase: 'idle' as SpinPhase,
    starterId: '' as string, // starter choisi
    starter: null as AdventureMon | null,
    level: START_LEVEL,
    xp: 0,
    stage: 0,
    evolvesAt: [] as number[],
    evoChain: [] as AdventureMon[],
    heldItem: null as HeldItem | null,
    runCoins: 0, // pièces internes au run (Centre / Marchand)
    lives: 0, // Rappels : survit à une défaite létale tant que > 0
    allies: [] as PokeType[], // couverture de type (Hautes Herbes)
    badges: 0, // badges d'arène gagnés (Acte 1)
    nodes: [] as AdvNode[],
    index: 0, // nœud courant
    edge: 0, // élan : bonus one-shot plafonné, consommé au prochain combat
    consecutiveLosses: 0, // pity légendaire (mock)
    legendaryMon: null as AdventureMon | null, // légendaire tiré pour ce run
    lastReward: null as AdvReward | null,
    evolution: null as { from: AdventureMon, to: AdventureMon } | null, // révélation d'évolution
    pendingEvolve: false, // une évolution est mûre (déclenchée après le combat)
    pendingMilestone: false, // un jalon de badge attend sa révélation
    rewardCoins: 0,
    // Statut hebdomadaire (source : /spin/status).
    weekStatus: null as SpinStatus | null, // statut brut pour l'écran de lancement
    statusLoaded: false, // false tant que /spin/status n'a pas répondu (skeleton)
    rewardedThisWeek: false, // récompense hebdo déjà obtenue → pas de pièces
    legendaryLockedThisWeek: false, // légendaire déjà capturé → pas de tentative
    legendaryResult: null as { captured: boolean, transferred: boolean, mon: AdventureMon } | null,
    lostTo: null as AdvTrainer | null,
    busy: false
  }),

  getters: {
    starters: () => STARTERS,
    current: state => state.nodes[state.index] ?? null,
    total: state => state.nodes.length,
    xpPct: state => Math.round((state.xp / XP_PER_LEVEL) * 100),
    maxStage: state => Math.max(0, state.evoChain.length - 1),
    nextForm: state => state.evoChain[state.stage + 1] ?? null,
    badgeGoal: () => BADGE_GOAL,
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
        let v = node.baseWinChance + lvl + stg + item + t + cov + this.edge
        // Gimmick d'arène (modificateurs numériques).
        const g = node.gimmick?.key
        if (g === 'rock') v -= item
        else if (g === 'grass' && t > 0) v += 12
        else if (g === 'water' && !covers(this.allies, node.opponent?.type)) v -= 10
        else if (g === 'electric') v -= Math.floor(this.edge / 2)
        else if (g === 'fire') v -= 8
        else if (g === 'ground') v -= lvl
        let c = clampChance(v)
        if (g === 'poison') c = Math.min(c, 75)
        return c
      }
    },
    currentChance(): number {
      const n = this.current
      return n ? this.chanceFor(n) : 0
    }
  },

  actions: {
    // Statut hebdo pour l'écran de lancement (GET pur, SANS effet de bord —
    // ne démarre aucune run). Alimente le panneau « Statut de la semaine ».
    async loadStatus() {
      try {
        const s = await spinRepo.status(useApi())
        this.weekStatus = s
        this.rewardedThisWeek = s.rewardedThisWeek
        this.legendaryLockedThisWeek = s.legendaryGrantedThisWeek ?? false
      } catch { /* silencieux : l'aventure reste jouable, statut par défaut */ }
      this.statusLoaded = true
    },

    // Ouvre l'écran de sélection du starter (avant le run).
    begin() {
      this.phase = 'select'
    },

    // Synchronise la run avec le backend en arrière-plan : démarre la run
    // (start, avec repli renew si une run traîne) et applique le statut hebdo
    // (récompense déjà prise, légendaire déjà accordé). Jouable hors-ligne :
    // en cas d'échec (non connecté / API indispo) on garde les valeurs mock.
    async syncRun() {
      try {
        const api = useApi()
        const [status, started] = await Promise.all([
          spinRepo.status(api).catch(() => null),
          spinRepo.start(api)
        ])
        let run = started
        if (run.runAlreadyActive) run = await spinRepo.renew(api)
        if (status) this.rewardedThisWeek = status.rewardedThisWeek
        const locked = run.legendaryGrantedThisWeek ?? status?.legendaryGrantedThisWeek
        if (locked !== undefined) this.legendaryLockedThisWeek = locked
      } catch { /* run jouable hors-ligne */ }
    },

    // Démarre un run avec le starter choisi (défaut : Salamèche).
    start(starterId?: string) {
      const s = STARTERS.find(o => o.id === starterId) ?? STARTERS.find(o => o.id === 'charmander') ?? (STARTERS[0] as StarterOption)
      this.starterId = s.id
      this.evoChain = [...s.chain]
      this.evolvesAt = [...s.evolvesAt]
      this.starter = s.chain[0] as AdventureMon
      this.level = START_LEVEL
      this.xp = 0
      this.stage = 0
      this.heldItem = null
      this.runCoins = 0
      this.lives = 0
      this.allies = []
      this.badges = 0
      this.legendaryMon = pick(LEGENDARIES)
      this.nodes = buildNodes(this.legendaryMon)
      this.index = 0
      this.edge = 0
      this.consecutiveLosses = 0
      this.lastReward = null
      this.evolution = null
      this.pendingEvolve = false
      this.pendingMilestone = false
      this.rewardCoins = 0
      this.legendaryResult = null
      this.lostTo = null
      this.phase = 'map'
      // Démarre la run côté serveur + statut hebdo, sans bloquer l'entrée en jeu
      // (les endpoints de fin de run — claim / légendaire — arrivent bien après).
      void this.syncRun()
    },

    // Élan plafonné (empêche d'empiler un boss trivial).
    addEdge(amount: number) {
      this.edge = Math.min(EDGE_CAP, this.edge + amount)
    },

    gainXp(amount: number) {
      this.xp += amount
      while (this.xp >= XP_PER_LEVEL) {
        this.xp -= XP_PER_LEVEL
        this.level++
      }
      // Une évolution devient mûre → révélée après le combat en cours.
      if (this.canEvolve) this.pendingEvolve = true
    },

    // Combat plein écran (BattleScene). Renvoie l'issue :
    //   'win'      victoire
    //   'revive'   défaite LÉTALE encaissée grâce à un Rappel (survit, REJOUE le combat)
    //   'setback'  défaite NON létale (arène / combat optionnel) : on continue
    //   'loss'     défaite létale sans Rappel → game over
    async fight(node: AdvNode): Promise<'win' | 'revive' | 'setback' | 'loss'> {
      const battle = useBattleStore()
      const op = node.opponent
      const me = this.starter
      if (!op || !me) return 'loss'
      const chance = this.chanceFor(node)
      const won = Math.random() * 100 < chance
      const lethal = node.lethal ?? false
      const willRevive = !won && lethal && this.lives > 0
      const g = node.gimmick?.key
      const champ = node.kind === 'champion'
      const isGym = node.kind === 'gym'
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
        title: champ ? `Champion — ${op.name}` : node.kind === 'elite' ? `Conseil des 4 — ${op.name}` : isGym ? `${node.trainer?.name ?? 'Arène'} — ${op.name}` : `Sauvage — ${op.name}`,
        winTitle: champ ? 'Champion vaincu ! 👑' : isGym ? 'Badge remporté ! 🏅' : 'Victoire !',
        winSub: champ ? (this.rewardedThisWeek ? 'Récompense hebdo déjà obtenue — mais le voyage continue.' : `+${SPIN_REWARD_COINS} 🪙 — un légendaire t'attend encore.`) : `${op.name} est battu — en avant !`,
        loseSub: willRevive ? 'Ton Pokémon tombe… un Rappel le relève — reprends le combat !' : lethal ? 'Ton aventure s\'arrête ici… mais tu peux retenter.' : 'Défaite — mais le circuit continue (pas de badge).'
      })

      if (won) {
        this.index++
        let xp = champ ? 90 : node.kind === 'elite' ? 70 : isGym ? 60 : 45
        if (g === 'fire') xp += 40 // gimmick Fournaise
        const coins = champ ? 60 : node.kind === 'elite' ? 45 : isGym ? 35 : 25
        if (g !== 'psy') this.edge = 0 // l'élan est consommé (sauf Prescience)
        this.runCoins += coins
        this.gainXp(xp) // peut armer pendingEvolve
        if (champ) void this.claimReward() // récompense hebdo réclamée côté serveur
        if (isGym) {
          this.badges++
          this.applyBadgeMilestone(this.badges)
        }
        return 'win'
      }
      if (willRevive) {
        // Rappel : on ressuscite mais on NE progresse PAS — le même combat est
        // REJOUÉ (sinon acheter des Rappels reviendrait à sauter les combats).
        this.lives--
        this.edge = 0
        return 'revive'
      }
      if (!lethal) {
        // Contretemps : on avance, sans badge, en perdant un peu d'élan.
        this.index++
        this.edge = Math.max(0, this.edge - 6)
        this.lostTo = node.trainer ?? null
        return 'setback'
      }
      this.consecutiveLosses++
      this.lostTo = node.trainer ?? null
      void this.recordDefeat() // notifie le backend (best-effort)
      this.phase = 'gameover'
      return 'loss'
    },

    // Jalons de badge (Acte 1) : rythment le circuit et récompensent la progression.
    applyBadgeMilestone(n: number) {
      if (n === 2) {
        this.addEdge(10)
        this.lastReward = { kind: 'rest', title: '2 badges !', amount: '+10 %', sub: 'la ferveur du circuit t\'anime' }
        this.pendingMilestone = true
      } else if (n === 3) {
        this.lives++
        this.lastReward = { kind: 'life', title: '3 badges !', amount: '+1 vie', sub: 'un Rappel offert par la Ligue' }
        this.pendingMilestone = true
      } else if (n === 4) {
        this.level++
        if (this.canEvolve) this.pendingEvolve = true
        this.lastReward = { kind: 'xp', title: '4 badges !', amount: `Niveau ${this.level}`, sub: 'ton talent est reconnu' }
        this.pendingMilestone = true
      } else if (n >= GYM_COUNT) {
        this.addEdge(15)
        this.runCoins += 50
        // Filet de sécurité : garantir la forme finale avant le Conseil.
        if (this.stage < this.maxStage) {
          this.level = Math.max(this.level, this.evolvesAt[this.stage] ?? this.level)
          if (this.canEvolve) this.pendingEvolve = true
        }
        this.lastReward = { kind: 'badge', title: 'Circuit complet !', amount: `${GYM_COUNT} badges`, sub: '+50 🪙 · +15 % — direction le Conseil' }
        this.pendingMilestone = true
      }
    },

    consumeMilestone() {
      this.pendingMilestone = false
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
      this.addEdge(8)
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

    // Évolution (déclenchée automatiquement après le combat qui a fait monter le
    // niveau). Enchaîne si deux paliers sont franchis d'un coup.
    doEvolve() {
      this.pendingEvolve = false
      const to = this.nextForm
      if (!to || !this.starter) return
      this.evolution = { from: this.starter, to }
      this.stage++
      this.starter = to
      if (this.canEvolve) this.pendingEvolve = true
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
      if (this.canEvolve) this.pendingEvolve = true
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
      this.addEdge(12)
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
        this.addEdge(15)
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
        if (this.canEvolve) this.pendingEvolve = true
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
        this.addEdge(10)
        this.lastReward = { kind: 'rest', title: 'Campement', amount: '+10 %', sub: 'au prochain combat' }
      }
    },

    // Coffre : prépare la récompense (l'avancée se fait après la révélation).
    openTreasure() {
      const boost = [10, 12, 15][Math.floor(Math.random() * 3)] ?? 12
      this.addEdge(boost)
      this.lastReward = { kind: 'treasure', title: 'Trésor', amount: `+${boost} %`, sub: 'de chances au prochain combat' }
    },

    // Rencontre légendaire : le SERVEUR choisit le légendaire (rotation) puis
    // gère la capture et la roulette de transfert vers la collection. On affiche
    // son verdict. Une capture verrouille la tentative pour le reste de la semaine.
    // Repli mock hors-ligne (taux de base + pity, transfert 10 %).
    async attemptLegendary(node: AdvNode) {
      try {
        const r = await spinRepo.legendaryAttempt(useApi())
        const p = r.pokemon
        const mon: AdventureMon = {
          num: p.num,
          name: p.name,
          imageUrl: p.image_url,
          type: LEGENDARIES.find(l => l.num === p.num)?.type ?? 'Psy'
        }
        this.legendaryResult = { captured: r.captured, transferred: r.transferred, mon }
        if (r.captured) this.legendaryLockedThisWeek = true
      } catch {
        const mon = node.opponent ?? this.legendaryMon ?? (LEGENDARIES[0] as AdventureMon)
        const rate = Math.min(80, 25 + this.consecutiveLosses * 5)
        const captured = Math.random() * 100 < rate
        const transferred = captured && Math.random() * 100 < 10
        this.legendaryResult = { captured, transferred, mon }
      }
      this.phase = 'victory'
    },

    // Récompense hebdo de fin de circuit (Champion vaincu) : le serveur décide de
    // l'octroi (1×/semaine) et renvoie le montant, crédité localement. Repli mock.
    async claimReward() {
      try {
        const r = await spinRepo.claim(useApi())
        this.rewardedThisWeek = true
        if (r.rewardGranted) {
          this.rewardCoins = r.coins || SPIN_REWARD_COINS
          useWalletStore().credit(this.rewardCoins, 'spin/claim')
        } else {
          this.rewardCoins = 0
        }
      } catch {
        if (!this.rewardedThisWeek) this.rewardCoins = SPIN_REWARD_COINS
      }
    },

    // Défaite létale : notifie le backend (best-effort, n'impacte pas l'écran).
    async recordDefeat() {
      try {
        await spinRepo.defeat(useApi())
      } catch { /* silencieux */ }
    },

    // Légendaire déjà capturé cette semaine : pas de tentative, on clôt le run.
    finishLegendaryLocked() {
      this.legendaryResult = null
      this.phase = 'victory'
    },

    // « Nouvelle aventure » → repasse par la sélection du starter.
    renew() {
      this.begin()
    },

    reset() {
      this.phase = 'idle'
      this.nodes = []
      this.index = 0
      this.badges = 0
      this.legendaryResult = null
      this.lostTo = null
      this.lastReward = null
      this.evolution = null
      this.pendingEvolve = false
      this.pendingMilestone = false
      this.runCoins = 0
      this.lives = 0
      this.allies = []
    }
  }
})
