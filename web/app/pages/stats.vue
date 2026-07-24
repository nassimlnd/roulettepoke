<script setup lang="ts">
import type { PokeType } from '~/types/api'
import type { StatPlayer, OddsKey } from '~/types/domain'
import { typeSlug } from '~/utils/poke'
import { useStatsStore } from '~/stores/stats'

// Page Statistiques — un seul payload agrégé (GET /stats) : stats globales, spin,
// popularité des badges, stats par joueur, probabilités par rareté, anecdotes.
const stats = useStatsStore()
const auth = useAuthStore()

const data = computed(() => stats.data)

type Tone = 'good' | 'bad' | 'gold' | 'neutral'

function typeColor(type: PokeType): string {
  return `var(--color-type-${typeSlug(type)}, var(--color-ash-400))`
}
const num = (n: number): string => n.toLocaleString('fr-FR')
const rate = (n: number): string => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function pct(p: number): string {
  return (p * 100).toLocaleString('fr-FR', { maximumFractionDigits: p < 0.001 ? 3 : 2, minimumFractionDigits: 2 })
}

// ─── Progression des arènes ───────────────────────────────────────────────────
const maxHolders = computed(() => Math.max(1, ...(data.value?.gyms.map(g => g.holders) ?? [1])))

// ─── Stats par joueur ─────────────────────────────────────────────────────────
const selectedPlayer = ref<string | undefined>(undefined)
const playerItems = computed(() => data.value?.players.map(p => ({ label: p.username, value: p.username })) ?? [])
const player = computed<StatPlayer | null>(() => data.value?.players.find(p => p.username === selectedPlayer.value) ?? null)
const isMe = computed(() => !!auth.user && player.value?.username === auth.user.username)
const playerShinyRate = computed(() => {
  const p = player.value
  return p && p.totalRolls > 0 ? (p.shinyRolls / p.totalRolls) * 100 : 0
})

// ─── Probabilités : calculateur « carte spécifique » ──────────────────────────
const selectedRarity = ref<OddsKey | undefined>(undefined)
const rarityItems = computed(() => data.value?.odds.map(o => ({ label: o.label, value: o.key })) ?? [])
const calc = computed(() => {
  const o = data.value?.odds.find(x => x.key === selectedRarity.value)
  if (!o || o.count === 0 || o.probability === 0) return null
  return { per: o.probability / o.count, oneIn: Math.round(o.count / o.probability), label: o.label, color: o.color }
})

// ─── Anecdotes ────────────────────────────────────────────────────────────────
const join = (names: string[]): string => names.join(' & ') || '—'
const plural = (n: number): string => (n > 1 ? 's' : '')
const anecdotes = computed<{ icon: string, label: string, name: string, detail: string, tone: Tone }[]>(() => {
  const a = data.value?.anecdotes
  if (!a) return []
  return [
    { icon: 'i-lucide-copy', label: 'Plus de doublons shiny', name: join(a.mostShinyDupes.names), detail: `${num(a.mostShinyDupes.dupes)} doublons · ${num(a.mostShinyDupes.shinyTotal)} shiny tirés`, tone: 'neutral' },
    { icon: 'i-lucide-cloud-rain', label: 'Dresseur le plus malchanceux', name: join(a.unluckiest.names), detail: `${num(a.unluckiest.lossHigh)} duels perdus avec ≥ 75 % de chances de gagner`, tone: 'bad' },
    { icon: 'i-lucide-clover', label: 'Dresseur le plus chanceux', name: join(a.luckiest.names), detail: `${num(a.luckiest.winLow)} duels gagnés avec ≤ 25 % de chances de gagner`, tone: 'good' },
    { icon: 'i-lucide-crown', label: 'Carte la plus possédée', name: a.mostOwnedCards[0]?.name ?? '—', detail: `${num(a.mostOwnedCards[0]?.totalQty ?? 0)} copies cumulées, toutes collections confondues`, tone: 'gold' },
    { icon: 'i-lucide-gem', label: 'Carte la moins possédée', name: a.leastOwnedCards.map(c => c.name).join(' & ') || '—', detail: `${num(a.leastOwnedCards[0]?.totalQty ?? 0)} copies au total · hors shiny et légendaire`, tone: 'neutral' },
    { icon: 'i-lucide-clover', label: 'Spineur chanceux', name: join(a.spinLucky.names), detail: `${num(a.spinLucky.attempts)} tentatives pour ${num(a.spinLucky.transfers)} transfert${plural(a.spinLucky.transfers)}`, tone: 'good' },
    { icon: 'i-lucide-cloud-rain', label: 'Spineur malchanceux', name: join(a.spinUnlucky.names), detail: `${num(a.spinUnlucky.attempts)} tentatives pour ${num(a.spinUnlucky.transfers)} transfert${plural(a.spinUnlucky.transfers)}`, tone: 'bad' },
    { icon: 'i-lucide-dumbbell', label: 'Spineur déterminé', name: join(a.spinDetermined.names), detail: `${num(a.spinDetermined.attempts)} tentatives pour ${num(a.spinDetermined.transfers)} transfert${plural(a.spinDetermined.transfers)}`, tone: 'gold' }
  ]
})

