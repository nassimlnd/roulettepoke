<script setup lang="ts">
import type { LeaderboardRow } from '~/types/domain'
import { useLeaderboardStore, SCORE_RULES } from '~/stores/leaderboard'

// Page Classement — score de diversité, podium top 3 + liste, « ta position »
// hors top 10, feed des derniers shiny/légendaires, et board des tricheurs
// (onglet secondaire, pas au même niveau que le contenu principal — cf. m7).
const lb = useLeaderboardStore()
const auth = useAuthStore()

const loading = ref(true)
const errorMsg = ref('')
const tab = ref<'main' | 'cheaters'>('main')

const me = computed(() => auth.user?.username)
const top = computed(() => lb.data?.top ?? [])
const podium = computed(() => top.value.slice(0, 3))
// Ordre visuel du podium : 2e à gauche, 1er au centre, 3e à droite.
const podiumOrder = computed(() => {
  const find = (r: number) => podium.value.find(p => p.rank === r)
  return [find(2), find(1), find(3)].filter((p): p is LeaderboardRow => !!p)
})
const rest = computed(() => top.value.slice(3))
const player = computed(() => lb.data?.player ?? null)
const showPlayerBlock = computed(() => {
  const p = player.value
  return !!p && !top.value.some(r => r.rank === p.current.rank)
})

function isYou(row: LeaderboardRow): boolean {
  return !!me.value && row.username === me.value
}

async function switchTab(t: 'main' | 'cheaters') {
  tab.value = t
  if (t === 'cheaters' && !lb.cheatersFetched) {
    try {
      await lb.ensureCheaters()
    } catch (err) {
      errorMsg.value = humanizeError(err)
    }
  }
}

