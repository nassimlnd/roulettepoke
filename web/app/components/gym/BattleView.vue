<script setup lang="ts">
import type { BattleResult } from '~/types/domain'

// Rejoue le combat d'arène (résolu côté serveur) duel par duel, puis annonce
// l'issue. Animation tempérée (pas le tachymètre d'origine) mais séquentielle.
const props = defineProps<{
  result: BattleResult
  gymName: string
  badgeImageUrl: string
}>()

const reduced = usePreferredReducedMotion()
const revealed = ref(0)
const showResult = ref(false)
const timers: ReturnType<typeof setTimeout>[] = []

const wins = computed(() => props.result.rounds.filter(r => r.playerWon).length)

onMounted(() => {
  if (reduced.value === 'reduce' || !props.result.rounds.length) {
    revealed.value = props.result.rounds.length
    showResult.value = true
    return
  }
  const step = 560
  props.result.rounds.forEach((_, i) => {
    timers.push(setTimeout(() => {
      revealed.value = i + 1
    }, i * step))
  })
  timers.push(setTimeout(() => {
    showResult.value = true
  }, props.result.rounds.length * step + 260))
})
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="battle">
    <ol class="duels">
      <li
        v-for="(r, i) in result.rounds"
        v-show="i < revealed"
        :key="i"
        class="duel"
        :class="r.playerWon ? 'duel--win' : 'duel--loss'"
      >
        <span class="duel__side">
          <span class="duel__av">
            <img
              v-if="r.player.imageUrl"
              :src="r.player.imageUrl"
              :alt="r.player.name"
              loading="lazy"
            >
            <UIcon
              v-else
              name="i-lucide-user"
              class="size-5"
            />
          </span>
          <span class="duel__name">{{ r.player.name }}</span>
        </span>

        <span class="duel__mid">
          <span class="duel__vs">{{ r.winProbability }}%</span>
          <UIcon
            :name="r.playerWon ? 'i-lucide-chevrons-right' : 'i-lucide-chevrons-left'"
            class="duel__arrow size-4"
          />
        </span>

        <span class="duel__side duel__side--foe">
          <span class="duel__name">{{ r.champion.name }}</span>
          <span class="duel__av">
            <img
              v-if="r.champion.imageUrl"
              :src="r.champion.imageUrl"
              :alt="r.champion.name"
              loading="lazy"
            >
            <UIcon
              v-else
              name="i-lucide-swords"
              class="size-5"
            />
          </span>
        </span>

        <span
          class="duel__flag"
          :aria-label="r.playerWon ? 'Duel gagné' : 'Duel perdu'"
        >
          <UIcon
            :name="r.playerWon ? 'i-lucide-check' : 'i-lucide-x'"
            class="size-4"
          />
        </span>
      </li>
    </ol>

    <Transition name="verdict">
      <div
        v-if="showResult"
        class="verdict"
        :class="result.won ? 'verdict--win' : 'verdict--loss'"
      >
        <template v-if="result.won">
          <img
            :src="badgeImageUrl"
            :alt="result.badgeName || 'Badge'"
            class="verdict__badge"
          >
          <p class="verdict__title font-display">
            Victoire ! 🎉
          </p>
          <p class="verdict__sub">
            Badge <b>{{ result.badgeName }}</b> obtenu — {{ gymName }}.
          </p>
        </template>
        <template v-else>
          <div class="verdict__x">
            <UIcon
              name="i-lucide-shield-x"
              class="size-10"
            />
          </div>
          <p class="verdict__title font-display">
            Défaite
          </p>
          <p class="verdict__sub">
            {{ wins }}/{{ result.rounds.length }} duels gagnés — retente la semaine prochaine.
          </p>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.battle { display: flex; flex-direction: column; gap: 12px; }
.duels { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.duel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  animation: duelin .35s var(--ease-pop) both;
}
.duel--win { border-color: color-mix(in oklab, #5bbf82 45%, transparent); background: color-mix(in oklab, #5bbf82 8%, var(--ui-bg-elevated)); }
.duel--loss { border-color: color-mix(in oklab, var(--color-poke-500) 32%, transparent); background: color-mix(in oklab, var(--color-poke-500) 6%, var(--ui-bg-elevated)); }
@keyframes duelin {
  from { opacity: 0; transform: translateY(8px) scale(.98); }
  to { opacity: 1; transform: none; }
}
.duel__side { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; }
.duel__side--foe { justify-content: flex-end; text-align: right; }
.duel__av {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--ui-bg-muted);
  box-shadow: inset 0 0 0 1px var(--ui-border);
  color: var(--ui-text-dimmed);
}
.duel__av img { width: 100%; height: 100%; object-fit: contain; }
.duel__name {
  font-weight: 700;
  font-size: .82rem;
  color: var(--ui-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.duel__mid { display: flex; flex-direction: column; align-items: center; flex: none; width: 52px; }
.duel__vs { font-size: .68rem; font-weight: 800; color: var(--ui-text-muted); }
.duel__arrow { color: var(--ui-text-dimmed); }
.duel--win .duel__arrow { color: #3f9e66; }
.duel--loss .duel__arrow { color: var(--color-poke-500); }
.duel__flag {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
}
.duel--win .duel__flag { background: linear-gradient(150deg, #8fd6a8, #5bbf82); }
.duel--loss .duel__flag { background: linear-gradient(150deg, #f4796b, #e2402f); }

.verdict {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  padding: 16px 12px 8px;
  border-radius: 18px;
  margin-top: 2px;
}
.verdict--win { background: color-mix(in oklab, #5bbf82 12%, transparent); }
.verdict--loss { background: var(--ui-bg-muted); }
.verdict__badge {
  width: 64px;
  height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, .25));
  animation: emerge .7s cubic-bezier(.2, .8, .3, 1) both;
}
.verdict__x { color: var(--ui-text-dimmed); }
.verdict__title { font-weight: 700; font-size: 1.3rem; }
.verdict--win .verdict__title { color: #3f9e66; }
.verdict__sub { font-size: .84rem; color: var(--ui-text-muted); }
.verdict__sub b { color: var(--ui-text-highlighted); }

.verdict-enter-active { transition: opacity .3s ease, transform .3s var(--ease-pop); }
.verdict-enter-from { opacity: 0; transform: translateY(10px) scale(.96); }

@media (prefers-reduced-motion: reduce) {
  .duel, .verdict__badge { animation: none; }
  .verdict-enter-active { transition: none; }
}
</style>
