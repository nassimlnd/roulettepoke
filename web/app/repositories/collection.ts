import type { WireCard, WireOwnedCard, WireZarbiForm, SellResult, UUID } from '~/types/api'
import type { DomainCard, DomainOwnedCard, ZarbiForm } from '~/types/domain'
import type { Api } from './_client'
import { normalizeCard, normalizeOwnedCard, normalizeZarbiForm } from './normalize'

export const collectionRepo = {
  mine: async (api: Api): Promise<DomainOwnedCard[]> => {
    const { cards } = await api<{ cards: WireOwnedCard[] }>('/collection')
    return cards.map(normalizeOwnedCard)
  },
  all: async (api: Api): Promise<DomainOwnedCard[]> => {
    const { cards } = await api<{ cards: WireOwnedCard[] }>('/collection/all')
    return cards.map(normalizeOwnedCard)
  },
  sell: (api: Api, cardId: UUID) =>
    api<SellResult>('/collection/sell', { method: 'POST', body: { cardId } }),
  // Les 28 formes de Zarbi vivent hors du dex standard : endpoint dédié, et une
  // vente qui prend l'identifiant de FORME et non de carte.
  zarbiForms: async (api: Api): Promise<ZarbiForm[]> => {
    const { forms } = await api<{ forms: WireZarbiForm[] }>('/collection/zarbi')
    return forms.map(normalizeZarbiForm)
  },
  sellZarbi: (api: Api, formId: UUID) =>
    api<SellResult>('/collection/zarbi/sell', { method: 'POST', body: { formId } })
}

export const mergeRepo = {
  perform: async (api: Api, parentCardId: UUID, currentLevel: number): Promise<DomainCard> => {
    const { card } = await api<{ card: WireCard }>('/merge', { method: 'POST', body: { parentCardId, currentLevel } })
    return normalizeCard(card)
  }
}
