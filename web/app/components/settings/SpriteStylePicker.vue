<script setup lang="ts">
import { SPRITE_STYLES, SPRITE_PREVIEW_NUM } from '~/constants/sprite-styles'

// Sélecteur de style de sprite : chaque tuile EST son propre aperçu — le même
// Pokémon rendu dans le style qu'elle propose. Comparer vaut mieux que lire une
// liste de noms de générations.
const model = defineModel<string>({ required: true })

// Le style « backend » n'a pas d'URL dérivable d'un n° : on affiche le sprite
// servi par le jeu (chemin identique à celui des cartes).
const BACKEND_PREVIEW = '/images/pikachu.webp'

// Chaque vignette PART du sprite du jeu et n'est remplacée qu'une fois l'aperçu
// distant réellement chargé. On ne peut pas se contenter d'un `@error` : quand
// le CDN est injoignable la requête PEND au lieu d'échouer, l'événement ne se
// déclenche jamais et la tuile resterait vide. Ainsi elle montre toujours
// quelque chose, et reste sélectionnable dans tous les cas.
const previews = reactive<Record<string, string>>(
  Object.fromEntries(SPRITE_STYLES.map(s => [s.key, BACKEND_PREVIEW]))
)

onMounted(() => {
  for (const s of SPRITE_STYLES) {
    const url = styledSpriteUrl(s.key, SPRITE_PREVIEW_NUM)
    if (!url) continue
    const probe = new Image()
    probe.onload = () => {
      previews[s.key] = url
    }
    probe.src = url
  }
})
</script>

<template>
  <div
    class="ssp"
    role="radiogroup"
    aria-label="Style des sprites"
  >
    <button
      v-for="s in SPRITE_STYLES"
      :key="s.key"
      type="button"
      class="ssp__tile"
      :class="{ 'ssp__tile--on': model === s.key }"
      role="radio"
      :aria-checked="model === s.key"
      :title="s.hint"
      @click="model = s.key"
    >
      <span class="ssp__thumb">
        <img
          :src="previews[s.key]"
          :alt="`Aperçu du style ${s.label}`"
          decoding="async"
        >
      </span>
      <span class="ssp__label">{{ s.label }}</span>
      <span class="ssp__hint">{{ s.hint }}</span>
    </button>
  </div>
</template>

<style scoped>
.ssp {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px;
  width: 100%;
}
.ssp__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px 9px;
  border-radius: 14px;
  cursor: pointer;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  transition: border-color .15s ease, box-shadow .15s ease, transform .15s var(--ease-pop);
}
.ssp__tile:hover { transform: translateY(-2px); }
.ssp__tile--on {
  border-color: var(--color-poke-500);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-poke-500) 30%, transparent);
}
.ssp__tile:focus-visible {
  outline: 2px solid var(--color-poke-400);
  outline-offset: 2px;
}

.ssp__thumb {
  display: grid;
  place-items: center;
  width: 100%;
  height: 66px;
  border-radius: 10px;
  background: var(--ui-bg-muted);
}
.ssp__thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.ssp__label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .82rem;
  color: var(--ui-text-highlighted);
}
.ssp__hint {
  font-size: .66rem;
  line-height: 1.2;
  color: var(--ui-text-dimmed);
  text-align: center;
}
</style>
