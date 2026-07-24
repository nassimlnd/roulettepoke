// Constantes de règles du jeu (miroir front du back). Une seule source pour les
// valeurs métier réécrites en dur dans plusieurs pages/composants.
//
// Chance shiny ≈ (exemplaires possédés) / SHINY_PITY_DENOMINATOR. Chaque doublon
// rapproche d'un shiny (« pity »).
export const SHINY_PITY_DENOMINATOR = 500

// Nombre d'exemplaires identiques consommés par une fusion (→ évolution).
export const MERGE_COST = 10

// Taille par défaut de la bande de prévisualisation d'un tirage (roll/preview-batch).
export const DEFAULT_PREVIEW_COUNT = 19
