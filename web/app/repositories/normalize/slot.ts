// Normalisation de la machine à sous (lignes gagnantes + gains récents).
import type { WireLineResult, WireSpinResult, WireRecentWin } from '~/types/api'
import type { LineReward, SpinResult, RecentWin } from '~/types/domain'
import { normalizeCard } from './card'

function normalizeLineReward(r: WireLineResult): LineReward {
  switch (r.type) {
    case 'coins': return { line: r.line, type: 'coins', amount: r.amount }
    case 'charme': return { line: r.line, type: 'charme' }
    case 'biome_ticket': return { line: r.line, type: 'biome_ticket', biome: r.biome }
    case 'type_ticket': return { line: r.line, type: 'type_ticket', typeName: r.typeName }
    case 'legendary': return { line: r.line, type: 'legendary', card: normalizeCard(r.card) }
    default: return { line: r.line, type: 'nothing' }
  }
}

export function normalizeSpinResult(w: WireSpinResult): SpinResult {
  return {
    cells: w.cells,
    lines: (w.lineResults ?? []).map(normalizeLineReward),
    cost: w.cost,
    newCoins: w.newCoins
  }
}

export function normalizeRecentWin(w: WireRecentWin): RecentWin {
  return {
    username: w.username,
    prizes: (w.prizes ?? []).map(normalizeLineReward),
    spunAt: w.spun_at
  }
}
