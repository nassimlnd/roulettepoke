// Type de l'instance $fetch injectée (plugins/api.ts), partagé par tous les
// repositories. `useApi` est auto-importé par Nuxt.
export type Api = ReturnType<typeof useApi>
