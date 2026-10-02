<script setup lang="ts">
import type { AdvReward } from '~/stores/spin'

// Révélation « en grand » d'une récompense — ton fête façon Pokémon : bannière à
// ruban, disque qui brille (balayage lumineux), confettis, gros montant qui
// rebondit. Le joueur voit clairement ce qu'il a gagné et avance à son rythme.
const props = defineProps<{ reward: AdvReward }>()
const emit = defineEmits<{ continue: [] }>()

const ICONS: Record<string, string> = {
  rest: 'i-lucide-flame', xp: 'i-lucide-trending-up', item: 'i-lucide-shield-plus', treasure: 'i-lucide-gem',
  life: 'i-lucide-heart', ally: 'i-lucide-shield', coins: 'i-lucide-coins', badge: 'i-lucide-medal'
}
const BANNERS: Record<string, string> = {
  rest: 'Élan gagné', xp: 'Entraînement', item: 'Objet obtenu', treasure: 'Trésor !',
  life: 'Rappel obtenu', ally: 'Nouvel allié', coins: 'Magot', badge: 'Jalon atteint'
}
const icon = computed(() => ICONS[props.reward.kind] ?? 'i-lucide-gem')
const banner = computed(() => BANNERS[props.reward.kind] ?? 'Récompense')
</script>

<template>
  <div
    class="rr"
    :class="`rr--${reward.kind}`"
  >
    <span
      v-for="c in 16"
      :key="c"
      class="rr__confetti"
      :style="{ '--i': c }"
    />
    <span class="rr__ribbon font-display">{{ banner }}</span>

    <span class="rr__disc">
      <span class="rr__halo" />
      <span class="rr__shine" />
      <span
        v-for="s in 8"
        :key="s"
        class="rr__spark"
        :style="{ '--i': s }"
      />
      <UIcon
        :name="icon"
        class="rr__ico"
      />
    </span>

    <p class="rr__title font-display">
      {{ reward.title }}
    </p>
    <p class="rr__amount font-display">
      {{ reward.amount }}
    </p>
    <p class="rr__sub">
      {{ reward.sub }}
    </p>
    <PButton
      color="primary"
      size="lg"
      class="rr__cta"
      @click="emit('continue')"
    >
      <UIcon
        name="i-lucide-check"
        class="size-5"
      /> Continuer
    </PButton>
  </div>
</template>

<style scoped>
.rr {
  --c1: #ffd76b;
  --c2: #f0a52e;
  position: relative;
  margin: auto;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 5px;
  padding: 40px 24px 26px;
  border-radius: 26px;
  background:
    radial-gradient(130% 80% at 50% -10%, color-mix(in oklab, var(--c1) 26%, var(--ui-bg-elevated)) 0%, var(--ui-bg-elevated) 62%);
  box-shadow: 0 22px 60px -14px rgba(0, 0, 0, .6), inset 0 0 0 1px color-mix(in oklab, var(--c1) 30%, transparent);
  overflow: hidden;
  animation: rrPop .5s var(--ease-pop) both;
}
/* Teintes par type de récompense */
.rr--rest, .rr--treasure, .rr--coins, .rr--badge { --c1: #ffd76b; --c2: #f0a52e; }
.rr--xp { --c1: #8fd6a8; --c2: #4faa78; }
.rr--item { --c1: #b79cf0; --c2: #8b5cc4; }
.rr--life { --c1: #ff9db0; --c2: #ef5a6e; }
.rr--ally { --c1: #7fd6c4; --c2: #3fae9b; }

/* Ruban titre */
.rr__ribbon {
  position: relative;
  z-index: 2;
  font-weight: 800;
  font-size: .78rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #fff;
  padding: 5px 22px;
  border-radius: 999px;
  background: linear-gradient(150deg, var(--c1), var(--c2));
  box-shadow: 0 4px 12px -3px color-mix(in oklab, var(--c2) 70%, transparent);
  margin-bottom: 6px;
  animation: rrRibbon .5s var(--ease-pop) .05s both;
}

.rr__disc {
  position: relative;
  display: grid;
  place-items: center;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  color: #fff;
  margin: 2px 0 8px;
  background: linear-gradient(150deg, var(--c1), var(--c2));
  box-shadow: 0 12px 30px -8px color-mix(in oklab, var(--c2) 70%, transparent), inset 0 -6px 14px rgba(0, 0, 0, .14);
  overflow: hidden;
  animation: rrDisc .55s var(--ease-pop) .08s both;
}
.rr__halo {
  position: absolute;
  inset: -40%;
  z-index: 0;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, .32) 40deg, transparent 80deg);
  animation: rrHalo 3.4s linear infinite;
}
/* Balayage lumineux qui traverse le disque (comme un badge qui brille) */
.rr__shine {
  position: absolute;
  top: 0;
  left: -60%;
  width: 45%;
  height: 100%;
  z-index: 1;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .75), transparent);
  transform: skewX(-18deg);
  animation: rrShine 2.6s ease-in-out 1s infinite;
}
.rr__ico { position: relative; z-index: 2; width: 62px; height: 62px; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, .25)); animation: rrWiggle 2.4s ease-in-out 1s infinite; }
.rr__spark {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff6d8;
  box-shadow: 0 0 8px #ffe8a0;
  opacity: 0;
  --a: calc(var(--i) * 45deg);
  animation: rrBurst .8s ease-out .3s forwards;
}

