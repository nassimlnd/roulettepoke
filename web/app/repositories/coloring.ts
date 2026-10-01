import type { WireColoringGrid, WireColoringCell } from '~/types/api'
import type { ColoringGrid } from '~/types/domain'
import type { Api } from './_client'
import { normalizeColoringGrid } from './normalize'

// Paintkemon : la grille en lecture, une case à la fois en écriture. Les coups
// des autres arrivent par la diffusion WebSocket (store coloring).
export const coloringRepo = {
  grid: async (api: Api): Promise<ColoringGrid> => normalizeColoringGrid(await api<WireColoringGrid>('/coloring/grid')),
  colorCell: (api: Api, x: number, y: number, colorId: string) =>
    api<WireColoringCell>('/coloring/cells', { method: 'POST', body: { x, y, colorId } })
}
