<script setup lang="ts">
import type { StatPlayer } from '~/types/domain'
import { useStatsStore } from '~/stores/stats'

// Page Statistiques — un seul payload agrégé (GET /stats), restructuré par la
// v4 : vue d'ensemble PAR JEU (roulette, jackpot, aventure, motus), stats par
// joueur avec ses duels de tournoi, et le palmarès (5 familles de récompenses
// nommées, vocabulaire du jeu d'origine).
//
// Disparus du serveur avec la v4 — et donc d'ici : la popularité des badges
// (`gyms`) et les probabilités par rareté (`pool.rarities`).
const stats = useStatsStore()
const auth = useAuthStore()

const data = computed(() => stats.data)

const num = (n: number): string => n.toLocaleString('fr-FR')
const rate = (n: number): string => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const avg = (n: number): string => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

// ─── Stats par joueur ─────────────────────────────────────────────────────────
const selectedPlayer = ref<string | undefined>(undefined)
const playerItems = computed(() => data.value?.players.map(p => ({ label: p.username, value: p.username })) ?? [])
const player = computed<StatPlayer | null>(() => data.value?.players.find(p => p.username === selectedPlayer.value) ?? null)
const isMe = computed(() => !!auth.user && player.value?.username === auth.user.username)
const playerShinyRate = computed(() => {
  const p = player.value
  return p && p.totalRolls > 0 ? (p.shinyRolls / p.totalRolls) * 100 : 0
})

const motusWinRate = computed(() => {
  const m = data.value?.motus
  return m && m.totalGames > 0 ? (m.totalWins / m.totalGames) * 100 : 0
})

const { loading, errorMsg, retry } = usePageData(async () => {
  await stats.ensureFresh()
  const me = auth.user?.username
  const list = data.value?.players ?? []
  selectedPlayer.value = me && list.some(p => p.username === me) ? me : (list[0]?.username ?? '')
})
</script>

