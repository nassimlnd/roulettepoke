// Les générations du jeu. Depuis la v4, presque tout est cloisonné par
// génération : deux porte-monnaie, deux parcours d'arènes, trois équipes, et un
// filtre de collection. Une seule est « active » à la fois côté serveur
// (PUT /auth/active-generation) et c'est elle qui détermine la bourse dépensée.

export type Generation = 1 | 2

export const DEFAULT_GENERATION: Generation = 1

export interface GenerationMeta {
  id: Generation
  /** Nom de la région, tel qu'affiché au joueur. */
  region: string
  /** Bornes du Pokédex — utile pour situer une carte sans champ `generation`. */
  dexFrom: number
  dexTo: number
  /** Portée d'équipe correspondante côté API (`/team?scope=`). */
  teamScope: 'gen1' | 'gen2'
  icon: string
}

export const GENERATIONS: readonly GenerationMeta[] = [
  { id: 1, region: 'Kanto', dexFrom: 1, dexTo: 151, teamScope: 'gen1', icon: 'i-lucide-mountain' },
  { id: 2, region: 'Johto', dexFrom: 152, dexTo: 251, teamScope: 'gen2', icon: 'i-lucide-trees' }
]

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
