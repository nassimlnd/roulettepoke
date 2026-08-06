<script setup lang="ts">
import type { DomainOwnedCard } from '~/types/domain'
import { ROUTES } from '~/constants/routes'

// Accueil public de PokéRoulette : landing / vitrine du jeu redessiné. Construite
// avec nos composants (PokeBall, BoosterPack, HoloCard, PButton) + Nuxt UI (UIcon),
// captures réelles de l'app en médaillon « téléphone ». Aucune auth requise ; les
// CTA mènent au jeu (ou directement à /play si déjà connecté).
definePageMeta({ public: true, layout: false })

// Titre / description / Open Graph : définis globalement dans nuxt.config (app.head)
// pour être présents dans le HTML initial (SPA) et lus par les crawlers.

const auth = useAuthStore()
const playTo = computed(() => (auth.isAuthenticated ? ROUTES.home : ROUTES.register))
const loginTo = computed(() => (auth.isAuthenticated ? ROUTES.home : ROUTES.login))

type Sample = Pick<DomainOwnedCard, 'num' | 'name' | 'type' | 'rarity' | 'isShiny' | 'biome' | 'level' | 'imageUrl' | 'owned' | 'quantity'>
function toCard(c: Sample): DomainOwnedCard {
  // Échantillons de vitrine : tous issus de Kanto.
  return { id: c.name + (c.isShiny ? '-s' : ''), generation: 1, parentCardId: '', standardId: null, obtainedAt: null, ...c }
}

const heroCard = toCard({ num: 144, name: 'Artikodin', type: 'Glace', rarity: 'Légendaire', isShiny: false, biome: 'Légendaire', level: 1, imageUrl: '/images/articuno.webp', owned: true, quantity: 1 })
const collectionSamples: Sample[] = [
  { num: 145, name: 'Électhor', type: 'Électrik', rarity: 'Légendaire', isShiny: true, biome: 'Légendaire', level: 1, imageUrl: '/images/zapdos.webp', owned: true, quantity: 2 },
  { num: 6, name: 'Dracaufeu', type: 'Feu', rarity: 'Épique', isShiny: false, biome: 'Montagnes', level: 3, imageUrl: '/images/charizard.webp', owned: true, quantity: 1 },
  { num: 150, name: 'Mewtwo', type: 'Psy', rarity: 'Légendaire', isShiny: false, biome: 'Légendaire', level: 1, imageUrl: '/images/mewtwo.webp', owned: true, quantity: 1 }
]
const collectionCards = collectionSamples.map(toCard)

const chips = [
  { label: 'Boosters par biome', c: 'var(--color-poke-500)' },
  { label: 'Chance shiny cumulative', c: '#eeb43e' },
  { label: 'Shiny & raretés', c: '#5cb6ba' },
  { label: 'Fusion de cartes', c: '#8f6fd0' },
  { label: '8 Arènes', c: '#57ba7f' },
  { label: 'Ligue des 4', c: '#5b9fe0' },
  { label: 'Tournois', c: 'var(--color-poke-500)' },
  { label: 'Échanges & Chat', c: '#eeb43e' }
]
</script>

