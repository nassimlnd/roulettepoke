<script setup lang="ts">
import type { SpinResult, LineReward } from '~/types/domain'
import type { SlotSymbol } from '~/types/api'
import { useSlotStore } from '~/stores/slot'
import { BET_TIERS, SLOT_ODDS, chanceOverLines } from '~/utils/slot'
import type { BetTier } from '~/utils/slot'

// Page Jackpot (machine à sous) — 1 partie/jour, 3 mises (1 ligne gratuite,
// 3 lignes 5 🪙, 3+diagonales 10 🪙). Barème dynamique + feed des gros lots.
const slot = useSlotStore()
const wallet = useWalletStore()
const toast = useToast()

const machine = ref<{ spin: (cells: Record<string, SlotSymbol>, lines: string[]) => Promise<void> } | null>(null)
const bet = ref<BetTier>(BET_TIERS[0]!)
const spinning = ref(false)
const lastResult = ref<SpinResult | null>(null)
const loading = ref(true)

const linesCount = computed(() => bet.value.lines.length)
const canAfford = computed(() => wallet.canAfford(bet.value.cost))
const wins = computed(() => lastResult.value?.lines.filter(l => l.type !== 'nothing') ?? [])
const legendary = computed(() => wins.value.find(l => l.type === 'legendary'))

function pct(p: number): string {
  const v = p * 100
  return v >= 10 ? v.toFixed(0) : v.toFixed(1)
}
function rewardLabel(l: LineReward): string {
  switch (l.type) {
    case 'coins': return `+${l.amount} pièces`
    case 'charme': return 'Charme Chroma'
    case 'biome_ticket': return `Ticket Biome — ${l.biome}`
    case 'type_ticket': return `Ticket Type — ${l.typeName}`
    case 'legendary': return `Légendaire — ${l.card.name}`
    default: return ''
  }
}
function rewardShort(l: LineReward): string {
  switch (l.type) {
    case 'coins': return `+${l.amount}`
    case 'charme': return 'Charme'
    case 'biome_ticket': return 'Biome'
    case 'type_ticket': return 'Type'
    case 'legendary': return 'Légend.'
    default: return ''
  }
}
function symOf(l: LineReward): SlotSymbol {
  return l.type === 'nothing' ? 'coins' : l.type
}
async function doSpin() {
  if (spinning.value || !slot.canSpin || !machine.value) return
  if (!canAfford.value) {
    toast.add({ title: `Il te manque des pièces pour cette mise (${bet.value.cost} 🪙).`, color: 'error' })
    return
  }
  spinning.value = true
  lastResult.value = null
  try {
    const res = await slot.spin(bet.value.mode)
    const winningLines = res.lines.filter(l => l.type !== 'nothing').map(l => l.line)
    await machine.value.spin(res.cells, winningLines)
    lastResult.value = res
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    spinning.value = false
  }
}

