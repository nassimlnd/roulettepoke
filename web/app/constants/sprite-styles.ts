// Styles de sprite proposés au joueur.
//
// Les jeux « génération » viennent du dépôt PokeAPI/sprites, indexés par n°
// national — ce que `card.num` contient déjà, donc aucun mapping de noms à
// maintenir. Ils sont désormais RAPATRIÉS EN LOCAL sous public/sprites/ par
// scripts/fetch-sprites.py : même hôte que l'application, donc instantanés,
// disponibles hors-ligne, et sans la latence de raw.githubusercontent (qui
// n'est pas un CDN et dont les requêtes pendent au lieu d'échouer).
//
// Une seule exception : Gen 5 animé, dont les 18 Mo de GIF ne se compressent
// pas — il reste servi par jsDelivr, un vrai CDN.
//
// Disponibilité VÉRIFIÉE endpoint par endpoint (n° 25 et 200, normal + shiny) :
//  · Gen 1 s'arrête au n° 151 ET n'a aucun shiny — les jeux Rouge/Bleu ne
//    connaissaient ni Johto ni les chromatiques. Les cartes hors de sa portée
//    retombent sur le sprite du jeu ; c'est annoncé au joueur, plus subi.
//  · Gen 6 (X/Y) a une couverture shiny incomplète → volontairement exclu.
//  · Tous les autres styles couvrent 1 à 251, shiny inclus.

import type { PokeType } from '~/types/primitives'
import { DEX_MAX } from './generation'

/** Famille de rendu — sert à regrouper les styles dans le sélecteur. */
export type SpriteFamily = 'jeu' | 'pixel' | 'rendu'

export interface SpriteStyle {
  key: string
  label: string
  hint: string
  family: SpriteFamily
  /** Chemin sous public/sprites/ ou sous le CDN ; null = sprite du backend. */
  path: string | null
  ext: 'png' | 'gif' | 'webp'
  /** false ⇒ servi par jsDelivr et non par nos assets. */
  local?: boolean
  animated?: boolean
  /** Dernier n° national disponible dans ce jeu. */
  dexMax?: number
  /** Aucune variante shiny dans ce jeu (repli sur le sprite du jeu). */
  noShiny?: boolean
}

// Le défaut reste le sprite du backend : c'est le style « maison », animé, et
// le seul qui couvre les formes spéciales que PokeAPI n'indexe pas par n°.
export const DEFAULT_SPRITE_STYLE = 'backend'

export const SPRITE_STYLES: readonly SpriteStyle[] = [
  {
    key: 'backend',
    label: 'PokéRoulette',
    hint: 'Le style du jeu',
    family: 'jeu',
    path: null,
    ext: 'png',
    animated: true
  },
  {
    key: 'gen1',
    label: 'Gen 1',
    hint: 'Rouge / Bleu',
    family: 'pixel',
    path: 'gen1',
    ext: 'png',
    local: true,
    dexMax: 151,
    noShiny: true
  },
  { key: 'gen2', label: 'Gen 2', hint: 'Cristal', family: 'pixel', path: 'gen2', ext: 'png', local: true },
  { key: 'gen3', label: 'Gen 3', hint: 'Émeraude', family: 'pixel', path: 'gen3', ext: 'png', local: true },
  { key: 'gen4', label: 'Gen 4', hint: 'Or / Argent HG-SS', family: 'pixel', path: 'gen4', ext: 'png', local: true },
  { key: 'gen5', label: 'Gen 5', hint: 'Noir / Blanc', family: 'pixel', path: 'gen5', ext: 'png', local: true },
  {
    key: 'gen5a',
    label: 'Gen 5 animé',
    hint: 'Noir / Blanc en mouvement',
    family: 'pixel',
    // Seul style resté distant : 18 Mo de GIF, et le ré-encodage en WebP animé
    // produit un fichier deux fois plus lourd (mesuré).
    path: 'versions/generation-v/black-white/animated',
    ext: 'gif',
    animated: true
  },
  { key: 'gen7', label: 'Gen 7', hint: 'Ultra-Soleil / Ultra-Lune', family: 'pixel', path: 'gen7', ext: 'png', local: true },
  { key: 'home', label: 'HOME', hint: 'Rendus 3D Pokémon HOME', family: 'rendu', path: 'home', ext: 'webp', local: true },
  { key: 'artwork', label: 'Artwork', hint: 'Illustrations officielles', family: 'rendu', path: 'artwork', ext: 'webp', local: true }
  // NB : le jeu `other/showdown` n'est volontairement PAS proposé — c'est le
  // même artwork que le sprite du backend (vérifié visuellement), donc un
  // doublon du style « PokéRoulette » pour le joueur.
] as const

