// Paintkemon, côté présentation : retrouver une case et appliquer un coup —
// le sien (réponse HTTP) ou celui d'un autre dresseur (diffusion WebSocket).
import type { WireColoringFrame } from '~/types/api'
import type { ColoringGrid, ColoringCell } from '~/types/domain'

export type ColoringMove = Pick<ColoringCell, 'x' | 'y' | 'colorId'>

/** Index d'une case : la grille est ligne par ligne, vérifié avant de s'y fier. */
export function cellIndex(grid: ColoringGrid, x: number, y: number): number {
  const guess = y * grid.width + x
  const c = grid.cells[guess]
  if (c && c.x === x && c.y === y) return guess
  return grid.cells.findIndex(k => k.x === x && k.y === y)
}

/** Applique un coup ; renvoie true si la case vient d'être remplie (progression +1). */
export function applyColoringMove(grid: ColoringGrid, move: ColoringMove): boolean {
  if (!move.colorId) return false
  const target = grid.cells[cellIndex(grid, move.x, move.y)]
  if (!target) return false
  const newlyFilled = !target.colorId
  target.colorId = move.colorId
  if (newlyFilled) grid.filled += 1
  return newlyFilled
}

/** Trame WebSocket → coup. Le serveur envoie x, y, color_id à plat (ou sous `cell`). */
export function frameToMove(frame: WireColoringFrame): ColoringMove | null {
  if (frame.type !== 'cell.colored') return null
  const src = frame.cell ?? frame
  if (typeof src.x !== 'number' || typeof src.y !== 'number') return null
  return { x: src.x, y: src.y, colorId: src.color_id ?? null }
}
