// Résolution de l'URL d'un sprite selon le style choisi par le joueur.
// Auto-importé (util de 1er niveau).
//
// Les jeux « génération » sont indexés par n° national : `card.num` suffit,
// aucun mapping de noms à maintenir. Ils sont servis depuis nos propres assets
// (public/sprites/, remplis par scripts/fetch-sprites.py), à une exception près
// — Gen 5 animé, trop lourd à embarquer, qui passe par jsDelivr.
import { spriteStyleByKey, styleCovers } from '~/constants/sprite-styles'

/** Sprites embarqués : même origine que l'application. */
const LOCAL_BASE = '/sprites'

/** Repli distant pour le seul style non embarqué. jsDelivr, pas raw.github. */
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon'

/**
 * URL du sprite pour un style donné, ou null s'il faut garder celui du backend
 * (style par défaut, n° invalide, ou carte hors de la portée du style — Gen 1
 * ne connaît ni Johto ni les shiny).
 */
export function styledSpriteUrl(styleKey: string, num: number, shiny = false): string | null {
  const style = spriteStyleByKey(styleKey)
  if (!style.path) return null
  if (!Number.isInteger(num)) return null
  if (!styleCovers(style, num, shiny)) return null

  const base = style.local ? `${LOCAL_BASE}/${style.path}` : `${CDN_BASE}/${style.path}`
  return `${base}/${shiny ? 'shiny/' : ''}${num}.${style.ext}`
}