<template>
  <div class="lp">
    <!-- Nav -->
    <header class="lp-nav">
      <div class="lp-wrap lp-nav__in">
        <NuxtLink
          to="/"
          class="lp-brand"
        >
          <PokeBall :size="30" />
          <span class="font-display">Poké<b>Roulette</b></span>
        </NuxtLink>
        <div class="lp-nav__actions">
          <ThemeToggle />
          <PButton
            :to="loginTo"
            size="md"
          >
            Jouer
          </PButton>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="lp-hero">
      <div class="lp-wrap lp-hero__in">
        <div class="lp-hero__copy">
          <span class="lp-eyebrow">
            <PokeBall :size="16" /> Gacha · Collection · Aventure
          </span>
          <h1 class="font-display">
            Ouvre. Collectionne.<br><em>Deviens Maître.</em>
          </h1>
          <p class="lp-lead">
            Ouvre des boosters, complète ton Pokédex de cartes holographiques et
            pars à l'aventure en combats réels — jusqu'au légendaire.
          </p>
          <div class="lp-cta">
            <PButton
              :to="playTo"
              icon="i-lucide-play"
            >
              Commencer à jouer
            </PButton>
            <PButton
              to="/login"
              color="neutral"
            >
              J'ai déjà un compte
            </PButton>
          </div>
          <div class="lp-bullets">
            <span><i style="background:var(--color-poke-500)" />151 cartes à collectionner</span>
            <span><i style="background:#5cb6ba" />Versions Shiny</span>
            <span><i style="background:#57ba7f" />Mode Aventure rogue-lite</span>
            <span><i style="background:#eeb43e" />Arènes, Ligue &amp; Tournoi</span>
          </div>
        </div>

        <div class="lp-stage">
          <PokeBall
            :size="34"
            :float="true"
            class="lp-orb lp-orb--a"
          />
          <PokeBall
            :size="22"
            :float="true"
            class="lp-orb lp-orb--b"
          />
          <BoosterPack
            biome=""
            :cost="10"
            size="lg"
            :floating="true"
            class="lp-booster"
          />
          <div class="lp-herocard">
            <HoloCard
              :card="heroCard"
              size="md"
              :is-new="true"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Chips -->
    <section class="lp-bar">
      <div class="lp-wrap lp-bar__grid">
        <span
          v-for="ch in chips"
          :key="ch.label"
          class="lp-chip"
        >
          <i :style="{ background: ch.c }" />{{ ch.label }}
        </span>
      </div>
    </section>

    <!-- F1 : Ouvre des boosters -->
    <section class="lp-feat lp-acc-red">
      <div class="lp-wrap lp-feat__in">
        <div class="lp-feat__copy">
          <span class="lp-tag">Le tirage</span>
          <h2 class="font-display">
            Ouvre un <em>booster</em>, la carte t'attend.
          </h2>
          <p>
            Choisis ta région, lance le tourbillon et découvre ta carte. Chaque
            biome a son pool — et chaque doublon rapproche ce Pokémon de sa
            version <b>shiny</b>.
          </p>
          <ul class="lp-list">
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span><b>Boosters par biome</b> : Forêt, Lac, Montagnes, Désert…</span>
            </li>
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span><b>Aucun doublon perdu</b> : chaque exemplaire en double
                augmente la chance shiny de ce Pokémon.</span>
            </li>
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span>Événements spéciaux : <b>choix de carte</b>, pièces, Charme Chroma.</span>
            </li>
          </ul>
        </div>
        <div class="lp-feat__media">
          <div class="lp-phone lp-phone--tilt">
            <div class="lp-phone__scr">
              <img
                src="/landing/play.jpg"
                alt="Ouvre un booster PokéRoulette"
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- F2 : Collectionne (HoloCards live) -->
    <section class="lp-feat lp-acc-teal lp-feat--rev">
      <div class="lp-wrap lp-feat__in">
        <div class="lp-feat__copy">
          <span class="lp-tag">La collection</span>
          <h2 class="font-display">
            Des cartes <em>holographiques</em>, à faire briller.
          </h2>
          <p>
            Un dégradé par type, des gemmes de rareté, un sprite réel. Survole
            une carte : elle s'incline et scintille pour de vrai.
          </p>
          <ul class="lp-list">
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span><b>Pokédex 151</b> en standard et en <b>Shiny</b>.</span>
            </li>
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span><b>Fusion</b> des doublons pour monter tes cartes en niveau.</span>
            </li>
          </ul>
          <p class="lp-hint">
            <UIcon
              name="i-lucide-sparkles"
              class="size-4"
            /> Passe la souris sur les cartes →
          </p>
        </div>
        <div class="lp-feat__media">
          <div class="lp-cards">
            <HoloCard
              v-for="c in collectionCards"
              :key="c.id"
              :card="c"
              size="md"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- F3 : Aventure -->
    <section
      id="aventure"
      class="lp-feat lp-acc-green"
    >
      <div class="lp-wrap lp-feat__in">
        <div class="lp-feat__copy">
          <span class="lp-tag">Le mode Aventure</span>
          <h2 class="font-display">
            Un périple <em>rogue-lite</em> en combats réels.
          </h2>
          <p>
            Choisis ton starter Kanto et traverse trois actes. Ton Pokémon gagne
            des niveaux, évolue, s'équipe — et au bout de la route, un légendaire.
          </p>
          <ul class="lp-list">
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span><b>Circuit des Arènes</b> → <b>Conseil des 4</b> → Champion.</span>
            </li>
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span>Centre Pokémon, Marchand, coffres, rencontres à chaque étape.</span>
            </li>
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span>Capture le <b>légendaire</b> et transfère-le dans ta collection.</span>
            </li>
          </ul>
        </div>
        <div class="lp-feat__media lp-feat__media--duo">
          <div class="lp-phone lp-phone--tilt2">
            <div class="lp-phone__scr">
              <img
                src="/landing/adventure.jpg"
                alt="Combat d'arène dans le mode Aventure"
              >
            </div>
          </div>
          <div class="lp-phone lp-phone--back">
            <div class="lp-phone__scr">
              <img
                src="/landing/legendary.jpg"
                alt="Légendaire capturé en fin d'aventure"
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- F4 : Compétition -->
    <section class="lp-feat lp-acc-gold lp-feat--rev">
      <div class="lp-wrap lp-feat__in">
        <div class="lp-feat__copy">
          <span class="lp-tag">La compétition</span>
          <h2 class="font-display">
            Défie les Arènes. <em>Grimpe</em> au classement.
          </h2>
          <p>
            Huit Arènes et leurs badges, la Ligue des 4, des tournois
            hebdomadaires et un classement mondial : prouve que tu es le meilleur.
          </p>
          <ul class="lp-list">
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span><b>Ligue des 4</b> &amp; <b>Tournois</b> en combats plein écran animés.</span>
            </li>
            <li>
              <UIcon
                name="i-lucide-check"
                class="lp-tick"
              /><span><b>Échanges</b> entre dresseurs et <b>chat</b> en direct.</span>
            </li>
          </ul>
        </div>
        <div class="lp-feat__media">
          <div class="lp-phone lp-phone--tilt">
            <div class="lp-phone__scr">
              <img
                src="/landing/gyms.jpg"
                alt="Les Arènes de PokéRoulette"
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA final -->
    <section class="lp-wrap">
      <div class="lp-final">
        <PokeBall
          :size="52"
          :float="true"
          class="lp-final__ball"
        />
        <h2 class="font-display">
          Prêt·e à les attraper tous ?
        </h2>
        <p>Crée ton compte, ouvre ton premier booster et lance-toi dans l'aventure.</p>
        <PButton
          :to="playTo"
          color="neutral"
          icon="i-lucide-play"
          class="lp-final__btn"
        >
          Commencer l'aventure
        </PButton>
      </div>
    </section>

    <!-- Footer -->
    <footer class="lp-wrap lp-foot">
      <div class="lp-brand">
        <PokeBall :size="24" />
        <span class="font-display">Poké<b>Roulette</b></span>
      </div>
      <span>Fan-game non officiel · Pokémon © Nintendo / Game Freak</span>
    </footer>
  </div>