const { loading, errorMsg } = usePageData(async () => {
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

    <UAlert
      v-else-if="errorMsg"
      color="error"
      variant="soft"
      :title="errorMsg"
    />

    <template v-else-if="data">
      <!-- Stats globales -->
      <section class="block">
        <h2 class="block__title font-display">
          Vue d'ensemble
        </h2>
        <div class="tiles">
          <StatTile
            icon="i-lucide-dices"
            :value="num(data.global.totalRolls)"
            label="Lancers totaux"
            tone="poke"
          />
          <StatTile
            icon="i-lucide-sparkles"
            :value="num(data.global.shinyObtained)"
            label="Shiny obtenus"
            tone="shiny"
          />
          <StatTile
            icon="i-lucide-percent"
            :value="`${rate(data.global.shinyRate)} %`"
            label="Taux de shiny observé"
            :sub="`${num(data.global.shinyObtained)} sur ${num(data.global.totalRolls)} lancers`"
            tone="shiny"
          />
          <StatTile
            icon="i-lucide-crown"
            :value="`${rate(data.global.legendaryRate)} %`"
            label="Taux de légendaire observé"
            sub="Sur l'historique des tirages"
            tone="gold"
          />
        </div>
      </section>

      <!-- Spin -->
      <section class="block">
        <h2 class="block__title font-display">
          <UIcon
            name="i-lucide-orbit"
            class="size-5"
          /> Spin — l'aventure
        </h2>
        <div class="tiles tiles--2">
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
        </div>
      </section>

      <!-- Progression des arènes -->
      <section class="block">
        <h2 class="block__title font-display">
          Progression des arènes
        </h2>
        <p class="block__hint">
          Nombre de dresseurs ayant décroché chaque badge.
        </p>
        <PPanel class="gyms">
          <div
            v-for="g in data.gyms"
            :key="g.name"
            class="gym"
            :style="{ '--tc': typeColor(g.type) }"
          >
            <img
              :src="g.badgeImageUrl"
              :alt="g.badgeName"
              class="gym__badge"
              loading="lazy"
            >
            <div class="gym__main">
              <div class="gym__top">
                <span class="gym__name">{{ g.name }}</span>
                <span class="gym__type">{{ g.type }}</span>
              </div>
              <div class="gym__bar">
                <i :style="{ width: (g.holders / maxHolders) * 100 + '%' }" />
              </div>
            </div>
            <div class="gym__count">
              <span class="gym__num tabular">{{ num(g.holders) }}</span>
              <span class="gym__lbl">dresseurs</span>
            </div>
          </div>
        </PPanel>
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
              <span class="mini__l">Runs de spin</span>
            </div>
            <div class="mini">
              <span class="mini__v tabular">{{ num(player.spinTransfers) }}</span>
              <span class="mini__l">Transferts</span>
            </div>
          </div>
        </PPanel>
      </section>

      <!-- Probabilités -->
      <section class="block">
        <h2 class="block__title font-display">
          Probabilités de tirage
        </h2>
        <p class="block__hint">
          Chances d'obtenir chaque rareté sur un tirage de base (pool complet, sans filtre).
        </p>
        <PPanel class="odds">
          <div
            v-for="o in data.odds"
            :key="o.key"
            class="odd"
            :style="{ '--oc': o.color }"
          >
            <span class="odd__label">
              <i class="odd__dot" />
              {{ o.label }}
            </span>
            <div class="odd__bar">
              <i :style="{ width: Math.max(o.probability * 100, 0.6) + '%' }" />
            </div>
            <span class="odd__pct tabular">{{ pct(o.probability) }} %</span>
          </div>

          <div class="calc">
            <div class="calc__pick">
              <span class="calc__q">Une carte précise ?</span>
              <USelectMenu
                v-model="selectedRarity"
                :items="rarityItems"
                value-key="value"
                :search-input="false"
                placeholder="Choisir une rareté…"
                aria-label="Rareté de la carte recherchée"
                class="calc__menu"
              />
            </div>
            <div
              v-if="calc"
              class="calc__out"
              :style="{ '--oc': calc.color }"
            >
              <span class="calc__pct tabular">≈ {{ pct(calc.per) }} %</span>
              <span class="calc__one tabular">1 chance sur {{ num(calc.oneIn) }}</span>
            </div>
            <p
              v-else
              class="calc__hint"
            >
              Choisis une rareté pour connaître la probabilité d'obtenir une carte donnée.
            </p>
          </div>
        </PPanel>
      </section>

      <!-- Anecdotes -->
      <section class="block">
        <h2 class="block__title font-display">
          Anecdotes
        </h2>
        <div class="anecs">
          <AnecdoteCard
            v-for="(a, i) in anecdotes"
            :key="i"
            :icon="a.icon"
            :label="a.label"
            :name="a.name"
            :detail="a.detail"
            :tone="a.tone"
          />
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

/* Arènes */
.gyms { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; }
.gym { display: flex; align-items: center; gap: 14px; padding: 9px 0; }
.gym + .gym { border-top: 1px solid var(--ui-border); }
.gym__badge { width: 34px; height: 34px; object-fit: contain; flex: none; }
.gym__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.gym__top { display: flex; align-items: center; gap: 8px; }
.gym__name { font-family: var(--font-display); font-weight: 700; font-size: .92rem; color: var(--ui-text-highlighted); }
.gym__type {
  font-size: .64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
  color: #fff;
  background: var(--tc);
  padding: 2px 8px;
  border-radius: 999px;
}
.gym__bar { height: 7px; border-radius: 99px; background: var(--ui-bg-accented); overflow: hidden; }
.gym__bar > i { display: block; height: 100%; border-radius: 99px; background: var(--tc); transition: width .6s var(--ease-glide); }
.gym__count { display: flex; flex-direction: column; align-items: flex-end; flex: none; width: 66px; }
.gym__num { font-family: var(--font-display); font-weight: 800; font-size: 1.05rem; color: var(--ui-text-highlighted); }
.gym__lbl { font-size: .64rem; color: var(--ui-text-dimmed); text-transform: uppercase; letter-spacing: .03em; }

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

/* Probabilités */
.odds { display: flex; flex-direction: column; gap: 12px; }
.odd { display: grid; grid-template-columns: 108px 1fr 62px; align-items: center; gap: 12px; }
.odd__label { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; font-size: .84rem; color: var(--ui-text-toned); }
.odd__dot { width: 9px; height: 9px; border-radius: 50%; background: var(--oc); flex: none; }
.odd__bar { height: 9px; border-radius: 99px; background: var(--ui-bg-accented); overflow: hidden; }
.odd__bar > i { display: block; height: 100%; border-radius: 99px; background: var(--oc); transition: width .7s var(--ease-glide); }
.odd__pct { font-weight: 800; font-size: .82rem; color: var(--ui-text-highlighted); text-align: right; }

.calc { margin-top: 6px; padding-top: 16px; border-top: 1px dashed var(--ui-border-accented); display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.calc__pick { display: flex; flex-direction: column; gap: 6px; }
.calc__q { font-family: var(--font-display); font-weight: 700; font-size: .84rem; color: var(--ui-text-muted); }
.calc__menu { min-width: 200px; max-width: 100%; align-self: flex-start; }
.calc__out {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 16px;
  border-radius: 12px;
  background: color-mix(in oklab, var(--oc) 12%, transparent);
  border: 1px solid color-mix(in oklab, var(--oc) 40%, transparent);
}
.calc__pct { font-family: var(--font-display); font-weight: 800; font-size: 1.15rem; color: var(--ui-text-highlighted); }
.calc__one { font-size: .76rem; font-weight: 700; color: var(--ui-text-muted); }
.calc__hint { font-size: .82rem; color: var(--ui-text-dimmed); flex: 1; min-width: 160px; }

/* Anecdotes */
.anecs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 900px) { .anecs { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .anecs { grid-template-columns: 1fr; } }
</style>
