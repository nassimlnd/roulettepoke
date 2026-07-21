// Couche repositories : SEUL point de contact avec l'API. Les stores appellent
// ces fonctions ; les composants ne touchent jamais un repository ni $fetch.
// Chaque repository connaît la forme « wire » de son endpoint et la normalise.

import type {
  AuthResponse, MeResponse, WireCard, WireOwnedCard, WireBiome, WireRollResult,
  SellResult, WireInventory, WireTeamMember, WireBadge, WireGym, TrainingStatus,
  SlotStatus, LeagueStatus, WireTournament, SpinStatus, WireTrade, TradeEligibility,
  NotificationsResponse, WireLeaderboardResponse, WireLeaderboardRow, WireRecentShiny,
  WireGymDetail, WireGymEstimate, WireBattleResult, WireTrainingResult,
  WireSpinResult, WireRecentWin, WireMyAnalysis, WireTradePlayer, WireTradeCard, WireStats, UUID
} from '~/types/api'
import type {
  DomainCard, DomainOwnedCard, RollOutcome, BiomeInfo, TeamMember, LeaderboardData, LeaderboardRow, RecentShiny,
  DomainGym, GymDetail, GymEstimate, BattleResult, TrainingOutcome, SpinResult, RecentWin,
  DomainTournament, TournamentAnalysis, DomainTrade, TradePlayer, TradeCard, DomainStats, RealRarity
} from '~/types/domain'
import {
  normalizeCard, normalizeOwnedCard, normalizeTeamMember, normalizeLeaderboardRow, normalizeRecentShiny,
  normalizeGym, normalizeGymDetail, normalizeGymEstimate, normalizeBattleResult, normalizeTrainingOutcome,
  normalizeSpinResult, normalizeRecentWin, normalizeTournament, normalizeTournamentAnalysis,
  normalizeTrade, normalizeTradePlayer, normalizeTradeCard, normalizeStats
} from './normalize'

type Api = ReturnType<typeof useApi>

function normalizeRoll(r: WireRollResult): RollOutcome {
  if ('isSpecialEvent' in r) {
    if (r.eventType === 'coins') return { kind: 'coins', amount: r.amount, rollCost: r.rollCost }
    if (r.eventType === 'charme_chroma') return { kind: 'charme', rollCost: r.rollCost }
    return {
      kind: 'choice',
      choiceId: r.choiceId,
      left: normalizeCard(r.leftCard),
      right: normalizeCard(r.rightCard),
      rollCost: r.rollCost
    }
  }
  return { kind: 'card', card: normalizeCard(r), isNew: r.isNew, rollCost: r.rollCost }
}