</template>

<style scoped>
.lp {
  --teal: #5cb6ba; --green: #57ba7f; --gold: #eeb43e; --purple: #8f6fd0; --blue: #5b9fe0;
  font-family: var(--font-sans);
  color: var(--ui-text-highlighted);
  background:
    radial-gradient(120% 60% at 80% -5%, color-mix(in oklab, var(--color-poke-500) 12%, transparent), transparent 60%),
    var(--ui-bg);
  min-height: 100vh;
  overflow-x: hidden;
}
.font-display { font-family: var(--font-display); }
.lp-wrap { width: 100%; max-width: 1080px; margin-inline: auto; padding-inline: 22px; }

/* Nav */
.lp-nav {
  position: sticky; top: 0; z-index: 20;
  backdrop-filter: blur(10px);
  background: color-mix(in oklab, var(--ui-bg) 80%, transparent);
  border-bottom: 1px solid var(--ui-border);
}
.lp-nav__in { display: flex; align-items: center; justify-content: space-between; height: 62px; }
.lp-nav__actions { display: flex; align-items: center; gap: 6px; }
.lp-brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.16rem; color: var(--ui-text-highlighted); text-decoration: none; }
.lp-brand b { color: var(--color-poke-500); }

/* Hero */
.lp-hero { position: relative; padding: 54px 0 34px; }
.lp-hero__in { display: grid; grid-template-columns: 1.05fr .95fr; gap: 30px; align-items: center; }
.lp-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-display); font-weight: 700; font-size: .74rem;
  letter-spacing: .1em; text-transform: uppercase; color: var(--color-poke-600, #c62b1e);
  background: color-mix(in oklab, var(--color-poke-500) 12%, transparent);
  padding: 6px 13px 6px 8px; border-radius: 999px;
}
.lp-hero h1 { font-weight: 700; font-size: clamp(2.3rem, 6vw, 3.5rem); line-height: 1.03; letter-spacing: -.02em; margin: .5rem 0 0; text-wrap: balance; }
.lp-hero h1 em { font-style: normal; color: var(--color-poke-500); }
.lp-lead { font-size: 1.05rem; color: var(--ui-text-muted); max-width: 36ch; margin: .9rem 0 0; }
.lp-cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
.lp-bullets { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 20px; }
.lp-bullets span { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; font-size: .84rem; color: var(--ui-text-muted); }
.lp-bullets i { width: 8px; height: 8px; border-radius: 50%; }

