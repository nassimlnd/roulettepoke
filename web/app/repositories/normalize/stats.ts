// Normalisation du gros payload agrégé /stats (probabilités du pool, anecdotes).
import type { WireStats } from '~/types/api'
import type { DomainStats, OddsKey } from '~/types/domain'

const ODDS_META: Record<OddsKey, { label: string, color: string }> = {
  commun: { label: 'Commun', color: '#b0a79a' },
  rare: { label: 'Rare', color: '#5b9bd5' },
  epic: { label: 'Épique', color: '#a06cc4' },
  shiny: { label: 'Shiny', color: '#a684ff' },
  legendary: { label: 'Légendaire', color: '#e0a92e' }
}

export function normalizeStats(s: WireStats): DomainStats {
  const p = s.pool
  const totalWeight = p.total_weight || 1
  const keys: OddsKey[] = ['commun', 'rare', 'epic', 'legendary', 'shiny']
  const odds = keys
    .map((k) => {
      const r = p.rarities[k]
      return {
        key: k,
        label: ODDS_META[k].label,
        color: ODDS_META[k].color,
        count: r.count,
        probability: (r.count * r.weight) / totalWeight
      }
    })
    .sort((a, b) => b.probability - a.probability)

  const a = s.anecdotes
  return {
    global: {
      totalRolls: s.global.total_rolls,
      shinyObtained: s.global.shiny_obtained,
      shinyRate: s.global.shiny_rate,
      legendaryRate: s.global.legendary_rate
    },
    gyms: s.gyms
      .map(g => ({
        name: g.name,
        type: g.type,
        badgeName: g.badge_name,
        badgeImageUrl: g.badge_image_url,
        orderNum: g.order_num,
        holders: g.badge_holders
      }))
      .sort((x, y) => y.holders - x.holders),
    players: [...s.players]
      .map(pl => ({
        username: pl.username,
        totalRolls: pl.total_rolls,
        shinyRolls: pl.shiny_rolls,
        legendaryRolls: pl.legendary_rolls,
        ownedStd: pl.owned_std,
        ownedShiny: pl.owned_shiny,
        spinRuns: pl.spin_runs,
        spinTransfers: pl.spin_transfers
      }))
      .sort((x, y) => x.username.localeCompare(y.username, 'fr', { sensitivity: 'base' })),
    odds,
    pool: { totalStd: p.total_std, totalLeg: p.total_leg, totalShiny: p.total_shiny },
    anecdotes: {
      mostShinyDupes: { names: a.most_shiny_dupes.players, dupes: a.most_shiny_dupes.dupes, shinyTotal: a.most_shiny_dupes.shiny_total },
      unluckiest: { names: a.unluckiest.players, lossHigh: a.unluckiest.loss_high },
      luckiest: { names: a.luckiest.players, winLow: a.luckiest.win_low },
      mostOwnedCards: a.most_owned_cards.map(c => ({ name: c.name, totalQty: c.total_qty })),
      leastOwnedCards: a.least_owned_cards.map(c => ({ name: c.name, totalQty: c.total_qty })),
      spinLucky: { names: a.spin_lucky.players, attempts: a.spin_lucky.attempts_count, transfers: a.spin_lucky.transfers_count },
      spinUnlucky: { names: a.spin_unlucky.players, attempts: a.spin_unlucky.attempts_count, transfers: a.spin_unlucky.transfers_count },
      spinDetermined: { names: a.spin_determined.players, attempts: a.spin_determined.attempts_count, transfers: a.spin_determined.transfers_count }
    },
    spin: { totalRuns: s.spin.total_runs, totalTransfers: s.spin.total_transfers }
  }
}
