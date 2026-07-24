import type { SpinStatus, WireSpinStart, WireSpinClaim, WireSpinLegendary } from '~/types/api'
import type { Api } from './_client'

export const spinRepo = {
  status: (api: Api) => api<SpinStatus>('/spin/status'),
  // Démarre / renouvelle une run (stateful). Le corps vide suffit.
  start: (api: Api) => api<WireSpinStart>('/spin/start', { method: 'POST', body: {} }),
  renew: (api: Api) => api<WireSpinStart>('/spin/renew', { method: 'POST', body: {} }),
  // Récompense hebdo de fin de circuit.
  claim: (api: Api) => api<WireSpinClaim>('/spin/claim', { method: 'POST', body: {} }),
  // Tentative de capture du légendaire (choix + capture gérés par le serveur).
  legendaryAttempt: (api: Api) => api<WireSpinLegendary>('/spin/legendary-attempt', { method: 'POST', body: {} }),
  // Enregistre une défaite létale.
  defeat: (api: Api) => api<{ ok: boolean }>('/spin/defeat', { method: 'POST', body: {} })
}
