<script setup lang="ts">
import { useSpinStore, SPIN_REWARD_COINS } from '~/stores/spin'

// Spin / Aventure — parcours de nœuds ; les combats se jouent en plein écran
// (BattleStage global). PHASE 1 : données mockées.
const spin = useSpinStore()

const next = computed(() => spin.next)
const cta = computed(() => {
  const n = next.value
  if (!n) return { label: 'Terminer', icon: 'i-lucide-flag' }
  if (n.kind === 'treasure') return { label: 'Ouvrir', icon: 'i-lucide-gift' }
  if (n.kind === 'legendary') return { label: 'Tenter le légendaire', icon: 'i-lucide-sparkles' }
  if (n.kind === 'champion') return { label: 'Affronter le Champion', icon: 'i-lucide-crown' }
  return { label: `Affronter ${n.opponent?.name ?? ''}`, icon: 'i-lucide-swords' }
})
</script>

<template>
  <div class="adv">
    <header class="adv__head">
      <h1 class="adv__title font-display">
        L'Aventure
      </h1>
      <p class="adv__lead">
        Enchaîne le Conseil des 4 et le Champion en combats réels. Une victoire
        rapporte <b>{{ SPIN_REWARD_COINS }} 🪙</b> (1×/semaine) — et un légendaire se cache au bout.
      </p>
    </header>

    <!-- ═══ Intro ═══ -->
    <PPanel
      v-if="spin.phase === 'idle'"
      class="intro"
    >
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
        Un starter t'accompagne. Chaque combat est joué en plein écran, et le
        hasard décide de ton parcours — pas de roue, un vrai périple.
      </p>
      <PButton
        color="primary"
        size="lg"
        @click="spin.start()"
      >
        <UIcon
          name="i-lucide-play"
          class="size-5"
        /> Commencer l'aventure
      </PButton>
    </PPanel>

    <!-- ═══ Parcours ═══ -->
    <template v-else-if="spin.phase === 'map'">
      <PPanel class="map">
        <div class="map__stat">
          <span class="map__starter">
            <img
              v-if="spin.starter"
              :src="spin.starter.imageUrl"
              :alt="spin.starter.name"
            >
            <span>
              <b>{{ spin.starter?.name }}</b>
              <span class="map__starter-lbl">ton champion</span>
            </span>
          </span>
          <span
            v-if="spin.edge > 0"
            class="map__edge"
          >
            <UIcon
              name="i-lucide-trending-up"
              class="size-4"
            /> +{{ spin.edge }} % cumulés
          </span>
        </div>

        <AdventureMap
          :nodes="spin.nodes"
          :index="spin.index"
          :next-chance="spin.nextChance"
        />
      </PPanel>

      <Transition name="rise">
        <p
          v-if="spin.lastTreasure"
          class="treasure"
        >
          <UIcon
            name="i-lucide-gift"
            class="size-4"
          /> {{ spin.lastTreasure }}
        </p>
      </Transition>

      <div class="cta">
        <PButton
          color="primary"
          size="lg"
          :loading="spin.busy"
          :disabled="spin.busy || !next"
          @click="spin.advance()"
        >
          <UIcon
            :name="cta.icon"
            class="size-5"
          /> {{ cta.label }}
        </PButton>
        <button
          class="cta__quit"
          :disabled="spin.busy"
          @click="spin.reset()"
        >
          Abandonner
        </button>
      </div>
    </template>

    <!-- ═══ Victoire ═══ -->
    <PPanel
      v-else-if="spin.phase === 'victory'"
      class="end end--win"
    >
      <span class="end__badge">🏆</span>
      <h2 class="end__title font-display">
        Aventure réussie !
      </h2>
      <p
        v-if="spin.rewardCoins"
        class="end__coins"
      >
        <UIcon
          name="i-lucide-coins"
          class="size-5"
        /> +{{ spin.rewardCoins }} 🪙 empochés
      </p>

      <div
        v-if="spin.legendaryResult"
        class="leg"
        :class="spin.legendaryResult.captured ? 'leg--win' : 'leg--miss'"
      >
        <span class="leg__frame">
          <img
            :src="spin.legendaryResult.mon.imageUrl"
            :alt="spin.legendaryResult.mon.name"
          >
        </span>
        <p class="leg__title font-display">
          {{ spin.legendaryResult.captured ? `${spin.legendaryResult.mon.name} capturé ! ✨` : 'Le légendaire s\'est échappé…' }}
        </p>
        <p class="leg__sub">
          {{ spin.legendaryResult.captured
            ? (spin.legendaryResult.transferred ? 'Il rejoint ta collection !' : 'Capturé — mais pas transféré cette fois.')
            : 'Reviens tenter ta chance à la prochaine aventure.' }}
        </p>
      </div>

      <div class="end__actions">
        <PButton
          color="primary"
          @click="spin.renew()"
        >
          <UIcon
            name="i-lucide-rotate-ccw"
            class="size-5"
          /> Nouvelle aventure
        </PButton>
        <button
          class="cta__quit"
          @click="spin.reset()"
        >
          Quitter
        </button>
      </div>
    </PPanel>

    <!-- ═══ Défaite ═══ -->
    <PPanel
      v-else
      class="end end--lose"
    >
      <span class="end__badge">
        <UIcon
          name="i-lucide-shield-x"
          class="size-9"
        />
      </span>
      <h2 class="end__title font-display">
        Aventure terminée
      </h2>
      <p class="end__sub">
        Tu es tombé·e au combat. Les tentatives sont illimitées — retente ta chance !
      </p>
      <div class="end__actions">
        <PButton
          color="primary"
          @click="spin.renew()"
        >
          <UIcon
            name="i-lucide-rotate-ccw"
            class="size-5"
          /> Recommencer
        </PButton>
        <button
          class="cta__quit"
          @click="spin.reset()"
        >
          Quitter
        </button>
      </div>
    </PPanel>
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

