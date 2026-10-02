<script setup lang="ts">
// Objectif de la semaine (v5.1) : un défi collectif, replié par défaut comme
// dans le jeu d'origine — un résumé chiffré suffit tant qu'on ne cherche pas
// le détail. La progression est recalculée côté serveur.
const events = useEventsStore()
const open = ref(false)
const goal = computed(() => events.goal)
const view = computed(() => events.goalView)
</script>

<template>
  <PPanel
    v-if="goal && view"
    class="goal"
  >
    <button
      type="button"
      class="goal__sum"
      :aria-expanded="open"
      @click="open = !open"
    >
      <UIcon
        name="i-lucide-handshake"
        class="size-5 goal__ico"
      />
      <span class="goal__title font-display">Objectif de la semaine</span>
      <span class="goal__nums tabular">
        <UIcon
          :name="view.icon"
          class="size-4"
        />{{ goal.progress.toLocaleString('fr-FR') }} / {{ goal.target.toLocaleString('fr-FR') }} ({{ view.percent }} %)
      </span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 goal__caret"
        :class="{ 'goal__caret--open': open }"
      />
    </button>

    <div
      v-if="open"
      class="goal__body"
    >
      <p class="goal__lead">
        Ensemble, atteignons <b>{{ goal.target.toLocaleString('fr-FR') }}</b> {{ view.noun }} avant dimanche !
      </p>
      <div
        class="goal__bar"
        role="progressbar"
        :aria-valuemin="0"
        :aria-valuemax="goal.target"
        :aria-valuenow="goal.progress"
      >
        <i
          :style="{ width: view.percent + '%' }"
          :class="{ 'goal__fill--done': view.achieved }"
        />
      </div>
      <p class="goal__count tabular">
        <b>{{ goal.progress.toLocaleString('fr-FR') }}</b> / {{ goal.target.toLocaleString('fr-FR') }}{{ view.achieved ? ' — 🎉 Objectif atteint !' : '' }}
      </p>
      <p
        class="goal__me"
        :class="{ 'goal__me--ok': view.qualifies }"
      >
        {{ view.qualifies
          ? `✅ Ta contribution : ${goal.myContribution} — tu recevras la récompense si l'objectif est atteint.`
          : `Ta contribution : ${goal.myContribution} / ${goal.minContribution} minimum pour toucher la récompense.` }}
      </p>
      <p
        v-if="goal.reward"
        class="goal__reward"
      >
        🎁 Récompense : <b>{{ goal.reward.label }}</b> pour chaque joueur ayant contribué, versée lundi. {{ view.hint }}
      </p>
      <p class="goal__who">
        {{ goal.contributors }} dresseur{{ goal.contributors > 1 ? 's ont' : ' a' }} déjà contribué.
      </p>
    </div>
  </PPanel>
</template>

<style scoped>
.goal { padding: 0 !important; overflow: hidden; }
.goal__sum {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  color: var(--ui-text);
  transition: background .15s ease;
}
.goal__sum:hover { background: var(--ui-bg-muted); }
.goal__ico { color: #3f9e66; flex: none; }
.goal__title { font-weight: 700; font-size: .95rem; flex: 1; min-width: 0; }
.goal__nums {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: .84rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
}
.goal__caret { color: var(--ui-text-dimmed); transition: transform .2s ease; flex: none; }
.goal__caret--open { transform: rotate(180deg); }
.goal__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 14px 14px;
  font-size: .88rem;
  color: var(--ui-text-muted);
}
.goal__body p { margin: 0; }
.goal__lead { color: var(--ui-text); }
.goal__bar {
  height: 10px;
  border-radius: 99px;
  background: var(--ui-bg-accented);
  overflow: hidden;
}
.goal__bar > i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #8fd6a8, #3f9e66);
  transition: width .6s var(--ease-glide);
}
.goal__fill--done { background: linear-gradient(90deg, #ffd67f, #e0a92e) !important; }
.goal__count b { color: var(--ui-text-highlighted); }
.goal__me--ok { color: #3f9e66; }
.goal__reward b { color: var(--ui-text-highlighted); }
.goal__who { font-size: .78rem; color: var(--ui-text-dimmed); }
</style>
