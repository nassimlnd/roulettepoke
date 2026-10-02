import { FetchError } from 'ofetch'
import type { ApiError } from '~/types/api'

// Transforme une erreur en message affichable — plus jamais de « TypeError:
// Failed to fetch » brut. Les messages métier du backend (français, conçus pour
// l'UI) sont réutilisés tels quels.
export function humanizeError(err: unknown): string {
  if (err instanceof FetchError) {
    if (!err.response) {
      return 'Connexion impossible. Vérifie ton réseau puis réessaie.'
    }
    const apiMsg = (err.data as ApiError | undefined)?.error
    if (apiMsg) return apiMsg
    if (err.response.status >= 500) {
      return 'Le serveur a un souci. Réessaie dans un instant.'
    }
    if (err.response.status === 404) return 'Introuvable.'
  }
  if (err instanceof Error && err.message) return err.message
  return 'Une erreur inattendue est survenue.'
}
