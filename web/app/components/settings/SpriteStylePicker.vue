<script setup lang="ts">
import type { DomainCard } from '~/types/domain'
import {
  SPRITE_STYLES, SPRITE_FAMILY_LABEL, SPRITE_PREVIEW_MONS,
  previewSpriteUrl, styleCovers, styleLimitation,
  type SpriteStyle, type SpriteFamily, type PreviewMon
} from '~/constants/sprite-styles'

// Sélecteur de style de sprite.
//
// Deux principes, tirés des défauts de la version précédente :
//
//  1. On compare mieux SUR PIÈCE. Une grande carte réelle montre le style dans
//     son contexte d'usage — cadre, fond de type, taille exacte — plutôt qu'une
//     vignette de 66 px qui ne ressemble à rien de ce qu'on verra en jeu.
//  2. On compare à Pokémon CONSTANT. Toutes les tuiles rendent le même Pokémon,
//     celui que le joueur a choisi : la seule variable est le style. Et comme
//     deux des Pokémon proposés sont de Johto, le repli de Gen 1 (qui s'arrête
//     à Kanto) devient visible au lieu d'être subi en silence.
const model = defineModel<string>({ required: true })

const mon = ref<PreviewMon>(SPRITE_PREVIEW_MONS[0]!)
const shiny = ref(false)

// Gen 1 n'a aucun shiny : proposer la bascule tout en sachant qu'elle forcera
// un repli est honnête, à condition de le dire (cf. `fallbackNote`).
const monOptions = computed(() =>
  SPRITE_PREVIEW_MONS.map(m => ({ value: String(m.num), label: m.name })))

function pickMon(num: string | number) {
  const found = SPRITE_PREVIEW_MONS.find(m => m.num === Number(num))
  if (found) mon.value = found
}

// Carte d'aperçu. Rareté et niveau sont FIXES à dessein : si le cadre changeait
// d'un Pokémon à l'autre, on ne comparerait plus les styles entre eux.
const previewCard = computed<DomainCard>(() => ({
  id: `preview-${mon.value.num}`,
  num: mon.value.num,
  generation: mon.value.num <= 151 ? 1 : 2,
  name: mon.value.name,
  imageUrl: previewSpriteUrl(mon.value, shiny.value),
  rarity: 'Rare',
  isShiny: shiny.value,
  level: 1,
  biome: 'Plaines',
  type: mon.value.type,
  parentCardId: `preview-${mon.value.num}`,
  standardId: null
}))

// Les styles embarqués s'affichent directement — ils sont sur le même hôte.
// Le seul style distant (Gen 5 animé) part du sprite du jeu et n'est remplacé
// qu'une fois son GIF réellement chargé : sans cela sa vignette reste un carré
// vide le temps de l'aller-retour, ce qui se lit comme une panne.
const remoteReady = ref<Record<string, string>>({})

watch([mon, shiny], () => {
  remoteReady.value = {}
  if (!import.meta.client) return
  for (const s of SPRITE_STYLES.filter(x => x.path && !x.local)) {
    const url = styledSpriteUrl(s.key, mon.value.num, shiny.value)
    if (!url) continue
    const probe = new Image()
    probe.onload = () => {
      remoteReady.value = { ...remoteReady.value, [s.key]: url }
    }
    probe.src = url
  }
}, { immediate: true })

// URL de la vignette d'une tuile. Repli sur le sprite du jeu quand le style ne
// couvre pas ce Pokémon — c'est exactement ce que le joueur obtiendra.
function tileUrl(style: SpriteStyle): string {
  const fallback = previewSpriteUrl(mon.value, shiny.value)
  if (!style.path) return fallback
  if (!style.local) return remoteReady.value[style.key] ?? fallback
  return styledSpriteUrl(style.key, mon.value.num, shiny.value) ?? fallback
}

function isFallback(style: SpriteStyle): boolean {
  return !styleCovers(style, mon.value.num, shiny.value)
}

// Ce que le style ne saura pas rendre POUR CE POKÉMON précis — plus utile que
// la limite générale quand on est justement en train de la déclencher.
function fallbackNote(style: SpriteStyle): string {
  if (shiny.value && style.noShiny) return 'Pas de shiny → style du jeu'
  return 'Hors Kanto → style du jeu'
}

const FAMILIES: SpriteFamily[] = ['jeu', 'pixel', 'rendu']
const byFamily = computed(() => FAMILIES.map(f => ({
  family: f,
  label: SPRITE_FAMILY_LABEL[f],
  styles: SPRITE_STYLES.filter(s => s.family === f)
})).filter(g => g.styles.length > 0))
</script>

