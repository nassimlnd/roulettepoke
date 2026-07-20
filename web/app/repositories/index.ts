// Couche repositories : SEUL point de contact avec l'API. Les stores appellent
// ces fonctions ; les composants ne touchent jamais un repository ni $fetch.
// Chaque repository connaît la forme « wire » de son endpoint et la normalise.

import type {
  AuthResponse, MeResponse, WireCard, WireOwnedCard, WireBiome, WireRollResult,
  SellResult, WireInventory, WireTeamMember, WireBadge, WireGym, TrainingStatus,
  SlotStatus, LeagueStatus, WireTournament, SpinStatus, WireTrade, TradeEligibility,
  NotificationsResponse, UUID
} from '~/types/api'
import type { DomainCard, DomainOwnedCard, RollOutcome, BiomeInfo } from '~/types/domain'
import { normalizeCard, normalizeOwnedCard } from './normalize'

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
  get: (api: Api) => api<WireTeamMember[]>('/team'),
  roll: (api: Api) => api<WireTeamMember>('/team/roll', { method: 'POST' }),
  swap: (api: Api, idA: UUID, idB: UUID) => api('/team/swap', { method: 'POST', body: { idA, idB } }),
  remove: (api: Api, teamEntryId: UUID) => api(`/team/${teamEntryId}`, { method: 'DELETE' }),
  clear: (api: Api) => api('/team', { method: 'DELETE' })
}

export const gymRepo = {
  getAll: (api: Api) => api<WireGym[]>('/gym'),
  getBadges: (api: Api) => api<WireBadge[]>('/gym/badges'),
  getHistory: (api: Api) => api<unknown[]>('/gym/history')
}

export const trainingRepo = {
  status: (api: Api) => api<TrainingStatus>('/training/status')
}

export const slotRepo = {
  status: (api: Api) => api<SlotStatus>('/slot-machine/status')
}

export const leagueRepo = {
  status: (api: Api) => api<LeagueStatus>('/league/status')
}

export const tournamentRepo = {
  current: (api: Api) => api<{ tournament: WireTournament | null }>('/tournament/current')
}

export const spinRepo = {
  status: (api: Api) => api<SpinStatus>('/spin/status')
}

export const tradesRepo = {
  list: (api: Api) => api<WireTrade[]>('/trades'),
  eligibility: (api: Api) => api<TradeEligibility>('/trades/eligibility')
}

export const notificationsRepo = {
  list: (api: Api) => api<NotificationsResponse>('/notifications'),
  readAll: (api: Api) => api('/notifications/read-all', { method: 'POST' })
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
