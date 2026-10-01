// Normalisation du coloriage collaboratif : palette numérotée (le numéro est
// l'ordre dans la palette, c'est lui que les cases affichent).
import type { WireColoringGrid, WireColoringCell } from '~/types/api'
import type { ColoringGrid, ColoringCell } from '~/types/domain'

export function normalizeColoringCell(c: WireColoringCell): ColoringCell {
  return { x: c.x, y: c.y, colorId: c.color_id ?? null, targetId: c.target_color_id ?? null }
}

export function normalizeColoringGrid(g: WireColoringGrid): ColoringGrid {
  return {
    width: g.width,
    height: g.height,
    palette: (g.palette ?? []).map((c, i) => ({ id: c.id, hex: c.hex, name: c.name, number: i + 1 })),
    cells: (g.cells ?? []).map(normalizeColoringCell),
    filled: g.progress?.filled ?? 0,
    playable: g.progress?.playable ?? 0
  }
}
