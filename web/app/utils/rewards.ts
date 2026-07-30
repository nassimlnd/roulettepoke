// Calculs de récompenses — fonctions pures, auto-importées (util de 1er niveau).
import { DAILY_BONUS_BASE, DAILY_BONUS_PER_BADGE } from '~/constants/game'

// Montant du bonus de connexion quotidien pour un joueur donné.
// Formule : forfait de base + prime par badge d'arène remporté.
export function dailyBonusAmount(badgeCount: number): number {
  const badges = Number.isFinite(badgeCount) ? Math.max(0, Math.trunc(badgeCount)) : 0
  return DAILY_BONUS_BASE + badges * DAILY_BONUS_PER_BADGE
}