export const SPRITE_FAMILY_LABEL: Record<SpriteFamily, string> = {
  jeu: 'Style du jeu',
  pixel: 'Pixel art',
  rendu: 'Rendus et illustrations'
}

export function spriteStyleByKey(key: string): SpriteStyle {
  return SPRITE_STYLES.find(s => s.key === key) ?? SPRITE_STYLES[0]!
}

/** Le style couvre-t-il cette carte ? (Gen 1 ignore Johto et les shiny.) */
export function styleCovers(style: SpriteStyle, num: number, shiny = false): boolean {
  if (!style.path) return true
  if (shiny && style.noShiny) return false
  return num >= 1 && num <= (style.dexMax ?? DEX_MAX)
}

/**
 * Ce qu'un style ne sait pas rendre, dit en clair. Le joueur choisissait
 * jusqu'ici à l'aveugle : Gen 1 retombait silencieusement sur le style du jeu
 * pour les 100 Pokémon de Johto et pour tous les shiny.
 */
export function styleLimitation(style: SpriteStyle): string | null {
  const noShiny = style.noShiny
  const partial = (style.dexMax ?? DEX_MAX) < DEX_MAX
  if (noShiny && partial) return 'Kanto seulement, sans shiny'
  if (noShiny) return 'Pas de shiny'
  if (partial) return 'Kanto seulement'
  return null
}

// Pokémon proposés en aperçu. Choisis pour couvrir les deux régions et des
// silhouettes franchement différentes — comparer deux styles sur un seul
// Pokémon ne dit pas grand-chose. Mentali et Lugia sont de Johto : les choisir
// rend VISIBLE le repli de Gen 1, qui s'arrête à Kanto.
export interface PreviewMon {
  num: number
  name: string
  type: PokeType
  /** Sprite du jeu ; la variante shiny suit la convention `_alt`. */
  slug: string
}

export const SPRITE_PREVIEW_MONS: readonly PreviewMon[] = [
  { num: 25, name: 'Pikachu', type: 'Électrik', slug: 'pikachu' },
  { num: 6, name: 'Dracaufeu', type: 'Feu', slug: 'charizard' },
  { num: 94, name: 'Ectoplasma', type: 'Spectre', slug: 'gengar' },
  { num: 130, name: 'Léviator', type: 'Eau', slug: 'gyarados' },
  { num: 196, name: 'Mentali', type: 'Psy', slug: 'espeon' },
  { num: 249, name: 'Lugia', type: 'Psy', slug: 'lugia' }
]

export const SPRITE_PREVIEW_NUM = SPRITE_PREVIEW_MONS[0]!.num

export function previewSpriteUrl(mon: PreviewMon, shiny = false): string {
  return `/images/${mon.slug}${shiny ? '_alt' : ''}.webp`
}

/**
 * Style employé par les pastilles de CHOIX du Pokémon d'aperçu. Fixe à dessein :
 * ces pastilles servent à reconnaître un Pokémon, pas à juger un style. Gen 5
 * est pris parce qu'il est embarqué, lisible en petit, et pèse moins d'un kilo-
 * octet — là où le sprite du jeu monte à 222 Ko pour Lugia, soit près d'un
 * mégaoctet rien que pour six pastilles.
 */
export const PREVIEW_CHIP_STYLE = 'gen5'
