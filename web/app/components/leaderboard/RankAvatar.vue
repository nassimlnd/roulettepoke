<script setup lang="ts">
import type { LeaderboardRow } from '~/types/domain'
import { RARITY_META } from '~/utils/cardTheme'

// Avatar d'un joueur : sprite de sa carte-avatar, anneau teinté par rareté
// (iridescent si shiny), et pastille d'honneur (couronne 👑 prioritaire sur les
// médailles de tournoi 🥇🥈🥉).
const props = withDefaults(defineProps<{ row: LeaderboardRow, size?: number }>(), { size: 46 })

const ring = computed(() => {
  if (props.row.isShinyAvatar) return '#c9b3ff'
  return props.row.avatarRarity ? RARITY_META[props.row.avatarRarity].color : 'var(--ui-border-accented)'
})
const honor = computed(() => {
  if (props.row.crowned) return { emoji: '👑', label: 'Couronne de la Ligue (7 jours)' }
  const m = props.row.medal
  if (m === 1) return { emoji: '🥇', label: '1re place au dernier tournoi' }
  if (m === 2) return { emoji: '🥈', label: '2e place au dernier tournoi' }
  if (m === 3) return { emoji: '🥉', label: '3e place au dernier tournoi' }
  return null
})
</script>

<template>
  <span
    class="ra"
    :style="{ '--s': size + 'px', '--ring': ring }"
  >
    <span
      class="ra__frame"
      :class="{ 'ra__frame--shiny': row.isShinyAvatar }"
    >
      <img
        v-if="row.avatarUrl"
        :src="row.avatarUrl"
        :alt="`Avatar de ${row.username}`"
        class="ra__img"
        loading="lazy"
        decoding="async"
      >
      <UIcon
        v-else
        name="i-lucide-user"
        class="ra__fallback"
      />
    </span>
    <span
      v-if="honor"
      class="ra__honor"
      role="img"
      :title="honor.label"
      :aria-label="honor.label"
    >{{ honor.emoji }}</span>
  </span>
</template>

<style scoped>
.ra {
  position: relative;
  display: inline-block;
  width: var(--s);
  height: var(--s);
  flex: none;
}
.ra__frame {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--ui-bg-muted);
  box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 4px var(--ring), 0 3px 8px rgba(0, 0, 0, .14);
}
.ra__frame--shiny {
  box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 4px #c9b3ff, 0 0 12px rgba(201, 179, 255, .75);
}
.ra__img { width: 100%; height: 100%; object-fit: cover; }
.ra__fallback { width: 55%; height: 55%; color: var(--ui-text-dimmed); }
.ra__honor {
  position: absolute;
  top: -7px;
  right: -7px;
  font-size: calc(var(--s) * 0.44);
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .3));
}
</style>