<template>
  <div class="st">
    <header class="st__head">
      <div>
        <h1 class="st__title font-display">
          Statistiques
        </h1>
        <p class="st__lead">
          <span class="st__live" /> Données agrégées en temps réel sur tout PokéRoulette.
        </p>
      </div>
    </header>

    <div
      v-if="loading"
      class="st__load"
    >
      <USkeleton class="h-24 w-full rounded-2xl" />
      <USkeleton class="h-40 w-full rounded-2xl" />
    </div>

    <PageError
      v-else-if="errorMsg"
      :message="errorMsg"
      :pending="loading"
      @retry="retry"
    />

    <template v-else-if="data">
      <!-- Roulette -->
      <section class="block">
        <h2 class="block__title font-display">
          <UIcon
            name="i-lucide-dices"
            class="size-5"
          /> Roulette
        </h2>
        <p class="block__hint">
          Catalogue : {{ num(data.pool.totalStd) }} cartes standard · {{ num(data.pool.totalShiny) }} shiny.
        </p>
        <div class="tiles">
          <StatTile
            icon="i-lucide-dices"
            :value="num(data.roulette.totalRolls)"
            label="Lancers totaux"
            tone="poke"
          />
          <StatTile
            icon="i-lucide-sparkles"
            :value="num(data.roulette.shinyObtained)"
            label="Shiny obtenus"
            tone="shiny"
          />
          <StatTile
            icon="i-lucide-percent"
            :value="`${rate(data.roulette.shinyRate)} %`"
            label="Taux de shiny observé"
            :sub="`${num(data.roulette.shinyObtained)} sur ${num(data.roulette.totalRolls)} lancers`"
            tone="shiny"
          />
          <StatTile
            icon="i-lucide-crown"
            :value="`${rate(data.roulette.legendaryRate)} %`"
            label="Taux de légendaire observé"
            sub="Sur l'historique des tirages"
            tone="gold"
          />
        </div>
      </section>

      <!-- Jackpot -->
      <section class="block">
        <h2 class="block__title font-display">
          <UIcon
            name="i-lucide-cherry"
            class="size-5"
          /> Jackpot
        </h2>
        <div class="tiles">
          <StatTile
            icon="i-lucide-cherry"
            :value="num(data.jackpot.totalSpins)"
            label="Parties jouées"
            tone="poke"
          />
          <StatTile
            icon="i-lucide-coins"
            :value="num(data.jackpot.totalCoins)"
            label="Coins distribués"
            tone="gold"
          />
          <StatTile
            icon="i-lucide-ticket"
            :value="num(data.jackpot.totalItems)"
            label="Objets gagnés"
            sub="Charmes et tickets"
            tone="ocean"
          />
          <StatTile
            icon="i-lucide-crown"
            :value="num(data.jackpot.totalLegendaries)"
            label="Légendaires remportés"
            tone="gold"
          />
        </div>
      </section>

      <!-- Aventure -->
      <section class="block">
        <h2 class="block__title font-display">
          <UIcon
            name="i-lucide-compass"
            class="size-5"
          /> Aventure
        </h2>
        <div class="tiles">
          <StatTile
            icon="i-lucide-orbit"
            :value="num(data.spin.totalRuns)"
            label="Runs lancés"
            tone="ocean"
          />
          <StatTile
            icon="i-lucide-arrow-left-right"
            :value="num(data.spin.totalTransfers)"
            label="Transferts de légendaires"
            sub="Vers PokéRoulette"
            tone="gold"
          />
          <StatTile
            icon="i-lucide-gauge"
            :value="avg(data.spin.avgRunsForReward)"
            label="Runs par récompense"
            sub="En moyenne"
            tone="ocean"
          />
          <StatTile
            icon="i-lucide-gauge"
            :value="avg(data.spin.avgRunsForLegendary)"
            label="Runs par légendaire"
            sub="En moyenne"
            tone="gold"
          />
        </div>
      </section>

      <!-- Motus -->
      <section class="block">
        <h2 class="block__title font-display">
          <UIcon
            name="i-lucide-whole-word"
            class="size-5"
          /> Motus
        </h2>
        <div class="tiles tiles--2">
          <StatTile
            icon="i-lucide-whole-word"
            :value="num(data.motus.totalGames)"
            label="Parties jouées"
            tone="poke"
          />
          <StatTile
            icon="i-lucide-check-check"
            :value="num(data.motus.totalWins)"
            label="Mots trouvés"
            :sub="`${rate(motusWinRate)} % de réussite`"
            tone="shiny"
          />
        </div>
      </section>

      <!-- Stats par joueur -->
      <section class="block">
        <h2 class="block__title font-display">
          Statistiques par joueur
        </h2>
        <PPanel class="pl">
          <div class="pl__pick">
            <span class="pl__label">Dresseur</span>
            <USelectMenu
              v-model="selectedPlayer"
              :items="playerItems"
              value-key="value"
              icon="i-lucide-user"
              :search-input="{ placeholder: 'Rechercher un dresseur…', icon: 'i-lucide-search' }"
              placeholder="Choisir un dresseur"
              aria-label="Dresseur"
              class="pl__menu"
            />
            <span
              v-if="isMe"
              class="pl__me"
            >C'est toi !</span>
          </div>

          <div
            v-if="player"
            class="pl__grid"
          >
            <div class="mini">
              <span class="mini__v tabular">{{ num(player.totalRolls) }}</span>
              <span class="mini__l">Lancers</span>
            </div>
            <div class="mini">
              <span class="mini__v tabular">{{ num(player.shinyRolls) }}</span>
              <span class="mini__l">Shiny tirés</span>
            </div>
            <div class="mini">
              <span class="mini__v tabular">{{ num(player.legendaryRolls) }}</span>
              <span class="mini__l">Légendaires tirés</span>
            </div>
            <div class="mini">
              <span class="mini__v tabular">{{ rate(playerShinyRate) }} %</span>
              <span class="mini__l">Taux de shiny</span>
            </div>
            <div class="mini">
              <span class="mini__v tabular">{{ num(player.ownedStd) }}</span>
              <span class="mini__l">Cartes standard</span>
            </div>
            <div class="mini">
              <span class="mini__v tabular">{{ num(player.ownedShiny) }}</span>
              <span class="mini__l">Cartes shiny</span>
            </div>
            <div class="mini">
              <span class="mini__v tabular">{{ num(player.spinRuns) }}</span>
              <span class="mini__l">Runs d'aventure</span>
            </div>
            <div class="mini">
              <span class="mini__v tabular">{{ num(player.spinTransfers) }}</span>
              <span class="mini__l">Transferts</span>
            </div>
          </div>

          <!-- Duels de tournoi : qui le bat, qui il bat -->
          <div
            v-if="player && (player.nemesis || player.victim)"
            class="duels"
          >
            <div
              v-if="player.nemesis"
              class="duel duel--bad"
            >
              <span class="duel__ico">
                <UIcon
                  name="i-lucide-skull"
                  class="size-4"
                />
              </span>
              <div class="duel__body">
                <span class="duel__label">Némésis</span>
                <span class="duel__names font-display">{{ player.nemesis.opponents.join(' & ') }}</span>
                <span class="duel__count">l'a battu {{ num(player.nemesis.count) }} fois en tournoi</span>
              </div>
            </div>
            <div
              v-if="player.victim"
              class="duel duel--good"
            >
              <span class="duel__ico">
                <UIcon
                  name="i-lucide-target"
                  class="size-4"
                />
              </span>
              <div class="duel__body">
                <span class="duel__label">Souffre-douleur</span>
                <span class="duel__names font-display">{{ player.victim.opponents.join(' & ') }}</span>
                <span class="duel__count">battu {{ num(player.victim.count) }} fois en tournoi</span>
              </div>
            </div>
          </div>
        </PPanel>
      </section>

      <!-- Palmarès -->
      <section class="block">
        <h2 class="block__title font-display">
          Palmarès
        </h2>
        <p class="block__hint">
          Les records de la communauté, jeu par jeu. Survole une carte pour voir
          ce qu'elle mesure.
        </p>
        <div
          v-for="grp in data.awardGroups"
          :key="grp.key"
          class="fam"
        >
          <h3 class="fam__title font-display">
            <UIcon
              :name="grp.icon"
              class="size-4"
            /> {{ grp.label }}
          </h3>
          <div class="anecs">
            <AnecdoteCard
              v-for="a in grp.awards"
              :key="a.key"
              :icon="a.icon"
              :label="a.label"
              :name="a.names.join(' & ') || '—'"
              :detail="a.detail"
              :tone="a.tone"
              :hint="a.hint"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.st { display: flex; flex-direction: column; gap: 22px; }