export const authRepo = {
  login: (api: Api, body: { email: string, password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body }),
  register: (api: Api, body: { username: string, email: string, password: string }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', body }),
  me: (api: Api) => api<MeResponse>('/auth/me'),
  forgotPassword: (api: Api, email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (api: Api, token: string, password: string) =>
    api('/auth/reset-password', { method: 'POST', body: { token, password } }),
  avatarCards: async (api: Api): Promise<DomainCard[]> => {
    const { cards } = await api<{ cards: WireCard[] }>('/auth/avatar-cards')
    return cards.map(normalizeCard)
  },
  setAvatar: (api: Api, cardId: UUID) =>
    api<{ avatar_url: string, avatar_is_alt: boolean }>('/auth/avatar', { method: 'PUT', body: { cardId } })
}

export const rollRepo = {
  biomes: async (api: Api): Promise<BiomeInfo[]> => {
    const { biomes } = await api<{ biomes: WireBiome[] }>('/roll/biomes')
    return biomes.map(b => ({ biome: b.biome, cardCount: b.card_count, cost: b.cost, ownedCount: b.owned_count }))
  },
  perform: async (api: Api, biome: string | null): Promise<RollOutcome> => {
    const res = await api<{ card: WireRollResult }>('/roll', {
      method: 'POST',
      body: biome ? { biome } : {}
    })
    return normalizeRoll(res.card)
  },
  previewBatch: async (api: Api, count = 19, biome: string | null = null, type: string | null = null): Promise<DomainCard[]> => {
    const params = new URLSearchParams({ count: String(count) })
    if (biome) params.set('biome', biome)
    if (type) params.set('type', type)
    const { cards } = await api<{ cards: WireCard[] }>(`/roll/preview-batch?${params}`)
    return cards.map(normalizeCard)
  },
  comboCheck: (api: Api, biome: string | null, type: string | null) => {
    const params = new URLSearchParams()
    if (biome) params.set('biome', biome)
    if (type) params.set('type', type)
    return api<{ available: boolean }>(`/roll/combo-check?${params}`)
  }
}

export const collectionRepo = {
  mine: async (api: Api): Promise<DomainOwnedCard[]> => {
    const { cards } = await api<{ cards: WireOwnedCard[] }>('/collection')
    return cards.map(normalizeOwnedCard)
  },
  all: async (api: Api): Promise<DomainOwnedCard[]> => {
    const { cards } = await api<{ cards: WireOwnedCard[] }>('/collection/all')
    return cards.map(normalizeOwnedCard)
  },
  sell: (api: Api, cardId: UUID) =>
    api<SellResult>('/collection/sell', { method: 'POST', body: { cardId } })
}

export const mergeRepo = {
  perform: async (api: Api, parentCardId: UUID, currentLevel: number): Promise<DomainCard> => {
    const { card } = await api<{ card: WireCard }>('/merge', { method: 'POST', body: { parentCardId, currentLevel } })
    return normalizeCard(card)
  }
}

export const inventoryRepo = {
  get: (api: Api) => api<WireInventory>('/inventory'),
  activateCharme: (api: Api) => api<{ rolls: number }>('/inventory/activate-charme', { method: 'POST' }),
  activateBiomeTicket: (api: Api, biomeSlug: string) =>
    api('/inventory/activate-biome-ticket', { method: 'POST', body: { biomeSlug } }),
  activateTypeTicket: (api: Api, typeSlug: string) =>
    api('/inventory/activate-type-ticket', { method: 'POST', body: { typeSlug } }),
  deactivateBiomeTicket: (api: Api) => api('/inventory/deactivate-biome-ticket', { method: 'POST' }),
  deactivateTypeTicket: (api: Api) => api('/inventory/deactivate-type-ticket', { method: 'POST' })
}

export const teamRepo = {
  get: async (api: Api): Promise<TeamMember[]> => {
    const members = await api<WireTeamMember[]>('/team')
    return members.map(normalizeTeamMember)
  },
  roll: async (api: Api): Promise<TeamMember> => {
    const member = await api<WireTeamMember>('/team/roll', { method: 'POST' })
    return normalizeTeamMember(member)
  },
  swap: (api: Api, idA: UUID, idB: UUID) => api('/team/swap', { method: 'POST', body: { idA, idB } }),
  remove: (api: Api, teamEntryId: UUID) => api(`/team/${teamEntryId}`, { method: 'DELETE' }),
  clear: (api: Api) => api('/team', { method: 'DELETE' })
}

export const gymRepo = {
  getAll: async (api: Api): Promise<DomainGym[]> => {
    const gyms = await api<WireGym[]>('/gym')
    return gyms.map(normalizeGym)
  },
  getBadges: (api: Api) => api<WireBadge[]>('/gym/badges'),
  detail: async (api: Api, id: UUID): Promise<GymDetail> => {
    const d = await api<WireGymDetail>(`/gym/${id}`)
    return normalizeGymDetail(d)
  },
  estimate: async (api: Api, id: UUID): Promise<GymEstimate> => {
    const e = await api<WireGymEstimate>(`/gym/${id}/estimate`)
    return normalizeGymEstimate(e)
  },
  battle: async (api: Api, id: UUID): Promise<BattleResult> => {
    const b = await api<WireBattleResult>(`/gym/${id}/battle`, { method: 'POST' })
    return normalizeBattleResult(b)
  },
  getHistory: (api: Api) => api<unknown[]>('/gym/history')
}

export const trainingRepo = {
  status: (api: Api) => api<TrainingStatus>('/training/status'),
  battle: async (api: Api): Promise<TrainingOutcome> => {
    const t = await api<WireTrainingResult>('/training/battle', { method: 'POST' })
    return normalizeTrainingOutcome(t)
  }
}

export const slotRepo = {
  status: (api: Api) => api<SlotStatus>('/slot-machine/status'),
  spin: async (api: Api, lines: 1 | 2 | 3): Promise<SpinResult> => {
    const w = await api<WireSpinResult>('/slot-machine/spin', { method: 'POST', body: { lines } })
    return normalizeSpinResult(w)
  },
  recentWins: async (api: Api): Promise<RecentWin[]> => {
    const { wins } = await api<{ wins: WireRecentWin[] }>('/slot-machine/recent-wins')
    return wins.map(normalizeRecentWin)
  }
}

export const leagueRepo = {
  status: (api: Api) => api<LeagueStatus>('/league/status')
}

export const tournamentRepo = {
  current: async (api: Api): Promise<DomainTournament | null> => {
    const { tournament } = await api<{ tournament: WireTournament | null }>('/tournament/current')
    return tournament ? normalizeTournament(tournament) : null
  },
  analysis: async (api: Api): Promise<TournamentAnalysis> => {
    const a = await api<WireMyAnalysis>('/tournament/my-analysis')
    return normalizeTournamentAnalysis(a)
  },
  register: (api: Api) => api('/tournament/register', { method: 'POST' })
}

export const spinRepo = {
  status: (api: Api) => api<SpinStatus>('/spin/status')
}

export const tradesRepo = {
  list: async (api: Api): Promise<DomainTrade[]> => {
    const trades = await api<WireTrade[]>('/trades')
    return trades.map(normalizeTrade)
  },
  eligibility: (api: Api) => api<TradeEligibility>('/trades/eligibility'),
  players: async (api: Api): Promise<TradePlayer[]> => {
    const players = await api<WireTradePlayer[]>('/trades/players')
    return players.map(normalizeTradePlayer)
  },
  playerCards: async (api: Api, playerId: UUID, rarity: RealRarity): Promise<TradeCard[]> => {
    const cards = await api<WireTradeCard[]>(`/trades/players/${playerId}/cards?rarity=${encodeURIComponent(rarity)}`)
    return cards.map(normalizeTradeCard)
  },
  create: (api: Api, targetId: UUID, requestedCardId: UUID) =>
    api('/trades', { method: 'POST', body: { targetId, requestedCardId } }),
  respond: (api: Api, id: UUID, accept: boolean, offeredCardId?: UUID) =>
    api(`/trades/${id}/respond`, { method: 'POST', body: { accept, offeredCardId } }),
  confirm: (api: Api, id: UUID, accept: boolean) =>
    api(`/trades/${id}/confirm`, { method: 'POST', body: { accept } }),
  cancel: (api: Api, id: UUID) => api(`/trades/${id}/cancel`, { method: 'POST' })
}

export const notificationsRepo = {
  list: (api: Api) => api<NotificationsResponse>('/notifications'),
  readAll: (api: Api) => api('/notifications/read-all', { method: 'POST' })
}

export const leaderboardRepo = {
  get: async (api: Api): Promise<LeaderboardData> => {
    const res = await api<WireLeaderboardResponse>('/leaderboard')
    const ctx = res.playerContext
    return {
      top: res.top10.map(normalizeLeaderboardRow),
      player: ctx
        ? {
            above: ctx.above ? normalizeLeaderboardRow(ctx.above) : null,
            current: normalizeLeaderboardRow(ctx.current),
            below: ctx.below ? normalizeLeaderboardRow(ctx.below) : null
          }
        : null
    }
  },
  cheaters: async (api: Api): Promise<LeaderboardRow[]> => {
    const { cheaters } = await api<{ cheaters: WireLeaderboardRow[] }>('/leaderboard/cheaters')
    return cheaters.map(normalizeLeaderboardRow)
  },
  recentShinies: async (api: Api): Promise<RecentShiny[]> => {
    const { shinies } = await api<{ shinies: WireRecentShiny[] }>('/leaderboard/recent-shinies')
    return shinies.map(normalizeRecentShiny)
  }
}

export const eventRepo = {
  confirmCardChoice: async (api: Api, choiceId: UUID, cardId: UUID) => {
    const { card } = await api<{ card: WireCard & { isNew?: boolean } }>('/event/card-choice', {
      method: 'POST',
      body: { choiceId, cardId }
    })
    return { card: normalizeCard(card), isNew: !!card.isNew }
  }
}

export const statsRepo = {
  get: async (api: Api): Promise<DomainStats> => normalizeStats(await api<WireStats>('/stats'))
}
