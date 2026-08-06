<script setup lang="ts">
import { GENERATIONS, type Generation } from '~/constants/generation'

// Bascule Kanto ↔ Johto. Depuis la v4 la génération active détermine la bourse
// dépensée, le parcours d'arènes et l'équipe engagée : c'est un sélecteur
// global, pas un filtre de page. On l'accole au solde parce que les deux
// répondent à la même question — « quel argent est-ce que je dépense ? ».
const auth = useAuthStore()
const wallet = useWalletStore()
const toast = useToast()

const active = computed(() => wallet.activeGeneration)
const activeMeta = computed(() =>
  GENERATIONS.find(g => g.id === active.value) ?? GENERATIONS[0]!)

function purse(g: Generation): string {
  const v = wallet.purses[g]
  return v === null ? '—' : v.toLocaleString('fr-FR')
}

const switching = ref(false)
async function pick(g: Generation) {
  if (g === active.value || switching.value) return
  switching.value = true
  try {
    await auth.setActiveGeneration(g)
    const region = GENERATIONS.find(x => x.id === g)?.region ?? ''
    toast.add({
      title: `Direction ${region} !`,
      description: 'Bourse, arènes et équipe suivent la région active.',
      color: 'secondary',
      icon: 'i-lucide-map'
    })
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <UPopover :content="{ align: 'end', sideOffset: 6 }">
    <button
      type="button"
      class="gsw"
      :disabled="switching"
      :aria-label="`Région ${activeMeta.region}, ${purse(active)} pièces. Changer de région.`"
    >
      <span
        class="gsw__pip"
        aria-hidden="true"
      />
      <span class="gsw__val tabular">{{ purse(active) }}</span>
      <span class="gsw__sep" />
      <span class="gsw__region">{{ activeMeta.region }}</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-3 gsw__caret"
      />
    </button>

    <template #content>
      <div class="pick">
        <p class="pick__head">
          Région active
        </p>
        <button
          v-for="g in GENERATIONS"
          :key="g.id"
          type="button"
          class="pick__opt"
          :class="{ 'pick__opt--on': g.id === active }"
          :disabled="switching"
          @click="pick(g.id)"
        >
          <UIcon
            :name="g.icon"
            class="size-4 pick__icon"
          />
          <span class="pick__name">{{ g.region }}</span>
          <span class="pick__coins tabular">
            <span
              class="gsw__pip gsw__pip--xs"
              aria-hidden="true"
            />{{ purse(g.id) }}
          </span>
          <UIcon
            v-if="g.id === active"
            name="i-lucide-check"
            class="size-4 pick__check"
          />
        </button>
        <p class="pick__note">
          Chaque région a sa propre bourse, ses arènes et son équipe.
        </p>
      </div>
    </template>
  </UPopover>
</template>

<style scoped>
/* Reprend la pilule ambre de CoinBalance, augmentée du nom de région. */
.gsw {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 5px 6px;
  border-radius: 12px;
  background: linear-gradient(150deg, #fff2d6, #ffe0a0);
  border: 1.5px solid #f0d189;
  box-shadow: 0 2px 0 #e6bd63;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: #8a5a12;
  line-height: 1;
  cursor: pointer;
  transition: transform .12s var(--ease-pop);
}
.gsw:hover:not(:disabled) { transform: translateY(-1px); }
.gsw:disabled { opacity: .6; cursor: progress; }
.gsw:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 2px; }
.gsw__pip {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, #f6c453 62%, #e0a92e);
  box-shadow: 0 0 6px rgba(246, 196, 83, .55), inset 0 -2px 0 rgba(0, 0, 0, .08);
  flex: none;
}
.gsw__pip--xs { width: 14px; height: 14px; box-shadow: none; }
.gsw__sep {
  width: 1px;
  height: 14px;
  background: rgba(138, 90, 18, .28);
  flex: none;
}
.gsw__region { font-size: .82rem; }
.gsw__caret { opacity: .55; margin-left: -3px; }
@media (max-width: 420px) {
  .gsw__sep, .gsw__region { display: none; }
}

.pick { padding: 6px; min-width: 15rem; }
.pick__head {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 700;
  color: var(--ui-text-dimmed);
  padding: 4px 8px 6px;
}
.pick__opt {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 10px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .9rem;
  color: var(--ui-text);
  text-align: left;
  cursor: pointer;
  transition: background .15s ease;
}
.pick__opt:hover:not(:disabled) { background: var(--ui-bg-muted); }
.pick__opt:disabled { opacity: .55; cursor: progress; }
.pick__opt--on { background: var(--ui-bg-muted); color: var(--ui-text-highlighted); }
.pick__icon { color: var(--ui-text-muted); flex: none; }
.pick__name { flex: 1; min-width: 0; }
.pick__coins {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: .84rem;
  color: #8a5a12;
}
:global(.dark) .pick__coins { color: #e8c274; }
.pick__check { color: var(--color-poke-500); flex: none; }
.pick__note {
  font-size: .72rem;
  color: var(--ui-text-dimmed);
  padding: 8px 8px 4px;
  line-height: 1.4;
}
</style>
