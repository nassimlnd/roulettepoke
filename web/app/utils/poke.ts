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

// Slug CSS d'un type (pour --color-type-*), sans accent ni majuscule.
export function typeSlug(type: PokeType): string {
  return type.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Les 18 types du jeu. `satisfies` force l'exhaustivité : oublier un membre de
// l'union PokeType ici devient une erreur de compilation.
export const POKE_TYPES = [
  'Acier', 'Combat', 'Dragon', 'Eau', 'Feu', 'Fée', 'Glace', 'Insecte',
  'Normal', 'Plante', 'Poison', 'Psy', 'Roche', 'Sol', 'Spectre',
  'Ténèbres', 'Vol', 'Électrik'
] as const satisfies readonly PokeType[]

// Dérivée de la liste ci-dessus plutôt qu'écrite à la main : la table
// manuscrite avait silencieusement dérivé (ni « Fée », ni les deux types de
// Johto), et les tickets de type concernés s'affichaient sous leur slug brut.
export const TYPE_SLUG_TO_NAME: Record<string, PokeType>
  = Object.fromEntries(POKE_TYPES.map(t => [typeSlug(t), t]))

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
