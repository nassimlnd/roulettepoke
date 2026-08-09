// Les générations du jeu. Depuis la v4, presque tout est cloisonné par
// génération : deux porte-monnaie, deux parcours d'arènes, trois équipes, et un
// filtre de collection. Une seule est « active » à la fois côté serveur
// (PUT /auth/active-generation) et c'est elle qui détermine la bourse dépensée.

export type Generation = 1 | 2

export const DEFAULT_GENERATION: Generation = 1

/** Dernier n° national couvert par le jeu (Kanto 1-151 + Johto 152-251). */
export const DEX_MAX = 251

export interface GenerationMeta {
  id: Generation
  /** Nom de la région, tel qu'affiché au joueur. */
  region: string
  /** Bornes du Pokédex — utile pour situer une carte sans champ `generation`. */
  dexFrom: number
  dexTo: number
  /** Portée d'équipe correspondante côté API (`/team?scope=`). */
  teamScope: 'gen1' | 'gen2'
  /**
   * Segment d'URL du classement régional (`/leaderboard/kanto`). L'API emploie
   * deux vocabulaires pour la même notion — `gen1` pour les équipes, `kanto`
   * pour les classements — d'où ces deux champs plutôt qu'une dérivation.
   */
  boardScope: 'kanto' | 'johto'
  icon: string
}

export const GENERATIONS: readonly GenerationMeta[] = [
  { id: 1, region: 'Kanto', dexFrom: 1, dexTo: 151, teamScope: 'gen1', boardScope: 'kanto', icon: 'i-lucide-mountain' },
  { id: 2, region: 'Johto', dexFrom: 152, dexTo: 251, teamScope: 'gen2', boardScope: 'johto', icon: 'i-lucide-trees' }
]

// Trois équipes indépendantes de 6 Pokémon, désignées par leur « portée ».
// Valeurs vérifiées contre l'API : tout autre libellé (`kanto`, `johto`, `1`)
// est rejeté par « Portée d'équipe invalide ».
export type TeamScope = 'global' | 'gen1' | 'gen2'

export const TEAM_SCOPES: readonly { value: TeamScope, label: string, hint: string }[] = [
  { value: 'global', label: 'Tournoi', hint: 'Engagée au Tournoi et à la Ligue des 4.' },
  { value: 'gen1', label: 'Kanto', hint: 'Engagée dans les arènes de Kanto.' },
  { value: 'gen2', label: 'Johto', hint: 'Engagée dans les arènes de Johto.' }
]

/** Portée d'équipe correspondant à une région (les arènes de cette région). */
export function teamScopeOf(g: Generation): TeamScope {
  return generationMeta(g).teamScope
}

export function generationMeta(g: Generation): GenerationMeta {
  return GENERATIONS.find(x => x.id === g) ?? GENERATIONS[0]!
}

export function generationRegion(g: Generation): string {
  return generationMeta(g).region
}

/** Garde d'exécution : l'API peut renvoyer n'importe quel entier. */
export function asGeneration(v: unknown): Generation {
  return v === 2 ? 2 : DEFAULT_GENERATION
}
