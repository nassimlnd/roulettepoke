<script setup lang="ts">
import type { DomainOwnedCard } from '~/types/domain'

// Page de démonstration TEMPORAIRE (validation qualité de HoloCard).
// Fond crème « Mochidex », vraies données/sprites. À retirer après validation.
definePageMeta({ public: true, layout: false })

type Sample = Pick<DomainOwnedCard, 'num' | 'name' | 'type' | 'rarity' | 'isShiny' | 'biome' | 'level' | 'imageUrl' | 'owned' | 'quantity'>

function toCard(c: Sample): DomainOwnedCard {
  return { id: c.name, parentCardId: '', standardId: null, obtainedAt: null, ...c }
}

const heroes: Sample[] = [
  { num: 144, name: 'Artikodin', type: 'Glace', rarity: 'Légendaire', isShiny: false, biome: 'Légendaire', level: 1, imageUrl: '/images/articuno.webp', owned: true, quantity: 1 },
  { num: 3, name: 'Florizarre', type: 'Plante', rarity: 'Épique', isShiny: false, biome: 'Forêt', level: 3, imageUrl: '/images/venusaur.webp', owned: true, quantity: 1 },
  { num: 145, name: 'Électhor', type: 'Électrik', rarity: 'Légendaire', isShiny: true, biome: 'Légendaire', level: 1, imageUrl: '/images/zapdos.webp', owned: true, quantity: 2 },
  { num: 2, name: 'Herbizarre', type: 'Plante', rarity: 'Rare', isShiny: false, biome: 'Forêt', level: 2, imageUrl: '/images/ivysaur.webp', owned: true, quantity: 1 },
  { num: 1, name: 'Bulbizarre', type: 'Plante', rarity: 'Commun', isShiny: false, biome: 'Forêt', level: 1, imageUrl: '/images/bulbasaur.webp', owned: true, quantity: 1 }
]

const grid: Sample[] = [
  { num: 146, name: 'Sulfura', type: 'Feu', rarity: 'Légendaire', isShiny: false, biome: 'Légendaire', level: 1, imageUrl: '/images/moltres.webp', owned: true, quantity: 1 },
  { num: 9, name: 'Tortank', type: 'Eau', rarity: 'Épique', isShiny: false, biome: 'Lac', level: 3, imageUrl: '/images/blastoise.webp', owned: true, quantity: 1 },
  { num: 3, name: 'Florizarre', type: 'Plante', rarity: 'Épique', isShiny: false, biome: 'Forêt', level: 3, imageUrl: '/images/venusaur.webp', owned: true, quantity: 1 },
  { num: 145, name: 'Électhor', type: 'Électrik', rarity: 'Légendaire', isShiny: false, biome: 'Légendaire', level: 1, imageUrl: '/images/zapdos.webp', owned: true, quantity: 1 },
  { num: 12, name: 'Papilusion', type: 'Insecte', rarity: 'Épique', isShiny: false, biome: 'Forêt', level: 3, imageUrl: '/images/butterfree.webp', owned: true, quantity: 1 },
  { num: 18, name: 'Roucarnage', type: 'Vol', rarity: 'Épique', isShiny: false, biome: 'Plaines', level: 3, imageUrl: '/images/pidgeot.webp', owned: true, quantity: 1 },
  { num: 20, name: 'Rattatac', type: 'Normal', rarity: 'Rare', isShiny: false, biome: 'Plaines', level: 2, imageUrl: '/images/raticate.webp', owned: true, quantity: 1 },
  { num: 31, name: 'Nidoqueen', type: 'Poison', rarity: 'Épique', isShiny: false, biome: 'Montagnes', level: 3, imageUrl: '/images/nidoqueen.webp', owned: true, quantity: 1 },
  { num: 28, name: 'Sablaireau', type: 'Sol', rarity: 'Rare', isShiny: false, biome: 'Désert', level: 2, imageUrl: '/images/sandslash.webp', owned: true, quantity: 1 },
  { num: 68, name: 'Mackogneur', type: 'Combat', rarity: 'Épique', isShiny: false, biome: 'Montagnes', level: 3, imageUrl: '/images/machamp.webp', owned: true, quantity: 1 },
  { num: 150, name: 'Mewtwo', type: 'Psy', rarity: 'Légendaire', isShiny: false, biome: 'Légendaire', level: 1, imageUrl: '/images/mewtwo.webp', owned: true, quantity: 1 },
  { num: 76, name: 'Grolem', type: 'Roche', rarity: 'Épique', isShiny: false, biome: 'Montagnes', level: 3, imageUrl: '/images/golem.webp', owned: true, quantity: 1 },
  { num: 94, name: 'Ectoplasma', type: 'Spectre', rarity: 'Épique', isShiny: false, biome: 'Ville', level: 3, imageUrl: '/images/gengar.webp', owned: true, quantity: 1 },
  { num: 149, name: 'Dracolosse', type: 'Dragon', rarity: 'Épique', isShiny: false, biome: 'Montagnes', level: 3, imageUrl: '/images/dragonite.webp', owned: true, quantity: 1 },
  { num: 6, name: 'Dracaufeu', type: 'Feu', rarity: 'Épique', isShiny: false, biome: 'Montagnes', level: 3, imageUrl: '/images/charizard.webp', owned: false, quantity: 0 }
]

