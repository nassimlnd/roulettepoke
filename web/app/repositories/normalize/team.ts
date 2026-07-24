// Normalisation d'un membre d'équipe.
import type { WireTeamMember } from '~/types/api'
import type { TeamMember } from '~/types/domain'
import { realRarity } from './card'

export function normalizeTeamMember(m: WireTeamMember): TeamMember {
  const isShiny = m.rarity === 'Alt'
  return {
    teamEntryId: m.team_entry_id,
    position: m.position,
    cardId: m.id,
    name: m.name,
    type: m.type,
    rarity: realRarity(m.rarity),
    isShiny,
    imageUrl: m.image_url,
    typeImageUrl: m.type_image_url ?? null
  }
}
