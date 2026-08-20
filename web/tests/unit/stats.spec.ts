import { describe, it, expect } from 'vitest'
import { normalizeStats } from '~/repositories/normalize'
import type { WireStats } from '~/types/api'

// Fixture calquée sur la réponse réelle de /stats (10 août 2026) — la v4 a
// restructuré tout le payload, et l'ancienne normalisation plantait sur
// `s.gyms.map` (champ disparu) : page Statistiques entièrement KO.
const wire: WireStats = {
  global: {
    roulette: { total_rolls: 51230, shiny_obtained: 208, shiny_rate: 0.41, legendary_rate: 0.12 },
    jackpot: { total_spins: 4100, total_coins: 60250, total_items: 310, total_legendaries: 12 },
    spin: { total_runs: 890, total_transfers: 41, avg_runs_for_reward: 3.4, avg_runs_for_legendary: 21.7 },
    motus: { total_games: 160, total_wins: 118 }
  },
  players: [
    {
      username: 'Zoé',
      total_rolls: 900,
      shiny_rolls: 4,
      legendary_rolls: 1,
      owned_std: 120,
      owned_shiny: 4,
      spin_runs: 12,
      spin_transfers: 1,
      nemesis: { opponents: ['Nate'], count: 5 },
      victim: { opponents: ['PouPou', 'Emma'], count: 3 }
    },
    {
      username: 'adrien',
      total_rolls: 100,
      shiny_rolls: 0,
      legendary_rolls: 0,
      owned_std: 30,
      owned_shiny: 0,
      spin_runs: 0,
      spin_transfers: 0,
      nemesis: null,
      victim: { opponents: [], count: 0 }
    }
  ],
  pool: { total_std: 502, total_shiny: 502 },
  anecdotes: {
    roulette: {
      most_shiny_dupes: { players: ['Nate', 'Emma', 'PouPou', 'Léa'], dupes: 9, shiny_total: 40 },
      specialist: { entries: [{ username: 'Emma', card_name: 'Métamorph', quantity: 42 }] },
      precious: null,
      shiny_hunter: { players: ['Nate'], count: 12 }
    },
    jackpot: {
      ka_tching: { players: ['PouPou'], total_won: 8000 },
      banqueroute: { players: ['Léa'], total_lost: 1200 }
      // big_winner / legendary_hunter absents : chaque récompense peut manquer.
    },
    motus: {
      rap_god: { players: ['Nate'], forms_owned: 21 }
    },
    tournoi: {
      tyran_victime: { entries: [{ tyran: 'Nate', victime: 'Emma', wins: 6 }] }
    }
    // famille spin absente en entier
  }
}

describe('normalizeStats (contrat v4)', () => {
  const d = normalizeStats(wire)

  it('mappe le global décliné par jeu', () => {
    expect(d.roulette.totalRolls).toBe(51230)
    expect(d.jackpot.totalCoins).toBe(60250)
    expect(d.spin.avgRunsForLegendary).toBe(21.7)
    expect(d.motus.totalWins).toBe(118)
    expect(d.pool).toEqual({ totalStd: 502, totalShiny: 502 })
  })

  it('trie les joueurs par pseudo (insensible à la casse) et porte leurs duels', () => {
    expect(d.players.map(p => p.username)).toEqual(['adrien', 'Zoé'])
    const zoe = d.players.find(p => p.username === 'Zoé')!
    expect(zoe.nemesis).toEqual({ opponents: ['Nate'], count: 5 })
    expect(zoe.victim?.opponents).toEqual(['PouPou', 'Emma'])
    // Un duel sans adversaire n'est pas un duel : null, pas un objet creux.
    const adrien = d.players.find(p => p.username === 'adrien')!
    expect(adrien.nemesis).toBeNull()
    expect(adrien.victim).toBeNull()
  })

  it('construit les 5 familles × 4 récompenses du palmarès', () => {
    expect(d.awardGroups.map(g => g.key)).toEqual(['roulette', 'jackpot', 'spin', 'motus', 'tournoi'])
    for (const g of d.awardGroups) expect(g.awards).toHaveLength(4)
  })

  it('formate une récompense pourvue : vedettes plafonnées à 2 + « +N »', () => {
    const dupes = d.awardGroups[0]!.awards.find(a => a.key === 'most_shiny_dupes')!
    expect(dupes.names).toEqual(['Nate', 'Emma', '+2'])
    expect(dupes.detail).toBe('9 doublons')
  })

  it('formate les récompenses « à entrées » (une carte par joueur, un duo par ligne)', () => {
    const spec = d.awardGroups[0]!.awards.find(a => a.key === 'specialist')!
    expect(spec.names).toEqual(['Emma (Métamorph)'])
    expect(spec.detail).toBe('42 exemplaires')
    const tyran = d.awardGroups[4]!.awards.find(a => a.key === 'tyran_victime')!
    expect(tyran.names).toEqual(['Nate → Emma'])
    expect(tyran.detail).toBe('6 victoires')
  })

  it('une récompense absente garde son message d\'attente, jamais un crash', () => {
    const precious = d.awardGroups[0]!.awards.find(a => a.key === 'precious')!
    expect(precious.names).toEqual([])
    expect(precious.detail).toBe('Pas encore de données')
    // Famille spin absente en entier : ses 4 récompenses existent quand même.
    const spin = d.awardGroups[2]!
    expect(spin.awards.every(a => a.names.length === 0)).toBe(true)
  })

  it('tolère un payload sans anecdotes du tout', () => {
    const bare = normalizeStats({ ...wire, anecdotes: undefined })
    expect(bare.awardGroups).toHaveLength(5)
    expect(bare.awardGroups.flatMap(g => g.awards)).toHaveLength(20)
  })
})
