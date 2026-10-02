<script setup lang="ts">
import type { LeagueRun } from '~/types/domain'

// Rejoue le défi de la Ligue (résolu côté serveur) maître par maître : chaque
// étape révèle son adversaire et ses duels, puis l'issue globale s'affiche.
const props = defineProps<{ run: LeagueRun }>()

const reduced = usePreferredReducedMotion()
const revealed = ref(0)
const showResult = ref(false)
const timers: ReturnType<typeof setTimeout>[] = []

const wonStages = computed(() => props.run.stages.filter(s => s.won).length)

function stageLabel(type: 'player' | 'npc'): string {
  return type === 'npc' ? 'Maître' : 'Dresseur'
}

onMounted(() => {
  const stages = props.run.stages
  if (reduced.value === 'reduce' || !stages.length) {
    revealed.value = stages.length
    showResult.value = true
    return
  }
  const step = 720
  stages.forEach((_, i) => {
    timers.push(setTimeout(() => {
      revealed.value = i + 1
    }, i * step))
  })
  timers.push(setTimeout(() => {
    showResult.value = true
  }, stages.length * step + 300))
})
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="lb">
    <ol class="lb__stages">
      <li
        v-for="(s, i) in run.stages"
        v-show="i < revealed"
        :key="i"
        class="stage"
        :class="s.won ? 'stage--win' : 'stage--loss'"
      >
        <header class="stage__head">
          <span class="stage__no">{{ i + 1 }}</span>
          <div class="stage__id">
            <span class="stage__name">{{ s.opponentName }}</span>
            <span
              class="stage__type"
              :class="`stage__type--${s.opponentType}`"
            >{{ stageLabel(s.opponentType) }}</span>
          </div>
          <span
            class="stage__flag"
            :aria-label="s.won ? 'Étape gagnée' : 'Étape perdue'"
          >
            <UIcon
              :name="s.won ? 'i-lucide-check' : 'i-lucide-x'"
              class="size-4"
            />
          </span>
        </header>

        <ol class="duels">
          <li
            v-for="(r, j) in s.rounds"
            :key="j"
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
                  class="size-4"
                />
              </span>
              <span class="duel__name">{{ r.player.name }}</span>
            </span>
            <span class="duel__mid">
              <span class="duel__vs tabular">{{ r.winProbability }}%</span>
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
                  class="size-4"
                />
              </span>
            </span>
          </li>
        </ol>
      </li>
    </ol>

    <Transition name="verdict">
      <div
        v-if="showResult"
        class="verdict"
        :class="run.won ? 'verdict--win' : 'verdict--loss'"
      >
        <div class="verdict__ico">
          <UIcon
            :name="run.won ? 'i-lucide-trophy' : 'i-lucide-shield-x'"
            class="size-10"
          />
        </div>
        <p class="verdict__title font-display">
          {{ run.won ? 'Ligue vaincue ! 🏆' : 'Défaite' }}
        </p>
        <p class="verdict__sub">
          {{ wonStages }}/{{ run.stages.length }} maîtres battus{{ run.won ? ' — choisis ta récompense.' : ' — retente la semaine prochaine.' }}
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.lb { display: flex; flex-direction: column; gap: 12px; }
.lb__stages { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.stage {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  animation: stagein .4s var(--ease-pop) both;
}
.stage--win { border-color: color-mix(in oklab, #5bbf82 42%, transparent); }
.stage--loss { border-color: color-mix(in oklab, var(--color-poke-500) 32%, transparent); }
@keyframes stagein {
  from { opacity: 0; transform: translateY(10px) scale(.98); }
  to { opacity: 1; transform: none; }
}
.stage__head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.stage__no {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: .82rem;
  color: #fff;
  background: linear-gradient(150deg, #b57ee0, #8b5cc4);
}
.stage__id { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.stage__name { font-family: var(--font-display); font-weight: 700; font-size: .95rem; color: var(--ui-text-highlighted); }
.stage__type {
  font-size: .62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
}
.stage__type--npc { background: #b58a2e; }
.stage__type--player { background: #4e8fd0; }
.stage__flag {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #fff;
}
.stage--win .stage__flag { background: linear-gradient(150deg, #8fd6a8, #5bbf82); }
.stage--loss .stage__flag { background: linear-gradient(150deg, #f4796b, #e2402f); }

.duels { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.duel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border-radius: 11px;
  background: var(--ui-bg-muted);
}
.duel--win { background: color-mix(in oklab, #5bbf82 10%, var(--ui-bg-muted)); }
.duel--loss { background: color-mix(in oklab, var(--color-poke-500) 7%, var(--ui-bg-muted)); }
.duel__side { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.duel__side--foe { justify-content: flex-end; text-align: right; }
.duel__av {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--ui-bg-elevated);
  box-shadow: inset 0 0 0 1px var(--ui-border);
  color: var(--ui-text-dimmed);
}
.duel__av img { width: 100%; height: 100%; object-fit: contain; }
.duel__name { font-weight: 700; font-size: .76rem; color: var(--ui-text-toned); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.duel__mid { display: flex; flex-direction: column; align-items: center; flex: none; width: 46px; }
.duel__vs { font-size: .64rem; font-weight: 800; color: var(--ui-text-dimmed); }
.duel__arrow { color: var(--ui-text-dimmed); }
.duel--win .duel__arrow { color: #3f9e66; }
.duel--loss .duel__arrow { color: var(--color-poke-500); }

.verdict {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
  padding: 20px 14px 12px;
  border-radius: 18px;
}
.verdict--win { background: linear-gradient(180deg, color-mix(in oklab, #f6c453 18%, transparent), transparent); }
.verdict--loss { background: var(--ui-bg-muted); }
.verdict__ico { color: var(--ui-text-dimmed); }
.verdict--win .verdict__ico { color: #d99a1c; animation: emerge .7s cubic-bezier(.2, .8, .3, 1) both; }
.verdict__title { font-weight: 700; font-size: 1.4rem; color: var(--ui-text-highlighted); }
.verdict--win .verdict__title { color: #c07d10; }
.verdict__sub { font-size: .86rem; color: var(--ui-text-muted); }

.verdict-enter-active { transition: opacity .3s ease, transform .3s var(--ease-pop); }
.verdict-enter-from { opacity: 0; transform: translateY(10px) scale(.96); }

@media (prefers-reduced-motion: reduce) {
  .stage, .verdict__ico { animation: none; }
  .verdict-enter-active { transition: none; }
}
</style>
