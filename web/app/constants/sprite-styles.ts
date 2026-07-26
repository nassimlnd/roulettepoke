// Styles de sprite proposés au joueur. Les jeux « génération » viennent du dépôt
// PokeAPI/sprites, indexés par n° national (ce que `card.num` contient déjà).
//
// Disponibilité VÉRIFIÉE endpoint par endpoint (n° 1 / 25 / 142, normal + shiny) :
//  · Gen 1 n'a AUCUN sprite shiny — le shiny n'existait pas encore. Marqué
//    `noShiny` : les cartes shiny retombent sur le sprite du backend.
//  · Gen 6 (X/Y) a une couverture shiny incomplète → volontairement exclu, pour
//    ne pas exposer des images manquantes.
//  · Tous les autres styles listés ici sont complets, shiny inclus.

export interface SpriteStyle {
  key: string
  label: string
  hint: string
  // Chemin sous sprites/pokemon/ ; null = sprite servi par notre backend.
  path: string | null
  ext: 'png' | 'gif'
  animated?: boolean
  // Aucune variante shiny dans ce jeu (repli sur le sprite du backend).
  noShiny?: boolean
}

// Le défaut reste le sprite du backend : auto-hébergé, déjà animé, et seul jeu
// disponible hors-ligne. Les autres styles sont un choix explicite du joueur.
export const DEFAULT_SPRITE_STYLE = 'backend'

export const SPRITE_STYLES: readonly SpriteStyle[] = [
  { key: 'backend', label: 'PokéRoulette', hint: 'Le style du jeu (animé)', path: null, ext: 'png', animated: true },
  { key: 'gen1', label: 'Gen 1', hint: 'Rouge / Bleu', path: 'versions/generation-i/red-blue', ext: 'png', noShiny: true },
  { key: 'gen2', label: 'Gen 2', hint: 'Cristal', path: 'versions/generation-ii/crystal', ext: 'png' },
  { key: 'gen3', label: 'Gen 3', hint: 'Émeraude', path: 'versions/generation-iii/emerald', ext: 'png' },
  { key: 'gen4', label: 'Gen 4', hint: 'Or / Argent HG-SS', path: 'versions/generation-iv/heartgold-soulsilver', ext: 'png' },
  { key: 'gen5', label: 'Gen 5', hint: 'Noir / Blanc', path: 'versions/generation-v/black-white', ext: 'png' },
  { key: 'gen5a', label: 'Gen 5 animé', hint: 'Noir / Blanc en mouvement', path: 'versions/generation-v/black-white/animated', ext: 'gif', animated: true },
  { key: 'gen7', label: 'Gen 7', hint: 'Ultra-Soleil / Ultra-Lune', path: 'versions/generation-vii/ultra-sun-ultra-moon', ext: 'png' },
  { key: 'home', label: 'HOME', hint: 'Rendus 3D Pokémon HOME', path: 'other/home', ext: 'png' },
  { key: 'artwork', label: 'Artwork', hint: 'Illustrations officielles', path: 'other/official-artwork', ext: 'png' }
  // NB : le jeu `other/showdown` n'est volontairement PAS proposé — c'est le
  // même artwork que le sprite du backend (vérifié visuellement), donc un
  // doublon du style « PokéRoulette » pour le joueur.
] as const

export function spriteStyleByKey(key: string): SpriteStyle {
  return SPRITE_STYLES.find(s => s.key === key) ?? SPRITE_STYLES[0]!
}

// Pokémon servant d'aperçu dans les réglages : Pikachu, reconnaissable dans
// tous les styles.
export const SPRITE_PREVIEW_NUM = 25
