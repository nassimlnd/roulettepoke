<script setup lang="ts">
import type { DomainGym, TeamMember, BattleResult } from '~/types/domain'
import type { UUID } from '~/types/api'
import { useGymStore, TOTAL_GYMS } from '~/stores/gyms'

// Page Arènes — 8 arènes, badges, estimation + combat hebdo (1/sem), et
// entraînement quotidien (+2 % de bonus d'arène). Confirmations là où l'action
// est limitée (combat 1/semaine).
const gym = useGymStore()
const toast = useToast()

const loading = ref(true)
const errorMsg = ref('')
const trainingLoading = ref(false)

const training = computed(() => gym.training)
const bonusPct = computed(() => Math.min(100, gym.training?.bonus ?? 0))

// ─── Détail / combat ──────────────────────────────────────────────────────────
const selectedId = ref<UUID | null>(null)
const detailOpen = ref(false)
const detailLoading = ref(false)
const fighting = ref(false)
const battleResult = ref<BattleResult | null>(null)

const selectedGym = computed(() => gym.gyms.find(g => g.id === selectedId.value) ?? null)
const detail = computed(() => (selectedId.value ? gym.details[selectedId.value] : null) ?? null)
const estimate = computed(() => (selectedId.value ? gym.estimates[selectedId.value] : null) ?? null)
const teamEmpty = computed(() => selectedId.value != null && selectedId.value in gym.estimates && estimate.value === null)

const champions = computed<TeamMember[]>(() => (detail.value?.champions ?? []).map(c => ({
  teamEntryId: String(c.position),
  position: c.position,
  cardId: '',
  name: c.name,
  type: c.type,
  rarity: c.rarity,
  isShiny: c.isShiny,
  imageUrl: c.imageUrl,
  typeImageUrl: null
})))

function probColor(p: number): string {
  if (p >= 60) return '#3f9e66'
  if (p >= 40) return '#cc6f16'
  return '#c62617'
}

async function openDetail(g: DomainGym) {
  selectedId.value = g.id
  battleResult.value = null
  detailOpen.value = true
  detailLoading.value = true
  try {
    await gym.loadDetail(g.id)
    if (g.canAttempt) await gym.loadEstimate(g.id)
  } catch (err) {
    errorMsg.value = humanizeError(err)
  } finally {
    detailLoading.value = false
  }
}

async function fight() {
  const g = selectedGym.value
  if (!g || fighting.value) return
  fighting.value = true
  try {
    battleResult.value = await gym.battle(g.id)
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    fighting.value = false
  }
}

async function train() {
  if (trainingLoading.value) return
  trainingLoading.value = true
  try {
    const res = await gym.train()
    toast.add({
      title: res.won
        ? `Entraînement gagné ! +${res.coinsGained} 🪙 · bonus d'arène ${res.newBonus} %`
        : `Entraînement perdu — bonus d'arène ${res.newBonus} %`,
      color: res.won ? 'success' : 'neutral',
      icon: res.won ? 'i-lucide-dumbbell' : 'i-lucide-info'
    })
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    trainingLoading.value = false
  }
}

