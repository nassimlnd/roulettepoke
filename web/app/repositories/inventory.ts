import type { WireInventory } from '~/types/api'
import type { Api } from './_client'

export const inventoryRepo = {
  get: (api: Api) => api<WireInventory>('/inventory'),
  // Réponse observée en prod : { charme_chroma_rolls } (l'ancien doc disait
  // { rolls }) — on lit les deux par prudence côté store.
  activateCharme: (api: Api) => api<{ charme_chroma_rolls?: number, rolls?: number }>('/inventory/activate-charme', { method: 'POST' }),
  activateBiomeTicket: (api: Api, biomeSlug: string) =>
    api('/inventory/activate-biome-ticket', { method: 'POST', body: { biomeSlug } }),
  activateTypeTicket: (api: Api, typeSlug: string) =>
    api('/inventory/activate-type-ticket', { method: 'POST', body: { typeSlug } }),
  deactivateBiomeTicket: (api: Api) => api('/inventory/deactivate-biome-ticket', { method: 'POST' }),
  deactivateTypeTicket: (api: Api) => api('/inventory/deactivate-type-ticket', { method: 'POST' })
}