onMounted(async () => {
  try {
    await lb.ensureFresh()
  } catch (err) {
    errorMsg.value = humanizeError(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="lb">
    <!-- En-tête -->
    <header class="lb__head">
      <div>
        <h1 class="lb__title font-display">
          Classement
        </h1>
        <p class="lb__lead">
          Score de <b>diversité</b> — les doublons ne comptent pas.
        </p>
        <NuxtLink
          to="/stats"
          class="lb__statslink"
        >
          <UIcon
            name="i-lucide-chart-column"
            class="size-4"
          /> Statistiques globales
        </NuxtLink>
      </div>
      <ul class="scale">
        <li
          v-for="r in SCORE_RULES"
          :key="r.label"
        >
          {{ r.label }} <b>{{ r.pts }}</b>
        </li>
      </ul>
    </header>

    <!-- Onglets -->
    <div
      class="tabs"
      role="tablist"
    >
      <button
        class="tab"
        :class="{ 'tab--on': tab === 'main' }"
        role="tab"
        :aria-selected="tab === 'main'"
        @click="switchTab('main')"
      >
        <UIcon
          name="i-lucide-trophy"
          class="size-4"
        /> Classement
      </button>
      <button
        class="tab"
        :class="{ 'tab--on': tab === 'cheaters' }"
        role="tab"
        :aria-selected="tab === 'cheaters'"
        @click="switchTab('cheaters')"
      >
        <UIcon
          name="i-lucide-shield-alert"
          class="size-4"
        /> Tricheurs
      </button>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      :title="errorMsg"
    />

    <div class="lb__grid">
      <!-- Colonne principale -->
      <div class="lb__main">
        <template v-if="loading">
          <USkeleton class="h-40 w-full rounded-2xl" />
          <USkeleton
            v-for="i in 5"
            :key="i"
            class="h-16 w-full rounded-2xl"
          />
        </template>

        <!-- Onglet Classement -->
        <template v-else-if="tab === 'main'">
          <!-- Podium -->
          <div
            v-if="podiumOrder.length"
            class="podium"
          >
            <div
              v-for="p in podiumOrder"
              :key="p.rank"
              class="pod"
              :class="[`pod--${p.rank}`, { 'pod--you': isYou(p) }]"
            >
              <RankAvatar
                :row="p"
                :size="p.rank === 1 ? 78 : 62"
              />
              <span class="pod__name">{{ p.username }}</span>
              <span class="pod__score tabular">{{ p.score }} <small>pts</small></span>
              <div class="pod__base">
                <span class="pod__rank tabular">{{ p.rank }}</span>
              </div>
            </div>
          </div>

          <!-- Rangs 4+ -->
          <div class="list">
            <LeaderRow
              v-for="row in rest"
              :key="row.rank"
              :row="row"
              :you="isYou(row)"
            />
          </div>

          <!-- Ta position (hors top 10) -->
          <div
            v-if="showPlayerBlock && player"
            class="player"
          >
            <p class="player__label">
              Ta position
            </p>
            <div class="list">
              <LeaderRow
                v-if="player.above"
                :row="player.above"
              />
              <LeaderRow
                :row="player.current"
                you
              />
              <LeaderRow
                v-if="player.below"
                :row="player.below"
              />
            </div>
          </div>

          <p
            v-if="!top.length"
            class="empty"
          >
            Classement indisponible pour le moment.
          </p>
        </template>

        <!-- Onglet Tricheurs -->
        <template v-else>
          <div
            v-if="lb.cheaters.length"
            class="list"
          >
            <p class="cheat-note">
              <UIcon
                name="i-lucide-shield-alert"
                class="size-4"
              />
              Joueurs ayant exploité des failles — hors classement officiel.
            </p>
            <LeaderRow
              v-for="row in lb.cheaters"
              :key="row.rank"
              :row="row"
            />
          </div>
          <p
            v-else
            class="empty"
          >
            Aucun tricheur épinglé — fair-play ! 🎉
          </p>
        </template>
      </div>

      <!-- Feed shiny / légendaires -->
      <aside class="feed">
        <h2 class="feed__title font-display">
          <UIcon
            name="i-lucide-sparkles"
            class="size-4"
          /> Derniers ✦ obtenus
        </h2>
        <ul
          v-if="lb.shinies.length"
          class="feed__list"
        >
          <li
            v-for="(s, i) in lb.shinies.slice(0, 12)"
            :key="i"
            class="fitem"
          >
            <span
              class="fitem__sprite"
              :class="{ 'fitem__sprite--shiny': s.isShiny }"
            >
              <img
                :src="s.imageUrl"
                :alt="s.name"
                loading="lazy"
              >
            </span>
            <div class="fitem__body">
              <p class="fitem__line">
                <b>{{ s.username }}</b> — {{ s.name }}
                <span
                  v-if="s.isDuplicate"
                  title="Doublon"
                >😅</span>
              </p>
              <p class="fitem__meta">
                <span :class="s.isShiny ? 'fitem__shiny' : 'fitem__leg'">{{ s.isShiny ? '✦ Shiny' : s.rarity }}</span>
                · {{ timeAgo(s.rolledAt) }}
              </p>
            </div>
          </li>
        </ul>
        <p
          v-else
          class="feed__empty"
        >
          Aucun tirage marquant récent.
        </p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.lb { display: flex; flex-direction: column; gap: 16px; }
.lb__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.lb__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.lb__lead { font-weight: 600; font-size: .9rem; color: var(--ui-text-muted); margin: 4px 0 0; }
.lb__statslink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .84rem;
  color: var(--color-poke-600);
  padding: 6px 12px;
  border-radius: 10px;
  background: var(--color-poke-50);
  transition: background .15s ease;
}
.lb__statslink:hover { background: color-mix(in oklab, var(--color-poke-100) 80%, transparent); }
.scale {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.scale li {
  font-size: .74rem;
  font-weight: 700;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  padding: 4px 9px;
  border-radius: 999px;
}
.scale b { color: var(--color-poke-600); }

.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  align-self: flex-start;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .9rem;
  border: none;
  background: transparent;
  color: var(--ui-text-muted);
  padding: 7px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all .15s ease;
}
.tab--on {
  background: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
  box-shadow: 0 2px 7px rgba(0, 0, 0, .1);
}
.tab:not(.tab--on):hover { color: var(--ui-text); }

.lb__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  align-items: start;
}
.lb__main { display: flex; flex-direction: column; gap: 10px; min-width: 0; }

/* Podium */
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(8px, 3vw, 22px);
  padding: 8px 0 0;
}
.pod {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: clamp(88px, 28%, 150px);
}
.pod__name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .86rem;
  color: var(--ui-text-highlighted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pod__score {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--color-poke-600);
}
.pod__score small { font-size: .62em; color: var(--ui-text-dimmed); font-weight: 700; }
.pod__base {
  width: 100%;
  display: grid;
  place-items: center;
  border-radius: 14px 14px 8px 8px;
  color: #fff;
  margin-top: 2px;
}
.pod__rank {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.6rem;
  text-shadow: 0 2px 3px rgba(0, 0, 0, .25);
}
.pod--1 { order: 2; }
.pod--1 .pod__base { height: 92px; background: linear-gradient(180deg, #ffdf7e, #e0a92e); box-shadow: inset 0 2px 0 rgba(255, 255, 255, .5), 0 6px 14px rgba(224, 169, 46, .4); }
.pod--2 { order: 1; }
.pod--2 .pod__base { height: 68px; background: linear-gradient(180deg, #e6ebf2, #b6bfcc); box-shadow: inset 0 2px 0 rgba(255, 255, 255, .6), 0 6px 14px rgba(150, 160, 175, .35); }
.pod--3 { order: 3; }
.pod--3 .pod__base { height: 52px; background: linear-gradient(180deg, #e8b58a, #c07f4e); box-shadow: inset 0 2px 0 rgba(255, 255, 255, .4), 0 6px 14px rgba(160, 110, 70, .35); }
.pod--you .pod__name { color: var(--color-poke-600); }

.list { display: flex; flex-direction: column; gap: 8px; }

.player { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.player__label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .8rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--ui-text-dimmed);
}

.cheat-note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .82rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  padding: 4px 2px 6px;
}
.empty { text-align: center; color: var(--ui-text-dimmed); font-size: .9rem; padding: 30px 0; }

/* Feed */
.feed {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 18px;
  padding: 14px 14px 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .04);
}
.feed__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: .95rem;
  margin: 0 0 8px;
}
.feed__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.fitem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 2px;
  border-top: 1px solid var(--ui-border-muted);
}
.fitem:first-child { border-top: none; }
.fitem__sprite {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 35%, var(--ui-bg-muted), var(--ui-bg-accented));
  box-shadow: inset 0 0 0 1px var(--ui-border);
}
.fitem__sprite--shiny {
  background: radial-gradient(circle at 50% 35%, #efe6ff, #d9c8ff);
  box-shadow: inset 0 0 0 1px rgba(201, 179, 255, .8), 0 0 8px rgba(201, 179, 255, .5);
}
.fitem__sprite img { width: 84%; height: 84%; object-fit: contain; }
.fitem__body { min-width: 0; flex: 1; }
.fitem__line {
  font-size: .82rem;
  color: var(--ui-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fitem__line b { font-weight: 700; color: var(--ui-text-highlighted); }
.fitem__meta { font-size: .72rem; font-weight: 700; color: var(--ui-text-dimmed); margin-top: 1px; }
.fitem__shiny { color: #8b6fd0; }
.fitem__leg { color: #c8901f; }
.feed__empty { font-size: .82rem; color: var(--ui-text-dimmed); padding: 8px 2px 12px; }

@media (max-width: 860px) {
  .lb__grid { grid-template-columns: 1fr; }
}
</style>
