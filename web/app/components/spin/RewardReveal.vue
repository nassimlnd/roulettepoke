<script setup lang="ts">
import type { AdvReward } from '~/stores/spin'

// Révélation « en grand » d'une récompense de coffre / repos : disque lumineux +
// éclats, gros montant qui rebondit, bouton Continuer. Le joueur voit clairement
// ce qu'il a gagné et avance à son rythme.
const props = defineProps<{ reward: AdvReward }>()
const emit = defineEmits<{ continue: [] }>()
const ICONS = { rest: 'i-lucide-flame', xp: 'i-lucide-trending-up', item: 'i-lucide-shield-plus', treasure: 'i-lucide-gem' }
const icon = computed(() => ICONS[props.reward.kind] ?? 'i-lucide-gem')
</script>

<template>
  <div class="reveal">
    <span class="reveal__rays" />
    <span
      class="reveal__disc"
      :class="`reveal__disc--${reward.kind}`"
    >
      <span
        v-for="s in 8"
        :key="s"
        class="reveal__spark"
        :style="{ '--i': s }"
      />
      <UIcon
        :name="icon"
        class="reveal__ico"
      />
    </span>
    <p class="reveal__title font-display">
      {{ reward.title }} !
    </p>
    <p class="reveal__amount font-display">
      {{ reward.amount }}
    </p>
    <p class="reveal__sub">
      {{ reward.sub }}
    </p>
    <PButton
      color="primary"
      size="lg"
      class="reveal__cta"
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
.reveal {
  position: relative;
  margin: auto;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 34px 24px 28px;
  border-radius: 24px;
  background: var(--ui-bg-elevated);
  box-shadow: 0 22px 60px -14px rgba(0, 0, 0, .6);
  overflow: hidden;
  animation: revealPop .5s var(--ease-pop) both;
}
.reveal__rays {
  position: absolute;
  inset: -40%;
  z-index: 0;
  background: repeating-conic-gradient(from 0deg at 50% 34%, transparent 0deg 7deg, color-mix(in oklab, var(--color-poke-500) 9%, transparent) 7deg 14deg);
  animation: revealSpin 14s linear infinite;
}
.reveal > :not(.reveal__rays) { position: relative; z-index: 1; }

.reveal__disc {
  position: relative;
  display: grid;
  place-items: center;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  color: #fff;
  margin-bottom: 6px;
  animation: discPop .55s var(--ease-pop) .08s both;
}
.reveal__disc--treasure { background: linear-gradient(150deg, #ffd76b, #f0a52e); box-shadow: 0 12px 30px -8px rgba(240, 165, 46, .7), inset 0 -6px 14px rgba(0, 0, 0, .12); }
.reveal__disc--rest { background: linear-gradient(150deg, #ff9d5c, #ef5a48); box-shadow: 0 12px 30px -8px rgba(239, 90, 72, .6), inset 0 -6px 14px rgba(0, 0, 0, .12); }
.reveal__disc--xp { background: linear-gradient(150deg, #8fd6a8, #4faa78); box-shadow: 0 12px 30px -8px rgba(79, 170, 120, .6), inset 0 -6px 14px rgba(0, 0, 0, .12); }
.reveal__disc--item { background: linear-gradient(150deg, #b79cf0, #8b5cc4); box-shadow: 0 12px 30px -8px rgba(139, 92, 196, .6), inset 0 -6px 14px rgba(0, 0, 0, .12); }
.reveal__ico { width: 64px; height: 64px; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, .25)); animation: icoWiggle 2.4s ease-in-out 1s infinite; }
.reveal__spark {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff5cf;
  box-shadow: 0 0 8px #ffe8a0;
  opacity: 0;
  --a: calc(var(--i) * 45deg);
  animation: sparkBurst .8s ease-out .3s forwards;
}

.reveal__title { font-weight: 800; font-size: 1.05rem; letter-spacing: .04em; text-transform: uppercase; color: var(--ui-text-muted); }
.reveal__amount {
  font-weight: 800;
  font-size: 3.4rem;
  line-height: 1;
  color: var(--color-poke-600, #c53a2b);
  animation: amountIn .5s var(--ease-pop) .26s both;
}
.reveal__disc--rest ~ .reveal__amount { color: #e0662e; }
.reveal__disc--xp ~ .reveal__amount { color: #3f9469; }
.reveal__disc--item ~ .reveal__amount { color: #7c4fb0; }
.reveal__sub { font-size: .92rem; color: var(--ui-text-muted); margin-top: 2px; }
.reveal__cta { margin-top: 18px; }

@keyframes revealPop { 0% { opacity: 0; transform: scale(.9) translateY(14px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes discPop { 0% { transform: scale(0) rotate(-20deg); } 60% { transform: scale(1.15) rotate(6deg); } 100% { transform: scale(1) rotate(0); } }
@keyframes amountIn { 0% { opacity: 0; transform: scale(.4); } 65% { opacity: 1; transform: scale(1.18); } 100% { transform: scale(1); } }
@keyframes sparkBurst { to { opacity: 0; transform: translate(calc(cos(var(--a)) * 92px), calc(sin(var(--a)) * 92px)) scale(.3); } }
@keyframes revealSpin { to { transform: rotate(360deg); } }
@keyframes icoWiggle { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }

@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal__disc, .reveal__amount { animation: none; }
  .reveal__rays, .reveal__ico { animation: none; }
  .reveal__spark { display: none; }
}
</style>
