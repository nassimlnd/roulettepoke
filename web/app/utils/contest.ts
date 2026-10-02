// Règles du Concours hebdomadaire (v5.0), côté présentation. La mécanique
// (tirage de la discipline, facteur chance, jury) vit sur le serveur ; ici ce
// qui doit être calculé pour afficher : candidats éligibles triés par stat,
// scores affichés sans ex-aequo trompeur, répartition entre les trois juges.
import type { ContestDiscipline, ContestStatus, ISODate } from '~/types/api'
import type { DomainOwnedCard, ContestRestriction, ContestResult } from '~/types/domain'

export const CONTEST_ENTRY_COST = 10
export const DANCE_POINTS_PER_ROUND = 2
export const DANCE_MAX_ROUNDS = 10

export const DISCIPLINES: readonly ContestDiscipline[] = ['Sang-froid', 'Beauté', 'Grâce', 'Intelligence', 'Robustesse']

export const DISCIPLINE_ICON: Record<ContestDiscipline, string> = {
  'Sang-froid': 'i-lucide-snowflake',
  'Beauté': 'i-lucide-gem',
  'Grâce': 'i-lucide-ribbon',
  'Intelligence': 'i-lucide-brain',
  'Robustesse': 'i-lucide-dumbbell'
}

export const CONTEST_STATUS: Record<ContestStatus, { label: string, cls: string }> = {
  registration_open: { label: 'Inscriptions ouvertes', cls: 'open' },
  registration_closed: { label: 'Inscriptions closes', cls: 'closed' },
  in_progress: { label: 'Dévoilement en cours…', cls: 'live' },
  completed: { label: 'Terminé', cls: 'done' }
}

export interface ContestCandidate { card: DomainOwnedCard, stat: number }

/**
 * Cartes qu'on peut inscrire : possédées, ni shiny ni légendaires, conformes à
 * la restriction de la semaine, et dotées d'une stat dans la discipline. Triées
 * de la meilleure à la moins bonne.
 */
export function contestCandidates(
  cards: readonly DomainOwnedCard[],
  discipline: ContestDiscipline,
  restriction: ContestRestriction | null,
  limit = 18
): ContestCandidate[] {
  const out: ContestCandidate[] = []
  for (const card of cards) {
    if (!card.owned || card.quantity < 1 || card.isShiny || card.rarity === 'Légendaire') continue
    if (restriction?.type === 'biome' && card.biome !== restriction.value) continue
    if (restriction?.type === 'type' && card.type !== restriction.value) continue
    const stat = card.contestStats?.[discipline]
    if (stat === undefined || stat === null) continue
    out.push({ card, stat })
  }
  out.sort((a, b) => b.stat - a.stat || a.card.name.localeCompare(b.card.name, 'fr'))
  return out.slice(0, limit)
}

/**
 * Scores arrondis SANS ex-aequo trompeur : deux placements consécutifs qui
 * arrondissent au même entier formeraient un faux match nul. Le mieux classé
 * garde la valeur, les suivants du bloc affichent un point de moins — règle
 * du jeu d'origine (5 joueurs à 127 → 127 / 126 / 126 / 126 / 126).
 */
export function displayScores(results: readonly ContestResult[]): Map<number, number> {
  const sorted = [...results].sort((a, b) => a.placement - b.placement)
  const out = new Map<number, number>()
  let blockValue: number | null = null
  for (const r of sorted) {
    const rounded = Math.round(r.score)
    if (blockValue !== null && rounded === blockValue) {
      out.set(r.placement, rounded - 1)
    } else {
      out.set(r.placement, rounded)
      blockValue = rounded
    }
  }
  return out
}

export const JUDGE_WEIGHTS = [0.42, 0.34, 0.24] as const
export const JUDGE_FALLBACK = ['Juge Alpha', 'Juge Béta', 'Juge Gamma'] as const

/** Répartition entière d'un total entre les juges (plus grand reste : somme exacte). */
export function splitJudgeScores(total: number): number[] {
  const raw = JUDGE_WEIGHTS.map(w => total * w)
  const floors = raw.map(Math.floor)
  let remaining = total - floors.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (remaining <= 0) break
    floors[i]! += 1
    remaining -= 1
  }
  return floors
}

/** « mardi 6 octobre à 11:55 » — fin des inscriptions, le jour du dévoilement. */
export function contestDeadline(date: ISODate): string {
  const d = new Date(date)
  return `${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à 11:55`
}

export function restrictionLabel(r: ContestRestriction | null): string {
  if (!r) return 'Ouvert à tous les Pokémon'
  return r.type === 'biome' ? `Réservé aux Pokémon du biome ${r.value}` : `Réservé aux Pokémon de type ${r.value}`
}
