<script setup lang="ts">
import type { LeagueLegendary, LeagueRun } from '~/types/domain'
import type { PokeType } from '~/types/api'
import { typeSlug } from '~/utils/poke'
import { useLeagueStore, LEAGUE_COINS_REWARD } from '~/stores/league'
import { useGymStore, TOTAL_GYMS } from '~/stores/gyms'
import { useBattleStore } from '~/stores/battle'

// Ligue des 4 (Elite Four) — défi ultime hebdomadaire. États : verrouillé
// (8 badges requis) / en attente (post-tournoi) / prêt (estimation + défi) /
// résultat (combat + récompense) / déjà tenté cette semaine.
const league = useLeagueStore()
const gyms = useGymStore()
const wallet = useWalletStore()
const collection = useCollectionStore()
const battle = useBattleStore()
const toast = useToast()

// Le combat de la Ligue se joue en plein écran (overlay), teinté violet, un
// « chapitre » par Maître. Réutilisable pour rejouer le dernier défi.
const LEAGUE_THEME = '#8b5cc4'
function presentRun(run: LeagueRun | null): Promise<void> {
  if (!run) return Promise.resolve()
  const wonStages = run.stages.filter(s => s.won).length
  return battle.present({
    stages: run.stages.map((s, i) => ({
      label: `Maître ${i + 1}/${run.stages.length} · ${s.opponentName}`,
      rounds: s.rounds,
      won: s.won
    })),
    won: run.won,
    themeColor: LEAGUE_THEME,
    title: 'Ligue des 4',
    winTitle: 'Ligue vaincue ! 🏆',
    winSub: `${wonStages}/${run.stages.length} Maîtres battus — choisis ta récompense.`,
    loseSub: `${wonStages}/${run.stages.length} Maîtres battus — retente la semaine prochaine.`
  })
}

const { pending: busy, run } = useAsyncAction()

const status = computed(() => league.status)
const hasBadges = computed(() => gyms.isChampion)

const phase = computed(() => {
  if (league.run) return 'result'
  if (!status.value) return 'waiting'
  if (!hasBadges.value) return 'locked'
  if (status.value.alreadyAttempted && status.value.lastRun) return 'attempted'
  if (status.value.eligible) return 'ready'
  return 'waiting'
})

function typeColor(type: string): string {
  return `var(--color-type-${typeSlug(type as PokeType)}, var(--color-ash-400))`
}
const pct = (p: number): string => `${Math.round(p)} %`

// ─── Défi ─────────────────────────────────────────────────────────────────────
const confirmOpen = ref(false)
function doChallenge() {
  return run(async () => {
    const leagueRun = await league.challenge()
    confirmOpen.value = false
    await presentRun(leagueRun)
  })
}

// ─── Récompense : pièces ──────────────────────────────────────────────────────
function claimCoins() {
  return run(async () => {
    await league.claimCoins()
    await refreshBalance()
    toast.add({ title: `+${LEAGUE_COINS_REWARD} pièces empochées !`, color: 'success', icon: 'i-lucide-coins' })
  })
}

// ─── Récompense : légendaire ──────────────────────────────────────────────────
const legendaryOpen = ref(false)
const picked = ref<LeagueLegendary | null>(null)
const odds = ref<{ captureProbability: number, challengers: string[] } | null>(null)
const oddsLoading = ref(false)

async function openLegendary(l: LeagueLegendary) {
  picked.value = l
  odds.value = null
  legendaryOpen.value = true
  oddsLoading.value = true
  try {
    odds.value = await league.legendaryOdds(l.id)
  } catch {
    odds.value = null
  } finally {
    oddsLoading.value = false
  }
}
function captureLegendary() {
  const target = picked.value
  if (!target) return
  return run(async () => {
    const res = await league.captureLegendary(target.id)
    legendaryOpen.value = false
    refreshCollection()
    if (res?.won) toast.add({ title: `${res.card.name} capturé ! 🎉`, color: 'success', icon: 'i-lucide-sparkles' })
    else toast.add({ title: 'Le légendaire s\'est échappé…', color: 'warning' })
  })
}

