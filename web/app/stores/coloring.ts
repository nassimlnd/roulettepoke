import { defineStore } from 'pinia'
import type { ColoringGrid, ColoringColor, ColoringCell } from '~/types/domain'
import type { WireColoringFrame } from '~/types/api'
import { coloringRepo } from '~/repositories'
import { normalizeColoringCell } from '~/repositories/normalize'
import { applyColoringMove, frameToMove } from '~/utils/coloring'

// Paintkemon : la grille vit ici, les coups partent en HTTP (une case à la
// fois) et ceux des autres arrivent par le canal WebSocket — un canal de
// diffusion pur, authentifié comme celui du tchat.
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let attempts = 0
let wanted = false

export const useColoringStore = defineStore('coloring', {
  state: () => ({
    grid: null as ColoringGrid | null,
    selectedColorId: null as string | null,
    live: 'off' as 'off' | 'connecting' | 'open',
    error: ''
  }),

  getters: {
    complete: state => !!state.grid && state.grid.playable > 0 && state.grid.filled >= state.grid.playable,
    colorById: (state): Map<string, ColoringColor> => new Map((state.grid?.palette ?? []).map(c => [c.id, c]))
  },

  actions: {
    async load() {
      this.grid = await coloringRepo.grid(useApi())
      if (this.selectedColorId && !this.colorById.has(this.selectedColorId)) this.selectedColorId = null
    },

    select(colorId: string) {
      this.selectedColorId = colorId
      this.error = ''
    },

    /** Colorie une case avec la couleur choisie ; renvoie true si le serveur l'a acceptée. */
    async paint(cell: ColoringCell): Promise<boolean> {
      if (!this.grid || !cell.targetId || cell.colorId) return false
      const colorId = this.selectedColorId
      if (!colorId) {
        this.error = 'Choisis d\'abord une couleur dans la palette.'
        return false
      }
      this.error = ''
      try {
        const updated = await coloringRepo.colorCell(useApi(), cell.x, cell.y, colorId)
        applyColoringMove(this.grid, normalizeColoringCell(updated))
        return true
      } catch (err) {
        this.error = humanizeError(err)
        return false
      }
    },

    /** Une trame du canal : session établie, ou coup d'un autre dresseur. */
    applyFrame(frame: WireColoringFrame) {
      if (frame.type === 'authenticated') {
        this.live = 'open'
        attempts = 0
        return
      }
      const move = frameToMove(frame)
      if (move && this.grid) applyColoringMove(this.grid, move)
    },

    // ─── Diffusion en direct ─────────────────────────────────────────────────
    connect() {
      wanted = true
      attempts = 0
      this._open()
    },

    disconnect() {
      wanted = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = null
      socket?.close()
      socket = null
      this.live = 'off'
    },

    _open() {
      if (typeof window === 'undefined' || !wanted) return
      const token = useAuthStore().token
      if (!token) return
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return
      this.live = 'connecting'
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${proto}//${location.host}/api/ws/coloring`)
      socket = ws
      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }))
      ws.onmessage = (ev) => {
        let frame: WireColoringFrame
        try {
          frame = JSON.parse(ev.data)
        } catch {
          return
        }
        this.applyFrame(frame)
      }
      ws.onclose = (ev) => {
        socket = null
        this.live = 'off'
        // 4001 = jeton refusé : inutile d'insister.
        if (!wanted || ev.code === 4001) return
        const delay = Math.min(30000, 3000 * 2 ** Math.min(attempts++, 4))
        reconnectTimer = setTimeout(() => this._open(), delay)
      }
      ws.onerror = () => ws.close()
    }
  }
})
