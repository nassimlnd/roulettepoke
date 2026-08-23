<script setup lang="ts">
import { BASE_ROLL_COST } from '~/stores/roll'
import { DAILY_BONUS_BASE, DAILY_BONUS_PER_BADGE, GYMS_PER_REGION } from '~/constants/game'

// Le Guide est accessible sans connexion ; les coûts de biome sont lus en direct
// depuis l'API quand on est connecté (résout C6 : plus de divergence Guide/app).
definePageMeta({ public: true })

const auth = useAuthStore()
const rollStore = useRollStore()

onMounted(() => {
  if (auth.isAuthenticated) rollStore.ensureBiomes().catch(() => {})
})

const biomeRows = computed(() =>
  [...rollStore.biomes].sort((a, b) => a.cost - b.cost)
)

const sections = [
  {
    icon: 'i-lucide-dices',
    color: '#dd3322',
    title: 'Tirages',
    items: [
      `Chaque tirage standard coûte ${BASE_ROLL_COST} coins ; les résultats sont pondérés par rareté.`,
      // Doit rester aligné sur REVEAL_OPTS (pages/settings.vue) : le Guide
      // documentait encore trois modes disparus (« Visibles / Si possédée /
      // Masquées ») qui ne correspondaient à aucun réglage réel.
      'Rythme de révélation réglable dans Réglages : Complète (animation entière), Rapide (accélérée) ou Directe (résultat immédiat).',
      'Filtrer par biome cible les cartes d\'une région — le coût dépend du biome (voir la table ci-dessous).',
      'Événements spéciaux (1 %) sur les tirages sans filtre : bonus de coins, Charme Chroma, ou choix entre deux cartes.'
    ]
  },
  {
    icon: 'i-lucide-sparkles',
    color: '#e0a92e',
    title: 'Raretés & Shiny',
    items: [
      'Quatre raretés : Commun, Rare (1ʳᵉ évolution), Épique (2ᵉ évolution), Légendaire.',
      'Les Shiny sont des versions alternatives ultra-rares (cadre argenté, ✦).',
      'Chance shiny de base : 1/500 (0,2 %). Chaque exemplaire déjà possédé d\'un Pokémon augmente sa chance shiny de +1/500 — c\'est le « pity », désormais affiché sur chaque doublon et dans la collection.',
      'Revendre un Shiny donne un Charme Chroma (au lieu de coins).'
    ]
  },
  {
    icon: 'i-lucide-layers',
    color: '#5b9bd5',
    title: 'Collection, fusion & vente',
    items: [
      'Accumule 10 exemplaires identiques pour débloquer la fusion → tu obtiens la version évoluée.',
      'La fusion demande désormais une confirmation (elle consomme 10 cartes, elle est définitive).',
      'Vente à l\'unité : Commun 1 · Rare 5 · Épique 10 · Légendaire 25 coins.',
      'Vente intelligente (dans la collection) : revend en une fois les doublons devenus inutiles — shiny déjà obtenue, doublons shiny (→ Charmes) — sans jamais toucher au dernier exemplaire ni aux réserves de fusion.'
    ]
  },
  {
    icon: 'i-lucide-swords',
    color: '#5bbf82',
    title: 'Équipe & arènes',
    items: [
      'Constitue une équipe de 6 Pokémon via la roulette d\'équipe — la carte tirée quitte définitivement ta collection (confirmation demandée).',
      'Deux parcours indépendants de 8 arènes, un par région (Kanto et Johto). Une tentative par semaine et par arène.',
      `Bonus de connexion : ${DAILY_BONUS_BASE} 🪙 par jour, + ${DAILY_BONUS_PER_BADGE} 🪙 par badge de ta région active — soit ${DAILY_BONUS_BASE + GYMS_PER_REGION * DAILY_BONUS_PER_BADGE} 🪙/jour une fois les ${GYMS_PER_REGION} badges de la région obtenus.`,
      'Un entraînement quotidien gratuit augmente tes chances en arène.'
    ]
  }
] as const
</script>

