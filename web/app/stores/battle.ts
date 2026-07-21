import { defineStore } from 'pinia'
import type { BattleRound } from '~/types/domain'

// Service de combat plein écran : n'importe quelle page appelle `present(...)`
// pour lancer un combat animé en overlay ; la promesse se résout à la fermeture.

// Un « stage » = un adversaire et ses duels. Un combat simple (Arène,
// entraînement) tient en un seul stage implicite via `rounds` ; la Ligue en
// fournit plusieurs (un par Maître), chacun introduit par une bannière.
export interface BattleStageInput {
  label: string
  rounds: BattleRound[]
  won?: boolean
}

export interface BattleConfig {
  rounds?: BattleRound[]
  stages?: BattleStageInput[]
  won: boolean
  themeColor?: string
  badgeUrl?: string | null
  title?: string
  winTitle?: string
  winSub?: string
  loseSub?: string
}

let resolver: (() => void) | null = null

export const useBattleStore = defineStore('battle', {
  state: () => ({
    active: false,
    config: null as BattleConfig | null
  }),

  actions: {
    present(config: BattleConfig): Promise<void> {
      this.config = config
      this.active = true
      return new Promise<void>((resolve) => {
        resolver = resolve
      })
    },

    close() {
      this.active = false
      this.config = null
      const r = resolver
      resolver = null
      if (r) r()
    }
  }
})
