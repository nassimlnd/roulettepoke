import { describe, it, expect } from 'vitest'
import { normalizeColoringGrid } from '~/repositories/normalize/coloring'
import { applyColoringMove, cellIndex, frameToMove } from '~/utils/coloring'
import type { WireColoringGrid } from '~/types/api'

const wire: WireColoringGrid = {
  width: 3,
  height: 2,
  palette: [{ id: 'c01', hex: '#111111', name: 'Noir' }, { id: 'c02', hex: '#eeeeee', name: 'Blanc' }],
  cells: [
    { x: 0, y: 0, color_id: 'c01', target_color_id: 'c01' },
    { x: 1, y: 0, color_id: null, target_color_id: 'c02' },
    { x: 2, y: 0, color_id: null, target_color_id: null },
    { x: 0, y: 1, color_id: null, target_color_id: 'c01' },
    { x: 1, y: 1, color_id: null, target_color_id: 'c02' },
    { x: 2, y: 1, color_id: null, target_color_id: null }
  ],
  progress: { filled: 1, playable: 4 }
}

describe('Paintkemon', () => {
  it('numérote la palette dans l\'ordre et reprend la progression serveur', () => {
    const g = normalizeColoringGrid(wire)
    expect(g.palette.map(c => c.number)).toEqual([1, 2])
    expect(g.filled).toBe(1)
    expect(g.playable).toBe(4)
    expect(g.cells[2]!.targetId).toBeNull()
  })

  it('retrouve une case par son index ligne par ligne, et sinon par recherche', () => {
    const g = normalizeColoringGrid(wire)
    expect(cellIndex(g, 1, 1)).toBe(4)
    const shuffled = { ...g, cells: [...g.cells].reverse() }
    expect(shuffled.cells[cellIndex(shuffled, 1, 1)]).toMatchObject({ x: 1, y: 1 })
  })

  it('un coup remplit la case et avance la progression une seule fois', () => {
    const g = normalizeColoringGrid(wire)
    expect(applyColoringMove(g, { x: 1, y: 0, colorId: 'c02' })).toBe(true)
    expect(g.filled).toBe(2)
    expect(g.cells[1]!.colorId).toBe('c02')
    // Rejouée (diffusion reçue après la réponse HTTP) : pas de double comptage.
    expect(applyColoringMove(g, { x: 1, y: 0, colorId: 'c02' })).toBe(false)
    expect(g.filled).toBe(2)
    // Sans couleur ou hors grille : ignoré.
    expect(applyColoringMove(g, { x: 0, y: 1, colorId: null })).toBe(false)
    expect(applyColoringMove(g, { x: 9, y: 9, colorId: 'c01' })).toBe(false)
  })

  it('lit la trame WebSocket à plat ou sous `cell`, et ignore le reste', () => {
    expect(frameToMove({ type: 'cell.colored', x: 1, y: 1, color_id: 'c01' })).toEqual({ x: 1, y: 1, colorId: 'c01' })
    expect(frameToMove({ type: 'cell.colored', cell: { x: 0, y: 1, color_id: 'c02', target_color_id: 'c02' } })).toEqual({ x: 0, y: 1, colorId: 'c02' })
    expect(frameToMove({ type: 'authenticated' })).toBeNull()
    expect(frameToMove({ type: 'cell.colored' })).toBeNull()
  })
})
