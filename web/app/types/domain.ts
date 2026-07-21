// Types « domaine » — normalisés, consommés par les stores et composants.
// La couche repositories convertit les types `api.ts` (wire) en ceux-ci :
// notamment la rareté 'Alt' (shiny dans /collection) est réconciliée en
// `isShiny` + rareté réelle.

import type { UUID, Biome, PokeType, ISODate } from './api'

export type RealRarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire'

export interface DomainCard {
  id: UUID
  num: number
  name: string
  imageUrl: string
  rarity: RealRarity
  isShiny: boolean
  level: 1 | 2 | 3
  biome: Biome
  type: PokeType
  parentCardId: UUID
  standardId: UUID | null
}

export interface DomainOwnedCard extends DomainCard {
  quantity: number
  owned: boolean
  obtainedAt: ISODate | null
}

// Résultat normalisé d'un tirage (union discriminée par `kind`)
export type RollOutcome
  = | { kind: 'card', card: DomainCard, isNew: boolean, rollCost: number }
    | { kind: 'coins', amount: number, rollCost: number }
    | { kind: 'charme', rollCost: number }
    | { kind: 'choice', choiceId: UUID, left: DomainCard, right: DomainCard, rollCost: number }

export type CelebrationTier
  = | 'common' | 'rare' | 'epic' | 'legendary' | 'shiny' | 'shiny-legendary'

export interface BiomeInfo {
  biome: Biome
  cardCount: number
  cost: number
  ownedCount: number
}

// Membre d'équipe — forme normalisée de WireTeamMember. Un membre ne porte pas
// toutes les infos d'une carte (pas de num/biome/niveau) : il s'affiche via
// TeamCard, pas HoloCard.
export interface TeamMember {
  teamEntryId: UUID
  position: number
  cardId: UUID
  name: string
  type: PokeType
  rarity: RealRarity
  isShiny: boolean
  imageUrl: string
  typeImageUrl: string | null
}
