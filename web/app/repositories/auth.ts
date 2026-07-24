import type { AuthResponse, MeResponse, WireCard, UUID } from '~/types/api'
import type { DomainCard } from '~/types/domain'
import type { Api } from './_client'
import { normalizeCard } from './normalize'

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
