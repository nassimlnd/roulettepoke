<script setup lang="ts">
import { BASE_ROLL_COST } from '~/stores/roll'

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
    title: 'Tirages',
    items: [
      `Chaque tirage standard coûte ${BASE_ROLL_COST} coins ; les résultats sont pondérés par rareté.`,
      '3 modes d\'affichage : Visibles (tout révélé), Si possédée (masque les nouvelles), Masquées (révélation après le lancer).',
      'Filtrer par biome cible les cartes d\'une région — le coût dépend du biome (voir la table ci-dessous).',
      'Événements spéciaux (1 %) sur les tirages sans filtre : bonus de coins, Charme Chroma, ou choix entre deux cartes.'
    ]
  },
  {
    icon: 'i-lucide-sparkles',
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
    title: 'Collection, fusion & vente',
    items: [
      'Accumule 10 exemplaires identiques pour débloquer la fusion → tu obtiens la version évoluée.',
      'La fusion demande désormais une confirmation (elle consomme 10 cartes, elle est définitive).',
      'Vente à l\'unité : Commun 1 · Rare 5 · Épique 10 · Légendaire 25 coins.'
    ]
  },
  {
    icon: 'i-lucide-swords',
    title: 'Équipe & arènes',
    items: [
      'Constitue une équipe de 6 Pokémon via la roulette d\'équipe — la carte tirée quitte définitivement ta collection (confirmation demandée).',
      '8 arènes à battre (1 tentative/semaine) pour collectionner les badges et booster ton bonus de connexion quotidien.',
      'Un entraînement quotidien gratuit augmente tes chances en arène.'
    ]
  }
] as const
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="font-display text-2xl font-extrabold">
      Guide du jeu
    </h1>

    <UAccordion
      :items="sections.map(s => ({ label: s.title, icon: s.icon, slot: s.title }))"
      type="multiple"
    >
      <template
        v-for="s in sections"
        #[s.title]
        :key="s.title"
      >
        <ul class="space-y-2 pb-2 pl-1">
          <li
            v-for="(item, i) in s.items"
            :key="i"
            class="flex gap-2 text-sm text-muted"
          >
            <UIcon
              name="i-lucide-check"
              class="mt-0.5 size-4 shrink-0 text-primary"
            />
            <span>{{ item }}</span>
          </li>
        </ul>
      </template>
    </UAccordion>

    <!-- Coûts de biome — lus en direct depuis l'API (résout C6) -->
    <section
      v-if="biomeRows.length"
      class="space-y-2"
    >
      <h2 class="font-display text-lg font-bold">
        Coût des tirages par biome
      </h2>
      <p class="text-sm text-muted">
        Ces coûts sont lus en direct depuis le jeu — ils sont toujours exacts.
      </p>
      <div class="overflow-hidden rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default bg-elevated text-left text-xs uppercase text-muted">
              <th class="px-3 py-2">
                Biome
              </th>
              <th class="px-3 py-2">
                Cartes
              </th>
              <th class="px-3 py-2 text-right">
                Coût
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-default">
              <td class="px-3 py-2 font-medium">
                Tous
              </td>
              <td class="px-3 py-2 text-muted">
                —
              </td>
              <td class="px-3 py-2 text-right tabular text-secondary">
                {{ BASE_ROLL_COST }} 🪙
              </td>
            </tr>
            <tr
              v-for="b in biomeRows"
              :key="b.biome"
              class="border-b border-default last:border-0"
            >
              <td class="px-3 py-2 font-medium">
                {{ b.biome }}
              </td>
              <td class="px-3 py-2 tabular text-muted">
                {{ b.ownedCount }}/{{ b.cardCount }}
              </td>
              <td class="px-3 py-2 text-right tabular text-secondary">
                {{ b.cost }} 🪙
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <UAlert
      v-else-if="!auth.isAuthenticated"
      color="info"
      variant="soft"
      icon="i-lucide-info"
      title="Connecte-toi pour voir les coûts de tirage par biome à jour."
    />
  </div>
</template>
