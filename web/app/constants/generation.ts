// Les générations du jeu — SOURCE UNIQUE. Depuis la v4 presque tout est
// cloisonné par génération (bourses, parcours d'arènes, équipes, classements,
// seuils d'échange, filtre de collection) ; la v5 en a ajouté une troisième,
// Hoenn. Tout ce qui dépend du nombre de générations DOIT dériver de ce
// tableau. La v5 a montré ce qu'il en coûte de l'écrire à la main : Hoenn est
// arrivé en silence, et ses 270 cartes et 8 arènes se sont rangées dans Kanto
// sans qu'aucun écran ne proteste.

export type Generation = 1 | 2 | 3

export const DEFAULT_GENERATION: Generation = 1

/** Devise d'une inscription (tournoi, concours) ou d'une récompense (Ligue). */
export type Currency = `gen${Generation}`

/** Portée d'équipe : le Tournoi (et la Ligue), ou les arènes d'une région. */
export type TeamScope = 'global' | Currency

/** Segment des classements régionaux (`/leaderboard/kanto`). */
export type RegionSlug = 'kanto' | 'johto' | 'hoenn'

export interface GenerationMeta {
  id: Generation
  /** Nom de la région, tel qu'affiché au joueur. */
  region: string
  /** Bornes du Pokédex — utile pour situer une carte sans champ `generation`. */
  dexFrom: number
  dexTo: number
  /**
   * L'API emploie deux vocabulaires pour la même notion — `gen1` pour les
   * équipes et les devises, `kanto` pour les classements — d'où ces deux
   * champs plutôt qu'une dérivation.
   */
  teamScope: Currency
  boardScope: RegionSlug
  icon: string
}

export const GENERATIONS: readonly GenerationMeta[] = [
  { id: 1, region: 'Kanto', dexFrom: 1, dexTo: 151, teamScope: 'gen1', boardScope: 'kanto', icon: 'i-lucide-mountain' },
  { id: 2, region: 'Johto', dexFrom: 152, dexTo: 251, teamScope: 'gen2', boardScope: 'johto', icon: 'i-lucide-trees' },
  { id: 3, region: 'Hoenn', dexFrom: 252, dexTo: 386, teamScope: 'gen3', boardScope: 'hoenn', icon: 'i-lucide-waves' }
]

/** Dernier n° national couvert par le jeu. */
export const DEX_MAX = GENERATIONS[GENERATIONS.length - 1]!.dexTo

// Une équipe de 6 par portée : le Tournoi, puis les arènes de chaque région.
// Valeurs vérifiées contre l'API : tout autre libellé (`kanto`, `johto`, `1`)
// est rejeté par « Portée d'équipe invalide ».
export const TEAM_SCOPES: readonly { value: TeamScope, label: string, hint: string }[] = [
  { value: 'global', label: 'Tournoi', hint: 'Engagée au Tournoi et à la Ligue des 4.' },
  ...GENERATIONS.map(g => ({ value: g.teamScope, label: g.region, hint: `Engagée dans les arènes de ${g.region}.` }))
]

/** Portée d'équipe correspondant à une région (les arènes de cette région). */
export function teamScopeOf(g: Generation): TeamScope {
  return generationMeta(g).teamScope
}

/** Devise à envoyer à l'API pour payer (ou être payé) dans cette région. */
export function currencyOf(g: Generation): Currency {
  return `gen${g}`
}

/** Nom du champ de bourse dans l'objet utilisateur (`coins_gen1`…). */
export function coinsField(g: Generation): `coins_gen${Generation}` {
  return `coins_gen${g}`
}

export function generationMeta(g: Generation): GenerationMeta {
  return GENERATIONS.find(x => x.id === g) ?? {
    // Génération que le serveur connaît et pas nous : on la NOMME plutôt que
    // de la déguiser en Kanto. Son classement répondra 404 — c'est voulu, une
    // erreur visible vaut mieux qu'une donnée fausse.
    id: g,
    region: `Génération ${g}`,
    dexFrom: 0,
    dexTo: 0,
    teamScope: `gen${g}`,
    boardScope: `gen${g}` as unknown as RegionSlug,
    icon: 'i-lucide-map'
  }
}

export function generationRegion(g: Generation): string {
  return generationMeta(g).region
}

/**
 * Génération d'une carte d'après son n° national — pour les charges utiles
 * qui décrivent une carte sans son champ `generation` (gains du Jackpot,
 * avatars…). Hors de tout Pokédex connu : génération par défaut.
 */
export function generationOfNum(num: number): Generation {
  return GENERATIONS.find(g => num >= g.dexFrom && num <= g.dexTo)?.id ?? DEFAULT_GENERATION
}

const warned = new Set<string>()

/**
 * Garde d'exécution : l'API peut renvoyer n'importe quel entier.
 *
 * Une génération inconnue n'est PAS Kanto. Un entier inattendu passe tel quel
 * (la carte sera rangée sous « Génération N », jamais sous Kanto) ; une valeur
 * absente ou aberrante retombe sur la génération par défaut. Dans les deux cas
 * on prévient — une fois par valeur — au lieu de corriger en silence : c'est
 * l'ancien repli muet sur Kanto qui a caché l'arrivée de Hoenn.
 */
export function asGeneration(v: unknown): Generation {
  if (GENERATIONS.some(g => g.id === v)) return v as Generation
  const key = String(v)
  if (!warned.has(key)) {
    warned.add(key)
    console.warn(`[generation] valeur inconnue reçue de l'API : ${key}`)
  }
  return typeof v === 'number' && Number.isInteger(v) && v > 0 ? (v as Generation) : DEFAULT_GENERATION
}
