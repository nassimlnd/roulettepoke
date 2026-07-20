// Tokens visuels de la carte, repris de la direction « Mochidex » (douce,
// pastel, arrondie) et adaptés à nos 16 types Kanto + 4 raretés + shiny.
// Purement présentation : aucune donnée métier ici.

import type { PokeType } from '~/types/api'
import type { RealRarity } from '~/types/domain'

export interface TypeGradient { c1: string, c2: string }

// Dégradé de face par type (clair → profond), esprit pastel Mochidex.
export const TYPE_GRADIENT: Record<PokeType, TypeGradient> = {
  Feu: { c1: '#ffc39a', c2: '#ff7e6b' },
  Eau: { c1: '#9bd6ef', c2: '#5aa9d6' },
  Plante: { c1: '#bde79c', c2: '#7bc36a' },
  Électrik: { c1: '#ffe89a', c2: '#ffcb45' },
  Roche: { c1: '#d8c3a6', c2: '#a98f6b' },
  Glace: { c1: '#c2f0ed', c2: '#7fd0d6' },
  Normal: { c1: '#efe6d6', c2: '#cbb99a' },
  Poison: { c1: '#e0b8ee', c2: '#a86cc4' },
  Insecte: { c1: '#dcea9e', c2: '#a3bf5a' },
  Psy: { c1: '#ffc2d6', c2: '#f585a8' },
  Sol: { c1: '#eecfa2', c2: '#c39a5e' },
  Combat: { c1: '#f4b6a0', c2: '#d1785c' },
  Vol: { c1: '#d2e2f5', c2: '#9db9e0' },
  Dragon: { c1: '#c3b0f7', c2: '#8a6ce0' },
  Spectre: { c1: '#c6b6e2', c2: '#7d68a8' },
  Fée: { c1: '#ffd4ea', c2: '#f09ac8' }
}

export interface RarityMeta {
  color: string
  bar: string
  gems: number
  holo: number // intensité de la couche holographique (0 → 0.7)
  label: string
}

export const RARITY_META: Record<RealRarity, RarityMeta> = {
  Commun: { color: '#b0a79a', bar: 'linear-gradient(90deg,#c9bfae,#b0a79a)', gems: 1, holo: 0, label: 'Commun' },
  Rare: { color: '#5b9bd5', bar: 'linear-gradient(90deg,#8fbfe8,#5b9bd5)', gems: 2, holo: 0.32, label: 'Rare' },
  Épique: { color: '#a06cc4', bar: 'linear-gradient(90deg,#c69ae0,#a06cc4)', gems: 3, holo: 0.5, label: 'Épique' },
  Légendaire: { color: '#e0a92e', bar: 'linear-gradient(90deg,#ffd86b,#e0a92e)', gems: 4, holo: 0.7, label: 'Légendaire' }
}

// Un shiny reçoit un cadre iridescent + holo maximal (par-dessus sa rareté).
export const SHINY_HOLO = 0.85

export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// PV décoratif : l'API ne fournit pas de statistiques. Dérivé déterministe de
// (num, rareté) — affichage uniquement, aucun effet de jeu.
const HP_BASE: Record<RealRarity, number> = { Commun: 50, Rare: 80, Épique: 110, Légendaire: 140 }
export function cosmeticHp(num: number, rarity: RealRarity): number {
  return HP_BASE[rarity] + ((num * 7) % 25)
}

export const STAGE_LABEL: Record<1 | 2 | 3, string> = {
  1: 'De base',
  2: 'Niv. 1',
  3: 'Niv. 2'
}
