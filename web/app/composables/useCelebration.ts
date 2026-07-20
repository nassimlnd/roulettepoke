import type { DomainCard, CelebrationTier } from '~/types/domain'

// Hiérarchie de célébration (cf. animation-system.md) : le niveau découle de la
// rareté + nouveauté, et l'intensité (son, plein écran) en découle.
export function useCelebration() {
  const sound = useSound()

  function tierFor(card: DomainCard): CelebrationTier {
    if (card.isShiny && card.rarity === 'Légendaire') return 'shiny-legendary'
    if (card.isShiny) return 'shiny'
    if (card.rarity === 'Légendaire') return 'legendary'
    if (card.rarity === 'Épique') return 'epic'
    if (card.rarity === 'Rare') return 'rare'
    return 'common'
  }

  // Les niveaux 6-7 (shiny, légendaire) passent en plein écran.
  function isFullscreen(tier: CelebrationTier): boolean {
    return tier === 'legendary' || tier === 'shiny' || tier === 'shiny-legendary'
  }

  function celebrate(tier: CelebrationTier) {
    sound.fanfare(tier)
  }

  return { tierFor, isFullscreen, celebrate }
}
