// Traduction des liens de l'original (routes par ancre, « #suggestions ») vers
// nos routes. Les notifications, les activités du jour et les Premiers pas
// sont produits par le serveur avec les ancres de SON front : sans cette table,
// un clic sur « 📊 Nouveau sondage » mènerait à /play#suggestions, c'est-à-dire
// nulle part.
import { ROUTES } from '~/constants/routes'

const HASH_ROUTES: Record<string, string> = {
  'home': ROUTES.play,
  'collection': ROUTES.collection,
  'team': ROUTES.team,
  'gyms': ROUTES.gyms,
  'spin': ROUTES.spin,
  'slot-machine': ROUTES.slotMachine,
  'leaderboard': ROUTES.leaderboard,
  'stats': ROUTES.stats,
  'rules': ROUTES.rules,
  'league': ROUTES.league,
  'tournament': ROUTES.tournament,
  'contest': ROUTES.contest,
  'trades': ROUTES.trades,
  'suggestions': '/suggestions',
  'motus': '/motus'
}

/**
 * `#suggestions` → `/suggestions`. Une ancre inconnue (page que nous n'avons
 * pas : concours, coloriage, tchat, notes de version) donne null — le texte
 * reste affiché, simplement sans lien, plutôt qu'un lien mort.
 */
export function hashToRoute(link: string | null | undefined): string | null {
  if (!link) return null
  const key = link.replace(/^#/, '').split('?')[0]!.trim()
  return HASH_ROUTES[key] ?? null
}