/* Confettis qui tombent en pluie */
.rr__confetti {
  position: absolute;
  top: -12px;
  left: calc(var(--i) * 6.25%);
  width: 8px;
  height: 12px;
  border-radius: 2px;
  opacity: 0;
  background: var(--c1);
  animation: rrFall 1.5s ease-in calc(var(--i) * 60ms) forwards;
}
.rr__confetti:nth-child(3n) { background: var(--c2); width: 7px; height: 7px; border-radius: 50%; }
.rr__confetti:nth-child(3n+1) { background: #ff8fa3; }
.rr__confetti:nth-child(4n) { background: #7fd0e0; }
.rr__confetti:nth-child(5n) { background: #fff2b0; }

.rr__title { position: relative; z-index: 2; font-weight: 800; font-size: 1.02rem; letter-spacing: .02em; color: var(--ui-text-highlighted); }
.rr__amount {
  position: relative;
  z-index: 2;
  font-weight: 800;
  font-size: 3.2rem;
  line-height: 1.02;
  color: color-mix(in oklab, var(--c2) 88%, #7a3a12);
  animation: rrAmount .5s var(--ease-pop) .26s both;
}
.rr__sub { position: relative; z-index: 2; font-size: .9rem; color: var(--ui-text-muted); margin-top: 2px; }
.rr__cta { position: relative; z-index: 2; margin-top: 18px; }

@keyframes rrPop { 0% { opacity: 0; transform: scale(.9) translateY(14px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes rrRibbon { 0% { opacity: 0; transform: translateY(-10px) scale(.8); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes rrDisc { 0% { transform: scale(0) rotate(-20deg); } 60% { transform: scale(1.14) rotate(6deg); } 100% { transform: scale(1) rotate(0); } }
@keyframes rrHalo { to { transform: rotate(360deg); } }
@keyframes rrShine { 0%, 100% { left: -60%; } 55%, 100% { left: 120%; } }
@keyframes rrWiggle { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@keyframes rrBurst { to { opacity: 0; transform: translate(calc(cos(var(--a)) * 92px), calc(sin(var(--a)) * 92px)) scale(.3); } }
@keyframes rrAmount { 0% { opacity: 0; transform: scale(.4); } 65% { opacity: 1; transform: scale(1.18); } 100% { transform: scale(1); } }
@keyframes rrFall {
  0% { opacity: 0; transform: translateY(0) rotate(0); }
  10% { opacity: 1; }
  100% { opacity: 0; transform: translateY(340px) rotate(540deg); }
}

@media (prefers-reduced-motion: reduce) {
  .rr, .rr__disc, .rr__amount, .rr__ribbon { animation: none; }
  .rr__halo, .rr__shine, .rr__ico, .rr__confetti, .rr__spark { animation: none; display: none; }
}
</style>
