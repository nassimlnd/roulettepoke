// Vente intelligente : construction du PLAN (pur, testé unitairement).
// L'API ne vend qu'un exemplaire par appel — toute l'intelligence est donc ici,
// côté client : décider quoi vendre, combien en garder, et pourquoi.
//
// Invariants, quelles que soient les règles cochées :
//  - on ne vend JAMAIS le dernier exemplaire : la progression du Pokédex et
//    l'éligibilité aux échanges (comptée en cartes distinctes) ne bougent pas ;
//  - une carte dont l'évolution existe garde sa réserve de fusion
//    (MERGE_COST exemplaires) : 10 doublons valent une carte de plus au dex,
//    pas 10 × leur prix de vente.
import type { DomainCard, DomainOwnedCard } from '~/types/domain'
import { SELL_PRICE } from '~/utils/poke'
import { MERGE_COST } from '~/constants/game'

export type SellRule = 'shinyOwned' | 'shinyDupes' | 'otherDupes'

export interface SellPlanOptions {
  /** Doublons standard des cartes dont la shiny est déjà possédée (garde 1). */
  shinyOwned: boolean
  /** Doublons shiny — chaque vente rapporte un Charme Chroma (garde 1). */
  shinyDupes: boolean
  /** Tous les autres doublons standard (garde `keep` exemplaires). */
  otherDupes: boolean
  /** Seuil de garde de la règle `otherDupes` : vendre au-delà de N exemplaires. */
  keep: number
}

export interface SellPlanLine {
  card: DomainOwnedCard
  rule: SellRule
  /** Exemplaires à vendre (< quantity, toujours). */
  count: number
  /** Gain estimé en pièces (0 pour un shiny). */
  coins: number
  /** Charmes Chroma obtenus (= count pour un shiny, 0 sinon). */
  charms: number
}

export interface SellPlan {
  lines: SellPlanLine[]
  copies: number
  coins: number
  charms: number
  /** Cartes dont la réserve de fusion a réduit (ou annulé) la vente. */
  mergeProtected: number
}

export const DEFAULT_SELL_OPTIONS: SellPlanOptions = {
  shinyOwned: true,
  shinyDupes: true,
  otherDupes: false,
  keep: 1
}

// Une évolution existe-t-elle pour cette carte ? Même critère que le badge
// « Fusion » de la grille (getter `mergeables`), sans la condition de quantité :
// ici on protège aussi les piles qui n'ont PAS ENCORE de quoi fusionner.
export function hasEvolution(card: DomainCard, cards: readonly DomainCard[]): boolean {
  if (card.level >= 3) return false
  const family = card.parentCardId ?? card.id
  return cards.some(x => x.parentCardId === family && x.level === card.level + 1)
}

// /collection ne renvoie pas standard_id : le lien shiny ↔ standard passe par
// (num, génération) — vérifié exhaustif sur le catalogue réel (251/251, aucun
// numéro dupliqué).
function dexKey(card: DomainCard): string {
  return `${card.generation}:${card.num}`
}

const RULE_ORDER: Record<SellRule, number> = { shinyOwned: 0, shinyDupes: 1, otherDupes: 2 }

export function buildSellPlan(cards: readonly DomainOwnedCard[], opts: SellPlanOptions): SellPlan {
  const ownedShinyKeys = new Set(
    cards.filter(c => c.isShiny && c.owned && c.quantity > 0).map(dexKey))

  const lines: SellPlanLine[] = []
  let mergeProtected = 0

  for (const card of cards) {
    if (!card.owned || card.quantity < 2) continue

    let rule: SellRule
    if (card.isShiny) rule = 'shinyDupes'
    else if (ownedShinyKeys.has(dexKey(card))) rule = 'shinyOwned'
    else rule = 'otherDupes'
    if (!opts[rule]) continue

    const keep = rule === 'otherDupes' ? Math.max(1, opts.keep) : 1
    const reserve = hasEvolution(card, cards) ? Math.max(MERGE_COST, keep) : keep
    const count = Math.max(0, card.quantity - reserve)
    if (reserve > keep && count < card.quantity - keep) mergeProtected++
    if (count === 0) continue

    lines.push({
      card,
      rule,
      count,
      coins: card.isShiny ? 0 : count * SELL_PRICE[card.rarity],
      charms: card.isShiny ? count : 0
    })
  }

  lines.sort((a, b) =>
    (RULE_ORDER[a.rule] - RULE_ORDER[b.rule])
    || (b.coins + b.charms) - (a.coins + a.charms)
    || a.card.name.localeCompare(b.card.name, 'fr'))

  return {
    lines,
    copies: lines.reduce((n, l) => n + l.count, 0),
    coins: lines.reduce((n, l) => n + l.coins, 0),
    charms: lines.reduce((n, l) => n + l.charms, 0),
    mergeProtected
  }
}
