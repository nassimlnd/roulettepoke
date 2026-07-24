// Chemins de routes centralisés — évite les '/play' / '/login' en dur éparpillés
// (middleware, pages, stores) et rend les redirections typo-safe.
export const ROUTES = {
  home: '/play',
  play: '/play',
  collection: '/collection',
  team: '/team',
  gyms: '/gyms',
  spin: '/spin',
  slotMachine: '/slot-machine',
  leaderboard: '/leaderboard',
  stats: '/stats',
  rules: '/rules',
  league: '/league',
  tournament: '/tournament',
  trades: '/trades',
  settings: '/settings',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password'
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