<template>
  <div class="guide">
    <header class="guide__head">
      <h1 class="guide__title">
        Guide du jeu
      </h1>
      <p class="guide__sub">
        Tout ce qu'il faut savoir pour devenir Maître Dresseur.
      </p>
    </header>

    <PPanel
      v-for="s in sections"
      :key="s.title"
    >
      <div class="sec">
        <div
          class="sec__icon"
          :style="{ background: `color-mix(in oklab, ${s.color} 15%, transparent)`, color: s.color }"
        >
          <UIcon
            :name="s.icon"
            class="size-5"
          />
        </div>
        <div class="sec__body">
          <h2 class="sec__title">
            {{ s.title }}
          </h2>
          <ul class="sec__list">
            <li
              v-for="(item, i) in s.items"
              :key="i"
            >
              <UIcon
                name="i-lucide-check"
                class="sec__check"
              />
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>
    </PPanel>

    <!-- Coûts de biome — lus en direct depuis l'API (résout C6) -->
    <PPanel v-if="biomeRows.length">
      <h2 class="sec__title mb-1">
        Coût des tirages par biome
      </h2>
      <p class="guide__note">
        Lus en direct depuis le jeu — toujours exacts.
      </p>
      <div class="tablewrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Biome</th>
              <th>Cartes</th>
              <th class="right">
                Coût
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="strong">
                Tous
              </td>
              <td class="muted">
                —
              </td>
              <td class="right cost">
                {{ BASE_ROLL_COST }}
              </td>
            </tr>
            <tr
              v-for="b in biomeRows"
              :key="b.biome"
            >
              <td class="strong">
                {{ b.biome }}
              </td>
              <td class="muted tabular">
                {{ b.ownedCount }}/{{ b.cardCount }}
              </td>
              <td class="right cost">
                {{ b.cost }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PPanel>
    <UAlert
      v-else-if="!auth.isAuthenticated"
      color="info"
      variant="soft"
      icon="i-lucide-info"
      title="Connecte-toi pour voir les coûts de tirage par biome à jour."
    />
  </div>
</template>

<style scoped>
.guide {
  max-width: 42rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.guide__head { text-align: center; margin-bottom: 4px; }
.guide__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.9rem;
  margin: 0;
  color: var(--ui-text-highlighted);
}
.guide__sub { color: var(--ui-text-muted); margin: 6px 0 0; }
.guide__note { color: var(--ui-text-muted); font-size: .85rem; margin: 0 0 12px; }

.sec { display: flex; gap: 14px; align-items: flex-start; }
.sec__icon {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: grid;
  place-items: center;
}
.sec__body { flex: 1; min-width: 0; }
.sec__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.15rem;
  margin: 2px 0 10px;
  color: var(--ui-text-highlighted);
}
.sec__list { display: flex; flex-direction: column; gap: 9px; margin: 0; padding: 0; list-style: none; }
.sec__list li {
  display: flex;
  gap: 9px;
  font-size: .92rem;
  color: var(--ui-text-toned);
  line-height: 1.45;
}
.sec__check {
  flex: none;
  width: 1.05rem;
  height: 1.05rem;
  margin-top: .18rem;
  color: var(--color-poke-500);
}

.tablewrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--ui-border); }
.tbl { width: 100%; border-collapse: collapse; font-size: .9rem; }
.tbl th {
  text-align: left;
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--ui-text-muted);
  font-weight: 700;
  padding: 10px 14px;
  background: var(--ui-bg-muted);
}
.tbl td { padding: 10px 14px; border-top: 1px solid var(--ui-border); }
.tbl .right { text-align: right; }
.tbl .strong { font-weight: 700; color: var(--ui-text); }
.tbl .muted { color: var(--ui-text-muted); }
.tbl .cost {
  font-family: var(--font-display);
  font-weight: 700;
  color: #b07d12;
}
.tbl .cost::after {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-left: 5px;
  vertical-align: -1px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, #f6c453 62%, #e0a92e);
}
</style>
