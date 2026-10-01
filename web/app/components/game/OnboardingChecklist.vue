<script setup lang="ts">
// Checklist « Premiers pas » (v4.4) : 8 étapes suivies par le serveur et
// 150 🪙 dans chaque région une fois tout fait. Sur l'accueil, pour les comptes
// qui n'ont pas encore réclamé — et jamais plus après renoncement.
import { hashToRoute } from '~/utils/links'

const onboarding = useOnboardingStore()
const toast = useToast()
const { pending, run } = useAsyncAction()
const open = ref(true)
const abandonOpen = ref(false)

const steps = computed(() =>
  (onboarding.status?.steps ?? []).map(s => ({ ...s, to: hashToRoute(s.link) })))
const total = computed(() => steps.value.length)
const canClaim = computed(() => !!onboarding.status?.allDone && !onboarding.status?.rewardClaimed)

function claim() {
  return run(async () => {
    const res = await onboarding.claim()
    toast.add({
      title: 'Premiers pas terminés ! 🎉',
      description: `+${res.coinsGen1} 🪙 Kanto · +${res.coinsGen2} 🪙 Johto · +${res.coinsGen3} 🪙 Hoenn — bienvenue dans l'aventure !`,
      color: 'success',
      icon: 'i-lucide-party-popper'
    })
  })
}

function abandon() {
  onboarding.dismiss()
  abandonOpen.value = false
}

onMounted(() => {
  onboarding.ensureFresh().catch(() => {})
})
</script>

<template>
  <PPanel
    v-if="onboarding.visible"
    class="ob"
  >
    <button
      type="button"
      class="ob__sum"
      :aria-expanded="open"
      @click="open = !open"
    >
      <UIcon
        name="i-lucide-compass"
        class="size-5 ob__ico"
      />
      <span class="ob__title font-display">Premiers pas</span>
      <span class="ob__count tabular">{{ onboarding.doneCount }} / {{ total }}</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 ob__caret"
        :class="{ 'ob__caret--open': open }"
      />
    </button>

    <div
      v-if="open"
      class="ob__body"
    >
      <ul class="ob__list">
        <li
          v-for="s in steps"
          :key="s.key"
          class="ob__step"
          :class="{ 'ob__step--done': s.done }"
        >
          <UIcon
            :name="s.done ? 'i-lucide-circle-check' : 'i-lucide-circle'"
            class="size-4 ob__check"
          />
          <NuxtLink
            v-if="s.to && !s.done"
            :to="s.to"
            class="ob__label ob__label--link"
          >{{ s.label }}</NuxtLink>
          <span
            v-else
            class="ob__label"
          >{{ s.label }}<span
            v-if="!s.to && !s.done"
            class="ob__soon"
          >bientôt ici</span></span>
        </li>
      </ul>

      <div class="ob__foot">
        <PButton
          v-if="canClaim"
          icon="i-lucide-gift"
          :loading="pending"
          @click="claim"
        >
          Réclamer 150 🪙 dans chaque région
        </PButton>
        <template v-else>
          <span class="ob__hint">Tout cocher rapporte 150 🪙 dans chaque région — une seule fois.</span>
          <button
            type="button"
            class="ob__skip"
            @click="abandonOpen = true"
          >
            Pas besoin de Premiers pas
          </button>
        </template>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="abandonOpen"
      title="Abandonner les Premiers pas ?"
      message="Tu ne toucheras pas la récompense de fin (150 🪙 dans chaque région). C'est définitif."
      confirm-label="Abandonner"
      danger
      @confirm="abandon"
    />
  </PPanel>
</template>

<style scoped>
.ob { padding: 0 !important; overflow: hidden; }
.ob__sum {
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
.ob__sum:hover { background: var(--ui-bg-muted); }
.ob__ico { color: var(--color-poke-500); flex: none; }
.ob__title { font-weight: 700; font-size: .95rem; flex: 1; min-width: 0; }
.ob__count { font-size: .84rem; color: var(--ui-text-muted); }
.ob__caret { color: var(--ui-text-dimmed); transition: transform .2s ease; flex: none; }
.ob__caret--open { transform: rotate(180deg); }
.ob__body { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 12px; }
.ob__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; grid-template-columns: 1fr; }
@media (min-width: 640px) { .ob__list { grid-template-columns: 1fr 1fr; } }
.ob__step { display: flex; align-items: center; gap: 8px; font-size: .88rem; color: var(--ui-text); }
.ob__step--done { color: var(--ui-text-dimmed); }
.ob__check { flex: none; color: var(--ui-text-dimmed); }
.ob__step--done .ob__check { color: #3f9e66; }
.ob__label--link { color: var(--ui-text); }
.ob__label--link:hover { color: var(--color-poke-600); text-decoration: underline; }
.ob__soon {
  margin-left: 6px;
  font-size: .68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--ui-text-dimmed);
  background: var(--ui-bg-muted);
  border-radius: 6px;
  padding: 1px 6px;
}
.ob__foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.ob__hint { font-size: .8rem; color: var(--ui-text-muted); }
.ob__skip {
  font-size: .8rem;
  font-weight: 600;
  color: var(--ui-text-dimmed);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: color .15s ease, background .15s ease;
}
.ob__skip:hover { color: var(--ui-text); background: var(--ui-bg-muted); }
</style>
