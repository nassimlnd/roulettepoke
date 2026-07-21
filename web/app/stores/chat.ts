import { defineStore } from 'pinia'
import type { ChatMessage } from '~/types/domain'
import type { UUID } from '~/types/api'
import { chatRepo } from '~/repositories'
import { normalizeChatMessage } from '~/repositories/normalize'

// Tchat temps réel. Un seul WebSocket partagé (au niveau module, comme le
// singleton d'auth) : historique via REST puis flux live. Reconnexion 3 s ;
// fermetures 4001 (session expirée) / 4003 (banni) sont définitives.
export const CHAT_MAX_LEN = 300
const HISTORY_CAP = 300
const RECONNECT_MS = 3000

export type ChatStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'banned' | 'expired'

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let manualClose = false

interface ChatFrame {
  type: 'authenticated' | 'message' | 'purge'
  id?: string | number
  user_id?: UUID
  message?: string
  created_at?: string
  username?: string
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[],
    status: 'idle' as ChatStatus,
    open: false,
    unread: 0,
    isAdmin: false,
    started: false
  }),

  getters: {
    connected: state => state.status === 'open',
    blocked: state => state.status === 'banned' || state.status === 'expired'
  },

  actions: {
    // Monté une fois par le widget global.
    start() {
      if (this.started) return
      this.started = true
      manualClose = false
      this._loadHistory().finally(() => this._connect())
    },

    async _loadHistory() {
      try {
        const { messages, isAdmin } = await chatRepo.history(useApi())
        this.messages = messages.slice(-HISTORY_CAP)
        this.isAdmin = isAdmin
      } catch {
        // silencieux : le flux live prendra le relais
      }
    },

    _connect() {
      if (typeof window === 'undefined') return
      const token = useAuthStore().token
      if (!token || manualClose) return
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return

      this.status = 'connecting'
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${proto}//${location.host}/api/ws/chat`)
      socket = ws
      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }))
      ws.onmessage = ev => this._onFrame(ev)
      ws.onclose = ev => this._onClose(ev)
      ws.onerror = () => ws.close()
    },

    _onFrame(ev: MessageEvent) {
      let frame: ChatFrame
      try {
        frame = JSON.parse(ev.data)
      } catch {
        return
      }
      if (frame.type === 'authenticated') {
        this.status = 'open'
        return
      }
      if (frame.type === 'purge' && frame.user_id) {
        this.messages = this.messages.filter(m => m.userId !== frame.user_id)
        return
      }
      if (frame.type === 'message' && frame.id != null) {
        const msg = normalizeChatMessage({
          id: frame.id,
          user_id: frame.user_id ?? '',
          message: frame.message ?? '',
          created_at: frame.created_at ?? new Date().toISOString(),
          username: frame.username ?? '?'
        })
        if (this.messages.some(m => m.id === msg.id)) return
        this.messages.push(msg)
        if (this.messages.length > HISTORY_CAP) this.messages.shift()
        if (!this.open && msg.userId !== useAuthStore().userId) this.unread++
      }
    },

    _onClose(ev: CloseEvent) {
      socket = null
      if (ev.code === 4003) {
        this.status = 'banned'
        return
      }
      if (ev.code === 4001) {
        this.status = 'expired'
        return
      }
      this.status = 'closed'
      if (manualClose) return
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => this._loadHistory().finally(() => this._connect()), RECONNECT_MS)
    },

    send(text: string): boolean {
      const trimmed = text.trim().slice(0, CHAT_MAX_LEN)
      if (!trimmed || !socket || socket.readyState !== WebSocket.OPEN) return false
      socket.send(JSON.stringify({ text: trimmed }))
      return true
    },

    openPanel() {
      this.open = true
      this.unread = 0
    },
    closePanel() {
      this.open = false
    },
    togglePanel() {
      if (this.open) this.closePanel()
      else this.openPanel()
    },

    async ban(userId: UUID, reason: string) {
      await chatRepo.ban(useApi(), userId, reason)
      this.messages = this.messages.filter(m => m.userId !== userId)
    },

    stop() {
      manualClose = true
      this.started = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = null
      socket?.close()
      socket = null
      this.status = 'idle'
    }
  }
})
