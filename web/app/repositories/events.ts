import type { WireGameEvents } from '~/types/api'
import type { Api } from './_client'

// Événements du jour, objectif de la semaine et PRIX EFFECTIF du tirage (v5.1).
// Un seul endpoint pour les trois ; chaque consommateur ne lit que sa part.
export const eventsRepo = {
  current: (api: Api) => api<WireGameEvents>('/game-events/current')
}
