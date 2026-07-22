<script setup lang="ts">
import { useSpinStore, SPIN_REWARD_COINS } from '~/stores/spin'

// Spin / Aventure — l'écran de lancement ; l'aventure elle-même se joue en
// plein écran (AdventureScene, overlay immersif). PHASE 1.5 : données mockées.
const spin = useSpinStore()
</script>

<template>
  <div class="adv">
    <header class="adv__head">
      <h1 class="adv__title font-display">
        L'Aventure
      </h1>
      <p class="adv__lead">
        Franchis le Conseil des 4 et le Champion en combats réels. Une victoire
        rapporte <b>{{ SPIN_REWARD_COINS }} 🪙</b> (1×/semaine) — et un légendaire se cache au bout.
      </p>
    </header>

    <PPanel class="intro">
      <span class="intro__spark">
        <UIcon
          name="i-lucide-compass"
          class="size-9"
        />
      </span>
      <h2 class="intro__h font-display">
        Prêt·e pour l'aventure ?
      </h2>
      <p class="intro__p">
        Un starter t'accompagne. Tu croiseras des dresseurs, des coffres et un
        légendaire — chaque combat se joue en plein écran.
      </p>
      <PButton
        color="primary"
        size="lg"
        @click="spin.begin()"
      >
        <UIcon
          name="i-lucide-play"
          class="size-5"
        /> Commencer l'aventure
      </PButton>
    </PPanel>

    <!-- L'aventure (overlay plein écran) : visible dès qu'un run démarre. -->
    <AdventureScene />
  </div>
</template>

<style scoped>
.adv { display: flex; flex-direction: column; gap: 16px; max-width: 34rem; margin: 0 auto; }
.adv__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.adv__lead { font-size: .9rem; color: var(--ui-text-muted); margin-top: 4px; }
.adv__lead b { color: var(--ui-text-highlighted); }

.intro { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 30px 22px; }
.intro__spark {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: 0 8px 20px -8px var(--color-poke-500);
}
.intro__h { font-weight: 700; font-size: 1.3rem; color: var(--ui-text-highlighted); }
.intro__p { font-size: .9rem; color: var(--ui-text-muted); max-width: 26rem; }
</style>
