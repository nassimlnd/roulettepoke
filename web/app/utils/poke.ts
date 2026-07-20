// Correspondances métier partagées (biomes, types) — reprises du front actuel.

import type { Biome, PokeType } from '~/types/api'
import type { RealRarity } from '~/types/domain'

export const BIOME_SLUGS: Record<string, string> = {
  Lac: 'lac', Mer: 'mer', Forêt: 'foret', Montagnes: 'montagnes',
  Ville: 'ville', Plaines: 'plaines', Désert: 'desert', Cave: 'cave', Tundra: 'tundra'
}

export const BIOME_SLUG_TO_NAME: Record<string, Biome> = {
  lac: 'Lac', mer: 'Mer', foret: 'Forêt', montagnes: 'Montagnes',
  ville: 'Ville', plaines: 'Plaines', desert: 'Désert', cave: 'Cave', tundra: 'Tundra'
}

export const TYPE_SLUG_TO_NAME: Record<string, PokeType> = {
  eau: 'Eau', normal: 'Normal', poison: 'Poison', feu: 'Feu', plante: 'Plante',
  insecte: 'Insecte', electrik: 'Électrik', roche: 'Roche', psy: 'Psy', sol: 'Sol',
  combat: 'Combat', vol: 'Vol', dragon: 'Dragon', spectre: 'Spectre', glace: 'Glace'
}

// Slug CSS d'un type (pour --color-type-*), sans accent ni majuscule.
export function typeSlug(type: PokeType): string {
  return type.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function biomeSlug(biome: Biome): string {
  return BIOME_SLUGS[biome] ?? biome.toLowerCase()
}

export const RARITY_LABEL: Record<RealRarity, string> = {
  Commun: 'Commun',
  Rare: 'Rare',
  Épique: 'Épique',
  Légendaire: 'Légendaire'
}

// Prix de vente de base (repris du Guide/backend).
export const SELL_PRICE: Record<RealRarity, number> = {
  Commun: 1, Rare: 5, Épique: 10, Légendaire: 25
}
