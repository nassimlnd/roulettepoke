// Normalisation « voix des joueurs » : suggestions (+ roadmap) et sondages.
import type { WireSuggestion, WirePoll } from '~/types/api'
import type { DomainSuggestion, DomainPoll } from '~/types/domain'

export function normalizeSuggestion(s: WireSuggestion): DomainSuggestion {
  return {
    id: s.id,
    title: s.title,
    text: s.text,
    status: s.status,
    adminNote: s.admin_note,
    noteVotingEnabled: s.note_voting_enabled,
    createdAt: s.created_at,
    username: s.username,
    authorIsAdmin: s.author_is_admin,
    upVotes: s.sugg_up,
    downVotes: s.sugg_down,
    noteUpVotes: s.note_up,
    noteDownVotes: s.note_down,
    myVote: s.my_suggestion_vote,
    myNoteVote: s.my_note_vote,
    // Une entrée portée par un titre vient de l'équipe : c'est la roadmap
    // officielle, distinguée visuellement des idées de joueurs.
    official: s.title !== null && s.title !== ''
  }
}

export function normalizePoll(p: WirePoll): DomainPoll {
  const options = (p.options ?? []).map(o => ({ id: o.id, label: o.label, votes: o.votes ?? 0 }))
  return {
    id: p.id,
    question: p.question,
    open: p.status === 'open',
    createdAt: p.created_at,
    myOptionId: p.my_option_id,
    options,
    totalVotes: options.reduce((sum, o) => sum + o.votes, 0)
  }
}
