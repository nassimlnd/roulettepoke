// Types « wire » — la forme brute renvoyée par l'API existante.
// Repris de docs/audit/api-inventory.md (observés sur 275 appels réels).
// Ces types ne sont consommés QUE par la couche repositories, qui les
// normalise en types `domain.ts` pour le reste de l'application.

export type UUID = string
export type ISODate = string

export type Rarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire' | 'Alt'
export type Biome
  = | 'Lac' | 'Mer' | 'Forêt' | 'Montagnes' | 'Ville' | 'Plaines'
    | 'Désert' | 'Cave' | 'Tundra' | 'Légendaire'
export type PokeType
  = | 'Combat' | 'Dragon' | 'Eau' | 'Feu' | 'Fée' | 'Glace' | 'Insecte'
    | 'Normal' | 'Plante' | 'Poison' | 'Psy' | 'Roche' | 'Sol'
    | 'Spectre' | 'Vol' | 'Électrik'

export interface ApiError { error: string }

export interface WireUser {
  id: UUID
  username: string
  email: string
  coins: number
  avatar_url: string | null
  avatar_is_alt: boolean
  charme_chroma_rolls: number
}

export interface WireCard {
  id: UUID
  num: number
  name: string
  image_url: string
  rarity: Rarity
  level: 1 | 2 | 3
  parent_card_id: UUID
  is_alt: boolean
  biome: Biome
  type: PokeType
  base_weight?: number
  biome_id?: UUID
  standard_id?: UUID | null
  created_at?: ISODate
}

export interface WireOwnedCard extends WireCard {
  quantity: number | null
  obtained_at: ISODate | null
  owned: boolean
}

export interface AuthResponse { user: WireUser, token: string }

export interface CardChoice {
  id: UUID
  leftCard: WireCard & { owned?: boolean }
  rightCard: WireCard & { owned?: boolean }
}

export interface MeResponse {
  user: WireUser
  rewardClaimed: boolean
  pendingChoice: CardChoice | null
}

// Résultat d'un POST /roll (toujours enveloppé dans { card })
export type WireRollResult
  = | (WireCard & { isNew: boolean, owned: boolean, rollCost: number })
    | { isSpecialEvent: true, eventType: 'coins', amount: number, rollCost: number }
    | { isSpecialEvent: true, eventType: 'charme_chroma', rollCost: number }
    | {
      isSpecialEvent: true
      eventType: 'card_choice'
      choiceId: UUID
      leftCard: WireCard & { owned: boolean }
      rightCard: WireCard & { owned: boolean }
      rollCost: number
    }

export interface WireBiome {
  biome: Biome
  card_count: number
  biome_weight: number
  cost: number
  owned_count: number
}

export interface SellResult {
  sellPrice: number
  newCoins: number
  charmeObtained?: boolean
}

export interface WireInventory {
  items: { item_type: string, quantity: number }[]
  activeBiomeTicket: string | null
  activeTypeTicket: string | null
}

export interface WireTeamMember {
  team_entry_id: UUID
  position: number
  id: UUID
  name: string
  type: PokeType
  rarity: Rarity
  image_url: string
  type_image_url?: string
}

export interface WireBadge {
  gym_id: UUID
  order_num: number
  badge_name: string
  badge_image_url: string
  obtained_at: ISODate
}

export interface WireGym {
  id: UUID
  order_num: number
  name: string
  type: PokeType
  badge_name: string
  badge_image_url: string
  badge_obtained_at: ISODate | null
  last_attempt_this_week: ISODate | null
  has_badge: boolean
  can_attempt: boolean
}

export interface TrainingStatus {
  bonus: number
  canFightToday: boolean
  coins: number
}

export interface WireChampionMon {
  position: number
  id: UUID
  name: string
  type: PokeType
  rarity: Rarity
  image_url: string
}

