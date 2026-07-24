// Durées de cache (TTL) partagées par les stores. Une seule source pour les
// fenêtres de fraîcheur, plutôt qu'un `const TTL` recopié dans chaque store.
export const CACHE_TTL_SHORT = 60_000 // 1 min — statuts/données volatiles (navbar, quotas courts, listes)
export const CACHE_TTL_MEDIUM = 120_000 // 2 min — agrégats semi-stables (stats)
export const CACHE_TTL_LONG = 5 * 60_000 // 5 min — données rarement changeantes (collection, inventaire, biomes)
