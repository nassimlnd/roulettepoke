import { describe, it, expect } from 'vitest'
import type { DomainOwnedCard } from '~/types/domain'
import { buildSellPlan, hasEvolution, DEFAULT_SELL_OPTIONS } from '~/utils/sellPlan'

// Fabrique compacte : une carte possédée, standard, commune, sans évolution.
// `id` sert aussi de nom lisible dans les assertions.
let seq = 0
function card(over: Partial<DomainOwnedCard> = {}): DomainOwnedCard {
  const id = over.id ?? `c${++seq}`
  return {
    id,
    num: over.num ?? 100 + seq,
    generation: 1,
    name: id,
    imageUrl: `/img/${id}.webp`,
    rarity: 'Commun',
    isShiny: false,
    level: 1,
    biome: 'Forêt',
    type: 'Plante',
    parentCardId: id,
    standardId: null,
    quantity: 1,
    owned: true,
    obtainedAt: null,
    ...over
  }
}

// Paire standard + shiny au même numéro de dex — /collection ne renvoyant pas
// standard_id, c'est (num, génération) qui relie les deux variantes.
function pair(num: number, stdQty: number, shinyQty: number) {
  return [
    card({ id: `std${num}`, num, quantity: stdQty, owned: stdQty > 0 }),
    card({ id: `shy${num}`, num, quantity: shinyQty, owned: shinyQty > 0, isShiny: true, parentCardId: `shy${num}` })
  ]
}

describe('buildSellPlan — règle « chasse shiny terminée »', () => {
  it('vend les doublons quand la shiny est possédée, en gardant 1 exemplaire', () => {
    const plan = buildSellPlan(pair(25, 4, 1), DEFAULT_SELL_OPTIONS)
    expect(plan.lines).toHaveLength(1)
    expect(plan.lines[0]).toMatchObject({ rule: 'shinyOwned', count: 3, coins: 3, charms: 0 })
    expect(plan.copies).toBe(3)
  })

  it('ignore les doublons dont la shiny manque (ils portent la chance shiny)', () => {
    const plan = buildSellPlan(pair(25, 4, 0), DEFAULT_SELL_OPTIONS)
    expect(plan.lines).toHaveLength(0)
  })

  it('ne relie pas deux numéros identiques de générations différentes', () => {
    const shinyG2 = card({ id: 'shyG2', num: 25, generation: 2, isShiny: true, quantity: 1 })
    const stdG1 = card({ id: 'stdG1', num: 25, generation: 1, quantity: 4 })
    const plan = buildSellPlan([stdG1, shinyG2], DEFAULT_SELL_OPTIONS)
    expect(plan.lines).toHaveLength(0)
  })

  it('valorise au prix de la rareté', () => {
    const [std, shy] = pair(9, 3, 1)
    std!.rarity = 'Légendaire'
    const plan = buildSellPlan([std!, shy!], DEFAULT_SELL_OPTIONS)
    expect(plan.lines[0]!.coins).toBe(2 * 25)
  })
})

describe('buildSellPlan — doublons shiny', () => {
  it('convertit chaque doublon shiny en Charme, sans pièces', () => {
    const plan = buildSellPlan(pair(52, 1, 4), DEFAULT_SELL_OPTIONS)
    expect(plan.lines).toHaveLength(1)
    expect(plan.lines[0]).toMatchObject({ rule: 'shinyDupes', count: 3, coins: 0, charms: 3 })
    expect(plan.charms).toBe(3)
    expect(plan.coins).toBe(0)
  })
})

describe('buildSellPlan — autres doublons (règle optionnelle)', () => {
  it('reste hors du plan par défaut', () => {
    const plan = buildSellPlan([card({ quantity: 9 })], DEFAULT_SELL_OPTIONS)
    expect(plan.lines).toHaveLength(0)
  })

  it('vend au-delà du seuil de garde choisi', () => {
    const plan = buildSellPlan(
      [card({ quantity: 9 })],
      { ...DEFAULT_SELL_OPTIONS, otherDupes: true, keep: 3 })
    expect(plan.lines[0]).toMatchObject({ rule: 'otherDupes', count: 6 })
  })

  it('un seuil supérieur à la quantité ne vend rien', () => {
    const plan = buildSellPlan(
      [card({ quantity: 3 })],
      { ...DEFAULT_SELL_OPTIONS, otherDupes: true, keep: 5 })
    expect(plan.lines).toHaveLength(0)
    expect(plan.mergeProtected).toBe(0)
  })
})

