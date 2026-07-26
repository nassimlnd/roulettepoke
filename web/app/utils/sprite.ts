// Sprites animés (GIF, Noir/Blanc Gen 5) servis par le dépôt PokeAPI/sprites.
// Le backend ne fournit que des WebP statiques : ces GIF servent UNIQUEMENT à
// l'affichage détaillé (au clic), jamais dans une grille — un GIF animé par
// vignette sur 151 cartes serait ruineux. Auto-importé (util de 1er niveau).
//
// Indexés par n° national, ce que `card.num` contient déjà : aucun mapping de
// noms à maintenir. La variante shiny est un vrai visuel distinct.
const ANIMATED_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated'

// Les sprites animés s'arrêtent à la Gen 5 (n° ≤ 649). Kanto (1-151) est
// intégralement couvert ; le garde-fou protège un futur ajout de génération.
const MAX_ANIMATED_DEX = 649

// URL du sprite animé, ou null si indisponible pour ce n° (l'appelant retombe
// alors sur le sprite statique).
export function animatedSpriteUrl(num: number, shiny = false): string | null {
  if (!Number.isInteger(num) || num < 1 || num > MAX_ANIMATED_DEX) return null
  return `${ANIMATED_BASE}/${shiny ? 'shiny/' : ''}${num}.gif`
}
