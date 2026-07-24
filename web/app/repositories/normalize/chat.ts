// Normalisation d'un message de tchat.
import type { WireChatMessage } from '~/types/api'
import type { ChatMessage } from '~/types/domain'

export function normalizeChatMessage(m: WireChatMessage): ChatMessage {
  return {
    id: String(m.id),
    userId: m.user_id,
    username: m.username,
    message: m.message,
    createdAt: m.created_at
  }
}
