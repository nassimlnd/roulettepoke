// Types « domaine » — normalisés, consommés par les stores et composants.
// La couche repositories convertit les types `api.ts` (wire) en ceux-ci :
// notamment la rareté 'Alt' (shiny dans /collection) est réconciliée en
// `isShiny` + rareté réelle.

import type { UUID, Biome, PokeType, ISODate, SlotSymbol, SlotLine } from './api'

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

// ─── Échanges ────────────────────────────────────────────────────────────────
export type TradeStatus = 'pending_target' | 'pending_initiator' | 'completed' | 'declined' | 'cancelled' | 'expired'

export interface TradeCardRef {
  id: UUID | null
  name: string
  imageUrl: string | null
  rarity: RealRarity
}

export interface DomainTrade {
  id: UUID
  status: TradeStatus
  initiatorId: UUID
  initiatorUsername: string
  targetId: UUID
  targetUsername: string
  requested: TradeCardRef
  offered: TradeCardRef | null
  createdAt: ISODate
  completedAt: ISODate | null
}

export interface TradePlayer {
  id: UUID
  username: string
  avatarUrl: string | null
  avatarIsShiny: boolean
  cooldownUntil: ISODate | null
}

export interface TradeCard {
  id: UUID
  name: string
  imageUrl: string
  rarity: RealRarity
  quantity: number
  viewerOwns: boolean
}

// ─── Tournoi ─────────────────────────────────────────────────────────────────
export type TournamentStatus = 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'

export interface TournamentParticipant {
  userId: UUID
  username: string
  avatarUrl: string | null
  avatarIsShiny: boolean
}

export interface TournamentResult {
  placement: number
  username: string
  prize: number
  avatarUrl: string | null
  avatarIsShiny: boolean
}

export interface DomainTournament {
  id: UUID
  date: ISODate
  status: TournamentStatus
  prizePool: number
  participants: TournamentParticipant[]
  isRegistered: boolean
  teamsAreLocked: boolean
  results: TournamentResult[]
}

export interface TypeRec {
  type: PokeType
  covered: number
  threatened: number
  netScore: number
}

export interface TournamentMatchup {
  username: string
  avatarUrl: string | null
  avatarIsShiny: boolean
  team: ChampionMon[]
  winProbability: number
  oppWinProbability: number
}

export interface TournamentAnalysis {
  myTeam: ChampionMon[]
  myTeamLocked: boolean
  teamsLocked: boolean
  hasOpponents: boolean
  strong: ChampionMon[]
  weak: ChampionMon[]
  matchups: TournamentMatchup[]
  toPrivilege: TypeRec[]
  toAvoid: TypeRec[]
}

// ─── Jackpot (machine à sous) ────────────────────────────────────────────────
export type LineReward
  = | { line: SlotLine, type: 'nothing' }
    | { line: SlotLine, type: 'coins', amount: number }
    | { line: SlotLine, type: 'charme' }
    | { line: SlotLine, type: 'biome_ticket', biome: Biome }
    | { line: SlotLine, type: 'type_ticket', typeName: PokeType }
    | { line: SlotLine, type: 'legendary', card: DomainCard }

export interface SpinResult {
  cells: Record<string, SlotSymbol>
  lines: LineReward[]
  cost: number
  newCoins: number
}

export interface RecentWin {
  username: string
  prizes: LineReward[]
  spunAt: ISODate
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

// ─── Statistiques (forme normalisée de WireStats) ─────────────────────────────
export interface StatsGlobal {
  totalRolls: number
  shinyObtained: number
  shinyRate: number
  legendaryRate: number
}

export interface StatGym {
  name: string
  type: PokeType
  badgeName: string
  badgeImageUrl: string
  orderNum: number
  holders: number
}

export interface StatPlayer {
  username: string
  totalRolls: number
  shinyRolls: number
  legendaryRolls: number
  ownedStd: number
  ownedShiny: number
  spinRuns: number
  spinTransfers: number
}

export type OddsKey = 'commun' | 'rare' | 'epic' | 'shiny' | 'legendary'

// Probabilité par tirage d'une rareté, calculée depuis le pool
// (count × weight / total_weight).
export interface RarityOdds {
  key: OddsKey
  label: string
  color: string
  count: number
  probability: number
}

export interface SpinAnecdote { names: string[], attempts: number, transfers: number }

export interface DomainAnecdotes {
  mostShinyDupes: { names: string[], dupes: number, shinyTotal: number }
  unluckiest: { names: string[], lossHigh: number }
  luckiest: { names: string[], winLow: number }
  mostOwnedCards: { name: string, totalQty: number }[]
  leastOwnedCards: { name: string, totalQty: number }[]
  spinLucky: SpinAnecdote
  spinUnlucky: SpinAnecdote
  spinDetermined: SpinAnecdote
}

export interface DomainStats {
  global: StatsGlobal
  gyms: StatGym[]
  players: StatPlayer[]
  odds: RarityOdds[]
  pool: { totalStd: number, totalLeg: number, totalShiny: number }
  anecdotes: DomainAnecdotes
  spin: { totalRuns: number, totalTransfers: number }
}

// ─── Tchat ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  userId: UUID
  username: string
  message: string
  createdAt: ISODate
}