.st__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.st__lead { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; font-size: .9rem; color: var(--ui-text-muted); margin: 4px 0 0; }
.st__live { width: 8px; height: 8px; border-radius: 50%; background: #5bbf82; box-shadow: 0 0 0 3px color-mix(in oklab, #5bbf82 26%, transparent); animation: pulse 2s var(--ease-glide) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
@media (prefers-reduced-motion: reduce) { .st__live { animation: none; } }
.st__load { display: flex; flex-direction: column; gap: 12px; }

.block { display: flex; flex-direction: column; gap: 12px; }
.block__title { font-weight: 700; font-size: 1.15rem; display: flex; align-items: center; gap: 8px; }
.block__title :deep(svg) { color: var(--color-poke-500); }
.block__hint { font-size: .84rem; color: var(--ui-text-muted); margin-top: -4px; }

.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tiles--2 { grid-template-columns: repeat(2, 1fr); max-width: 34rem; }
@media (max-width: 900px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 460px) { .tiles, .tiles--2 { grid-template-columns: 1fr; } }

/* Joueur */
.pl { display: flex; flex-direction: column; gap: 16px; }
.pl__pick { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pl__label { font-family: var(--font-display); font-weight: 700; font-size: .86rem; color: var(--ui-text-muted); }
.pl__menu { min-width: 220px; max-width: 100%; }
.pl__me { font-size: .72rem; font-weight: 800; color: var(--color-poke-600); background: var(--color-poke-50); padding: 4px 10px; border-radius: 999px; }

.pl__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 720px) { .pl__grid { grid-template-columns: repeat(2, 1fr); } }
.mini {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 13px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
}
.mini__v { font-family: var(--font-display); font-weight: 800; font-size: 1.2rem; color: var(--ui-text-highlighted); }
.mini__l { font-size: .72rem; font-weight: 600; color: var(--ui-text-muted); }

/* Duels de tournoi */
.duels { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (max-width: 560px) { .duels { grid-template-columns: 1fr; } }
.duel {
  --accent: var(--ui-text-muted);
  --wash: var(--ui-bg-muted);
  display: flex;
  gap: 11px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 13px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
}
.duel--bad { --accent: var(--color-poke-600); --wash: var(--color-poke-50); }
.duel--good { --accent: #3f9e66; --wash: color-mix(in oklab, #5bbf82 20%, transparent); }
.duel__ico {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 10px;
  color: var(--accent);
  background: var(--wash);
}
.duel__body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.duel__label { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--ui-text-muted); }
.duel__names { font-weight: 700; font-size: .96rem; color: var(--ui-text-highlighted); }
.duel__count { font-size: .78rem; color: var(--ui-text-muted); }

/* Palmarès */
.fam { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; }
.fam__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: .92rem;
  color: var(--ui-text-toned);
  margin: 0;
}
.fam__title :deep(svg) { color: var(--ui-text-muted); }
.anecs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 1100px) { .anecs { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .anecs { grid-template-columns: 1fr; } }
</style>
