<script setup lang="ts">
// Tableau d'un tournoi : rounds de la finale vers le premier tour, puis le
// match pour la 3ᵉ place. Chaque match rejouable (journal de combat serveur).
import type { DomainTournament, TournamentMatch } from '~/types/domain'
import { maxRound, roundLabel } from '~/utils/tournament'

const props = defineProps<{ tournament: DomainTournament, me: string | null }>()
const emit = defineEmits<{ replay: [match: TournamentMatch] }>()

const groups = computed(() => {
  const ms = props.tournament.matches
  if (!ms.length) return []
  const max = maxRound(ms)
  const rounds = [...new Set(ms.map(m => m.round))].filter(r => r !== 0).sort((a, b) => b - a)
  const order = ms.some(m => m.round === 0) ? [...rounds, 0] : rounds
  return order.map(r => ({ round: r, label: roundLabel(r, max), matches: ms.filter(m => m.round === r) }))
})

const mine = (m: TournamentMatch) => !!props.me && (m.player1Id === props.me || m.player2Id === props.me)
</script>

<template>
  <div class="bk">
    <section
      v-for="g in groups"
      :key="g.round"
      class="bk__round"
    >
      <h3 class="bk__label font-display">
        {{ g.label }}
      </h3>
      <ul class="bk__list">
        <li
          v-for="(m, i) in g.matches"
          :key="`${g.round}-${i}`"
          class="match"
          :class="{ 'match--mine': mine(m), 'match--bye': m.isBye }"
        >
          <template v-if="m.isBye">
            <span class="match__p match__p--win">{{ m.player1Name }}</span>
            <span class="match__bye">Passage automatique</span>
          </template>
          <template v-else>
            <span
              class="match__p"
              :class="{ 'match__p--win': m.winnerId === m.player1Id }"
            >{{ m.player1Name }}</span>
            <span class="match__vs">vs</span>
            <span
              class="match__p"
              :class="{ 'match__p--win': m.winnerId === m.player2Id }"
            >{{ m.player2Name }}</span>
            <button
              v-if="m.rounds.length"
              type="button"
              class="match__replay"
              :title="`Rejouer ${m.player1Name} vs ${m.player2Name}`"
              @click="emit('replay', m)"
            >
              <UIcon
                name="i-lucide-play"
                class="size-3.5"
              />
              Rejouer
            </button>
          </template>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.bk { display: flex; flex-direction: column; gap: 14px; }
.bk__label { font-weight: 700; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: var(--ui-text-muted); margin: 0 0 6px; }
.bk__list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.match {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  font-size: .86rem;
}
.match--mine { border-color: var(--color-poke-400); }
.match--bye { color: var(--ui-text-muted); }
.match__p { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ui-text-muted); }
.match__p--win { font-weight: 700; color: var(--ui-text-highlighted); }
.match__vs { font-size: .72rem; color: var(--ui-text-dimmed); }
.match__bye { font-size: .76rem; color: var(--ui-text-dimmed); margin-left: auto; }
.match__replay {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: .76rem;
  font-weight: 700;
  color: var(--color-poke-600);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  flex: none;
}
.match__replay:hover { background: var(--color-poke-50); }
</style>
