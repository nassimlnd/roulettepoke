<script setup lang="ts">
import type { BattleRound } from '~/types/domain'

// Moteur de combat animé façon Pokémon (démo Mochidex). Rejoue un battleLog
// (suite de duels résolus côté serveur) en auto : chaque duel = un clash, PV qui
// descendent, K.O., puis verdict. Décor thématisé par `themeColor` (type d'arène).
// Multi-stages (Ligue) : plusieurs adversaires enchaînés, un par bannière.
const props = withDefaults(defineProps<{
  rounds?: BattleRound[]
  stages?: { label: string, rounds: BattleRound[], won?: boolean }[]
  won: boolean
  themeColor?: string
  badgeUrl?: string | null
  winTitle?: string
  winSub?: string
  loseSub?: string
}>(), {
  rounds: () => [],
  stages: undefined,
  themeColor: '#7fc98a',
  badgeUrl: null,
  winTitle: 'Victoire !',
  winSub: '',
  loseSub: 'Retente ta chance bientôt.'
})

const emit = defineEmits<{ finished: [] }>()
const reduced = usePreferredReducedMotion()

// Un combat simple = un stage implicite ; la Ligue en fournit plusieurs.
const stageList = computed(() =>
  props.stages?.length ? props.stages : [{ label: '', rounds: props.rounds ?? [], won: props.won }]
)
const multi = computed(() => (props.stages?.length ?? 0) > 1)
const totalDuels = computed(() => stageList.value.reduce((n, s) => n + s.rounds.length, 0))
const wonDuels = computed(() => stageList.value.reduce((n, s) => n + s.rounds.filter(r => r.playerWon).length, 0))

function hpColor(hp: number): string {
  if (hp > 50) return 'linear-gradient(90deg,#8fd6a8,#5bbf82)'
  if (hp > 20) return 'linear-gradient(90deg,#f6d06b,#e0a92e)'
  return 'linear-gradient(90deg,#f4796b,#e2402f)'
}
// Couleur du compteur de PV (chiffres) selon le niveau de vie, façon Mochidex.
function hpText(hp: number): string {
  if (hp > 50) return '#3f9e66'
  if (hp > 20) return '#c98a1a'
  return '#e2402f'
}

type Side = { name: string, imageUrl: string | null, hp: number, fainted: boolean, hit: boolean, lunge: boolean }
const blank = (): Side => ({ name: '', imageUrl: null, hp: 100, fainted: false, hit: false, lunge: false })

const foe = reactive(blank()) // adversaire (haut-droite)
const me = reactive(blank()) // mon champion (bas-gauche)
const message = ref('Le combat commence !')
const phase = ref<'fight' | 'done'>('fight')
const duelNo = ref(0)
const duelTotal = ref(0) // duels du stage courant
const stageNo = ref(0) // maître courant (multi-stages)
const chapter = ref('') // texte de la bannière d'introduction du maître
const showChapter = ref(false)

let cancelled = false
const wait = (ms: number) => new Promise<void>((r) => {
  const id = setTimeout(r, reduced.value === 'reduce' ? Math.min(ms, 30) : ms)
  timers.push(id)
})
const timers: ReturnType<typeof setTimeout>[] = []

async function strike(attacker: Side, defender: Side, dmg: number) {
  if (cancelled) return
  attacker.lunge = true
  await wait(180)
  defender.hp = Math.max(0, defender.hp - dmg)
  defender.hit = true
  attacker.lunge = false
  await wait(240)
  defender.hit = false
  await wait(160)
}

async function play() {
  for (let si = 0; si < stageList.value.length; si++) {
    if (cancelled) return
    const stage = stageList.value[si]
    if (!stage) continue
    stageNo.value = si + 1

    // Bannière d'introduction du maître (Ligue uniquement).
    if (multi.value && stage.label) {
      chapter.value = stage.label
      showChapter.value = true
      await wait(1050)
      if (cancelled) return
      showChapter.value = false
      await wait(200)
    }

    duelTotal.value = stage.rounds.length
    for (let i = 0; i < stage.rounds.length; i++) {
      if (cancelled) return
      const r = stage.rounds[i]
      if (!r) continue
      duelNo.value = i + 1
      Object.assign(me, blank(), { name: r.player.name, imageUrl: r.player.imageUrl })
      Object.assign(foe, blank(), { name: r.champion.name, imageUrl: r.champion.imageUrl })
      message.value = `${r.player.name} affronte ${r.champion.name} !`
      await wait(760)

      // Deux échanges puis le perdant tombe K.O.
      const winnerRemain = Math.max(28, Math.round((r.playerWon ? r.winProbability : 100 - r.winProbability) * 0.6))
      if (r.playerWon) {
        await strike(me, foe, 42)
        await strike(foe, me, 100 - winnerRemain)
        message.value = `${r.player.name} inflige le coup décisif !`
        await strike(me, foe, 100)
        foe.fainted = true
        message.value = `${r.champion.name} est K.O. !`
      } else {
        await strike(foe, me, 42)
        await strike(me, foe, 100 - winnerRemain)
        message.value = `${r.champion.name} riposte durement…`
        await strike(foe, me, 100)
        me.fainted = true
        message.value = `${r.player.name} est K.O.`
      }
      await wait(760)
    }

    // Petit temps mort entre deux maîtres (multi-stages).
    if (multi.value && si < stageList.value.length - 1) {
      message.value = stage.won ? `Maître ${stageNo.value} vaincu !` : `Maître ${stageNo.value} résiste…`
      await wait(720)
    }
  }
  if (cancelled) return
  phase.value = 'done'
  message.value = props.won ? props.winTitle : 'Défaite'
  emit('finished')
}

