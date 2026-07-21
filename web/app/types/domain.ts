// Types « domaine » — normalisés, consommés par les stores et composants.
// La couche repositories convertit les types `api.ts` (wire) en ceux-ci :
// notamment la rareté 'Alt' (shiny dans /collection) est réconciliée en
// `isShiny` + rareté réelle.

import type { UUID, Biome, PokeType, ISODate } from './api'

export type RealRarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire'

export interface DomainCard {
  id: UUID
  num: number
  name: string
  imageUrl: string
  rarity: RealRarity
  isShiny: boolean
  level: 1 | 2 | 3
  biome: Biome
  type: PokeType
  parentCardId: UUID
  standardId: UUID | null
}

export interface DomainOwnedCard extends DomainCard {
  quantity: number
  owned: boolean
  obtainedAt: ISODate | null
}

// Résultat normalisé d'un tirage (union discriminée par `kind`)
export type RollOutcome
  = | { kind: 'card', card: DomainCard, isNew: boolean, rollCost: number }
    | { kind: 'coins', amount: number, rollCost: number }
    | { kind: 'charme', rollCost: number }
    | { kind: 'choice', choiceId: UUID, left: DomainCard, right: DomainCard, rollCost: number }

export type CelebrationTier
  = | 'common' | 'rare' | 'epic' | 'legendary' | 'shiny' | 'shiny-legendary'

export interface BiomeInfo {
  biome: Biome
  cardCount: number
  cost: number
  ownedCount: number
}

// ─── Arènes ─────────────────────────────────────────────────────────────────────
export interface DomainGym {
  id: UUID
  order: number
  name: string
  type: PokeType
  badgeName: string
  badgeImageUrl: string
  badgeObtainedAt: ISODate | null
  hasBadge: boolean
  canAttempt: boolean
  lastAttemptThisWeek: ISODate | null
}

export interface ChampionMon {
  position: number
  name: string
  type: PokeType
  rarity: RealRarity
  isShiny: boolean
  imageUrl: string
}

export interface GymDetail {
  id: UUID
  typeColor: string
  typeImageUrl: string
  champions: ChampionMon[]
  recommendedTypes: { name: string, imageUrl: string, color: string }[]
}

export interface GymEstimate {
  winProbability: number
  trainingBonus: number
  matchups: { player: string, champion: string, probability: number }[]
}

export interface BattleRound {
  round: number
  player: { name: string, imageUrl: string | null }
  champion: { name: string, imageUrl: string | null }
  winProbability: number
  playerWon: boolean
}

export interface BattleResult {
  won: boolean
  badgeName: string | null
  rounds: BattleRound[]
}

export interface TrainingOutcome {
  won: boolean
  coinsGained: number
  newBonus: number
  rounds: BattleRound[]
}

// ─── Classement ───────────────────────────────────────────────────────────────
export interface LeaderboardRow {
  rank: number
  username: string
  avatarUrl: string | null
  avatarRarity: RealRarity | null
  isShinyAvatar: boolean
  crowned: boolean
  medal: 1 | 2 | 3 | null // médaille de tournoi (couronne prioritaire)
  standardCount: number
  legendaryCount: number
  shinyCount: number
  score: number
  badges: { imageUrl: string, name: string }[]
}

export interface PlayerContext {
  above: LeaderboardRow | null
  current: LeaderboardRow
  below: LeaderboardRow | null
}

export interface LeaderboardData {
  top: LeaderboardRow[]
  player: PlayerContext | null
}

export interface RecentShiny {
  username: string
  name: string
  imageUrl: string
  isShiny: boolean
  rarity: RealRarity
  rolledAt: ISODate
  isDuplicate: boolean
  source: string
}

// Membre d'équipe — forme normalisée de WireTeamMember. Un membre ne porte pas
// toutes les infos d'une carte (pas de num/biome/niveau) : il s'affiche via
// TeamCard, pas HoloCard.
export interface TeamMember {
  teamEntryId: UUID
  position: number
  cardId: UUID
  name: string
  type: PokeType
  rarity: RealRarity
  isShiny: boolean
  imageUrl: string
  typeImageUrl: string | null
}
