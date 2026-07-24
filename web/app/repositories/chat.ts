import type { WireChatHistory, UUID } from '~/types/api'
import type { ChatMessage } from '~/types/domain'
import type { Api } from './_client'
import { normalizeChatMessage } from './normalize'

export const chatRepo = {
  history: async (api: Api): Promise<{ messages: ChatMessage[], isAdmin: boolean }> => {
    const { messages, isAdmin } = await api<WireChatHistory>('/chat/history')
    return { messages: messages.map(normalizeChatMessage), isAdmin }
  },
  ban: (api: Api, userId: UUID, reason: string) =>
    api(`/chat/ban/${userId}`, { method: 'POST', body: { reason } }),
  unban: (api: Api, userId: UUID) =>
    api(`/chat/unban/${userId}`, { method: 'POST' })
}