/* Hero stage */
.lp-stage { position: relative; display: grid; place-items: center; min-height: 420px; }
.lp-booster { filter: drop-shadow(0 26px 40px rgba(210, 60, 45, .28)); }
.lp-herocard { position: absolute; right: 2%; bottom: 2%; z-index: 3; transform: rotate(6deg); filter: drop-shadow(0 18px 30px rgba(40, 60, 80, .4)); }
.lp-orb { position: absolute; z-index: 1; }
.lp-orb--a { top: 4%; left: 6%; }
.lp-orb--b { top: 24%; right: 8%; }

/* Chips */
.lp-bar { padding: 8px 0 6px; }
.lp-bar__grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.lp-chip {
  display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: .86rem;
  color: var(--ui-text-highlighted); background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border); padding: 9px 15px; border-radius: 999px;
}
.lp-chip i { width: 9px; height: 9px; border-radius: 50%; flex: none; }

/* Features */
.lp-feat { padding: 48px 0; }
.lp-feat__in { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
.lp-feat--rev .lp-feat__copy { order: 2; }
.lp-feat--rev .lp-feat__media { order: 1; }
.lp-tag {
  display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-display);
  font-weight: 700; font-size: .74rem; letter-spacing: .08em; text-transform: uppercase;
  padding: 6px 12px; border-radius: 999px;
  color: color-mix(in oklab, var(--a) 78%, var(--ui-text-highlighted));
  background: color-mix(in oklab, var(--a) 18%, transparent);
}
.lp-feat h2 { font-weight: 700; font-size: clamp(1.7rem, 3.4vw, 2.3rem); letter-spacing: -.02em; margin: .5rem 0 0; line-height: 1.1; text-wrap: balance; }
.lp-feat h2 em { font-style: normal; color: color-mix(in oklab, var(--a) 72%, var(--ui-text-highlighted)); }
.lp-feat p { color: var(--ui-text-muted); font-size: 1.02rem; margin: .7rem 0 0; max-width: 42ch; }
.lp-list { list-style: none; padding: 0; margin: 1.1rem 0 0; display: flex; flex-direction: column; gap: 10px; }
.lp-list li { display: flex; gap: 10px; align-items: flex-start; font-weight: 600; font-size: .96rem; color: var(--ui-text-toned); }
.lp-list b { font-weight: 800; color: var(--ui-text-highlighted); }
.lp-tick { flex: none; width: 22px; height: 22px; padding: 4px; border-radius: 50%; color: #fff; background: var(--a); margin-top: 1px; }
.lp-hint { display: inline-flex; align-items: center; gap: 7px; font-size: .84rem; font-weight: 700; color: color-mix(in oklab, var(--a) 70%, var(--ui-text-muted)); }

.lp-acc-red { --a: var(--color-poke-500); }
.lp-acc-teal { --a: var(--teal); }
.lp-acc-green { --a: var(--green); }
.lp-acc-gold { --a: var(--gold); }

/* Live HoloCards row */
.lp-feat__media { display: flex; justify-content: center; align-items: center; gap: 18px; }
.lp-cards { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
.lp-cards > :first-child { transform: rotate(-4deg); }
.lp-cards > :last-child { transform: rotate(4deg); }

/* Phone mockup */
.lp-phone {
  position: relative; width: 258px; aspect-ratio: 402/858; border-radius: 36px;
  background: #17141c; padding: 9px; flex: none;
  box-shadow: 0 26px 50px -22px rgba(50, 30, 25, .5), 0 0 0 2px rgba(255, 255, 255, .05) inset;
}
.lp-phone::after { content: ""; position: absolute; top: 15px; left: 50%; transform: translateX(-50%); width: 74px; height: 6px; border-radius: 999px; background: rgba(255, 255, 255, .22); }
.lp-phone__scr { width: 100%; height: 100%; border-radius: 28px; overflow: hidden; background: #fff; }
.lp-phone__scr img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.lp-phone--tilt { transform: rotate(3deg); }
.lp-phone--tilt2 { transform: rotate(-3deg); z-index: 2; }
.lp-feat__media--duo { position: relative; }
.lp-phone--back { position: absolute; right: 8%; bottom: -6%; width: 210px; transform: rotate(6deg); z-index: 1; opacity: .96; }

/* Final CTA */
.lp-final {
  position: relative; overflow: hidden; margin: 28px 0 0; padding: 52px 26px; text-align: center;
  border-radius: 30px; color: #fff;
  background: linear-gradient(150deg, var(--color-poke-500), #ff6a4d);
  box-shadow: 0 26px 50px -22px color-mix(in oklab, var(--color-poke-500) 60%, transparent);
}
.lp-final::before { content: ""; position: absolute; inset: 0; opacity: .16; background: radial-gradient(circle at 15% 20%, #fff 0 2px, transparent 3px) 0 0 / 34px 34px; }
.lp-final__ball { position: relative; margin-bottom: 6px; }
.lp-final h2 { position: relative; font-weight: 700; font-size: clamp(1.9rem, 4vw, 2.7rem); margin: 0; letter-spacing: -.01em; }
.lp-final p { position: relative; opacity: .96; margin: .5rem auto 0; max-width: 40ch; color: #fff; }
.lp-final__btn { position: relative; margin-top: 20px; }

/* Footer */
.lp-foot { padding: 26px 22px 40px; color: var(--ui-text-muted); font-size: .85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.lp-foot .lp-brand { font-size: 1rem; }

@media (max-width: 860px) {
  .lp-hero__in { grid-template-columns: 1fr; }
  .lp-stage { min-height: 380px; margin-top: 6px; }
  .lp-feat__in { grid-template-columns: 1fr; gap: 26px; }
  .lp-feat--rev .lp-feat__copy { order: 1; }
  .lp-feat--rev .lp-feat__media { order: 2; }
  .lp-phone--back { position: relative; right: auto; bottom: auto; margin-left: -40px; }
}
</style>
