<script setup lang="ts">
// Bandeau des événements du jour, juste sous la navbar. Ils ne sont jamais
// annoncés à l'avance : c'est ici que le joueur les découvre. Masquable d'un
// clic ; il revient dès que l'empreinte du jour change (nouvel événement,
// nouveau jour) — même règle que le jeu d'origine.
const events = useEventsStore()
</script>

<template>
  <Transition name="strip">
    <div
      v-if="events.stripVisible"
      class="strip"
      role="region"
      aria-label="Événements du jour"
    >
      <div class="strip__inner">
        <ul class="strip__list">
          <li
            v-for="e in events.active"
            :key="e.type"
            class="strip__item"
          >
            <NuxtLink
              v-if="e.to"
              :to="e.to"
              class="ev"
            >
              <UIcon
                :name="e.icon"
                class="size-4 ev__ico"
              />
              <span class="ev__title">{{ e.title }}</span>
              <span class="ev__text">{{ e.text }}</span>
            </NuxtLink>
            <span
              v-else
              class="ev"
            >
              <UIcon
                :name="e.icon"
                class="size-4 ev__ico"
              />
              <span class="ev__title">{{ e.title }}</span>
              <span class="ev__text">{{ e.text }}</span>
            </span>
          </li>
        </ul>
        <button
          type="button"
          class="strip__close"
          aria-label="Masquer les événements du jour"
          @click="events.dismissStrip()"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4"
          />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.strip {
  background: linear-gradient(150deg, #fff2d6, #ffe0a0);
  border-bottom: 1px solid #f0d189;
}
:global(.dark) .strip {
  background: linear-gradient(150deg, #3a2e12, #4a3a14);
  border-bottom-color: #6b5420;
}
.strip__inner {
  max-width: 72rem;
  margin: 0 auto;
  padding: 6px 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.strip__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.ev {
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
  font-size: .84rem;
  color: #5c3d00;
  line-height: 1.35;
  padding: 2px 0;
}
:global(.dark) .ev { color: #f1d9a0; }
a.ev:hover .ev__title { text-decoration: underline; }
.ev__ico { align-self: center; color: #c98a1a; flex: none; }
.ev__title { font-family: var(--font-display); font-weight: 700; }
.ev__text { color: inherit; opacity: .9; }
.strip__close {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #8a5a12;
  cursor: pointer;
  transition: background .15s ease;
}
.strip__close:hover { background: rgba(138, 90, 18, .12); }
:global(.dark) .strip__close { color: #e8c274; }

.strip-enter-active, .strip-leave-active { transition: opacity .2s ease, transform .2s ease; }
.strip-enter-from, .strip-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
