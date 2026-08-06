import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { POKE_TYPES, TYPE_SLUG_TO_NAME, typeSlug } from '~/utils/poke'
import { TYPE_GRADIENT } from '~/utils/cardTheme'

// Un type Pokémon vit sur quatre couches indépendantes : l'union `PokeType`,
// la table slug → nom, les tokens CSS `--color-type-*` et le dégradé de carte.
// L'arrivée de Johto (v4) en a ajouté deux — Acier et Ténèbres — et les quatre
// couches sont restées à 16, si bien que ces cartes s'affichaient en beige
// neutre. Ces tests échouent à la prochaine divergence.

const css = readFileSync(new URL('../../app/assets/css/main.css', import.meta.url), 'utf8')

describe('types Pokémon', () => {
  it('couvre les 18 types du jeu', () => {
    expect(POKE_TYPES).toHaveLength(18)
    expect(POKE_TYPES).toContain('Acier')
    expect(POKE_TYPES).toContain('Ténèbres')
  })

  it('donne un dégradé de carte à chaque type', () => {
    for (const t of POKE_TYPES) expect(TYPE_GRADIENT[t], t).toBeDefined()
  })

  it('déclare un token CSS --color-type-* pour chaque type', () => {
    for (const t of POKE_TYPES) {
      expect(css, t).toContain(`--color-type-${typeSlug(t)}:`)
    }
  })

  it('sait retrouver un type depuis son slug (tickets de type)', () => {
    // Les accents doivent tomber : c'est la forme que l'API emploie.
    expect(TYPE_SLUG_TO_NAME.electrik).toBe('Électrik')
    expect(TYPE_SLUG_TO_NAME.fee).toBe('Fée')
    expect(TYPE_SLUG_TO_NAME.tenebres).toBe('Ténèbres')
    expect(Object.keys(TYPE_SLUG_TO_NAME)).toHaveLength(18)
  })
})
