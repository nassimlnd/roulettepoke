// Accès à l'instance $fetch typée créée par le plugin api.ts.
export function useApi() {
  return useNuxtApp().$api
}
