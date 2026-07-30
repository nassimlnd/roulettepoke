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

// Bonus de connexion quotidien : forfait de base + prime par badge d'arène.
// L'API ne renvoie PAS le montant crédité (/auth/me crédite par effet de bord et
// ne retourne que le solde final) — mais la formule est déterministe, donc le
// front peut l'annoncer exactement à partir du nombre de badges.
export const DAILY_BONUS_BASE = 100
export const DAILY_BONUS_PER_BADGE = 10
