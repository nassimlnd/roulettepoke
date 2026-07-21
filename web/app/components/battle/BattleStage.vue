<script setup lang="ts">
import { useBattleStore } from '~/stores/battle'

// Overlay de combat plein écran (monté globalement). Héberge le BattleScene sur
// un fond immersif thématisé ; bouton « Continuer » à la fin.
const battle = useBattleStore()
const finished = ref(false)

watch(() => battle.active, (a) => {
  if (a) finished.value = false
})
</script>

<template>
  <Teleport to="body">
    <Transition name="stage">
      <div
        v-if="battle.active && battle.config"
        class="stage"
        :style="{ '--tc': battle.config.themeColor || '#7fc98a' }"
        role="dialog"
        aria-label="Combat"
      >
        <div class="stage__inner">
          <p
            v-if="battle.config.title"
            class="stage__title font-display"
          >
            {{ battle.config.title }}
          </p>

          <BattleScene
            :rounds="battle.config.rounds"
            :stages="battle.config.stages"
            :won="battle.config.won"
            :theme-color="battle.config.themeColor"
            :badge-url="battle.config.badgeUrl"
            :win-title="battle.config.winTitle"
            :win-sub="battle.config.winSub"
            :lose-sub="battle.config.loseSub"
            @finished="finished = true"
          />

          <Transition name="rise">
            <button
              v-if="finished"
              class="stage__continue"
              @click="battle.close()"
            >
              Continuer
            </button>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background:
    radial-gradient(120% 90% at 50% 15%, color-mix(in oklab, var(--tc) 42%, #171015) 0%, #120d12 78%);
}
.stage__inner {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stage__title {
  text-align: center;
  font-weight: 700;
  font-size: 1.4rem;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, .5);
}
.stage__continue {
  align-self: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-poke-700, #a3271b);
  background: #fff;
  padding: 12px 30px;
  border-radius: 14px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, .25);
  transition: transform .14s var(--ease-pop);
}
.stage__continue:hover { transform: translateY(-2px); }
.stage__continue:active { transform: translateY(1px); box-shadow: 0 2px 0 rgba(0, 0, 0, .25); }

.stage-enter-active, .stage-leave-active { transition: opacity .3s ease; }
.stage-enter-from, .stage-leave-to { opacity: 0; }
.rise-enter-active { transition: opacity .3s ease, transform .3s var(--ease-pop); }
.rise-enter-from { opacity: 0; transform: translateY(12px); }
@media (prefers-reduced-motion: reduce) {
  .stage-enter-active, .stage-leave-active, .rise-enter-active { transition: none; }
}
</style>