const heroCards = heroes.map(toCard)
const gridCards = grid.map(toCard)
</script>

<template>
  <div class="stage">
    <header class="head">
      <h1>Nouvelle DA <span>— blanc/gris · rouge Poké · cartes pastel</span></h1>
      <p>Composants au style Mochidex, polices Fredoka + Nunito. Survole une carte (tilt + holo).</p>
    </header>

    <section class="buttons">
      <PButton icon="i-lucide-sparkles">
        Ouvrir un booster
      </PButton>
      <PButton
        color="success"
        icon="i-lucide-check"
      >
        Ranger dans l'album
      </PButton>
      <PButton
        color="secondary"
        icon="i-lucide-coins"
      >
        240
      </PButton>
      <PButton color="neutral">
        Collection
      </PButton>
      <PButton loading>
        Tirage…
      </PButton>
      <PButton disabled>
        Indisponible
      </PButton>
    </section>

    <section class="heroes">
      <HoloCard
        v-for="c in heroCards"
        :key="c.name + c.isShiny"
        :card="c"
        size="xl"
        :quantity="c.quantity"
        :is-new="c.name === 'Artikodin'"
      />
    </section>

    <h2 class="section-title">
      Un dégradé par type · gemmes de rareté · sprite réel
    </h2>
    <section class="grid">
      <HoloCard
        v-for="c in gridCards"
        :key="c.name"
        :card="c"
        size="md"
        :quantity="c.quantity"
      />
    </section>
  </div>
</template>

<style scoped>
.stage {
  min-height: 100vh;
  background:
    radial-gradient(120% 80% at 50% -10%, #ffffff 0%, transparent 55%),
    linear-gradient(180deg, #f6f7f9 0%, #eceef2 100%);
  color: var(--ui-text);
  padding: clamp(24px, 5vw, 64px) clamp(16px, 4vw, 56px) 80px;
  font-family: 'Nunito', system-ui, sans-serif;
}
.head { text-align: center; margin-bottom: clamp(20px, 3vw, 36px); }
.head h1 {
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  font-size: clamp(1.8rem, 5vw, 3rem);
  margin: 0;
  color: var(--ui-text-highlighted);
}
.head h1 span { color: var(--ui-text-muted); font-weight: 500; font-size: .5em; }
.head p { color: var(--ui-text-muted); margin: 8px 0 0; font-size: clamp(.9rem, 2vw, 1.05rem); }

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin-bottom: clamp(32px, 5vw, 56px);
}

.heroes {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(18px, 3vw, 40px);
  align-items: flex-end;
  justify-content: center;
  margin-bottom: clamp(40px, 6vw, 72px);
}

.section-title {
  font-family: 'Fredoka', sans-serif;
  font-weight: 600;
  font-size: clamp(1.1rem, 2.5vw, 1.5rem);
  text-align: center;
  color: #6a5b48;
  margin: 0 0 clamp(20px, 3vw, 32px);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(208px, 1fr));
  gap: clamp(16px, 2.5vw, 30px);
  justify-items: center;
  max-width: 1180px;
  margin: 0 auto;
}
</style>