function refreshCollection() {
  collection.invalidate()
  collection.ensureFresh(true).catch(() => {})
}
async function refreshBalance() {
  try {
    const { user } = await useApi()<{ user: { coins: number } }>('/auth/me')
    if (user) wallet.reconcile(user.coins, 'league')
  } catch {
    // silencieux
  }
}

const { loading, errorMsg } = usePageData(async () => {
  await Promise.all([league.ensureFresh(), gyms.ensureFresh().catch(() => {})])
  if (phase.value === 'ready') league.loadEstimate().catch(() => {})
})
</script>

<template>
  <div class="lg">
    <header class="lg__head">
      <h1 class="lg__title font-display">
        Ligue des 4
      </h1>
      <p class="lg__lead">
        Le défi ultime : enchaîne les 4 Maîtres, une seule tentative par semaine.
      </p>
    </header>

    <div
      v-if="loading"
      class="lg__load"
    >
      <USkeleton class="h-40 w-full rounded-2xl" />
      <USkeleton class="h-24 w-full rounded-2xl" />
    </div>

    <UAlert
      v-else-if="errorMsg"
      color="error"
      variant="soft"
      :title="errorMsg"
    />

    <template v-else>
      <!-- ═══ Résultat du défi ═══ -->
      <template v-if="phase === 'result' && league.run">
        <PPanel>
          <LeagueBattle :run="league.run" />
          <button
            class="replay"
            @click="presentRun(league.run)"
          >
            <UIcon
              name="i-lucide-play"
              class="size-4"
            /> Revoir le combat
          </button>
        </PPanel>

        <!-- Choix de récompense -->
        <PPanel
          v-if="league.run.won && !league.rewardTaken"
          class="reward"
        >
          <h2 class="reward__title font-display">
            Choisis ta récompense
          </h2>
          <button
            class="rcoins"
            :disabled="busy"
            @click="claimCoins"
          >
            <span class="rcoins__ico">
              <UIcon
                name="i-lucide-coins"
                class="size-6"
              />
            </span>
            <span class="rcoins__body">
              <b>+{{ LEAGUE_COINS_REWARD }} pièces</b>
              <span>La valeur sûre, créditée aussitôt.</span>
            </span>
          </button>
          <div class="rleg">
            <p class="rleg__q font-display">
              … ou tente de capturer un légendaire
            </p>
            <LegendaryStrip
              :legendaries="status?.legendaries ?? []"
              pickable
              :busy="busy"
              @pick="openLegendary"
            />
          </div>
        </PPanel>

        <!-- Récompense prise -->
        <PPanel
          v-else-if="league.rewardTaken"
          class="rdone"
        >
          <template v-if="league.legendaryResult">
            <span
              class="rdone__frame"
              :class="league.legendaryResult.won ? 'rdone__frame--win' : 'rdone__frame--miss'"
            >
              <img
                :src="league.legendaryResult.card.imageUrl"
                :alt="league.legendaryResult.card.name"
              >
            </span>
            <p class="rdone__title font-display">
              {{ league.legendaryResult.won ? `${league.legendaryResult.card.name} capturé ! 🎉` : 'Envolé…' }}
            </p>
            <p class="rdone__sub">
              {{ league.legendaryResult.won
                ? 'Le légendaire rejoint ta collection.'
                : 'Le légendaire s\'est échappé. Reviens la semaine prochaine.' }}
            </p>
          </template>
          <template v-else>
            <span class="rdone__coins">
              <UIcon
                name="i-lucide-coins"
                class="size-8"
              />
            </span>
            <p class="rdone__title font-display">
              +{{ LEAGUE_COINS_REWARD }} pièces
            </p>
            <p class="rdone__sub">
              Récompense créditée. À la semaine prochaine !
            </p>
          </template>
        </PPanel>
      </template>

      <!-- ═══ Prêt à défier (éligible) ═══ -->
      <template v-else-if="phase === 'ready'">
        <PPanel
          v-if="league.estimate"
          class="est"
        >
          <div class="est__overall">
            <div class="est__gauge">
              <span
                class="est__pct font-display tabular"
                :style="{ color: probColor(league.estimate.overallWinProbability) }"
              >{{ pct(league.estimate.overallWinProbability) }}</span>
              <span class="est__pctlbl">de vaincre la Ligue</span>
            </div>
            <div
              v-if="league.estimate.toPrivilege.length || league.estimate.toAvoid.length"
              class="est__reco"
            >
              <div
                v-if="league.estimate.toPrivilege.length"
                class="reco"
              >
                <span class="reco__lbl reco__lbl--go">Privilégie</span>
                <span class="reco__chips">
                  <span
                    v-for="t in league.estimate.toPrivilege"
                    :key="t"
                    class="tchip"
                    :style="{ '--tc': typeColor(t) }"
                  >{{ t }}</span>
                </span>
              </div>
              <div
                v-if="league.estimate.toAvoid.length"
                class="reco"
              >
                <span class="reco__lbl reco__lbl--no">Évite</span>
                <span class="reco__chips">
                  <span
                    v-for="t in league.estimate.toAvoid"
                    :key="t"
                    class="tchip tchip--muted"
                    :style="{ '--tc': typeColor(t) }"
                  >{{ t }}</span>
                </span>
              </div>
            </div>
          </div>

          <ol class="stages">
            <li
              v-for="(s, i) in league.estimate.stages"
              :key="i"
              class="est-stage"
            >
              <span class="est-stage__no">{{ i + 1 }}</span>
              <div class="est-stage__id">
                <span class="est-stage__name">{{ s.opponentName }}</span>
                <span
                  class="est-stage__type"
                  :class="`est-stage__type--${s.opponentType}`"
                >{{ s.opponentType === 'npc' ? 'Maître' : 'Dresseur' }}</span>
              </div>
              <div class="est-stage__bar">
                <i :style="{ width: Math.min(100, s.winProbability) + '%', background: probColor(s.winProbability) }" />
              </div>
              <span
                class="est-stage__pct tabular"
                :style="{ color: probColor(s.winProbability) }"
              >{{ pct(s.winProbability) }}</span>
            </li>
          </ol>
        </PPanel>
        <PPanel
          v-else
          class="est est--empty"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin"
          />
          <span>Analyse des Maîtres…</span>
        </PPanel>

        <section class="stake">
          <h2 class="stake__title font-display">
            À la clé
          </h2>
          <p class="stake__hint">
            <b>{{ LEAGUE_COINS_REWARD }} pièces</b> ou la capture de l'un de ces légendaires.
          </p>
          <LegendaryStrip :legendaries="status?.legendaries ?? []" />
        </section>

        <div class="cta">
          <PButton
            color="primary"
            size="lg"
            :disabled="busy"
            @click="confirmOpen = true"
          >
            <UIcon
              name="i-lucide-swords"
              class="size-5"
            /> Défier la Ligue
          </PButton>
          <span class="cta__note">1 tentative par semaine</span>
        </div>
      </template>

      <!-- ═══ Déjà tenté cette semaine ═══ -->
      <template v-else-if="phase === 'attempted' && status?.lastRun">
        <PPanel>
          <p class="recap__cap">
            Ton défi de la semaine
          </p>
          <LeagueBattle :run="status.lastRun" />
          <button
            class="replay"
            @click="presentRun(status?.lastRun ?? null)"
          >
            <UIcon
              name="i-lucide-play"
              class="size-4"
            /> Revoir le combat
          </button>
        </PPanel>
        <p class="nextweek">
          <UIcon
            name="i-lucide-calendar-clock"
            class="size-4"
          />
          Prochaine tentative la semaine prochaine.
        </p>
      </template>

      <!-- ═══ Verrouillé : 8 badges requis ═══ -->
      <template v-else-if="phase === 'locked'">
        <PPanel class="hero">
          <span class="hero__ico">
            <UIcon
              name="i-lucide-lock"
              class="size-8"
            />
          </span>
          <h2 class="hero__title font-display">
            Réservée aux Champions
          </h2>
          <p class="hero__text">
            La Ligue des 4 s'ouvre aux dresseurs ayant décroché les <b>8 badges d'arène</b>.
          </p>
          <div class="hero__gauge">
            <div class="hero__bar">
              <i :style="{ width: (gyms.badgeCount / TOTAL_GYMS) * 100 + '%' }" />
            </div>
            <span class="hero__count tabular">{{ gyms.badgeCount }}/{{ TOTAL_GYMS }} badges</span>
          </div>
          <NuxtLink
            to="/gyms"
            class="hero__cta"
          >
            <UIcon
              name="i-lucide-swords"
              class="size-4"
            /> Continuer les arènes
          </NuxtLink>
        </PPanel>

        <section class="stake">
          <h2 class="stake__title font-display">
            Ce qui t'attend
          </h2>
          <LegendaryStrip :legendaries="status?.legendaries ?? []" />
        </section>
      </template>

      <!-- ═══ En attente (post-tournoi) ═══ -->
      <template v-else>
        <PPanel class="hero">
          <span class="hero__ico hero__ico--wait">
            <UIcon
              name="i-lucide-hourglass"
              class="size-8"
            />
          </span>
          <h2 class="hero__title font-display">
            La Ligue rouvre bientôt
          </h2>
          <p class="hero__text">
            Ce défi s'ouvrira après le résultat du prochain tournoi. Prépare ton équipe, ce sera corsé !
          </p>
          <NuxtLink
            to="/tournament"
            class="hero__cta hero__cta--soft"
          >
            <UIcon
              name="i-lucide-trophy"
              class="size-4"
            /> Voir le tournoi
          </NuxtLink>
        </PPanel>

        <section class="stake">
          <h2 class="stake__title font-display">
            Ce qui t'attend
          </h2>
          <LegendaryStrip :legendaries="status?.legendaries ?? []" />
        </section>
      </template>
    </template>

    <!-- Confirmation du défi -->
    <UModal
      v-model:open="confirmOpen"
      title="Défier la Ligue des 4 ?"
    >
      <template #body>
        <p class="confirm">
          Tu affrontes les 4 Maîtres d'affilée. <b>Une seule tentative par semaine</b> — assure-toi que ton équipe est prête.
        </p>
      </template>
      <template #footer>
        <div class="confirm__actions">
          <PButton
            color="neutral"
            :disabled="busy"
            @click="confirmOpen = false"
          >
            Annuler
          </PButton>
          <PButton
            color="primary"
            :loading="busy"
            @click="doChallenge"
          >
            En avant !
          </PButton>
        </div>
      </template>
    </UModal>

    <!-- Capture d'un légendaire -->
    <UModal
      v-model:open="legendaryOpen"
      :title="`Capturer ${picked?.name ?? ''}`"
    >
      <template #body>
        <div
          v-if="picked"
          class="cap"
        >
          <span class="cap__frame">
            <img
              :src="picked.imageUrl"
              :alt="picked.name"
            >
          </span>
          <div
            v-if="oddsLoading"
            class="cap__load"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin"
            />
          </div>
          <template v-else-if="odds">
            <p
              class="cap__prob font-display tabular"
              :style="{ color: probColor(odds.captureProbability) }"
            >
              {{ pct(odds.captureProbability) }}
            </p>
            <p class="cap__problbl">
              de chances de capture
            </p>
            <p
              v-if="odds.challengers.length"
              class="cap__rivals"
            >
              En concurrence avec <b>{{ odds.challengers.join(', ') }}</b>.
            </p>
          </template>
          <p
            v-else
            class="cap__problbl"
          >
            Tente ta chance sur ce légendaire.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="confirm__actions">
          <PButton
            color="neutral"
            :disabled="busy"
            @click="legendaryOpen = false"
          >
            Annuler
          </PButton>
          <PButton
            color="primary"
            :loading="busy"
            @click="captureLegendary"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="size-4"
            /> Tenter la capture
          </PButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.lg { display: flex; flex-direction: column; gap: 16px; }
