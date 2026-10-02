import type { AuthResponse, RegisterResponse, MeResponse, WireCard, UUID, DailyBonusExchange } from '~/types/api'
import type { DomainCard } from '~/types/domain'
import type { Api } from './_client'
import { normalizeCard } from './normalize'

export const authRepo = {
  // `identifier` accepte l'e-mail OU le pseudo. Le champ s'appelait `email`
  // jusqu'en v3 ; l'envoyer sous cet ancien nom fait répondre au serveur
  // « Identifiant et mot de passe requis » et la connexion échoue en entier.
  login: (api: Api, body: { identifier: string, password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body }),
  // Ne connecte PAS : depuis la 4.1.0 le compte doit d'abord confirmer son
  // e-mail. Attendre un jeton ici cassait l'inscription en entier.
  register: (api: Api, body: { username: string, email: string, password: string }) =>
    api<RegisterResponse>('/auth/register', { method: 'POST', body }),
  resendVerification: (api: Api, identifier: string) =>
    api<{ message: string }>('/auth/resend-verification', { method: 'POST', body: { identifier } }),
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
  // Bascule de région. PUT uniquement : GET et POST répondent 404.
  setActiveGeneration: (api: Api, generation: number) =>
    api<{ active_generation: number }>('/auth/active-generation', { method: 'PUT', body: { generation } }),
  // Bureau de change : fait passer 100 % de la prime du jour sur une région,
  // autant de fois qu'on veut dans la journée. Remplace
  // /auth/correct-daily-bonus-generation, qui répond désormais 404.
  exchangeDailyBonus: (api: Api, generation: number) =>
    api<DailyBonusExchange>('/auth/exchange-daily-bonus', { method: 'POST', body: { generation } })
}
