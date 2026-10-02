# Design system — PokeRoulette (base Nuxt UI v4)

> Distillation du rapport `docs/experts/03-ui-designer.md`. Système **indépendant
> de la direction visuelle retenue** (la « peau » A/B/C se pose par-dessus, cf.
> `visual-directions.md`). Fondé sur Nuxt UI v4 (Reka UI) + Tailwind v4. Le détail
> du mouvement est dans `animation-system.md`, l'accessibilité dans
> `accessibility-guidelines.md`.

## Principe : 3 couches de tokens, proprement séparées

L'ancien front a 6 462 lignes de CSS avec des hex codés en dur, 7 breakpoints et
l'or utilisé à la fois pour l'économie, la rareté et des boutons d'action. La
refonte repart de **trois couches de tokens** :

### Couche 1 — Rôles sémantiques Nuxt UI (`app.config.ts > ui.colors`)

| Rôle | Palette | Nuance dark | Usage |
| --- | --- | --- | --- |
| `primary` | violet | `violet-400 #a78bfa` | actions, liens, sélection, marque |
| `secondary` | amber | `amber-400 #fbbf24` | **économie uniquement** : coins, prix, cagnottes, récompenses |
| `success` | emerald | `emerald-400 #34d399` | victoires, jauges gagnées, complétion |
| `info` | sky | `sky-400 #38bdf8` | pédagogie, intros, hints |
| `warning` | orange | `orange-400 #fb923c` | cooldowns, avertissements destructifs (distinct de l'or) |
| `error` | red | `red-400 #f87171` | défaites, erreurs |
| `neutral` | `night` (custom) | rampe ci-dessous | surfaces, texte, bordures |

Rampe custom `night` (gris teintés violet, parenté volontaire avec l'existant
`#0f0f1a/#1a1a2e` pour que les joueurs reconnaissent leur jeu) :

```css
--color-night-50:#f6f6fa; --color-night-100:#ececf4; --color-night-200:#d9d9e7;
--color-night-300:#b9b9cf; --color-night-400:#9494b0; --color-night-500:#757591;
--color-night-600:#5c5c77; --color-night-700:#46465e; --color-night-800:#232338;
--color-night-900:#17172a; --color-night-950:#0e0e1b;
```

Surfaces dark :
```css
.dark {
  --ui-bg: var(--color-night-950);          /* page */
  --ui-bg-muted: var(--color-night-900);    /* panneaux */
  --ui-bg-elevated: var(--color-night-800); /* cartes, popovers */
  --ui-border: color-mix(in oklch, white 8%, transparent);
  --ui-text: var(--color-night-100);
  --ui-text-muted: var(--color-night-400);
  --ui-primary: var(--color-violet-400);
}
```

**Mode clair** : non prioritaire v1 (`colorMode` forcé dark), mais tout style
custom passe par `--ui-*`/classes sémantiques (jamais un hex) ⇒ le clair devient
un P3 activable sans refonte.

### Couche 2 — Tokens de rareté (décoratifs, `@theme`)

Pas des couleurs sémantiques Nuxt UI (éviter de générer 125 variantes inutiles) —
utilitaires `text-rarity-*`, `border-rarity-*` :
```css
--color-rarity-common:   #757591;  /* discret */
--color-rarity-rare:     #38bdf8;
--color-rarity-epic:     #e879f9;
--color-rarity-legendary:#fbbf24;  /* or discipliné */
--color-rarity-shiny:    #e2e8f0;  /* argent + gradient conique */
```

### Couche 3 — Tokens des 15 types + 9 biomes (`@theme`)

Un hex par type (palette canonique conforme aux chips actuelles), encapsulés dans
un composant `TypeBadge` avec une recette de contraste garanti :
```
badge type = bg color-mix(type 18%, transparent) + border color-mix(type 40%)
           + texte color-mix(type 85%, white 15%) + icône du type (pas emoji)
```
Même mécanique pour les 9 biomes (`--color-biome-*`).

## Typographie

Deux familles variables via `@nuxt/fonts` (self-host, subset latin, `swap`,
métriques de fallback → zéro CLS) :

| Rôle | Famille | Usage |
| --- | --- | --- |
| Texte & UI | **Inter** (400/500/600) | corps, boutons, tableaux, formulaires — **chiffres tabulaires** obligatoires sur compteurs/timers/quantités |
| Display | **Bricolage Grotesque** (600/800) | titres, compteurs de coins, « Vous avez obtenu ! », scores, cagnottes |

Échelle (rem, base 16) : `display` 36 px / `h1` 24→30 px / `h2` 20 px / `h3`
18 px / `body` 16 px / `body-sm` 14 px / `caption` 12 px / `num-lg` 24 px tabular.
Règle : Bricolage **uniquement** ≥ 20 px et sur les nombres « spectacle », jamais
en corps de texte. Budget : ≤ 250 Ko woff2 préchargés.

## Surfaces & profondeur (3 niveaux max)

Hiérarchie par **luminosité** (les ombres portées sont invisibles sur fond
`#0e0e1b`) :

| Niveau | Fond | Bordure | Usage |
| --- | --- | --- | --- |
| 0 — Page | `--ui-bg` | — | body |
| 1 — Panneau | `--ui-bg-muted`, `UCard variant="soft"` | 1px white/8 | sections, toolbars |
| 2 — Élevé | `--ui-bg-elevated` | 1px white/10 + ombre légère | cartes, popovers, modales |

Discipline : bordure de rareté = **2 px + halo unique** (`0 0 0 1px <r>/30, 0 0
20px -6px <r>/50`) ; commun = pas de bordure colorée ; shiny = liseré conique
argent-irisé (shimmer lent 6 s, seul « animé permanent » autorisé) ; **un seul
élément qui brille au repos par écran** ; l'or réservé à l'économie et au
légendaire (plus aucun bouton d'action jaune plein).

## Contrat d'états (systématique, tout élément interactif)

| État | Traitement |
| --- | --- |
| hover (desktop) | fond +1 niveau ; PokeCard : `translateY(-2px)` + bordure accentuée, 150 ms |
| active | `scale-[0.98]`, 100 ms |
| focus-visible | `ring-2 ring-primary/60 ring-offset-2` — **jamais supprimé** (y compris PokeCard, pips) |
| disabled | `opacity-50` + `cursor-not-allowed` + raison en tooltip (« Revenez demain — reset à 00:00 ») |
| loading | `UButton :loading` sur TOUTE action async (conserve l'anti double-clic) |
| chargement page | `USkeleton` reproduisant la grille finale (supprime « Chargement… » et le CLS) |
| vide | `EmptyState` : icône + phrase + CTA |
| erreur | `UAlert` + message humain + retry (jamais de `TypeError` brut) |
| toast | `useToast()` global (survit à la navigation) |
| live | `aria-live="polite"` sur résultat de tirage, CoinCounter, jauges |

## Mapping des composants (existant → Nuxt UI)

| Existant | Nuxt UI v4 | Note |
| --- | --- | --- |
| Racine | `UApp` | requis (toasts/overlays) |
| Navbar + dropdowns | `UNavigationMenu` + `UDropdownMenu` | badges → `UChip` **avec compte** |
| Hamburger | `UDrawer` + **bottom-tab-bar custom** | mobile |
| `showModal` générique | `UModal` + `useOverlay()` | promesse au close (même DX) ; Escape + focus trap + `role=dialog` fournis (résout M5, m1) |
| Confirm vente/**fusion** | `UModal` confirm | **fusion enfin confirmée (C5)** |
| Choix de carte forcé | `UModal :dismissible="false"` | comportement propre |
| Inventaire | `USlideover`/`UDrawer` + `UAccordion` + `USwitch` | |
| Replay combat | `UModal fullscreen` + `UButtonGroup` vitesse | contenu custom |
| Bannières | `UBanner` (dismiss persisté par `id`) | quitte le `position:fixed` (M2) |
| Boutons | `UButton` (variantes, `size`, `:loading`) | **1 seul `solid primary` par écran** |
| Badges biome/type | `UBadge` + `TypeBadge`/`BiomeBadge` | recette color-mix |
| Barres | `UProgress` (couleur dynamique) | |
| Onglets | `UTabs` (pill) | |
| Accordéons | `UAccordion` | table jackpot **ouverte par défaut (m3)** |
| Bandeaux succès | `useToast()` | global (M8) |
| « Chargement… » | `USkeleton` | M3 |
| Erreurs brutes | `UAlert` + humain + retry | C3 |
| Leaderboard | `UTable` ≥ md / liste-cartes < md | tabular-nums |
| Formulaires auth | `UForm` + `UFormField` (labels **visibles**) + `UInput` | validation live Zod, fini le placeholder-label |
| Icônes emoji | **Lucide** | emojis conservés dans le TEXTE éditorial |
| 404 | `UError` + redirect | m2 |

## Composants custom (le « moteur de jeu »)

| Composant | Props | États / variantes |
| --- | --- | --- |
| `PokeCard` | `pokemon, size(xs72/sm104/md150/lg200), rarity, shiny, owned, revealed, qty, isNew, selectable, showActions` | owned / dos « ? » / shiny (bordure conique) ; hover/selected/focus/disabled ; slot footer actions |
| `RarityFrame` | `rarity, animated` | interne PokeCard |
| `TypeBadge`/`BiomeBadge` | `type\|biome, size, icon-only` | wrappers UBadge |
| `RouletteStrip` | `cards[], targetIndex, revealMode, state` | émet `tick`/`end` ; reduced-motion → crossfade |
| `RollResultReveal` | `reward, tier, isNew, isDuplicate` | inline (commun/rare) ou modale (épique+) ; **verbalise doublon vs nouveauté (M1)** |
| `DuelGauge` | `percent, threshold, state, size` | SVG arc conservé ; `aria-live` du % |
| `SlotMachine`/`SlotReel` | `reels[], result, activeLines, state` | glow gagnant = seul glow de l'écran |
| `BadgePips` | `badges[], earned, size(≥44px)` | tooltip arène ; verrouillé grisé |
| `CoinCounter` | `value, animateDelta` | Bricolage + tabular, count-up 400 ms, `aria-live` ; **une seule instance source** |
| `MatchupBar` | `mine, theirs, labels` | double barre tournoi |
| `BracketView` | `rounds[], me, mode` | accordéon par tour < lg |
| `CaptureSequence` | `stage, result` | séquence légendaire (keyframes sous tokens motion) |
| `BottomTabBar` | `items[5]` | mobile, safe-area |

## Hiérarchie visuelle par écran clé

- **Play** : la bande + Lancer dominent (au-dessus du fold à toutes tailles) ; les
  options reculent (barre compacte sous la bande) ; **le résultat s'affiche là où
  sont les yeux** (centre du viewport / modale pour épique+, jamais sous le fold —
  résout C1) ; aside « Aujourd'hui » 320 px desktop / rangée de chips mobile.
- **Collection** : les cartes dominent ; les actions reculent (au hover desktop /
  drawer mobile) ; toolbar sticky (onglets Standard/Shiny + progression + filtres) ;
  boutons jaunes retirés de la grille.
- **Gyms** : le combat de la semaine domine ; entraînement secondaire ;
  historique tertiaire ; `DuelGauge` en overlay plein écran (théâtre conservé).
- **Tournoi** : mon statut + l'action suivante dominent ; « Mon parcours »
  (anti-spoiler) par défaut ; participants en liste compacte (vs 16 panneaux
  pleine largeur actuels).

## Comportement desktop vs mobile (synthèse — détail dans `responsive-strategy.md`)

| Pattern | Desktop ≥ lg | Mobile < lg |
| --- | --- | --- |
| Navigation | `UNavigationMenu` horizontale | bottom-tab-bar 5 onglets |
| Inventaire/filtres/détail | `USlideover`/`UPopover` | `UDrawer` bas (snap points) |
| Confirmations | `UModal` centrée | idem (décision rapide) |
| Célébration épique+/replay | `UModal fullscreen` | idem |
| Chat | Fab + slideover | intégré à l'onglet Social (pas de FAB qui masque, M2) |
| Leaderboard | `UTable` | liste-cartes custom |
| Multi-roll | 1 bande + 5 cartes | séquence sur UNE bande (m12) |

## Ce qu'on ne touche pas

Le théâtre de suspense, la synthèse sonore, la résolution serveur + rejeu client,
l'anti-spoiler tournoi, les modales d'intro, les estimations affichées, le ton
français. **La refonte est un écrin, pas un remake.**