.lg__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.lg__lead { font-weight: 600; font-size: .9rem; color: var(--ui-text-muted); margin: 4px 0 0; }
.lg__load { display: flex; flex-direction: column; gap: 12px; }

/* Héros verrouillé / attente */
.hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 28px 22px; }
.hero__ico {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(150deg, #b57ee0, #8b5cc4);
  box-shadow: 0 8px 20px -8px rgba(139, 92, 196, .6);
}
.hero__ico--wait { background: linear-gradient(150deg, #f0b95e, #d99a1c); box-shadow: 0 8px 20px -8px rgba(217, 154, 28, .55); }
.hero__title { font-weight: 700; font-size: 1.3rem; color: var(--ui-text-highlighted); }
.hero__text { font-size: .92rem; color: var(--ui-text-muted); max-width: 32rem; }
.hero__text b { color: var(--ui-text-highlighted); }
.hero__gauge { display: flex; align-items: center; gap: 12px; width: min(100%, 24rem); margin-top: 4px; }
.hero__bar { flex: 1; height: 10px; border-radius: 99px; background: var(--ui-bg-accented); overflow: hidden; }
.hero__bar > i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #b58ae0, #8b5cc4); transition: width .6s var(--ease-glide); }
.hero__count { font-size: .82rem; font-weight: 800; color: var(--ui-text-muted); flex: none; }
.hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .9rem;
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  padding: 10px 18px;
  border-radius: 13px;
  box-shadow: 0 3px 0 var(--color-poke-700);
}
.hero__cta--soft { background: linear-gradient(150deg, #f0b95e, #d99a1c); box-shadow: 0 3px 0 #a9781a; }

/* À la clé */
.stake { display: flex; flex-direction: column; gap: 10px; }
.stake__title { font-weight: 700; font-size: 1.1rem; }
.stake__hint { font-size: .86rem; color: var(--ui-text-muted); margin-top: -4px; }
.stake__hint b { color: var(--ui-text-highlighted); }

/* Estimation */
.est { display: flex; flex-direction: column; gap: 16px; }
.est--empty { flex-direction: row; align-items: center; justify-content: center; gap: 10px; color: var(--ui-text-muted); padding: 30px; }
.est__overall { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.est__gauge { display: flex; flex-direction: column; align-items: center; flex: none; }
.est__pct { font-weight: 800; font-size: 2.6rem; line-height: 1; }
.est__pctlbl { font-size: .78rem; font-weight: 600; color: var(--ui-text-muted); }
.est__reco { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; }
.reco { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.reco__lbl { font-family: var(--font-display); font-weight: 700; font-size: .78rem; flex: none; }
.reco__lbl--go { color: #3f9e66; }
.reco__lbl--no { color: var(--color-poke-600); }
.reco__chips { display: flex; flex-wrap: wrap; gap: 5px; }
.tchip {
  font-size: .72rem;
  font-weight: 800;
  color: #fff;
  background: var(--tc);
  padding: 3px 10px;
  border-radius: 999px;
}
.tchip--muted { opacity: .55; text-decoration: line-through; }

.stages { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.est-stage { display: flex; align-items: center; gap: 10px; }
.est-stage__no {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: .76rem;
  color: #fff;
  background: linear-gradient(150deg, #b57ee0, #8b5cc4);
}
.est-stage__id { flex: none; width: 128px; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.est-stage__name { font-weight: 700; font-size: .84rem; color: var(--ui-text-highlighted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.est-stage__type { font-size: .6rem; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; }
.est-stage__type--npc { color: #b58a2e; }
.est-stage__type--player { color: #4e8fd0; }
.est-stage__bar { flex: 1; height: 8px; border-radius: 99px; background: var(--ui-bg-accented); overflow: hidden; }
.est-stage__bar > i { display: block; height: 100%; border-radius: 99px; transition: width .6s var(--ease-glide); }
.est-stage__pct { flex: none; width: 42px; text-align: right; font-weight: 800; font-size: .82rem; }

/* CTA défi */
.cta { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 4px 0 8px; }
.cta__note { font-size: .76rem; color: var(--ui-text-dimmed); font-weight: 600; }

/* Rejouer le combat en plein écran */
.replay {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: center;
  margin-top: 14px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .84rem;
  color: #8b5cc4;
  background: color-mix(in oklab, #8b5cc4 12%, transparent);
  padding: 8px 16px;
  border-radius: 12px;
  transition: transform .14s var(--ease-pop), background-color .14s ease;
}
.replay:hover { transform: translateY(-2px); background: color-mix(in oklab, #8b5cc4 18%, transparent); }
.replay:active { transform: translateY(1px); }

/* Recap déjà tenté */
.recap__cap { font-family: var(--font-display); font-weight: 700; font-size: .9rem; color: var(--ui-text-muted); margin-bottom: 10px; }
.nextweek { display: flex; align-items: center; justify-content: center; gap: 7px; font-size: .84rem; font-weight: 600; color: var(--ui-text-muted); }

/* Récompense */
.reward { display: flex; flex-direction: column; gap: 14px; }
.reward__title { font-weight: 700; font-size: 1.15rem; }
.rcoins {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid color-mix(in oklab, #f6c453 45%, var(--ui-border));
  background: color-mix(in oklab, #f6c453 10%, var(--ui-bg-elevated));
  text-align: left;
  transition: transform .15s var(--ease-pop);
}
.rcoins:hover:not(:disabled) { transform: translateY(-2px); }
.rcoins:disabled { opacity: .5; cursor: default; }
.rcoins__ico { display: grid; place-items: center; width: 42px; height: 42px; flex: none; border-radius: 12px; color: #b7791f; background: color-mix(in oklab, #f6c453 30%, transparent); }
.rcoins__body { display: flex; flex-direction: column; gap: 1px; }
.rcoins__body b { font-family: var(--font-display); font-weight: 800; font-size: 1.05rem; color: var(--ui-text-highlighted); }
.rcoins__body span { font-size: .8rem; color: var(--ui-text-muted); }
.rleg { display: flex; flex-direction: column; gap: 10px; }
.rleg__q { font-weight: 700; font-size: .92rem; color: var(--ui-text-muted); }

/* Récompense prise */
.rdone { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 24px; }
.rdone__frame {
  width: 96px;
  height: 96px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, color-mix(in oklab, #f6c453 24%, #fff), color-mix(in oklab, #f6c453 8%, #fff));
}
.rdone__frame--win { box-shadow: 0 0 0 3px #e0a92e, 0 8px 20px -8px rgba(224, 169, 46, .6); }
.rdone__frame--miss { filter: grayscale(.7) opacity(.7); box-shadow: 0 0 0 3px var(--ui-border-accented); }
.rdone__frame img { width: 88%; height: 88%; object-fit: contain; }
.rdone__coins { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 20px; color: #b7791f; background: color-mix(in oklab, #f6c453 26%, transparent); }
.rdone__title { font-weight: 700; font-size: 1.3rem; color: var(--ui-text-highlighted); }
.rdone__sub { font-size: .86rem; color: var(--ui-text-muted); }

/* Modales */
.confirm { font-size: .9rem; color: var(--ui-text-toned); line-height: 1.5; }
.confirm b { color: var(--ui-text-highlighted); }
.confirm__actions { display: flex; justify-content: flex-end; gap: 8px; }
.cap { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
.cap__frame {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  margin-bottom: 6px;
  background: radial-gradient(circle at 50% 30%, color-mix(in oklab, #f6c453 24%, #fff), color-mix(in oklab, #f6c453 8%, #fff));
  box-shadow: 0 0 0 3px #e0a92e;
}
.cap__frame img { width: 88%; height: 88%; object-fit: contain; }
.cap__load { padding: 16px; color: var(--color-poke-500); }
.cap__prob { font-weight: 800; font-size: 2rem; line-height: 1; }
.cap__problbl { font-size: .8rem; font-weight: 600; color: var(--ui-text-muted); }
.cap__rivals { font-size: .82rem; color: var(--ui-text-muted); margin-top: 6px; }
.cap__rivals b { color: var(--ui-text-highlighted); }
</style>
