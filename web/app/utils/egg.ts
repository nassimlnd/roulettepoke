// Avancement de l'incubation de l'œuf mystérieux (textes du jeu d'origine).
// Purement indicatif : l'éclosion se déclenche seule au fil des tirages.
export function eggStatusLabel(remaining: number): string {
  if (remaining >= 50) return 'Aucune activité pour l\'instant'
  if (remaining >= 35) return 'Ça commence à bouger'
  if (remaining >= 20) return 'Pas de doute, ça bouge'
  return 'L\'œuf va éclore dans très peu de temps'
}
