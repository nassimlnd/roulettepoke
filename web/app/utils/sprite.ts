// Résolution de l'URL d'un sprite selon le style choisi par le joueur.
// Auto-importé (util de 1er niveau).
//
// Les jeux « génération » sont servis par le dépôt PokeAPI/sprites et indexés
// par n° national : `card.num` suffit, aucun mapping de noms à maintenir.
import { spriteStyleByKey } from '~/constants/sprite-styles'

const PKM_SPRITES_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

// URL du sprite pour un style donné, ou null s'il faut garder celui du backend
// (style par défaut, n° invalide, ou shiny absent de ce jeu — cf. Gen 1).
export function styledSpriteUrl(styleKey: string, num: number, shiny = false): string | null {
  const style = spriteStyleByKey(styleKey)
  if (!style.path) return null
  if (!Number.isInteger(num) || num < 1) return null
  if (shiny && style.noShiny) return null
  return `${PKM_SPRITES_BASE}/${style.path}/${shiny ? 'shiny/' : ''}${num}.${style.ext}`
}
