<script setup lang="ts">
import type { MotusRewardForm } from '~/types/api'

// Célébration de victoire du Motus — même langage de fête que RewardReveal
// (Aventure) : ruban, disque qui brille, confettis, contenu qui rebondit. Ici
// la vedette est la récompense : le Zarbi gagné trône sur le disque.
//
// Ouverte UNIQUEMENT sur la transition de victoire (pas au rechargement d'une
// partie déjà gagnée : on célèbre une fois, ensuite le résumé de page suffit).
const props = defineProps<{
  attempts: number
  reward: MotusRewardForm | null
  firstWinnerCoins: number
  word: string | null
  definitionUrl: string | null
}>()
const emit = defineEmits<{ close: [] }>()

const cardEl = ref<HTMLElement>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // Focus sur l'action principale, cherchée DANS le DOM : une ref posée sur
  // <PButton> renvoie l'instance du composant, dont `.focus()` n'existe pas —
  // l'appel levait une TypeError à l'ouverture.
  nextTick(() => cardEl.value?.querySelector<HTMLButtonElement>('button')?.focus())
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const attemptsLabel = computed(() =>
  `${props.attempts} essai${props.attempts > 1 ? 's' : ''}`)
</script>

<template>
  <div
    class="mv"
    role="dialog"
    aria-modal="true"
    aria-label="Mot du jour trouvé"
    @click.self="emit('close')"
  >
    <div
      ref="cardEl"
      class="mv__card"
    >
      <span
        v-for="c in 16"
        :key="c"
        class="mv__confetti"
        :style="{ '--i': c }"
      />

      <span class="mv__ribbon font-display">Mot trouvé !</span>

      <span class="mv__disc">
        <span class="mv__halo" />
        <span class="mv__shine" />
        <span
          v-for="s in 8"
          :key="s"
          class="mv__spark"
          :style="{ '--i': s }"
        />
        <img
          v-if="reward"
          :src="reward.imageUrl"
          :alt="`Zarbi ${reward.form}`"
          class="mv__mon"
        >
        <UIcon
          v-else
          name="i-lucide-party-popper"
          class="mv__fallback"
        />
      </span>

      <p class="mv__title font-display">
        Trouvé en {{ attemptsLabel }} !
      </p>

      <p
        v-if="word"
        class="mv__word font-display"
      >
        {{ word }}
      </p>

      <!-- Interpolation d'un seul tenant : des <template> inline ici se font
           avaler leurs espaces par la condensation de Vue (« Zarbi P— version »). -->
      <p
        v-if="reward"
        class="mv__reward"
      >
        Tu remportes <b>Zarbi {{ reward.form }}</b>{{ reward.isAlt ? ' — version ✦ shiny' : '' }} !
      </p>

      <p
        v-if="firstWinnerCoins"
        class="mv__first"
      >
        🥇 Première personne à trouver le mot aujourd'hui : +{{ firstWinnerCoins }} 🪙
      </p>

      <div class="mv__actions">
        <PButton
          color="primary"
          size="lg"
          @click="emit('close')"
        >
          <UIcon
            name="i-lucide-check"
            class="size-5"
          /> Continuer
        </PButton>
        <NuxtLink
          v-if="reward"
          to="/collection"
          class="mv__link"
        >
          Voir ma collection
        </NuxtLink>
      </div>

      <a
        v-if="definitionUrl && word"
        :href="definitionUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="mv__def"
      >
        📖 Définition de « {{ word }} »
      </a>
    </div>
  </div>
</template>

<style scoped>
.mv {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  padding: 20px;
  background: rgba(24, 16, 20, .55);
  backdrop-filter: blur(6px);
  animation: mvFade .25s ease both;
}
.mv__card {
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
  padding: 40px 24px 24px;
  border-radius: 26px;
  background:
    radial-gradient(130% 80% at 50% -10%, color-mix(in oklab, var(--c1) 26%, var(--ui-bg-elevated)) 0%, var(--ui-bg-elevated) 62%);
  box-shadow: 0 22px 60px -14px rgba(0, 0, 0, .6), inset 0 0 0 1px color-mix(in oklab, var(--c1) 30%, transparent);
  overflow: hidden;
  animation: mvPop .5s var(--ease-pop) both;
}

.mv__ribbon {
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
  animation: mvRibbon .5s var(--ease-pop) .05s both;
}

