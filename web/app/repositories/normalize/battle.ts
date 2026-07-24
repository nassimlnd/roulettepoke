// Primitives de combat partagées (arènes, entraînement, Ligue des 4).
import type { WireBattleRound, WireChampionMon } from '~/types/api'
import type { BattleRound, ChampionMon } from '~/types/domain'
import { realRarity } from './card'

export function normalizeBattleRound(r: WireBattleRound): BattleRound {
  return {
    round: r.round,
    player: { name: r.player_pokemon.name, imageUrl: r.player_pokemon.image_url ?? null },
    champion: { name: r.champion_pokemon.name, imageUrl: r.champion_pokemon.image_url ?? null },
    winProbability: r.win_probability,
    playerWon: r.player_wins_duel
  }
}

export function normalizeChampionMon(c: WireChampionMon): ChampionMon {
  return {
    position: c.position,
    name: c.name,
    type: c.type,
    rarity: realRarity(c.rarity),
    isShiny: c.rarity === 'Alt',
    imageUrl: c.image_url
  }
}
