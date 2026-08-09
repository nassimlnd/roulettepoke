// Source UNIQUE de la navigation. Elle était auparavant déclarée trois fois
// (AppNavbar, MobileMenu, BottomTabBar) et les listes ont fini par diverger :
// Ligue des 4, Tournoi et Échanges figuraient dans le menu mobile mais dans
// AUCUNE navigation desktop — trois pages entières inaccessibles à la souris.
//
// Import explicite (`~/config/navigation`) : Nuxt n'auto-importe pas config/.

export interface NavLink {
  to: string
  label: string
  icon: string
}

// Modes de jeu principaux — accès direct, ce sont les gestes quotidiens.
export const PRIMARY_LINKS: readonly NavLink[] = [
  { to: '/play', label: 'Jouer', icon: 'i-lucide-dices' },
  { to: '/collection', label: 'Collection', icon: 'i-lucide-layout-grid' },
  { to: '/team', label: 'Équipe', icon: 'i-lucide-users' },
  { to: '/spin', label: 'Aventure', icon: 'i-lucide-compass' },
  { to: '/slot-machine', label: 'Jackpot', icon: 'i-lucide-cherry' },
  { to: '/motus', label: 'Motus', icon: 'i-lucide-whole-word' }
]

// Compétition — regroupée : à 12 entrées de premier niveau la navbar déborde en
// 1440px. Le regroupement reprend celui que le menu mobile utilisait déjà.
export const COMPETITION_LINKS: readonly NavLink[] = [
  { to: '/gyms', label: 'Arènes', icon: 'i-lucide-swords' },
  { to: '/league', label: 'Ligue des 4', icon: 'i-lucide-crown' },
  { to: '/tournament', label: 'Tournoi', icon: 'i-lucide-trophy' },
  { to: '/leaderboard', label: 'Classement', icon: 'i-lucide-medal' },
  { to: '/trades', label: 'Échanges', icon: 'i-lucide-arrow-left-right' }
]

// Consultation.
export const SECONDARY_LINKS: readonly NavLink[] = [
  { to: '/stats', label: 'Stats', icon: 'i-lucide-chart-column' },
  { to: '/rules', label: 'Guide', icon: 'i-lucide-book-open' }
]

// Toutes les destinations, pour un contrôle d'exhaustivité en test.
export const ALL_NAV_LINKS: readonly NavLink[] = [
  ...PRIMARY_LINKS, ...COMPETITION_LINKS, ...SECONDARY_LINKS
]