export interface WireGymDetail {
  id: UUID
  order_num: number
  name: string
  type: PokeType
  badge_name: string
  badge_image_url: string
  type_image_url: string
  type_color: string
  champion_team: WireChampionMon[]
  recommended_types?: { name: string, image_url: string, color: string }[]
}

export interface WireGymEstimate {
  estimated_win_probability: number
  training_bonus?: number
  matchups: { player: string, champion: string, probability: number }[]
}

export interface WireBattleRound {
  round: number
  player_pokemon: { name: string, image_url?: string }
  champion_pokemon: { name: string, image_url?: string }
  win_probability: number
  player_wins_duel: boolean
  roll_value?: number
}

export interface WireBattleResult {
  won: boolean
  badge_name?: string
  log: WireBattleRound[]
  player_team: WireCard[]
  champion_team: WireCard[]
}

export interface WireTrainingResult {
  won: boolean
  coins_gained?: number
  new_bonus: number
  log: WireBattleRound[]
  player_team: WireCard[]
  trainer_team: WireCard[]
}

export interface SlotStatus {
  canSpin: boolean
  lastSpin: ISODate | null
  coins: number
}

export interface LeagueStatus {
  eligible: boolean
  cycleStart: ISODate | null
  alreadyAttempted: boolean
  lastRun: unknown | null
  legendaries: { id: UUID, name: string, image_url: string }[]
}

export interface WireTournamentParticipant {
  user_id: UUID
  username: string
  avatar_url: string | null
  avatar_is_alt: boolean | null
}

export interface WireTournament {
  id: UUID
  tournament_date: ISODate
  status: 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
  prize_pool: number
  created_at: ISODate
  completed_at: ISODate | null
  participants: WireTournamentParticipant[]
  is_registered?: boolean
  teamsAreLocked?: boolean
  snapshots?: Record<UUID, WireCard[]>
  matches?: unknown[]
  results?: { placement: number, username: string, prize: number, avatar_url: string | null, avatar_is_alt: boolean | null }[]
}

export interface SpinStatus {
  hasStarters: boolean
  rewardedThisWeek: boolean
  legendaryGrantedThisWeek?: boolean
  legendaryTransfersThisWeek?: number
  legendaryTransferRate?: number
}

export interface WireTrade {
  id: UUID
  status: 'pending_target' | 'pending_initiator' | 'completed' | 'declined' | 'cancelled' | 'expired'
  initiator_id: UUID
  initiator_username: string
  target_id: UUID
  target_username: string
  requested_card_name: string
  requested_card_rarity: Rarity
  offered_card_name?: string
  offered_card_rarity?: Rarity
  created_at: ISODate
  completed_at?: ISODate
}

export interface TradeEligibility {
  uniqueStandardCount: number
  minRequired: number
  tradedThisWeek: boolean
  eligible: boolean
}

export interface WireNotification {
  id: UUID
  message: string
  link: string | null
  read: boolean
  created_at: ISODate
}

export interface NotificationsResponse {
  notifications: WireNotification[]
  unreadCount: number
}

export interface WireBadgeRef {
  image_url: string
  name: string
}

export interface WireLeaderboardRow {
  username: string
  avatar_url: string | null
  avatar_is_alt: boolean | null
  avatar_rarity: Rarity | null
  crowned: boolean
  tournament_medal_placement: 1 | 2 | 3 | null
  standard_count: number
  legendary_count: number
  shiny_count: number
  score: number
  badges: WireBadgeRef[]
  rank: number
}

export interface WireLeaderboardResponse {
  top10: WireLeaderboardRow[]
  playerContext: {
    above: WireLeaderboardRow | null
    current: WireLeaderboardRow
    below: WireLeaderboardRow | null
  } | null
}

export interface WireRecentShiny {
  username: string
  name: string
  image_url: string
  is_alt: boolean
  rarity: Rarity
  rolled_at: ISODate
  is_duplicate: boolean
  source: string
}
