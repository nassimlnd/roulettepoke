<script setup lang="ts">
import { useSpinStore, SPIN_REWARD_COINS } from '~/stores/spin'
import { nextWeekly } from '~/utils/paris-time'

// Spin / Aventure — l'écran de lancement : explique le mode, montre le statut
// hebdomadaire (récompenses déjà obtenues ?), puis ouvre l'aventure en plein
// écran (AdventureScene, overlay immersif).
const spin = useSpinStore()

// Reset hebdo du Spin : lundi 00:00 Paris (cohérent avec la tuile du hub).
const weeklyReset = nextWeekly(1, 0)

const rewardDone = computed(() => spin.rewardedThisWeek)
const legendDone = computed(() => spin.legendaryLockedThisWeek)
const transferPct = computed(() => {
  const r = spin.weekStatus?.legendaryTransferRate
  return r != null ? Math.round(r * 100) : null
})
const allClaimed = computed(() => spin.statusLoaded && rewardDone.value && legendDone.value)

// Les 3 actes du périple (pédagogie de l'écran de lancement).
const ACTS = [
  {
    n: 1, c: '#37b06a', icon: 'i-lucide-medal', title: 'Le circuit des Arènes',
    desc: 'Six Champions à défier. À chaque victoire ton starter gagne des niveaux et évolue. Non létal : une défaite ne coûte qu\'un badge.'
  },
  {
    n: 2, c: '#8b5cc4', icon: 'i-lucide-swords', title: 'Le Conseil des 4',
    desc: 'Quatre Maîtres, en combats à la vie à la mort. Un Rappel te relève d\'une défaite — sinon l\'aventure s\'arrête.'
  },
  {
    n: 3, c: '#e8952f', icon: 'i-lucide-crown', title: 'Champion & Légendaire',
    desc: 'Détrône le Champion, puis tente de capturer un légendaire — choisi au hasard, transférable dans ta collection.'
  }
]
const MECHANICS = [
  { icon: 'i-lucide-signpost', label: 'Choix à chaque étape' },
  { icon: 'i-lucide-plus', label: 'Centre Pokémon' },
  { icon: 'i-lucide-store', label: 'Marchand' },
  { icon: 'i-lucide-gift', label: 'Coffres' },
  { icon: 'i-lucide-shield-plus', label: 'Objets tenus' },
  { icon: 'i-lucide-flame', label: 'Élan' }
]

onMounted(() => spin.loadStatus())
</script>

<template>
  <div class="adv">
    <header class="adv__head">
      <span class="adv__eyebrow font-display">Mode Aventure</span>
      <h1 class="adv__title font-display">
        L'Aventure
      </h1>
      <p class="adv__lead">
        Un périple en combats réels : traverse le circuit des Arènes, affronte le
        Conseil des 4, détrône le Champion — et tente de capturer un légendaire.
      </p>
    </header>

    <!-- ═══ Statut de la semaine ═══ -->
    <PPanel class="week">
      <div class="week__head">
        <h2 class="sect__t font-display">
          <UIcon
            name="i-lucide-calendar-check"
            class="size-5"
          /> Statut de la semaine
        </h2>
        <span class="week__reset">
          <UIcon
            name="i-lucide-hourglass"
            class="size-3.5"
          />
          Réinit. lundi · <CountdownChip :target="weeklyReset" />
        </span>
      </div>

      <template v-if="spin.statusLoaded">
        <ul class="stats">
          <li
            class="stat"
            :class="rewardDone ? 'stat--done' : 'stat--open'"
          >
            <span class="stat__ico"><UIcon name="i-lucide-coins" /></span>
            <span class="stat__body">
              <b class="stat__name font-display">Récompense hebdomadaire</b>
              <i class="stat__sub">{{ SPIN_REWARD_COINS }} 🪙 pour un circuit complet</i>
            </span>
            <span class="stat__badge">
              <UIcon
                :name="rewardDone ? 'i-lucide-circle-check' : 'i-lucide-sparkles'"
                class="size-3.5"
              />
              {{ rewardDone ? 'Déjà obtenue' : 'À gagner' }}
            </span>
          </li>
          <li
            class="stat"
            :class="legendDone ? 'stat--done' : 'stat--open'"
          >
            <span class="stat__ico"><UIcon name="i-lucide-sparkles" /></span>
            <span class="stat__body">
              <b class="stat__name font-display">Rencontre légendaire</b>
              <i class="stat__sub">
                Un légendaire à capturer<template v-if="transferPct !== null"> · transfert {{ transferPct }} %</template>
              </i>
            </span>
            <span class="stat__badge">
              <UIcon
                :name="legendDone ? 'i-lucide-circle-check' : 'i-lucide-sparkles'"
                class="size-3.5"
              />
              {{ legendDone ? 'Déjà capturé' : 'Disponible' }}
            </span>
          </li>
        </ul>
        <p
          v-if="allClaimed"
          class="week__note"
        >
          <UIcon
            name="i-lucide-info"
            class="size-4"
          />
          Tu as déjà tout récolté cette semaine — rejoue pour t'entraîner, les récompenses reviennent lundi.
        </p>
      </template>
      <div
        v-else
        class="week__load"
      >
        <span class="skel" />
        <span class="skel" />
      </div>
    </PPanel>

    <!-- ═══ Comment ça marche ═══ -->
    <PPanel class="how">
      <h2 class="sect__t font-display">
        <UIcon
          name="i-lucide-compass"
          class="size-5"
        /> Comment ça marche
      </h2>
      <ol class="acts">
        <li
          v-for="a in ACTS"
          :key="a.n"
          class="act"
          :style="{ '--c': a.c }"
        >
          <span class="act__num font-display">{{ a.n }}</span>
          <span class="act__ico"><UIcon :name="a.icon" /></span>
          <span class="act__body">
            <b class="act__t font-display">{{ a.title }}</b>
            <span class="act__d">{{ a.desc }}</span>
          </span>
        </li>
      </ol>
      <div class="mechs">
        <span
          v-for="m in MECHANICS"
          :key="m.label"
          class="mech"
        >
          <UIcon
            :name="m.icon"
            class="size-3.5"
          /> {{ m.label }}
        </span>
      </div>
    </PPanel>

    <!-- ═══ Lancement ═══ -->
    <div class="cta">
      <PButton
        color="primary"
        size="lg"
        class="cta__btn"
        @click="spin.begin()"
      >
        <UIcon
          name="i-lucide-play"
          class="size-5"
        /> Commencer l'aventure
      </PButton>
      <p class="cta__hint">
        <template v-if="allClaimed">
          Récompenses de la semaine déjà prises — rejoue pour le plaisir et l'entraînement.
        </template>
        <template v-else-if="rewardDone">
          Récompense hebdo déjà prise, mais un légendaire t'attend encore.
        </template>
        <template v-else>
          Choisis ton starter (Kanto) — il t'accompagnera de bout en bout.
        </template>
      </p>
    </div>

    <!-- L'aventure (overlay plein écran) : visible dès qu'un run démarre. -->
    <AdventureScene />
  </div>
