<script setup lang="ts">
// Coque de panneau d'authentification (login/register/reset) : Poké Ball en
// « couronne », titre + sous-titre, corps (formulaire) et pied (liens).
// Style « Mochidex » : carte blanche, coins doux, ombre douce.
defineProps<{ title: string, subtitle?: string }>()
</script>

<template>
  <div class="panel">
    <div class="panel__crown">
      <PokeBall
        :size="66"
        float
      />
    </div>

    <div class="panel__head">
      <h1 class="panel__title">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="panel__sub"
      >
        {{ subtitle }}
      </p>
    </div>

    <div class="panel__body">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="panel__footer"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: relative;
  margin-top: 36px;
  padding: 46px 30px 26px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 26px;
  box-shadow:
    0 22px 50px -16px rgba(60, 40, 40, .22),
    0 2px 8px rgba(60, 40, 40, .06);
}
.panel__crown {
  position: absolute;
  top: -33px;
  left: 50%;
  transform: translateX(-50%);
}
.panel__head {
  text-align: center;
  margin-bottom: 22px;
}
.panel__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.55rem;
  line-height: 1.1;
  color: var(--ui-text-highlighted);
  margin: 0;
}
.panel__sub {
  color: var(--ui-text-muted);
  margin: 7px 0 0;
  font-size: .95rem;
}
.panel__footer {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--ui-border);
  text-align: center;
}
</style>
