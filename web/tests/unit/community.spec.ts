import { describe, it, expect } from 'vitest'
import { normalizeSuggestion, normalizePoll } from '~/repositories/normalize'
import type { WireSuggestion, WirePoll } from '~/types/api'

// Charges utiles relevées sur l'API de production le 9 août 2026.
const wireSuggestion: WireSuggestion = {
  id: 'e006114c-3fb4-43c0-b364-f0ae87e1258a',
  title: null,
  text: 'Autoriser un échange légendaire exceptionnel (ex: 1 par gen)',
  status: 'proposed',
  admin_note: null,
  note_voting_enabled: false,
  created_at: '2026-08-07T04:45:31.375Z',
  username: 'nate_plm',
  author_is_admin: false,
  sugg_up: 1,
  sugg_down: 0,
  note_up: 0,
  note_down: 0,
  my_suggestion_vote: null,
  my_note_vote: null
}

const wirePoll: WirePoll = {
  id: '0b38d203-3ed2-4767-a8b5-c27837a4ee36',
  question: 'Est-ce que l\'utilisation de plusieurs comptes devrait être permis ?',
  status: 'open',
  created_at: '2026-08-06T11:57:55.804Z',
  closed_at: null,
  my_option_id: null,
  options: [
    { id: 'o1', label: 'Oui, aucune limite', votes: 3 },
    { id: 'o2', label: 'Oui, dans la limite du raisonnable', votes: 2 },
    { id: 'o3', label: 'Non', votes: 5 }
  ]
}

describe('normalizeSuggestion', () => {
  it('mappe les champs wire vers domaine', () => {
    const s = normalizeSuggestion(wireSuggestion)
    expect(s.upVotes).toBe(1)
    expect(s.downVotes).toBe(0)
    expect(s.myVote).toBeNull()
    expect(s.adminNote).toBeNull()
    expect(s.noteVotingEnabled).toBe(false)
  })

  it('une entrée portée par un titre est la roadmap officielle', () => {
    expect(normalizeSuggestion(wireSuggestion).official).toBe(false)
    expect(normalizeSuggestion({ ...wireSuggestion, title: 'Mode nuit' }).official).toBe(true)
    // Chaîne vide ≠ titre : ne pas promouvoir une idée de joueur par accident.
    expect(normalizeSuggestion({ ...wireSuggestion, title: '' }).official).toBe(false)
  })
})

describe('normalizePoll', () => {
  it('calcule le total des votes et l\'état ouvert', () => {
    const p = normalizePoll(wirePoll)
    expect(p.totalVotes).toBe(10)
    expect(p.open).toBe(true)
    expect(p.myOptionId).toBeNull()
    expect(p.options).toHaveLength(3)
  })

  it('un sondage clos n\'est plus ouvert', () => {
    expect(normalizePoll({ ...wirePoll, status: 'closed' }).open).toBe(false)
  })

  it('tolère un sondage sans options', () => {
    const p = normalizePoll({ ...wirePoll, options: [] })
    expect(p.totalVotes).toBe(0)
    expect(p.options).toEqual([])
  })
})
