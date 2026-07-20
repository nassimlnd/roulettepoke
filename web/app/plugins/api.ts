// Instance $fetch unique et typée : Bearer injecté, 401 centralisé, retry
// idempotent, timeout. Seule la couche repositories l'utilise.

export default defineNuxtPlugin(() => {
  const api = $fetch.create({
    baseURL: '/api',
    timeout: 15_000,
    retry: 1,
    // ofetch ne retente jamais POST/PUT/PATCH/DELETE : uniquement les codes
    // transitoires sur les GET. Aucun retry sur un 500 métier ni un roll.
    retryStatusCodes: [408, 425, 429, 502, 503, 504],
    retryDelay: 400,
    onRequest({ options }) {
      const auth = useAuthStore()
      if (auth.token) {
        options.headers.set('Authorization', `Bearer ${auth.token}`)
      }
    },
    onResponseError({ response }) {
      if (response?.status === 401) {
        useAuthStore().handleSessionExpired()
      }
    }
  })

  return {
    provide: { api }
  }
})
