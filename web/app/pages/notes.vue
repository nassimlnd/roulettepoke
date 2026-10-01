<script setup lang="ts">
import { NOTE_SECTION_META } from '~/config/release-notes'

// Notes de version du front : la dernière ouverte, les autres repliées.
// Consulter la page éteint la pastille de la navigation.
const { notes, markSeen } = useReleaseNotes()
onMounted(markSeen)

function dateLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="pn">
    <header class="pn__head">
      <h1 class="pn__title font-display">
        Nouveautés
      </h1>
      <p class="pn__sub">
        Ce qui change dans l'interface, version par version. Les règles du jeu, elles, suivent le serveur d'origine.
      </p>
    </header>

    <details
      v-for="(n, i) in notes"
      :key="n.version"
      class="rel"
      :open="i === 0"
    >
      <summary class="rel__sum">
        <span
          class="rel__tag"
          :class="{ 'rel__tag--major': n.major }"
        >v{{ n.version }}</span>
        <span class="rel__title font-display">{{ n.title }}</span>
        <span class="rel__date">{{ dateLabel(n.date) }}</span>
      </summary>
      <div class="rel__body">
        <section
          v-for="s in n.sections"
          :key="s.type"
          class="sec"
          :class="`sec--${s.type}`"
        >
          <h2 class="sec__title">
            <UIcon
              :name="NOTE_SECTION_META[s.type].icon"
              class="size-4"
            />
            {{ NOTE_SECTION_META[s.type].label }}
          </h2>
          <div
            v-for="(g, gi) in s.groups"
            :key="gi"
            class="grp"
          >
            <p
              v-if="g.label"
              class="grp__label"
            >
              {{ g.label }}
            </p>
            <ul class="grp__list">
              <li
                v-for="(item, ii) in g.items"
                :key="ii"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </section>
      </div>
    </details>
  </div>
</template>

<style scoped>
.pn { max-width: 44rem; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
.pn__head { margin-bottom: 6px; }
.pn__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.pn__sub { color: var(--ui-text-muted); margin: 6px 0 0; font-size: .92rem; }

.rel {
  border: 1px solid var(--ui-border);
  border-radius: 16px;
  background: var(--ui-bg-elevated);
  overflow: hidden;
}
.rel__sum {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  cursor: pointer;
  list-style: none;
}
.rel__sum::-webkit-details-marker { display: none; }
.rel[open] .rel__sum { border-bottom: 1px solid var(--ui-border); }
.rel__tag {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .78rem;
  padding: 3px 10px;
  border-radius: 999px;
  color: var(--ui-text-muted);
  background: var(--ui-bg-accented);
}
.rel__tag--major { color: #fff; background: var(--color-poke-500); box-shadow: 0 2px 0 var(--color-poke-700); }
.rel__title { font-weight: 700; font-size: 1.05rem; color: var(--ui-text-highlighted); flex: 1; }
.rel__date { font-size: .8rem; color: var(--ui-text-dimmed); }
.rel__body { display: flex; flex-direction: column; gap: 16px; padding: 14px 16px 18px; }

.sec { display: flex; flex-direction: column; gap: 10px; }
.sec__title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: .74rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.sec--new .sec__title { color: #3f9e66; }
.sec--fix .sec__title { color: #cc6f16; }
.sec--roadmap .sec__title { color: #5b7bd5; }
.grp { display: flex; flex-direction: column; gap: 4px; }
.grp__label { margin: 0; font-weight: 700; font-size: .9rem; color: var(--ui-text-highlighted); }
.grp__list { margin: 0; padding: 0 0 0 18px; display: flex; flex-direction: column; gap: 5px; font-size: .9rem; color: var(--ui-text-toned); line-height: 1.5; }
</style>