describe('buildSellPlan — protections', () => {
  it('ne vend JAMAIS le dernier exemplaire, toutes règles actives', () => {
    const cards = [
      ...pair(1, 1, 1), // std qty 1 + shiny possédée : intouchable
      card({ quantity: 1 })
    ]
    const plan = buildSellPlan(cards, { shinyOwned: true, shinyDupes: true, otherDupes: true, keep: 1 })
    expect(plan.lines).toHaveLength(0)
  })

  it('garde la réserve de fusion (10) quand une évolution existe', () => {
    const base = card({ id: 'chenipan', num: 10, quantity: 25 })
    const evo = card({ id: 'chrysacier', num: 11, level: 2, parentCardId: 'chenipan', quantity: 0, owned: false })
    const shiny = card({ id: 'shy10', num: 10, isShiny: true, parentCardId: 'shy10', quantity: 1 })
    const plan = buildSellPlan([base, evo, shiny], DEFAULT_SELL_OPTIONS)
    expect(plan.lines[0]!.count).toBe(15) // 25 − 10, pas 25 − 1
    expect(plan.mergeProtected).toBe(1)
  })

  it('une pile sous la réserve de fusion n\'est pas touchée mais est comptée protégée', () => {
    const base = card({ id: 'base', num: 10, quantity: 6 })
    const evo = card({ id: 'evo', num: 11, level: 2, parentCardId: 'base', quantity: 0, owned: false })
    const shiny = card({ id: 'shy10', num: 10, isShiny: true, parentCardId: 'shy10', quantity: 1 })
    const plan = buildSellPlan([base, evo, shiny], DEFAULT_SELL_OPTIONS)
    expect(plan.lines).toHaveLength(0)
    expect(plan.mergeProtected).toBe(1)
  })

  it('niveau 3 : plus d\'évolution possible, pas de réserve', () => {
    const top = card({ id: 'top', num: 12, level: 3, quantity: 12 })
    const shiny = card({ id: 'shy12', num: 12, isShiny: true, parentCardId: 'shy12', quantity: 1 })
    const plan = buildSellPlan([top, shiny], DEFAULT_SELL_OPTIONS)
    expect(plan.lines[0]!.count).toBe(11)
  })
})

describe('buildSellPlan — totaux et ordre', () => {
  it('agrège pièces, charmes et exemplaires, et trie par règle puis par gain', () => {
    const [stdA, shyA] = pair(30, 5, 1) // shinyOwned : vend 4 → 4 🪙
    const [stdB, shyB] = pair(31, 1, 3) // shinyDupes : vend 2 → 2 charmes
    const other = card({ id: 'zz', num: 40, quantity: 4 }) // otherDupes : vend 3
    const plan = buildSellPlan(
      [other, stdB!, shyB!, stdA!, shyA!],
      { shinyOwned: true, shinyDupes: true, otherDupes: true, keep: 1 })
    expect(plan.lines.map(l => l.rule)).toEqual(['shinyOwned', 'shinyDupes', 'otherDupes'])
    expect(plan.copies).toBe(4 + 2 + 3)
    expect(plan.coins).toBe(4 + 0 + 3)
    expect(plan.charms).toBe(2)
  })
})

describe('hasEvolution', () => {
  it('reconnaît une évolution de la même famille au niveau suivant', () => {
    const base = card({ id: 'b', level: 1 })
    const evo = card({ id: 'e', level: 2, parentCardId: 'b' })
    expect(hasEvolution(base, [base, evo])).toBe(true)
    expect(hasEvolution(evo, [base, evo])).toBe(false)
  })
})
