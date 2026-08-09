import type { MotusToday, MotusGuessResult, MotusLeaderboardRow } from '~/types/api'
import type { Api } from './_client'

// Motus — le mot du jour, partagé par tous les joueurs.
// Un essai hors dictionnaire est refusé par le serveur avec un message clair
// (« Ce mot n'existe pas dans le dictionnaire. ») et ne consomme PAS de
// tentative — vérifié contre l'API.
export const motusRepo = {
  today: (api: Api) => api<MotusToday>('/motus/today'),
  guess: (api: Api, guess: string) =>
    api<MotusGuessResult>('/motus/guess', { method: 'POST', body: { guess } }),
  leaderboard: (api: Api) => api<MotusLeaderboardRow[]>('/motus/leaderboard')
}
