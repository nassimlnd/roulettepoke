// Tableau d'un tournoi (v5), côté présentation. Le serveur numérote les tours
// à partir de 1 — le plus grand est la finale — et réserve 0 au match pour la
// 3ᵉ place. Le journal d'un match est écrit du point de vue du joueur 1.
import type { BattleRound, TournamentMatch } from '~/types/domain'

export function maxRound(matches: readonly TournamentMatch[]): number {
  return matches.reduce((max, m) => Math.max(max, m.round), 0)
}

export function roundLabel(round: number, max: number): string {
  if (round === 0) return 'Match pour la 3ᵉ place'
  if (round === max) return 'Finale'
  if (round === max - 1 && max > 1) return 'Demi-finales'
  return `Tour ${round}`
}

/** Le même journal relu depuis l'autre côté du terrain (probabilités sur 100). */
export function flipRounds(rounds: readonly BattleRound[]): BattleRound[] {
  return rounds.map(r => ({
    ...r,
    player: r.champion,
    champion: r.player,
    playerWon: !r.playerWon,
    winProbability: 100 - r.winProbability
  }))
}