onMounted(async () => {
  try {
    await gym.ensureFresh()
  } catch (err) {
    errorMsg.value = humanizeError(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="gyms">
    <!-- En-tête -->
    <header class="gyms__head">
      <div class="gyms__title-wrap">
        <h1 class="gyms__title font-display">
          Arènes
        </h1>
        <div class="gyms__progress">
          <div class="gbar">
            <i :style="{ width: (gym.badgeCount / TOTAL_GYMS * 100) + '%' }" />
          </div>
          <span class="tabular">{{ gym.badgeCount }}/{{ TOTAL_GYMS }} badges</span>
        </div>
      </div>
      <CoinBalance />
    </header>

    <!-- Champion de Kanto -->
    <div
      v-if="gym.isChampion"
      class="champ"
    >
      <span class="champ__emoji">🏆</span>
      <div>
        <p class="champ__title font-display">
          Champion de Kanto !
        </p>
        <p class="champ__sub">
          Les 8 badges sont à toi. Ton bonus de connexion est au maximum.
        </p>
      </div>
    </div>

    <!-- Entraînement quotidien -->
    <PPanel class="train">
      <div class="train__head">
        <div>
          <p class="train__title font-display">
            <UIcon
              name="i-lucide-dumbbell"
              class="size-4"
            /> Entraînement quotidien
          </p>
          <p class="train__sub">
            Un combat par jour : +5 🪙 et +2 % de bonus d'arène (cumulable jusqu'à 100 %).
          </p>
        </div>
        <PButton
          color="secondary"
          :loading="trainingLoading"
          :disabled="!training?.canFightToday || trainingLoading"
          @click="train"
        >
          <UIcon
            name="i-lucide-dumbbell"
            class="size-5"
          />
          {{ training?.canFightToday ? "S'entraîner" : 'Fait aujourd\'hui' }}
        </PButton>
      </div>
      <div class="train__gauge">
        <div class="train__bar">
          <i :style="{ width: bonusPct + '%' }" />
        </div>
        <span class="train__val tabular">Bonus d'arène&nbsp;: <b>{{ training?.bonus ?? 0 }} %</b></span>
      </div>
    </PPanel>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      :title="errorMsg"
    />

    <!-- Grille des arènes -->
    <div
      v-if="loading"
      class="grid"
    >
      <USkeleton
        v-for="i in TOTAL_GYMS"
        :key="i"
        class="h-52 rounded-2xl"
      />
    </div>
    <div
      v-else
      class="grid"
    >
      <button
        v-for="g in gym.sorted"
        :key="g.id"
        class="grid__cell"
        @click="openDetail(g)"
      >
        <GymTile :gym="g" />
      </button>
    </div>

    <!-- ═══ Détail / Combat ═══ -->
    <UModal
      v-model:open="detailOpen"
      :title="battleResult ? 'Combat' : (selectedGym?.name || 'Arène')"
      :dismissible="!fighting"
      :ui="{ footer: 'justify-end gap-2' }"
    >
      <template #body>
        <div
          v-if="detailLoading"
          class="dloading"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-7 animate-spin"
          />
        </div>

        <!-- Combat en cours / résultat -->
        <BattleView
          v-else-if="battleResult && selectedGym"
          :result="battleResult"
          :gym-name="selectedGym.name"
          :badge-image-url="selectedGym.badgeImageUrl"
        />

        <!-- Vue détail -->
        <div
          v-else-if="selectedGym && detail"
          class="detail"
        >
          <div
            class="detail__type"
            :style="{ '--tc': detail.typeColor }"
          >
            <img
              :src="detail.typeImageUrl"
              :alt="selectedGym.type"
              class="detail__type-img"
            >
            <span>Champion·ne de type <b>{{ selectedGym.type }}</b></span>
          </div>

          <!-- Estimation -->
          <div
            v-if="estimate"
            class="est"
          >
            <div class="est__head">
              <span class="est__label">Estimation de victoire</span>
              <span
                class="est__pct tabular"
                :style="{ color: probColor(estimate.winProbability) }"
              >{{ estimate.winProbability }} %</span>
            </div>
            <div class="est__track">
              <i
                :style="{ width: estimate.winProbability + '%', background: probColor(estimate.winProbability) }"
              />
            </div>
            <details
              v-if="estimate.matchups.length"
              class="est__more"
            >
              <summary>Détail par duel</summary>
              <ul>
                <li
                  v-for="(m, i) in estimate.matchups"
                  :key="i"
                >
                  <span>{{ m.player }} <span class="est__vs">vs</span> {{ m.champion }}</span>
                  <span
                    class="tabular"
                    :style="{ color: probColor(m.probability) }"
                  >{{ m.probability }} %</span>
                </li>
              </ul>
            </details>
          </div>
          <p
            v-else-if="teamEmpty"
            class="detail__empty"
          >
            <UIcon
              name="i-lucide-triangle-alert"
              class="size-4"
            />
            Compose une équipe pour estimer et défier cette arène.
          </p>

          <!-- Types recommandés -->
          <div
            v-if="detail.recommendedTypes.length"
            class="rec"
          >
            <span class="rec__label">Types conseillés</span>
            <span class="rec__chips">
              <span
                v-for="t in detail.recommendedTypes"
                :key="t.name"
                class="rec__chip"
                :style="{ '--tc': t.color }"
              >
                <img
                  :src="t.imageUrl"
                  :alt="t.name"
                >{{ t.name }}
              </span>
            </span>
          </div>

          <!-- Équipe du champion -->
          <div class="champs">
            <span class="champs__label">Équipe du champion ({{ champions.length }})</span>
            <div class="champs__grid">
              <TeamCard
                v-for="c in champions"
                :key="c.position"
                :member="c"
                size="sm"
                :interactive="false"
              />
            </div>
          </div>
        </div>
      </template>

      <template
        v-if="!detailLoading"
        #footer
      >
        <!-- Après combat -->
        <template v-if="battleResult">
          <PButton
            :to="battleResult.won ? undefined : '/team'"
            :color="battleResult.won ? 'primary' : 'neutral'"
            @click="detailOpen = false"
          >
            {{ battleResult.won ? 'Génial !' : 'Gérer mon équipe' }}
          </PButton>
        </template>
        <!-- Détail -->
        <template v-else-if="selectedGym">
          <PButton
            v-if="teamEmpty"
            color="neutral"
            to="/team"
            @click="detailOpen = false"
          >
            <UIcon
              name="i-lucide-users"
              class="size-5"
            />
            Composer mon équipe
          </PButton>
          <PButton
            v-else-if="selectedGym.hasBadge"
            color="success"
            disabled
          >
            <UIcon
              name="i-lucide-check"
              class="size-5"
            />
            Badge obtenu
          </PButton>
          <PButton
            v-else-if="!selectedGym.canAttempt"
            color="neutral"
            disabled
          >
            Déjà tenté cette semaine
          </PButton>
          <PButton
            v-else
            :loading="fighting"
            :disabled="fighting"
            @click="fight"
          >
            <UIcon
              name="i-lucide-swords"
              class="size-5"
            />
            Combattre
          </PButton>
        </template>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.gyms { display: flex; flex-direction: column; gap: 16px; }
.gyms__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.gyms__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.gyms__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: .88rem;
  font-weight: 700;
  color: var(--ui-text-muted);
}
.gbar {
  width: 150px;
  height: 9px;
  border-radius: 99px;
  background: var(--ui-bg-accented);
  overflow: hidden;
}
.gbar > i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #ffd67f, var(--color-poke-500));
  transition: width .6s var(--ease-glide);
}

.champ {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 18px;
  background: linear-gradient(150deg, #fff4d6, #ffe6ac);
  border: 1px solid rgba(224, 169, 46, .4);
}
.champ__emoji { font-size: 2.2rem; }
.champ__title { font-weight: 700; font-size: 1.15rem; color: #7a4c07; }
.champ__sub { font-size: .85rem; font-weight: 600; color: #96702c; }

.train__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.train__title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 1rem; }
.train__sub { font-size: .82rem; color: var(--ui-text-muted); margin-top: 3px; max-width: 34rem; }
.train__gauge { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.train__bar {
  flex: 1;
  height: 10px;
  border-radius: 99px;
  background: var(--ui-bg-accented);
  overflow: hidden;
}
.train__bar > i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #8fd6a8, #5bbf82);
  transition: width .6s var(--ease-glide);
}
.train__val { font-size: .82rem; font-weight: 700; color: var(--ui-text-muted); flex: none; }
.train__val b { color: var(--ui-text-highlighted); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 14px;
}
.grid__cell {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: 18px;
  text-align: left;
  transition: transform .18s var(--ease-pop);
}
.grid__cell:hover { transform: translateY(-4px); }
.grid__cell:focus-visible { outline: 3px solid var(--color-poke-400); outline-offset: 3px; }

.dloading { display: grid; place-items: center; padding: 40px; color: var(--color-poke-500); }

.detail { display: flex; flex-direction: column; gap: 16px; }
.detail__type {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: .9rem;
  color: var(--ui-text-toned);
}
.detail__type-img { width: 30px; height: 20px; object-fit: contain; }
.detail__type b { color: var(--tc); }
.detail__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .85rem;
  font-weight: 600;
  color: var(--color-poke-600);
  background: var(--color-poke-50);
  padding: 10px 12px;
  border-radius: 12px;
}

.est { display: flex; flex-direction: column; gap: 6px; }
.est__head { display: flex; align-items: baseline; justify-content: space-between; }
.est__label { font-size: .82rem; font-weight: 700; color: var(--ui-text-muted); }
.est__pct { font-family: var(--font-display); font-weight: 700; font-size: 1.5rem; }
.est__track {
  height: 12px;
  border-radius: 99px;
  background: var(--ui-bg-accented);
  overflow: hidden;
}
.est__track > i { display: block; height: 100%; border-radius: 99px; transition: width .5s var(--ease-glide); }
.est__more { margin-top: 2px; }
.est__more summary {
  font-size: .8rem;
  font-weight: 700;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.est__more ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.est__more li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: .8rem;
  font-weight: 600;
  color: var(--ui-text);
}
.est__vs { color: var(--ui-text-dimmed); font-weight: 700; font-size: .74em; }

.rec { display: flex; flex-direction: column; gap: 7px; }
.rec__label { font-size: .82rem; font-weight: 700; color: var(--ui-text-muted); }
.rec__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rec__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: .78rem;
  font-weight: 700;
  color: #fff;
  background: var(--tc);
  padding: 3px 10px 3px 5px;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .25);
  text-shadow: 0 1px 1px rgba(0, 0, 0, .2);
}
.rec__chip img { width: 18px; height: 18px; object-fit: contain; }

.champs { display: flex; flex-direction: column; gap: 8px; }
.champs__label { font-size: .82rem; font-weight: 700; color: var(--ui-text-muted); }
.champs__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 10px;
}
</style>
