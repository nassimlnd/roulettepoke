import { describe, it, expect } from 'vitest'
import { dailyBonusAmount } from '~/utils/rewards'
import { DAILY_BONUS_BASE, DAILY_BONUS_PER_BADGE } from '~/constants/game'

describe('dailyBonusAmount', () => {
  it('sans badge → forfait de base', () => {
    expect(dailyBonusAmount(0)).toBe(DAILY_BONUS_BASE)
  })

  it('ajoute la prime par badge', () => {
    expect(dailyBonusAmount(3)).toBe(DAILY_BONUS_BASE + 3 * DAILY_BONUS_PER_BADGE)
  })

  it('les 8 badges donnent le maximum', () => {
    expect(dailyBonusAmount(8)).toBe(DAILY_BONUS_BASE + 8 * DAILY_BONUS_PER_BADGE)
  })

  it('valeurs aberrantes → traitées comme zéro badge', () => {
    expect(dailyBonusAmount(-5)).toBe(DAILY_BONUS_BASE)
    expect(dailyBonusAmount(Number.NaN)).toBe(DAILY_BONUS_BASE)
    expect(dailyBonusAmount(2.7)).toBe(DAILY_BONUS_BASE + 2 * DAILY_BONUS_PER_BADGE)
  })
})
