// Config partagée de la machine à sous (Jackpot). Purement présentation + barème.
import type { SlotSymbol, SlotLine } from '~/types/api'

export interface SymbolMeta { icon: string, color: string, label: string }

export const SLOT_SYMBOLS: Record<SlotSymbol, SymbolMeta> = {
  legendary: { icon: 'i-lucide-crown', color: '#e0a92e', label: 'Légendaire' },
  charme: { icon: 'i-lucide-sparkles', color: '#a06cc4', label: 'Charme Chroma' },
  biome_ticket: { icon: 'i-lucide-trees', color: '#5bbf82', label: 'Ticket Biome' },
  type_ticket: { icon: 'i-lucide-ticket', color: '#5b9bd5', label: 'Ticket Type' },
  coins: { icon: 'i-lucide-coins', color: '#f3b53c', label: 'Pièces' }
}

// Ordre de rareté (pour le bandeau de barème).
export const SLOT_ORDER: SlotSymbol[] = ['legendary', 'charme', 'biome_ticket', 'type_ticket', 'coins']

// Cellules (col_row) composant chaque ligne de paie.
export const LINE_CELLS: Record<SlotLine, string[]> = {
  L1: ['0_top', '1_top', '2_top'],
  L2: ['0_mid', '1_mid', '2_mid'],
  L3: ['0_bot', '1_bot', '2_bot'],
  D1: ['0_top', '1_mid', '2_bot'],
  D2: ['0_bot', '1_mid', '2_top']
}

export interface BetTier { mode: 1 | 2 | 3, lines: SlotLine[], cost: number, label: string }

export const BET_TIERS: BetTier[] = [
  { mode: 1, lines: ['L2'], cost: 0, label: '1 ligne' },
  { mode: 2, lines: ['L1', 'L2', 'L3'], cost: 5, label: '3 lignes' },
  { mode: 3, lines: ['L1', 'L2', 'L3', 'D1', 'D2'], cost: 10, label: '3 + diagonales' }
]

// Probabilité par ligne d'aligner chaque symbole (barème du Guide) + gain.
export const SLOT_ODDS: { symbol: SlotSymbol, p: number, reward: string }[] = [
  { symbol: 'legendary', p: 0.005, reward: 'Carte légendaire' },
  { symbol: 'charme', p: 0.024, reward: 'Charme Chroma' },
  { symbol: 'biome_ticket', p: 0.046, reward: 'Ticket Biome' },
  { symbol: 'type_ticket', p: 0.046, reward: 'Ticket Type' },
  { symbol: 'coins', p: 0.14, reward: '50–200 pièces' }
]

// P(au moins une ligne gagnante sur N) = 1 − (1 − p)^N.
export function chanceOverLines(p: number, lines: number): number {
  return 1 - (1 - p) ** lines
}
