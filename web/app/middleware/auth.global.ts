import { ROUTES } from '~/constants/routes'

// Garde d'auth client (SPA). Ne valide que la présence du token — n'appelle
// JAMAIS /auth/me ici (effet de bord bonus quotidien, réservé au plugin bootstrap).
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    if (auth.isAuthenticated && ['login', 'register'].includes(String(to.name))) {
      return navigateTo(ROUTES.home)
    }
    return
  }

  if (!auth.isAuthenticated) {
    return navigateTo({ path: ROUTES.login, query: { next: to.fullPath } })
  }
})