onMounted(async () => {
  try {
    await slot.ensureFresh()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="jp">
    <header class="jp__head">
      <div>
        <h1 class="jp__title font-display">
          Jackpot
        </h1>
        <p class="jp__lead">
          Une partie par jour. Aligne 3 symboles sur une ligne active pour gagner.
        </p>
      </div>
      <CoinBalance />
    </header>

    <div class="jp__grid">
      <!-- Machine -->
      <div class="jp__main">
        <!-- Mise -->
        <div
          class="bets"
          role="radiogroup"
          aria-label="Mise"
        >
          <button
            v-for="t in BET_TIERS"
            :key="t.mode"
            class="bet"
            :class="{ 'bet--on': bet.mode === t.mode }"
            role="radio"
            :aria-checked="bet.mode === t.mode"
            :disabled="spinning"
            @click="bet = t"
          >
            <span class="bet__label">{{ t.label }}</span>
            <span class="bet__cost">{{ t.cost === 0 ? 'Gratuit' : `${t.cost} 🪙` }}</span>
          </button>
        </div>

        <SlotMachine ref="machine" />

        <!-- Action -->
        <div class="jp__action">
          <PButton
            v-if="slot.canSpin || spinning"
            :loading="spinning"
            :disabled="spinning || !canAfford"
            @click="doSpin"
          >
            <UIcon
              name="i-lucide-cherry"
              class="size-5"
            />
            {{ spinning ? 'Ça tourne…' : (bet.cost === 0 ? 'Lancer (gratuit)' : `Lancer — ${bet.cost} 🪙`) }}
          </PButton>
          <p
            v-else
            class="jp__done"
          >
            <UIcon
              name="i-lucide-clock"
              class="size-4"
            />
            Déjà joué aujourd'hui — reviens demain !
          </p>
          <p
            v-if="slot.canSpin && !canAfford && !spinning"
            class="jp__warn"
          >
            Solde insuffisant pour cette mise.
          </p>
        </div>

        <!-- Résultat -->
        <Transition name="res">
          <div
            v-if="lastResult && !spinning"
            class="result"
            :class="{ 'result--win': wins.length }"
          >
            <template v-if="wins.length">
              <p class="result__title font-display">
                {{ legendary ? 'JACKPOT LÉGENDAIRE ! 🎉' : 'Gagné !' }}
              </p>
              <div
                v-if="legendary && legendary.type === 'legendary'"
                class="result__card"
              >
                <HoloCard
                  :card="legendary.card"
                  size="md"
                  :is-new="true"
                />
              </div>
              <ul class="result__lines">
                <li
                  v-for="(l, i) in wins"
                  :key="i"
                >
                  <SlotSymbolTile
                    :symbol="symOf(l)"
                    :size="30"
                  />
                  <span class="result__label">{{ rewardLabel(l) }}</span>
                  <span class="result__line">{{ l.line }}</span>
                </li>
              </ul>
            </template>
            <p
              v-else
              class="result__none"
            >
              Pas de ligne gagnante cette fois. Retente ta chance demain !
            </p>
          </div>
        </Transition>
      </div>

      <!-- Feed des gros lots -->
      <aside class="feed">
        <h2 class="feed__title font-display">
          <UIcon
            name="i-lucide-trophy"
            class="size-4"
          /> Derniers gros lots
        </h2>
        <ul
          v-if="slot.recentWins.length"
          class="feed__list"
        >
          <li
            v-for="(w, i) in slot.recentWins.slice(0, 10)"
            :key="i"
            class="fitem"
          >
            <div class="fitem__top">
              <b class="fitem__user">{{ w.username }}</b>
              <span class="fitem__time">{{ timeAgo(w.spunAt) }}</span>
            </div>
            <div class="fitem__prizes">
              <span
                v-for="(p, j) in w.prizes"
                :key="j"
                class="prize"
              >
                <SlotSymbolTile
                  :symbol="symOf(p)"
                  :size="22"
                />{{ rewardShort(p) }}
              </span>
            </div>
          </li>
        </ul>
        <p
          v-else
          class="feed__empty"
        >
          Aucun gros lot récent.
        </p>
      </aside>
    </div>

    <!-- Barème dynamique -->
    <div class="odds">
      <div class="odds__head">
        <span class="odds__title font-display">Récompenses</span>
        <span class="odds__note">Chances pour <b>{{ linesCount }}</b> ligne{{ linesCount > 1 ? 's' : '' }} active{{ linesCount > 1 ? 's' : '' }}</span>
      </div>
      <ul class="odds__list">
        <li
          v-for="o in SLOT_ODDS"
          :key="o.symbol"
          class="odds__row"
        >
          <SlotSymbolTile
            :symbol="o.symbol"
            :size="30"
          />
          <span class="odds__reward">{{ o.reward }}</span>
          <span class="odds__pct tabular">{{ pct(chanceOverLines(o.p, linesCount)) }} %</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.jp { display: flex; flex-direction: column; gap: 16px; }
.jp__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.jp__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.jp__lead { font-weight: 600; font-size: .9rem; color: var(--ui-text-muted); margin: 4px 0 0; max-width: 34rem; }

.jp__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: start;
}
.jp__main { display: flex; flex-direction: column; align-items: center; gap: 16px; }

.bets { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.bet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 104px;
  padding: 9px 14px;
  border-radius: 14px;
  border: 2px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  cursor: pointer;
  transition: all .16s ease;
}
.bet__label { font-family: var(--font-display); font-weight: 700; font-size: .88rem; color: var(--ui-text); }
.bet__cost { font-size: .72rem; font-weight: 700; color: var(--ui-text-muted); }
.bet--on {
  border-color: var(--color-poke-500);
  background: var(--color-poke-50);
  box-shadow: 0 3px 0 color-mix(in oklab, var(--color-poke-500) 30%, transparent);
}
.bet--on .bet__label { color: var(--color-poke-600); }
.bet:disabled { opacity: .6; cursor: default; }

.jp__action { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.jp__done {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: .9rem;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  padding: 10px 18px;
  border-radius: 14px;
}
.jp__warn { font-size: .8rem; color: var(--color-poke-600); font-weight: 600; }

.result {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  text-align: center;
  background: var(--ui-bg-muted);
}
.result--win { background: color-mix(in oklab, #f6c453 16%, transparent); }
.result__title { font-weight: 700; font-size: 1.2rem; color: #b06a00; }
.result__card { animation: emerge .7s cubic-bezier(.2, .8, .3, 1) both; }
.result__lines { list-style: none; margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; gap: 6px; }
.result__lines li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .05);
}
.result__label { flex: 1; text-align: left; font-weight: 700; font-size: .86rem; color: var(--ui-text-highlighted); }
.result__line { font-size: .7rem; font-weight: 800; color: var(--ui-text-dimmed); background: var(--ui-bg-accented); padding: 2px 7px; border-radius: 999px; }
.result__none { font-size: .88rem; font-weight: 600; color: var(--ui-text-muted); }
.res-enter-active { transition: opacity .3s ease, transform .3s var(--ease-pop); }
.res-enter-from { opacity: 0; transform: translateY(10px) scale(.97); }

/* Feed */
.feed {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 18px;
  padding: 14px 14px 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .04);
}
.feed__title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: .95rem; margin: 0 0 8px; }
.feed__list { list-style: none; margin: 0; padding: 0; }
.fitem { padding: 9px 2px; border-top: 1px solid var(--ui-border-muted); }
.fitem:first-child { border-top: none; }
.fitem__top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.fitem__user { font-weight: 700; font-size: .84rem; color: var(--ui-text-highlighted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fitem__time { flex: none; font-size: .7rem; font-weight: 700; color: var(--ui-text-dimmed); }
.fitem__prizes { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.prize {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: .72rem;
  font-weight: 800;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  padding: 2px 8px 2px 3px;
  border-radius: 999px;
}
.feed__empty { font-size: .82rem; color: var(--ui-text-dimmed); padding: 8px 2px 12px; }

/* Barème */
.odds {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 18px;
  padding: 14px 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .04);
}
.odds__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.odds__title { font-weight: 700; font-size: 1rem; }
.odds__note { font-size: .8rem; color: var(--ui-text-muted); font-weight: 600; }
.odds__note b { color: var(--color-poke-600); }
.odds__list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
.odds__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-radius: 12px;
  background: var(--ui-bg-muted);
}
.odds__reward { flex: 1; font-weight: 700; font-size: .84rem; color: var(--ui-text); }
.odds__pct { font-family: var(--font-display); font-weight: 700; font-size: .95rem; color: var(--ui-text-highlighted); }

@media (max-width: 820px) {
  .jp__grid { grid-template-columns: 1fr; }
}
</style>