</template>

<style scoped>
.adv { display: flex; flex-direction: column; gap: 16px; max-width: 34rem; margin: 0 auto; }

.adv__head { display: flex; flex-direction: column; gap: 4px; }
.adv__eyebrow { font-weight: 800; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--color-poke-600, #d33d2f); }
.adv__title { font-weight: 700; font-size: 1.8rem; margin: 0; }
.adv__lead { font-size: .9rem; color: var(--ui-text-muted); }

/* Titres de section */
.sect__t { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.08rem; color: var(--ui-text-highlighted); }
.sect__t :deep(svg) { color: var(--color-poke-500); }

/* ── Statut de la semaine ── */
.week { display: flex; flex-direction: column; gap: 14px; }
.week__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.week__reset { display: inline-flex; align-items: center; gap: 5px; font-size: .76rem; font-weight: 700; color: var(--ui-text-dimmed); }

.stats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.stat {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 15px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
}
.stat__ico {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: var(--sc);
  background: color-mix(in oklab, var(--sc) 18%, var(--ui-bg-elevated));
}
.stat__ico :deep(svg) { width: 22px; height: 22px; }
.stat__body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.stat__name { font-weight: 700; font-size: .96rem; color: var(--ui-text-highlighted); }
.stat__sub { font-style: normal; font-size: .78rem; color: var(--ui-text-muted); }
.stat__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .74rem;
  padding: 5px 11px;
  border-radius: 999px;
  color: color-mix(in oklab, var(--sc) 60%, var(--ui-text-highlighted));
  background: color-mix(in oklab, var(--sc) 20%, transparent);
}
.stat--open { --sc: #1f9d5a; }
.stat--done { --sc: #97a0ac; }
.stat--done .stat__name { color: var(--ui-text-toned); }

.week__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: .82rem;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px dashed var(--ui-border-accented);
  padding: 10px 13px;
  border-radius: 13px;
}
.week__note :deep(svg) { flex: none; margin-top: 1px; color: var(--color-poke-500); }

.week__load { display: flex; flex-direction: column; gap: 10px; }
.skel { height: 64px; border-radius: 15px; background: linear-gradient(100deg, var(--ui-bg-muted) 30%, var(--ui-bg-accented) 50%, var(--ui-bg-muted) 70%); background-size: 200% 100%; animation: shimmer 1.3s ease-in-out infinite; }

/* ── Comment ça marche ── */
.how { display: flex; flex-direction: column; gap: 14px; }
.acts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.act { position: relative; display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: start; padding-left: 4px; }
.act__num {
  position: absolute;
  top: -3px;
  left: 26px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-weight: 800;
  font-size: .72rem;
  color: #fff;
  background: var(--c);
  box-shadow: 0 0 0 2px var(--ui-bg-elevated);
}
.act__ico {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  color: var(--c);
  background: color-mix(in oklab, var(--c) 18%, var(--ui-bg-elevated));
  border: 1.5px solid color-mix(in oklab, var(--c) 34%, transparent);
}
.act__ico :deep(svg) { width: 24px; height: 24px; }
.act__body { display: flex; flex-direction: column; gap: 2px; padding-top: 2px; }
.act__t { font-weight: 700; font-size: 1rem; color: var(--ui-text-highlighted); }
.act__d { font-size: .84rem; line-height: 1.5; color: var(--ui-text-muted); }

.mechs { display: flex; flex-wrap: wrap; gap: 7px; padding-top: 2px; }
.mech {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: .76rem;
  font-weight: 700;
  color: var(--ui-text-toned);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  padding: 5px 11px;
  border-radius: 999px;
}
.mech :deep(svg) { color: var(--color-poke-500); }

/* ── Lancement ── */
.cta { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 6px 0 4px; }
.cta__btn { min-width: 260px; justify-content: center; }
.cta__hint { font-size: .82rem; color: var(--ui-text-muted); text-align: center; max-width: 24rem; }

@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skel { animation: none; } }
</style>
