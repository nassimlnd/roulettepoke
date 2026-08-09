import type { AuthResponse, MeResponse, WireCard, UUID, DailyBonusCorrection } from '~/types/api'
import type { DomainCard } from '~/types/domain'
import type { Api } from './_client'
import { normalizeCard } from './normalize'

export const authRepo = {
  // `identifier` accepte l'e-mail OU le pseudo. Le champ s'appelait `email`
  // jusqu'en v3 ; l'envoyer sous cet ancien nom fait répondre au serveur
  // « Identifiant et mot de passe requis » et la connexion échoue en entier.
  login: (api: Api, body: { identifier: string, password: string }) =>
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
    api<{ avatar_url: string, avatar_is_alt: boolean }>('/auth/avatar', { method: 'PUT', body: { cardId } }),
  // Bascule Kanto ↔ Johto. PUT uniquement : GET et POST répondent 404.
  setActiveGeneration: (api: Api, generation: number) =>
    api<{ active_generation: number }>('/auth/active-generation', { method: 'PUT', body: { generation } }),
  // Déplace la prime du jour vers la région active (1×/jour). Sans corps.
  correctDailyBonusGeneration: (api: Api) =>
    api<DailyBonusCorrection>('/auth/correct-daily-bonus-generation', { method: 'POST' })
}