.mv__disc {
  position: relative;
  display: grid;
  place-items: center;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  margin: 2px 0 8px;
  background: linear-gradient(150deg, var(--c1), var(--c2));
  box-shadow: 0 12px 30px -8px color-mix(in oklab, var(--c2) 70%, transparent), inset 0 -6px 14px rgba(0, 0, 0, .14);
  overflow: hidden;
  animation: mvDisc .55s var(--ease-pop) .08s both;
}
.mv__halo {
  position: absolute;
  inset: -40%;
  z-index: 0;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, .32) 40deg, transparent 80deg);
  animation: mvHalo 3.4s linear infinite;
}
.mv__shine {
  position: absolute;
  top: 0;
  left: -60%;
  width: 45%;
  height: 100%;
  z-index: 1;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .75), transparent);
  transform: skewX(-18deg);
  animation: mvShine 2.6s ease-in-out 1s infinite;
}
.mv__mon {
  position: relative;
  z-index: 2;
  width: 88px;
  height: 88px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 6px rgba(60, 30, 0, .35));
  animation: mvBounce 2.2s ease-in-out .9s infinite;
}
.mv__fallback { position: relative; z-index: 2; width: 62px; height: 62px; color: #fff; }
.mv__spark {
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
  animation: mvBurst .8s ease-out .3s forwards;
}

.mv__confetti {
  position: absolute;
  top: -12px;
  left: calc(var(--i) * 6.25%);
  width: 8px;
  height: 12px;
  border-radius: 2px;
  opacity: 0;
  background: var(--c1);
  animation: mvFall 1.6s ease-in calc(var(--i) * 60ms) forwards;
}
.mv__confetti:nth-child(3n) { background: var(--c2); width: 7px; height: 7px; border-radius: 50%; }
.mv__confetti:nth-child(3n+1) { background: #ff8fa3; }
.mv__confetti:nth-child(4n) { background: #7fd0e0; }
.mv__confetti:nth-child(5n) { background: #b79cf0; }

.mv__title {
  position: relative;
  z-index: 2;
  font-weight: 800;
  font-size: 1.5rem;
  color: var(--ui-text-highlighted);
  animation: mvAmount .5s var(--ease-pop) .22s both;
}
.mv__word {
  position: relative;
  z-index: 2;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--c2) 88%, #7a3a12);
}
.mv__reward { position: relative; z-index: 2; font-size: .95rem; color: var(--ui-text-toned); margin-top: 4px; }
.mv__first { position: relative; z-index: 2; font-size: .9rem; font-weight: 700; color: #b07d12; }

.mv__actions {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
}
.mv__link {
  font-weight: 700;
  font-size: .88rem;
  color: var(--color-poke-600);
  text-decoration: underline;
}
.mv__def {
  position: relative;
  z-index: 2;
  margin-top: 10px;
  font-size: .8rem;
  color: var(--ui-text-muted);
  text-decoration: underline;
}

@keyframes mvFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes mvPop { 0% { opacity: 0; transform: scale(.9) translateY(14px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes mvRibbon { 0% { opacity: 0; transform: translateY(-10px) scale(.8); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes mvDisc { 0% { transform: scale(0) rotate(-20deg); } 60% { transform: scale(1.14) rotate(6deg); } 100% { transform: scale(1) rotate(0); } }
@keyframes mvHalo { to { transform: rotate(360deg); } }
@keyframes mvShine { 0%, 100% { left: -60%; } 55%, 100% { left: 120%; } }
@keyframes mvBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes mvBurst { to { opacity: 0; transform: translate(calc(cos(var(--a)) * 94px), calc(sin(var(--a)) * 94px)) scale(.3); } }
@keyframes mvAmount { 0% { opacity: 0; transform: scale(.4); } 65% { opacity: 1; transform: scale(1.15); } 100% { transform: scale(1); } }
@keyframes mvFall {
  0% { opacity: 0; transform: translateY(0) rotate(0); }
  10% { opacity: 1; }
  100% { opacity: 0; transform: translateY(360px) rotate(540deg); }
}

@media (prefers-reduced-motion: reduce) {
  .mv, .mv__card, .mv__disc, .mv__title, .mv__ribbon { animation: none; }
  .mv__halo, .mv__shine, .mv__mon, .mv__confetti, .mv__spark { animation: none; }
  .mv__confetti, .mv__spark { display: none; }
}
</style>
