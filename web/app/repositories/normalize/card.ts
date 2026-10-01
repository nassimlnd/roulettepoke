// Normalisation des cartes — cœur du modèle. Réconcilie la rareté 'Alt'
// (shiny dans /collection) en `isShiny` + rareté réelle.
import type { WireCard, WireOwnedCard, WireZarbiForm, Rarity } from '~/types/api'
import type { DomainCard, DomainOwnedCard, ZarbiForm, RealRarity } from '~/types/domain'
import { asGeneration, generationOfNum } from '~/constants/generation'

// La rareté réelle d'une carte, en réconciliant 'Alt'. Un shiny garde la
// rareté de sa version standard (Commun par défaut si non déductible).
export function realRarity(rarity: Rarity): RealRarity {
  if (rarity === 'Alt') return 'Commun'
  return rarity
}

export function normalizeCard(c: WireCard): DomainCard {
  const isShiny = c.is_alt || c.rarity === 'Alt'
  // Un légendaire se reconnaît au biome 'Légendaire' même si sa rareté wire varie.
  const rarity: RealRarity = c.biome === 'Légendaire' ? 'Légendaire' : realRarity(c.rarity)
  return {
    id: c.id,
    num: c.num,
    // L'API porte la génération sur chaque carte du dex ; certaines charges
    // utiles (gains du Jackpot, avatars) décrivent une carte sans ce champ —
    // on la situe alors par son n° national plutôt que de crier à l'inconnu.
    generation: c.generation === undefined ? generationOfNum(c.num) : asGeneration(c.generation),
    name: c.name,
    imageUrl: c.image_url,
    rarity,
    isShiny,
    level: c.level,
    biome: c.biome,
    type: c.type,
    parentCardId: c.parent_card_id,
    standardId: c.standard_id ?? null
  }
}

export function normalizeZarbiForm(f: WireZarbiForm): ZarbiForm {
  const quantity = f.quantity ?? 0
  return {
    id: f.id,
    form: f.form,
    imageUrl: f.image_url,
    isShiny: f.is_alt,
    quantity,
    owned: quantity > 0
  }
}

export function normalizeOwnedCard(c: WireOwnedCard): DomainOwnedCard {
  return {
    ...normalizeCard(c),
    quantity: c.quantity ?? 0,
    owned: c.owned,
    obtainedAt: c.obtained_at
  }
}
