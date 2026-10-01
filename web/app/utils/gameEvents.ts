// Événements du jour et objectif de la semaine : la mécanique vit côté
// serveur, ici seulement sa présentation (icône, titre, phrase, destination),
// reprise du jeu d'origine (lib/gameEvents.js, communityGoal.js) pour que les
// joueurs retrouvent les mêmes mots.
import type { WireGameEvent, WireGameEvents, WireCommunityGoal, UUID } from '~/types/api'
import { asGeneration, generationRegion } from '~/constants/generation'
import { ROUTES } from '~/constants/routes'

export interface GameEventView {
  type: string
  icon: string
  title: string
  text: string
  to: string | null
}

const region = (g: unknown): string => generationRegion(asGeneration(Number(g)))

type Describer = (e: WireGameEvent) => Omit<GameEventView, 'type'> | null

const CATALOGUE: Record<string, Describer> = {
  generation_day: e => ({
    icon: 'i-lucide-globe',
    title: `Journée ${region(e.params?.generation)}`,
    text: `Les tirages ${region(e.params?.generation)} sont à −30 % aujourd'hui !`,
    to: ROUTES.play
  }),
  sales: () => ({
    icon: 'i-lucide-tag',
    title: 'Soldes',
    text: 'Tous les tirages sont à −50 % aujourd\'hui !',
    to: ROUTES.play
  }),
  special_rain: () => ({
    icon: 'i-lucide-gift',
    title: 'Pluie d\'événements',
    text: 'Les événements spéciaux des tirages sont 3× plus fréquents aujourd\'hui !',
    to: ROUTES.play
  }),
  daily_bonus_x2: () => ({
    icon: 'i-lucide-landmark',
    title: 'Prime du jour ×2',
    text: 'La prime de connexion du jour est doublée !',
    to: ROUTES.play
  }),
  jackpot_frenzy: () => ({
    icon: 'i-lucide-cherry',
    title: 'Jackpot en folie',
    text: '2 tirages au Jackpot aujourd\'hui !',
    to: ROUTES.slotMachine
  }),
  open_gyms: () => ({
    icon: 'i-lucide-swords',
    title: 'Arènes ouvertes',
    text: '2 combats d\'arène possibles cette semaine, jusqu\'à dimanche !',
    to: ROUTES.gyms
  }),
  merchant: (e) => {
    const wanted = e.merchant?.wanted ?? []
    // Marchand sans Pokémon résolu (cartes supprimées) : rien à annoncer.
    if (!wanted.length) return null
    const names = wanted.map(w => `${w.name} (${region(w.generation)})`).join(', ')
    return {
      icon: 'i-lucide-store',
      title: 'Un marchand recherche…',
      text: `Un marchand recherche aujourd'hui ${names}. Il offre ${e.merchant?.price ?? 250} 🪙 si tu tombes dessus et que tu le lui vends — premier arrivé, premier servi !`,
      to: ROUTES.collection
    }
  },
  spin_lucky: () => ({
    icon: 'i-lucide-tornado',
    title: 'Aventure chanceuse',
    text: 'Dimanche : légendaires de l\'Aventure boostés — capture 40 % et transfert 20 % !',
    to: ROUTES.spin
  })
}

/** null pour un type inconnu (événement futur) : on l'ignore, on ne plante pas. */
export function describeGameEvent(e: WireGameEvent): GameEventView | null {
  const view = CATALOGUE[e.type]?.(e)
  return view ? { type: e.type, ...view } : null
}

/**
 * Empreinte du jour : un nouvel événement ou un nouveau jour la change, et le
 * bandeau masqué réapparaît.
 */
export function eventsSignature(events: WireGameEvents['events'] | null | undefined): string {
  if (!events) return ''
  return `${events.date}|${events.active.map(e => `${e.type}:${e.startsOn ?? ''}`).join(',')}`
}

// ─── Marchand ────────────────────────────────────────────────────────────────
export interface MerchantOffer { price: number, eligible: boolean }

export function findMerchant(events: WireGameEvents['events'] | null | undefined) {
  return events?.active.find(e => e.type === 'merchant')?.merchant ?? null
}

/**
 * Le marchand n'achète au prix fort que les cartes qu'il recherche, tirées
 * AUJOURD'HUI et pas encore vendues par un autre joueur (premier arrivé).
 */
export function merchantOffer(
  merchant: WireGameEvent['merchant'] | null | undefined,
  cardId: UUID
): MerchantOffer | null {
  if (!merchant?.wanted?.some(w => w.cardId === cardId)) return null
  const eligible = !!merchant.drawnTodayCardIds?.includes(cardId) && !merchant.soldCardIds?.includes(cardId)
  return { price: merchant.price ?? 250, eligible }
}

// ─── Objectif de la semaine ──────────────────────────────────────────────────
export interface GoalView {
  icon: string
  noun: string
  hint: string
  percent: number
  achieved: boolean
  /** Le joueur a-t-il assez contribué pour toucher la récompense ? */
  qualifies: boolean
  missing: number
}

const METRICS: Record<string, { icon: string, noun: string, hint: string }> = {
  rolls: { icon: 'i-lucide-dices', noun: 'tirages', hint: 'Chaque tirage de la roulette compte.' },
  spin_runs: { icon: 'i-lucide-compass', noun: 'parties d\'Aventure', hint: 'Une partie compte à partir de 90 secondes de jeu.' },
  gym_battles: { icon: 'i-lucide-swords', noun: 'combats d\'arène', hint: 'Chaque combat d\'arène compte, victoire ou défaite.' },
  jackpot_spins: { icon: 'i-lucide-cherry', noun: 'tirages du Jackpot', hint: 'Chaque tirage du Jackpot compte.' }
}

export function describeGoal(goal: WireCommunityGoal | null | undefined): GoalView | null {
  if (!goal || !goal.target) return null
  const meta = METRICS[goal.metric] ?? { icon: 'i-lucide-target', noun: 'actions', hint: '' }
  return {
    ...meta,
    percent: Math.min(100, Math.round((goal.progress / goal.target) * 100)),
    achieved: goal.achieved,
    qualifies: goal.myContribution >= goal.minContribution,
    missing: Math.max(0, goal.minContribution - goal.myContribution)
  }
}