onMounted(play)
onBeforeUnmount(() => {
  cancelled = true
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div
    class="bs"
    :style="{ '--tc': themeColor }"
  >
    <div class="arena">
      <!-- Adversaire : plaque haut-gauche, créature haut-droite -->
      <div class="plate plate--foe">
        <div class="plate__row">
          <span class="plate__name">{{ foe.name || '—' }}</span>
          <span
            class="plate__hp"
            :style="{ color: hpText(foe.hp) }"
          ><b>{{ foe.hp }}</b><i>PV</i></span>
        </div>
        <div class="hpbar">
          <span class="hpbar__track"><i :style="{ width: foe.hp + '%', background: hpColor(foe.hp) }" /></span>
        </div>
      </div>
      <div class="mon mon--foe">
        <img
          v-if="foe.imageUrl"
          :src="foe.imageUrl"
          :alt="foe.name"
          class="mon__img"
          :class="{ 'mon__img--lunge': foe.lunge, 'mon__img--hit': foe.hit, 'mon__img--faint': foe.fainted }"
        >
        <span
          v-else
          class="mon__ph"
        >?</span>
      </div>

      <!-- Mon champion : plaque bas-droite, créature bas-gauche -->
      <div class="mon mon--me">
        <img
          v-if="me.imageUrl"
          :src="me.imageUrl"
          :alt="me.name"
          class="mon__img"
          :class="{ 'mon__img--lunge': me.lunge, 'mon__img--hit': me.hit, 'mon__img--faint': me.fainted }"
        >
        <span
          v-else
          class="mon__ph"
        >?</span>
      </div>
      <div class="plate plate--me">
        <div class="plate__row">
          <span class="plate__name">{{ me.name || '—' }}</span>
          <span
            class="plate__hp"
            :style="{ color: hpText(me.hp) }"
          ><b>{{ me.hp }}</b><i>PV</i></span>
        </div>
        <div class="hpbar">
          <span class="hpbar__track"><i :style="{ width: me.hp + '%', background: hpColor(me.hp) }" /></span>
        </div>
      </div>

      <span
        v-if="phase === 'fight' && !showChapter"
        class="duel-chip"
      ><template v-if="multi">Maître {{ stageNo }}/{{ stageList.length }} · </template>Duel {{ duelNo }}/{{ duelTotal }}</span>

      <!-- Bannière d'introduction du maître (multi-stages) -->
      <Transition name="chapter">
        <div
          v-if="showChapter"
          class="chapter"
        >
          <span class="chapter__lbl font-display">{{ chapter }}</span>
        </div>
      </Transition>
    </div>

    <!-- Boîte de message / verdict -->
    <div
      class="msg"
      :class="{ 'msg--done': phase === 'done', 'msg--win': phase === 'done' && won, 'msg--lose': phase === 'done' && !won }"
    >
      <template v-if="phase === 'done'">
        <img
          v-if="won && badgeUrl"
          :src="badgeUrl"
          alt=""
          class="msg__badge"
        >
        <UIcon
          v-else-if="!won"
          name="i-lucide-shield-x"
          class="msg__ko size-7"
        />
        <div class="msg__body">
          <p class="msg__title font-display">
            {{ won ? winTitle : 'Défaite' }}
          </p>
          <p class="msg__sub">
            {{ won ? (winSub || `${wonDuels}/${totalDuels} duels remportés.`) : (loseSub || `${wonDuels}/${totalDuels} duels remportés.`) }}
          </p>
        </div>
      </template>
      <p
        v-else
        class="msg__line"
      >
        {{ message }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.bs { display: flex; flex-direction: column; gap: 12px; }

.arena {
  position: relative;
  border-radius: 20px;
  padding: 16px;
  min-height: 300px;
  overflow: hidden;
  border: 3px solid color-mix(in oklab, var(--tc) 55%, #3a2f2a);
  background:
    repeating-linear-gradient(90deg, transparent 0 22px, color-mix(in oklab, var(--tc) 12%, transparent) 22px 24px),
    radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--tc) 34%, #fff) 0%, color-mix(in oklab, var(--tc) 62%, #eaeaea) 100%);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 4px;
}

.plate {
  z-index: 2;
  align-self: start;
  background: var(--ui-bg-elevated);
  border: 3px solid color-mix(in oklab, #3a2f2a 70%, var(--tc));
  border-radius: 16px;
  padding: 11px 15px;
  box-shadow: 0 4px 0 rgba(58, 47, 42, .18);
  min-width: 168px;
  max-width: 100%;
}
.plate--foe { grid-column: 1; grid-row: 1; justify-self: start; }
.plate--me { grid-column: 2; grid-row: 3; justify-self: end; align-self: end; }
.plate__row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
.plate__name { font-family: var(--font-display); font-weight: 700; font-size: 1.08rem; color: var(--ui-text-highlighted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Compteur de PV en chiffres (façon Mochidex) */
.plate__hp { flex: none; display: flex; align-items: baseline; gap: 2px; font-family: var(--font-display); line-height: 1; }
.plate__hp b { font-weight: 800; font-size: 1.25rem; }
.plate__hp i { font-weight: 800; font-size: .6rem; font-style: normal; text-transform: uppercase; letter-spacing: .02em; opacity: .8; }
.hpbar { display: flex; align-items: center; }
.hpbar__track { flex: 1; height: 11px; border-radius: 99px; background: #e9e6df; box-shadow: inset 0 1px 2px rgba(0, 0, 0, .12); overflow: hidden; }
.hpbar__track > i { display: block; height: 100%; border-radius: 99px; transition: width .35s var(--ease-glide); }

.mon { z-index: 1; display: grid; place-items: center; }
.mon--foe { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
.mon--me { grid-column: 1; grid-row: 2 / span 2; align-self: end; }
.mon__img { object-fit: contain; filter: drop-shadow(0 8px 10px rgba(40, 30, 30, .28)); }
.mon--foe .mon__img { width: 132px; height: 132px; }
.mon--me .mon__img { width: 174px; height: 174px; }
.mon__ph { font-family: var(--font-display); font-size: 2rem; color: rgba(255, 255, 255, .7); }

.mon__img--lunge { animation: lunge .34s var(--ease-pop); }
.mon--foe .mon__img--lunge { animation-name: lungeFoe; }
.mon__img--hit { animation: hit .38s ease; }
.mon__img--faint { animation: faint .5s ease forwards; }
@keyframes lunge { 50% { transform: translate(28px, -22px) scale(1.06); } }
@keyframes lungeFoe { 50% { transform: translate(-28px, 22px) scale(1.06); } }
@keyframes hit { 0%, 100% { transform: none; } 20% { transform: translateX(-6px); filter: drop-shadow(0 8px 10px rgba(40, 30, 30, .28)) brightness(1.8) saturate(.3); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } }
@keyframes faint { to { transform: translateY(26px) scale(.7); opacity: 0; } }

.duel-chip {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: .68rem;
  color: #fff;
  background: color-mix(in oklab, #3a2f2a 70%, var(--tc));
  padding: 3px 12px;
  border-radius: 999px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, .2);
}

/* Bannière d'introduction du maître (Ligue) */
.chapter {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  place-items: center;
  padding: 20px;
  background: color-mix(in oklab, var(--tc) 32%, rgba(20, 14, 22, .8));
  backdrop-filter: blur(2px);
}
.chapter__lbl {
  font-weight: 800;
  font-size: 1.35rem;
  line-height: 1.2;
  text-align: center;
  color: #fff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, .55);
  animation: chapterPop .5s var(--ease-pop) both;
}
@keyframes chapterPop {
  from { opacity: 0; transform: scale(.86); }
  to { opacity: 1; transform: none; }
}
.chapter-enter-active, .chapter-leave-active { transition: opacity .3s ease; }
.chapter-enter-from, .chapter-leave-to { opacity: 0; }

.msg {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--ui-bg-elevated);
  border: 3px solid color-mix(in oklab, #3a2f2a 55%, var(--tc));
  box-shadow: 0 4px 0 rgba(58, 47, 42, .16);
}
.msg__line { font-weight: 700; font-size: .95rem; color: var(--ui-text-highlighted); }
.msg--done { justify-content: center; text-align: center; }
.msg--win { border-color: color-mix(in oklab, #5bbf82 60%, transparent); background: color-mix(in oklab, #5bbf82 12%, var(--ui-bg-elevated)); }
.msg__badge { width: 48px; height: 48px; object-fit: contain; animation: emerge .6s cubic-bezier(.2, .8, .3, 1) both; }
.msg__ko { color: var(--ui-text-dimmed); flex: none; }
.msg__body { display: flex; flex-direction: column; gap: 1px; }
.msg--done .msg__title { font-weight: 700; font-size: 1.15rem; color: var(--ui-text-highlighted); }
.msg--win .msg__title { color: #3f9e66; }
.msg__sub { font-size: .82rem; color: var(--ui-text-muted); }

@media (max-width: 480px) {
  .mon--foe .mon__img { width: 92px; height: 92px; }
  .mon--me .mon__img { width: 118px; height: 118px; }
  .arena { min-height: 220px; }
  .plate { min-width: 132px; padding: 9px 12px; border-radius: 14px; }
  .plate__name { font-size: .96rem; }
  .plate__hp b { font-size: 1.08rem; }
}
@media (prefers-reduced-motion: reduce) {
  .mon__img--lunge, .mon__img--hit { animation: none; }
  .mon__img--faint { animation: none; opacity: 0; }
  .msg__badge, .chapter__lbl { animation: none; }
  .chapter-enter-active, .chapter-leave-active { transition: none; }
}
</style>