.map { display: flex; flex-direction: column; gap: 14px; }
.map__stat { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.map__starter { display: flex; align-items: center; gap: 10px; }
.map__starter img { width: 44px; height: 44px; object-fit: contain; }
.map__starter b { font-family: var(--font-display); font-weight: 700; color: var(--ui-text-highlighted); display: block; }
.map__starter-lbl { font-size: .74rem; color: var(--ui-text-muted); }
.map__edge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  font-size: .8rem;
  color: #3f9e66;
  background: color-mix(in oklab, #5bbf82 15%, transparent);
  padding: 4px 11px;
  border-radius: 999px;
}

.treasure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  font-size: .88rem;
  color: #b7791f;
  background: color-mix(in oklab, #f6c453 16%, var(--ui-bg-elevated));
  border: 1px solid color-mix(in oklab, #f6c453 40%, transparent);
  padding: 10px 14px;
  border-radius: 14px;
}

.cta { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.cta__quit {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .82rem;
  color: var(--ui-text-muted);
  padding: 4px 10px;
}
.cta__quit:hover:not(:disabled) { color: var(--ui-text-highlighted); }
.cta__quit:disabled { opacity: .5; }

.end { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 28px 22px; }
.end__badge { font-size: 2.6rem; display: grid; place-items: center; }
.end--lose .end__badge { color: var(--ui-text-dimmed); }
.end__title { font-weight: 700; font-size: 1.4rem; color: var(--ui-text-highlighted); }
.end--win .end__title { color: #c07d10; }
.end__sub { font-size: .88rem; color: var(--ui-text-muted); max-width: 24rem; }
.end__coins {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-display);
  font-weight: 800;
  color: #b7791f;
  background: color-mix(in oklab, #f6c453 18%, transparent);
  padding: 6px 14px;
  border-radius: 999px;
}
.end__actions { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 8px; }

.leg { display: flex; flex-direction: column; align-items: center; gap: 5px; margin-top: 8px; }
.leg__frame {
  width: 92px;
  height: 92px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, color-mix(in oklab, #b57ee0 22%, #fff), color-mix(in oklab, #b57ee0 8%, #fff));
}
.leg--win .leg__frame { box-shadow: 0 0 0 3px #8b5cc4, 0 8px 20px -8px rgba(139, 92, 196, .6); }
.leg--miss .leg__frame { filter: grayscale(.7) opacity(.7); box-shadow: 0 0 0 3px var(--ui-border-accented); }
.leg__frame img { width: 86%; height: 86%; object-fit: contain; }
.leg__title { font-weight: 700; font-size: 1.05rem; color: var(--ui-text-highlighted); margin-top: 4px; }
.leg--win .leg__title { color: #7c4fb0; }
.leg__sub { font-size: .82rem; color: var(--ui-text-muted); }

.rise-enter-active { transition: opacity .3s ease, transform .3s var(--ease-pop); }
.rise-enter-from { opacity: 0; transform: translateY(8px); }
</style>
