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

export type SlotSymbol = 'legendary' | 'charme' | 'biome_ticket' | 'type_ticket' | 'coins'
export type SlotLine = 'L1' | 'L2' | 'L3' | 'D1' | 'D2'

export type WireLineResult
  = | { line: SlotLine, type: 'nothing' }
    | { line: SlotLine, type: 'coins', amount: number }
    | { line: SlotLine, type: 'charme' }
    | { line: SlotLine, type: 'biome_ticket', slug: string, biome: Biome }
    | { line: SlotLine, type: 'type_ticket', slug: string, typeName: PokeType }
    | { line: SlotLine, type: 'legendary', card: WireCard }

export interface WireSpinResult {
  cells: Record<string, SlotSymbol>
  lineResults: WireLineResult[]
  cost: number
  newCoins: number
}

export interface WireRecentWin {
  username: string
  prizes: WireLineResult[]
  spun_at: ISODate
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

export interface WireTypeRec {
  type: PokeType
  covered: number
  threatened: number
  netScore: number
}

export interface WireTournamentMatchup {
  user_id: UUID
  username: string
  avatar_url: string | null
  avatar_is_alt: boolean | null
  team: WireChampionMon[]
  winProbability: number
  oppWinProbability: number
}

export interface WireMyAnalysis {
  myTeam: WireChampionMon[]
  myTeamIsLocked: boolean
  teamsAreLocked: boolean
  hasOpponents: boolean
  analysis: { strongPokemon: WireChampionMon[], weakPokemon: WireChampionMon[] }
  matchups: WireTournamentMatchup[]
  typeRecommendations: { toPrivilege: WireTypeRec[], toAvoid: WireTypeRec[] }
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
  requested_card_id?: UUID
  requested_card_name: string
  requested_card_image?: string
  requested_card_rarity: Rarity
  offered_card_id?: UUID
  offered_card_name?: string
  offered_card_image?: string
  offered_card_rarity?: Rarity
  created_at: ISODate
  target_responded_at?: ISODate
  completed_at?: ISODate
}

export interface TradeEligibility {
  uniqueStandardCount: number
  minRequired: number
  tradedThisWeek: boolean
  eligible: boolean
}

export interface WireTradePlayer {
  id: UUID
  username: string
  avatar_url: string | null
  avatar_is_alt: boolean | null
  cooldown_until: ISODate | null
}

export interface WireTradeCard {
  id: UUID
  name: string
  image_url: string
  rarity: Rarity
  quantity: number
  viewer_owns: boolean
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

// ─── Statistiques (GET /stats — gros payload agrégé, une requête) ──────────────
export interface WireStatsGlobal {
  total_rolls: number
  shiny_obtained: number
  shiny_rate: number
  legendary_rate: number
}

export interface WireStatsGym {
  name: string
  type: PokeType
  badge_name: string
  badge_image_url: string
  order_num: number
  badge_holders: number
}

export interface WireStatsPlayer {
  username: string
  total_rolls: number
  shiny_rolls: number
  legendary_rolls: number
  owned_std: number
  owned_shiny: number
  spin_runs: number
  spin_transfers: number
}

export interface WireStatsRarity { weight: number, count: number }

export interface WireStatsPool {
  total_weight: number
  total_std: number
  total_leg: number
  total_shiny: number
  rarities: {
    commun: WireStatsRarity
    rare: WireStatsRarity
    epic: WireStatsRarity
    legendary: WireStatsRarity
    shiny: WireStatsRarity
  }
}

export interface WireStatsCardQty { name: string, total_qty: number }
export interface WireStatsSpinAnec { players: string[], attempts_count: number, transfers_count: number }

export interface WireStatsAnecdotes {
  most_shiny_dupes: { players: string[], dupes: number, shiny_total: number }
  unluckiest: { players: string[], loss_high: number }
  luckiest: { players: string[], win_low: number }
  most_owned_cards: WireStatsCardQty[]
  least_owned_cards: WireStatsCardQty[]
  spin_lucky: WireStatsSpinAnec
  spin_unlucky: WireStatsSpinAnec
  spin_determined: WireStatsSpinAnec
}

export interface WireStats {
  global: WireStatsGlobal
  gyms: WireStatsGym[]
  players: WireStatsPlayer[]
  pool: WireStatsPool
  anecdotes: WireStatsAnecdotes
  spin: { total_runs: number, total_transfers: number }
}

// ─── Tchat (GET /chat/history + WebSocket /api/ws/chat) ────────────────────────
export interface WireChatMessage {
  id: string | number
  user_id: UUID
  message: string
  created_at: ISODate
  username: string
}

export interface WireChatHistory {
  messages: WireChatMessage[]
  isAdmin: boolean
}