<template>
  <div class="ssp">
    <!-- ─── Aperçu sur une vraie carte ─────────────────────────────────── -->
    <div class="ssp__preview">
      <HoloCard
        :key="`${model}-${mon.num}-${shiny}`"
        :card="previewCard"
        size="md"
        :ambient="false"
      />
      <div class="ssp__controls">
        <div>
          <p class="ssp__ctl-label">
            Pokémon d'aperçu
          </p>
          <PSegmented
            :model-value="String(mon.num)"
            :options="monOptions"
            size="sm"
            a11y="radio"
            aria-label="Choisir le Pokémon d'aperçu"
            @update:model-value="pickMon"
          />
        </div>
        <label class="ssp__shiny">
          <USwitch v-model="shiny" />
          <span>Voir en shiny</span>
        </label>
        <p class="ssp__note">
          Toutes les vignettes montrent le même Pokémon : la seule différence
          est le style.
        </p>
      </div>
    </div>

    <!-- ─── Tuiles, groupées par famille de rendu ──────────────────────── -->
    <div
      v-for="g in byFamily"
      :key="g.family"
      class="ssp__group"
    >
      <p class="ssp__family">
        {{ g.label }}
      </p>
      <div
        class="ssp__grid"
        role="radiogroup"
        :aria-label="`Style des sprites — ${g.label}`"
      >
        <button
          v-for="s in g.styles"
          :key="s.key"
          type="button"
          class="ssp__tile"
          :class="{ 'ssp__tile--on': model === s.key }"
          role="radio"
          :aria-checked="model === s.key"
          @click="model = s.key"
        >
          <span
            class="ssp__thumb"
            :class="{ 'ssp__thumb--pixel': s.family === 'pixel' }"
          >
            <img
              :src="tileUrl(s)"
              :alt="`${mon.name} dans le style ${s.label}`"
              decoding="async"
              loading="lazy"
            >
            <span
              v-if="s.animated"
              class="ssp__anim"
              title="Style animé"
            >▶</span>
          </span>
          <span class="ssp__label">{{ s.label }}</span>
          <span
            v-if="isFallback(s)"
            class="ssp__warn"
          >{{ fallbackNote(s) }}</span>
          <span
            v-else-if="styleLimitation(s)"
            class="ssp__lim"
          >{{ styleLimitation(s) }}</span>
          <span
            v-else
            class="ssp__hint"
          >{{ s.hint }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ssp { display: flex; flex-direction: column; gap: 18px; width: 100%; }

.ssp__preview {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 16px;
  border-radius: 16px;
  background: var(--ui-bg-muted);
}
.ssp__controls {
  flex: 1;
  min-width: 15rem;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ssp__ctl-label {
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 700;
  color: var(--ui-text-dimmed);
  margin: 0 0 6px;
}
.ssp__shiny {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: .88rem;
  font-weight: 600;
  color: var(--ui-text);
  cursor: pointer;
}
.ssp__note {
  font-size: .78rem;
  line-height: 1.45;
  color: var(--ui-text-dimmed);
  margin: 0;
  max-width: 26rem;
}

.ssp__family {
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 700;
  color: var(--ui-text-dimmed);
  margin: 0 0 8px;
}
.ssp__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 10px;
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
.ssp__tile:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 2px; }

.ssp__thumb {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 72px;
  border-radius: 10px;
  background: var(--ui-bg-muted);
  overflow: hidden;
}
/* Dimensions explicites plutôt que max-* : un enfant de grille garde
   `min-height: auto` et refuse de rétrécir sous sa taille naturelle — les
   sprites de 96 et 128 px débordaient donc de la vignette et chevauchaient
   le libellé en dessous. */
.ssp__thumb img {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
  padding: 4px;
}
/* Le pixel art est agrandi de 40-96 px à ~70 px : sans ceci, le lissage du
   navigateur le rend flou et le style perd exactement ce qui le caractérise. */
.ssp__thumb--pixel img { image-rendering: pixelated; }
.ssp__anim {
  position: absolute;
  right: 4px;
  bottom: 3px;
  font-size: .55rem;
  line-height: 1;
  padding: 3px 4px;
  border-radius: 5px;
  color: #fff;
  background: rgba(0, 0, 0, .45);
}

.ssp__label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .82rem;
  color: var(--ui-text-highlighted);
}
.ssp__hint, .ssp__lim, .ssp__warn {
  font-size: .66rem;
  line-height: 1.2;
  text-align: center;
  /* Deux lignes réservées : les libellés vont de « Cristal » à
     « Ultra-Soleil / Ultra-Lune », et sans cette réserve les tuiles d'une même
     rangée n'ont pas la même hauteur. */
  min-height: 2.4em;
  align-content: center;
}
.ssp__hint { color: var(--ui-text-dimmed); }
.ssp__lim { color: var(--ui-text-muted); font-weight: 600; }
.ssp__warn { color: var(--color-poke-600); font-weight: 700; }
</style>
