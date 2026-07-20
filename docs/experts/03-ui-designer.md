# 03 — Expert UI Designer : système UI de la refonte Nuxt UI

> Base : `docs/audit/ui-inventory.md`, `frontend-issues.md`, `application-map.md`
> + captures (`artifacts/screenshots/` : home, collection, gyms, slot-machine,
> tournament, leaderboard, team, mobiles compacts) + docs Nuxt UI v4 (Context7).
> Cible : `web/` (Nuxt 4.5, @nuxt/ui 4.10, Tailwind CSS v4, Lucide). L'API ne change pas.
> Note : `home-biome-panel-open.png` n'existe pas dans les artefacts ; analyse
> faite sur `home-desktop(-fullpage)` + `roll-*`. Les hex des 15 types ne sont
> pas dans `ui-inventory.md` : valeurs reconstituées depuis
> `collection/collection-filters-open.png` (palette canonique Pokémon) — à
> recaler au pixel sur `style.css` de prod au moment de l'implémentation.

## 1. Synthèse

L'app a une **identité forte** (dark violet, théâtre de suspense, ton français
drôle) mais un **système inexistant** : 6 462 lignes de CSS ad hoc, 7 breakpoints,
radius variables, emojis comme seule iconographie, Segoe UI, trois systèmes
d'overlay incompatibles, zéro état de chargement structuré. Le violet `#bb86fc`
sur `#0f0f1a` est du Material 2 dark de 2018 : correct, mais plat et daté, et le
jaune plein (`#ffd700` boutons de vente, bordures or) crie plus fort que le
contenu (cf. `collection-desktop.png` : 27 boutons jaunes au-dessus des cartes).

La refonte ne doit **pas** réinventer le jeu : le drama (roulette, jauges,
slot, sons synchronisés) est déjà excellent. Elle doit le **mettre en scène** :
1 système de tokens (Nuxt UI + Tailwind v4 `@theme`), 1 système d'overlay
accessible, 3 cibles responsive au lieu de 7, une hiérarchie où **l'action de
jeu domine** et où l'or/le glow sont réservés aux récompenses. Dark-first
obligatoire (identité casino nocturne) ; le mode clair devient « gratuit » si
l'on ne code qu'en tokens, mais n'est pas un objectif v1.

Environ 80 % de l'UI se mappe directement sur des composants Nuxt UI (overlays,
nav, formulaires, tableaux, feedbacks). Le cœur de jeu reste custom mais
discipliné par les tokens : `PokeCard`, `RouletteStrip`, `DuelGauge`,
`SlotMachine`, `CaptureSequence` — 12 composants custom identifiés, pas plus.

---

## 2. Système proposé

### 2.1 Grille & layout

**Shell d'application** (toutes pages privées) :

```text
UApp (racine obligatoire v4 : Toaster + Tooltip provider + overlays)
├── Header sticky h-14 (56px) : logo · nav (desktop) · CoinCounter+avatar (HUD permanent) · notifs · burger (mobile)
├── UBanner (flux normal, SOUS le header) : tournoi / nouvelle version — jamais en position: fixed
├── <main> : conteneur de page
├── Bottom-tab-bar mobile h-16 (64px + safe-area) — <lg uniquement
└── ChatFab (desktop uniquement ; sur mobile le chat vit dans l'onglet Social)
```

Le HUD coins+avatar passe **dans le header** (aujourd'hui bloc flottant au
centre de la home, chevauché par la bannière tournoi sur mobile —
`home-mobile-compact.png`). Un seul endroit affiche le solde → règle aussi la
moitié du problème M7 (solde éclaté).

**Largeurs max par type de page** (centrées, `px-4 sm:px-6 lg:px-8`) :

| Type de page | Conteneur | Pages |
| --- | --- | --- |
| Jeu focalisé | `max-w-3xl` (48 rem) | home/roulette, jackpot, spin |
| Jeu + panneau latéral | `max-w-5xl` (64 rem), 2 col ≥ `lg` : main + aside 320 px | home desktop (roulette + rail progression), team |
| Grille de contenu | `max-w-7xl` (80 rem) | collection |
| Contenu structuré | `max-w-4xl` (56 rem) | gyms, tournoi, ligue, trades, stats, leaderboard |
| Lecture | `max-w-2xl` (42 rem) | guide, patch notes, suggestions |
| Formulaire | `max-w-sm` (24 rem) | auth |

**Densités** : desktop = confort (cartes 160 px, `gap-4`, tableaux complets) ;
mobile = compact (cartes 104–120 px, `gap-3`, tableaux → listes de cartes,
actions dans des drawers). Jamais de scroll horizontal implicite (m9).

### 2.2 Breakpoints, espacements, tailles

**Breakpoints : 7 → 3 cibles** sur l'échelle Tailwind standard, c'est la seule
décision responsive autorisée :

| Cible | Plage | Usage |
| --- | --- | --- |
| Mobile | `< 640` (base) | 1 colonne, bottom bar, drawers, densité compacte |
| Tablette | `sm:640 – lg:1023` | grilles 2-3 col, nav top complète, pas d'aside |
| Desktop | `≥ lg:1024` | asides, tableaux, hover states riches |

(`md:768` autorisé uniquement pour les grilles de cartes ; `xl/2xl` interdits
hors largeur de conteneur.)

**Espacements — base 4 px** (échelle Tailwind), avec rôles fixes :

| Rôle | Valeur | Exemples |
| --- | --- | --- |
| Micro (intra-chip, icône↔label) | 4 / 8 px (`gap-1/2`) | badges type, boutons |
| Composant (padding interne) | 12 / 16 px (`p-3/4`) | PokeCard `p-3`, UCard `p-4` |
| Grille de cartes | 12 px mobile / 16 px desktop (`gap-3/4`) | collection, équipe |
| Entre sections | 24 px mobile / 32 px desktop (`space-y-6/8`) | blocs de page |
| Haut de page | 24 / 32 px (`pt-6/8`) | sous le header |

**Radius systématisé** (`--ui-radius: 0.5rem`) : boutons/inputs `rounded-lg`
(8 px), chips `rounded-full`, UCard/panneaux `rounded-xl` (12 px), PokeCard
10 px (`rounded-[10px]`), modales `rounded-2xl`. Rien d'autre.

**Zones tactiles** : min 44×44 px mobile (pips de badges, votes, boutons de
carte — aujourd'hui < 40 px, cf. M5).

### 2.3 Typographie

Remplacement de Segoe UI par **2 familles variables**, via le module
`@nuxt/fonts` (self-host au build, subset latin, `font-display: swap`,
métriques de fallback automatiques → zéro CLS) :

| Rôle | Famille | Usage | Poids |
| --- | --- | --- | --- |
| **Texte & UI** | **Inter** (variable) | tout le corps, boutons, tableaux, formulaires | 400 / 500 / 600 |
| **Display** | **Bricolage Grotesque** (variable) | titres de page, compteurs de coins, « Vous avez obtenu ! », scores, cagnottes | 600 / 800 |

Pourquoi : Inter est la référence lisibilité UI et possède de **vrais chiffres
tabulaires** (`font-variant-numeric: tabular-nums` obligatoire sur
CoinCounter, timers, tableaux, quantités ×N — les compteurs ne « dansent »
plus). Bricolage Grotesque apporte le caractère jeu/arcade (chunky, chaleureux)
sans tomber dans le cartoon illisible, et reste gratuite (Google Fonts).
Fallback : `Inter, system-ui, 'Segoe UI', sans-serif` /
`'Bricolage Grotesque', Inter, system-ui, sans-serif`.

**Budget de chargement** : 2 fichiers woff2 variables subset latin ≈ 100–130 KB
(Inter) + 60–90 KB (Bricolage) → **plafond 250 KB**, préchargés, cache long.
Si le budget devait descendre : Inter seule + graisse 800 en display.

**Échelle typographique (rem, base 16 px)** :

| Token | Taille / interligne | Usage |
| --- | --- | --- |
| `display` | 2.25 / 1.1 (36 px), Bricolage 800 | célébration légendaire, hero rare |
| `h1` | 1.5 mobile → 1.875 desktop / 1.2, Bricolage 600 | titre de page (nettement plus petit qu'aujourd'hui : « Ma collection » 30 px max) |
| `h2` | 1.25 / 1.3, Inter 600 | sections de page |
| `h3` | 1.125 / 1.4, Inter 600 | titres de cartes/panneaux |
| `body` | 1 / 1.5, Inter 400 | texte courant |
| `body-sm` | 0.875 / 1.45, Inter 400-500 | densité UI par défaut (boutons, tableaux) |
| `caption` | 0.75 / 1.35, Inter 500 | badges, méta, hints |
| `num-lg` | 1.5, Bricolage 700 + tabular | CoinCounter header, cagnotte, score |

Règle : Bricolage **uniquement** ≥ 20 px et sur les nombres « spectacle ».
Jamais en corps de texte.

### 2.4 Palette & tokens

Principe : **on garde l'âme violette, on quitte le lavande Material 2**. Trois
couches de tokens, proprement séparées :

**Couche 1 — rôles sémantiques Nuxt UI** (`app.config.ts > ui.colors`),
consommés par tous les composants U* :

| Rôle | Palette | Nuance dark (`--ui-*`) | Usage |
| --- | --- | --- | --- |
| `primary` | `violet` (Tailwind) | `violet-400 #a78bfa` (500 `#8b5cf6` en clair) | actions, liens, sélection, marque |
| `secondary` | `amber` | `amber-400 #fbbf24` | **économie** : coins, prix, cagnottes, récompenses |
| `success` | `emerald` | `emerald-400 #34d399` | victoires, jauges gagnées, complétion |
| `info` | `sky` | `sky-400 #38bdf8` | pédagogie, intros, hints |
| `warning` | `orange` | `orange-400 #fb923c` | cooldowns, avertissements destructifs (distinct de l'or des coins — c'est le point) |
| `error` | `red` | `red-400 #f87171` | défaites, erreurs |
| `neutral` | **`night`** (custom) | voir rampe | surfaces, texte, bordures |

Rampe custom `night` (gris teintés violet, hue ≈ 248°, dans `@theme static`) :

```css
--color-night-50:#f6f6fa; --color-night-100:#ececf4; --color-night-200:#d9d9e7;
--color-night-300:#b9b9cf; --color-night-400:#9494b0; --color-night-500:#757591;
--color-night-600:#5c5c77; --color-night-700:#46465e; --color-night-800:#232338;
--color-night-900:#17172a; --color-night-950:#0e0e1b;
```

Surfaces dark (overrides dans `main.css`) — parenté volontaire avec l'existant
(`#0f0f1a/#1a1a2e/#1e1e2e`) pour que les joueurs reconnaissent leur jeu :

```css
.dark {
  --ui-bg: var(--color-night-950);            /* page */
  --ui-bg-muted: var(--color-night-900);      /* panneaux */
  --ui-bg-elevated: var(--color-night-800);   /* cartes, popovers */
  --ui-border: color-mix(in oklch, white 8%, transparent);
  --ui-border-accented: color-mix(in oklch, white 14%, transparent);
  --ui-text: var(--color-night-100);
  --ui-text-muted: var(--color-night-400);
  --ui-primary: var(--color-violet-400);
}
```

**Mode clair** : non prioritaire v1 — `colorMode` forcé en dark. Mais tout
style custom DOIT passer par `--ui-*`/classes sémantiques, jamais par un hex :
le clair devient un P3 activable sans refonte.

**Couche 2 — tokens de rareté** (décoratifs, PAS des couleurs sémantiques
Nuxt UI : les enregistrer dans `ui.theme.colors` générerait des variantes
inutiles sur les 125 composants). Dans `@theme` → utilitaires
`text-rarity-epic`, `border-rarity-epic`, etc. :

```css
--color-rarity-common:  #757591;  /* night-500 — discret */
--color-rarity-rare:    #38bdf8;  /* cyan observé sur les captures */
--color-rarity-epic:    #e879f9;  /* fuchsia (rose actuel modernisé) */
--color-rarity-legendary:#fbbf24; /* or discipliné (ex-#ffd700) */
--color-rarity-shiny:   #e2e8f0;  /* argent + gradient (voir 2.5) */
```

**Couche 3 — tokens des 15 types** (même mécanique `@theme`, un hex par type,
palette canonique conforme aux chips de `collection-filters-open.png`) :

```css
--color-type-normal:#a8a77a; --color-type-feu:#ee8130;  --color-type-eau:#6390f0;
--color-type-plante:#7ac74c; --color-type-electrik:#f7d02c; --color-type-glace:#96d9d6;
--color-type-combat:#c22e28; --color-type-poison:#a33ea1;  --color-type-sol:#e2bf65;
--color-type-vol:#a98ff3;    --color-type-psy:#f95587;    --color-type-insecte:#a6b91a;
--color-type-roche:#b6a136;  --color-type-spectre:#735797; --color-type-dragon:#6f35fc;
```

Recette d'usage unique (contraste garanti sur fond sombre, jamais de texte
couleur-type sur `night-950` direct) — un `TypeBadge` l'encapsule :

```
badge type = bg color-mix(type 18%, transparent) + border color-mix(type 40%)
           + texte color-mix(type 85%, white 15%) + icône du type (pas emoji)
```

Biomes (9) : même recette avec une rampe dérivée des couleurs actuelles des
badges (Forêt vert, Lac bleu, Désert orange…), tokens `--color-biome-*`.

### 2.5 Surfaces & profondeur

**Hiérarchie à 3 niveaux maximum**, par luminosité et non par ombre (les
ombres portées sont quasi invisibles sur fond `#0e0e1b`) :

| Niveau | Fond | Bordure | Usage |
| --- | --- | --- | --- |
| 0 — Page | `--ui-bg` (night-950) | — | body |
| 1 — Panneau | `--ui-bg-muted` (night-900), `UCard variant="soft"` | `1px --ui-border` (white/8) | sections de page, toolbar, panneaux |
| 2 — Élevé | `--ui-bg-elevated` (night-800) | `1px white/10` + `shadow-lg` légère | PokeCard, popovers, modales, dropdowns |

Règles de discipline :
- **Bordures de rareté** : `2px` couleur rareté + halo unique
  `box-shadow: 0 0 0 1px <rarity>/30, 0 0 20px -6px <rarity>/50`. Fini
  l'empilement bordure épaisse + glow saturé de la collection actuelle.
  Commun = pas de bordure colorée du tout (bordure neutre niveau 2).
- **Shiny** : bordure `2px` en dégradé conique argent-irisé
  (`conic-gradient` via `border-image`/pseudo-élément) + badge ✦ — le seul
  traitement « animé » permanent autorisé, en shimmer lent 6 s.
- **Glow animé** : réservé aux événements transitoires (révélation, cellule
  gagnante du slot, nouvelle découverte). **Un seul élément qui brille par
  écran au repos.** L'or (`secondary`) est réservé à l'économie et au
  légendaire — plus aucun bouton d'action jaune plein (les boutons « vendre »
  deviennent `variant="ghost"` au hover de la carte, cf. 2.8 Collection).
- Carte non possédée : niveau 1 + bordure dashed `white/10`, dos « ? » à 40 %
  d'opacité — elle **recule**, aujourd'hui elle pèse autant qu'une possédée.

### 2.6 Feedbacks & états (systématiques)

Contrat d'interaction identique pour tout élément interactif (U* le fournit ;
les customs DOIVENT l'implémenter) :

| État | Traitement |
| --- | --- |
| hover (desktop) | fond +1 niveau ou `bg-elevated/60` ; PokeCard : `translateY(-2px)` + bordure accentuée, 150 ms |
| active | `scale-[0.98]`, 100 ms |
| focus-visible | `ring-2 ring-primary/60 ring-offset-2 ring-offset-(--ui-bg)` — jamais supprimé, y compris sur PokeCard et pips |
| disabled | `opacity-50` + `cursor-not-allowed` + raison en `UTooltip` quand utile (« Revenez demain — reset à 00:00 ») |
| loading | `UButton :loading` (spinner intégré, largeur conservée) sur TOUTE action asynchrone — conserve l'excellent anti double-clic existant |
| chargement page | `USkeleton` reproduisant la grille finale (collection : grille de rectangles carte ; gyms : 3 panneaux ; leaderboard : lignes) — supprime « Chargement... » et le layout shift (M3) |
| vide | pattern EmptyState : icône Lucide + phrase + CTA (`UButton`) |
| erreur | `UAlert color="error"` + message humain + action de retry ; jamais de `TypeError` brut (C3) |
| toast | `useToast()` global : succès vente/fusion, trade reçu, erreurs réseau — survit à la navigation (M8) |
| live | `aria-live="polite"` sur résultat de tirage, CoinCounter, jauges (M5) |

### 2.7 Motion

Conserver les 25 keyframes « théâtre » (roulette 4 s Bézier, flip, capture…)
mais les ranger sous des **tokens de durée** (`--motion-spin: 4s`,
`--motion-pop: 200ms`, `--motion-fade: 150ms`) et un interrupteur global :

```css
@media (prefers-reduced-motion: reduce) { /* + réglage utilisateur persisté */
  --motion-spin: 0.6s;  /* la roulette devient un crossfade court, résultat identique */
  /* pops/shakes/glows animés → opacity fade simple */
}
```

Le son suit le même interrupteur logique (réglage volume/mute dans un panneau
Réglages — inexistant aujourd'hui, cf. m10) sans toucher au moteur Web Audio.

### 2.8 Hiérarchie visuelle par écran clé

**Home (roulette)** — ce qui domine : la bande de roulette + bouton Lancer,
au-dessus de la ligne de flottaison à toutes tailles. Ce qui recule : options.
- Ordre : bande (hero, niveau 2) → `UButton size="xl"` Lancer (seule action
  `solid primary` de la page, coût affiché) → sous la bande, une **barre
  d'options compacte** : mode de révélation (`UTabs` pill), « Biome : Tous »
  (`UPopover` desktop / `UDrawer` mobile), toggle ×5, Inventaire (`USlideover`).
- Le **résultat s'affiche là où sont les yeux** : les cartes de la bande
  s'estompent et la carte gagnée apparaît au centre du viewport de la roulette
  (commun/rare), en modale de célébration pour épique+ (voir R2). Plus jamais
  sous le pli (C1).
- Desktop ≥ lg : aside droit 320 px « Aujourd'hui » — quotas (entraînement,
  jackpot), complétion collection `UProgress`, échéance tournoi (m8). Mobile :
  ce rail devient une rangée de 3 stat-chips scrollable sous les options.

**Collection** — ce qui domine : les cartes. Ce qui recule : les actions.
- Toolbar sticky niveau 1 : `UTabs` Standard/Shiny + `UProgress` 134/151 +
  bouton « Filtres (2) » avec compteur de filtres actifs.
- Filtres : chips toggle (biome/type via TypeBadge cliquables) en ligne
  repliable desktop, `UDrawer` bas mobile avec bouton Appliquer.
- Les boutons jaunes vendre disparaissent de la grille : actions 💰/🆙 au
  hover (desktop) ou via tap → `UDrawer` détail de carte (mobile) qui montre
  aussi la fiche. Fusion AVEC confirmation (`UModal`, C5).
- Grille : `repeat(auto-fill, minmax(150px,1fr))` desktop, `minmax(104px,1fr)`
  mobile, images `loading="lazy"`, virtualisation si > 150 éléments visibles.

**Gyms** — ce qui domine : le combat de la semaine (ou l'état Champion).
- Panneau hero « Arène de Misty » : type, estimation `UProgress` colorée,
  CTA `UButton solid` Combattre + compte à rebours (`BadgePips` en tête).
- Secondaire : entraînement quotidien (panneau niveau 1 avec heure de reset,
  m4) ; tertiaire : historique (`UAccordion`).
- La jauge de duel `DuelGauge` reste LE moment : plein écran overlay pendant le
  combat (théâtre conservé, sons compris).

**Tournoi** — ce qui domine : mon statut + l'action suivante.
- Carte statut hero : état (`UBadge` Inscriptions ouvertes), échéance,
  cagnotte en `num-lg` doré, CTA S'inscrire / Voir mon match.
- « Mon parcours » (anti-spoiler existant, à préserver) = onglet par défaut ;
  bracket complet en second onglet (`UTabs`).
- Participants : liste compacte `UAvatar` + username + 6 mini-sprites (39 px
  de haut), en 2 colonnes ≥ sm — la page actuelle fait 16 panneaux pleine
  largeur de 80 px (`tournament-desktop-fullpage.png`), soit 3 écrans de
  scroll avant le contenu utile.

### 2.9 Desktop vs mobile — comportement par pattern

| Pattern | Desktop ≥ lg | Mobile < lg |
| --- | --- | --- |
| Navigation | `UNavigationMenu` horizontale (5 entrées + dropdowns) | **Bottom-tab-bar custom 5 onglets** : Jouer · Collection · Défis · Social · Plus (badge `UChip` par onglet) ; « Plus » = `UDrawer` |
| Notifications | `UPopover` sous la cloche | `UDrawer` bas |
| Inventaire / filtres / détail carte | `USlideover` droit / `UPopover` | `UDrawer` bas (snap points, handle) |
| Modales de confirmation | `UModal` sm centrée | `UModal` (reste centrée — décision rapide) |
| Célébration épique+/replay | `UModal fullscreen` | idem |
| Bannière tournoi/version | `UBanner` sous header, `close` persisté par `id` | idem — plus de chevauchement (M2) |
| Chat | ChatFab + panneau `USlideover` | intégré à l'onglet Social (pas de FAB qui masque les CTAs, M2) |
| Leaderboard / tableaux | `UTable` (tri, colonnes complètes) | liste de lignes-cartes custom : rang + avatar + nom + score, badges dans un `UPopover` au tap (m9) |
| Bracket tournoi | colonnes côte à côte | `UAccordion` par tour, « Mon parcours » par défaut |
| Multi-roll ×5 | 1 bande + 5 cartes résultat en cascade | séquence sur UNE bande (×5 compteur) — pas 5 roulettes empilées (m12) |
| Stat-chips / quotas | aside 320 px | rangée horizontale scrollable |

---

## 3. Mapping composants

### 3.1 Existant → Nuxt UI

| Existant (`src/components`, `style.css`) | Nuxt UI v4 | Notes |
| --- | --- | --- |
| Racine app | `UApp` | requis pour toasts/tooltips/overlays programmatiques |
| Navbar + dropdowns clic | `UNavigationMenu` + `UDropdownMenu` | badges → `UChip` (avec compte, pas juste un point) |
| Hamburger plein écran | `UDrawer`/`USlideover` (menu « Plus ») | + bottom-tab-bar custom |
| `showModal` générique | `UModal` + `useOverlay()` (programmatique) | promesse au close = même DX qu'aujourd'hui ; Escape + focus trap + `role=dialog` fournis (M5, m1) |
| Confirm vente / fusion | `UModal` pattern confirm | fusion enfin confirmée (C5) |
| Choix de carte forcé | `UModal :dismissible="false"` | comportement « pas de fermeture » propre |
| Avatar picker | `UModal` + `UTabs` + grille | |
| Inventaire (`inventoryModal`) | `USlideover` (desktop) / `UDrawer` (mobile) + `UAccordion` + `USwitch` | |
| Replay combat | `UModal fullscreen :dismissible="false"` + `UButtonGroup` vitesse | contenu = custom BattleStage |
| Patch notes | `UModal` + contenu servi (une seule source de version, m5) | |
| Modales d'intro | `UModal` + `UStepper` si multi-étapes | pédagogie conservée |
| Bannière tournoi / cache | `UBanner` (prop `id` = dismiss persisté) | quitte le `position:fixed` (M2) |
| Boutons (btn-spin, etc.) | `UButton` (`solid/soft/ghost/outline`, `size xs→xl`, `:loading`) | 1 seul `solid primary` par écran |
| Badges biome/type/statut | `UBadge` + wrappers `TypeBadge`/`BiomeBadge` | recette color-mix 2.4 |
| Pastilles compteur | `UChip` (avec valeur) | |
| Avatars joueurs | `UAvatar` / `UAvatarGroup` | tournoi, leaderboard, chat |
| Barres (bonus, estimation, complétion) | `UProgress` (couleur dynamique success/warning/error) | double barre matchup reste custom |
| Tooltips `title` + custom badges | `UTooltip` | |
| Onglets (Standard/Shiny, révélation) | `UTabs` (variant pill) | |
| Accordéons (guide, table jackpot) | `UAccordion` | table des gains OUVERTE par défaut (m3) |
| Bandeaux succès 4 s | `useToast()` (`UToast`) | global, survit à la navigation (M8) |
| « Chargement... » | `USkeleton` layouts par page | M3 |
| Erreurs inline brutes | `UAlert` + messages humains + retry | C3 |
| Leaderboard 6 colonnes | `UTable` ≥ md / liste custom < md | tri, `tabular-nums` |
| Formulaires auth | `UForm` + `UFormField` (labels visibles) + `UInput` + `UButton` | validation live (Zod), fini le placeholder-label |
| Selects/textarea suggestions | `USelect` / `UTextarea` | |
| Icônes emoji fonctionnelles | Lucide (`i-lucide-coins`, `i-lucide-swords`…) | emojis conservés dans le TEXTE éditorial (personnalité), plus comme seule icône porteuse de sens (M5) |
| Page 404 / hash inconnu | `UError` + redirect propre | m2 |

### 3.2 Composants custom inévitables (le « moteur de jeu »)

| Composant | Props principales | Variantes / états |
| --- | --- | --- |
| `PokeCard` | `pokemon`, `size (xs 72px / sm 104 / md 150 / lg 200)`, `rarity`, `shiny`, `owned`, `revealed`, `qty`, `isNew`, `selectable`, `showActions` | owned / unknown (dos « ? ») / shiny (bordure conique) ; hover/selected/focus-visible/disabled ; slot `footer` (actions) ; consomme tokens rareté+type |
| `RarityFrame` | `rarity`, `animated` | interne à PokeCard — bordure 2 px + halo 2.5 |
| `TypeBadge` / `BiomeBadge` | `type\|biome`, `size`, `icon-only` | wrappers UBadge + tokens couche 3 |
| `RouletteStrip` | `cards[]`, `targetIndex`, `revealMode`, `state (idle\|spinning\|revealing\|done)` | émet `tick` (sons) et `end` ; reduced-motion → crossfade 0.6 s |
| `RollResultReveal` | `reward`, `tier (common→shiny)`, `isNew`, `isDuplicate` | inline (commun/rare) ou `UModal fullscreen` (épique+) ; verbalise doublon vs nouveauté (M1) |
| `DuelGauge` | `percent`, `threshold`, `state (idle\|running\|won\|lost)`, `size` | SVG arc conservé ; `aria-live` du % ; couleurs success/error tokens |
| `SlotMachine` / `SlotReel` | `reels[]`, `result`, `activeLines`, `state` | émet `reel-stop(i)` ; glow gagnant = seul glow de l'écran |
| `BadgePips` | `badges[]`, `earned`, `size (≥44px tap)` | tooltip nom d'arène ; état verrouillé grisé |
| `CoinCounter` | `value`, `animateDelta` | Bricolage + tabular-nums, count-up 400 ms, `aria-live="polite"` ; UNE instance source (header) |
| `MatchupBar` | `mine`, `theirs`, `labels` | double barre tournoi |
| `BracketView` | `rounds[]`, `me`, `mode (journey\|full)` | accordéon par tour < lg |
| `CaptureSequence` | `stage`, `result` | séquence scriptée légendaire, keyframes conservées sous tokens motion |
| `ChatPanel` / `ChatFab` | `messages[]`, `connected` | slideover desktop / onglet mobile |
| `BottomTabBar` | `items[5]` (badges `UChip`) | mobile uniquement, safe-area |

---

## 4. Recommandations

## [P0] R1 — Fonder toute l'UI sur les 3 couches de tokens (sémantique Nuxt UI + rareté + types)
**Problème** : 6 462 lignes de CSS avec hex codés en dur, radius/breakpoints
variables, violet Material 2 daté, or utilisé à la fois pour l'économie, la
rareté et des boutons d'action.
**Preuve** : `ui-inventory.md` (tokens « de fait », 7 breakpoints) ;
`collection-desktop.png` (boutons jaunes pleins × 27).
**Impact** : incohérence visuelle générale, refonte impossible à maintenir,
mode clair inaccessible, hiérarchie brouillée (l'or n'a plus de sens).
**Recommandation** : implémenter §2.4 : `ui.colors` (primary violet, secondary
amber, warning orange, neutral `night` custom) + `@theme static` pour les
rampes `night`, `rarity-*`, `type-*`, `biome-*` + overrides `--ui-bg/border/
text` dark. Interdiction lint de tout hex hors `main.css`.
**Complexité** : M (2-3 j, c'est le socle).
**Dépendances** : aucune — à faire en premier dans `web/`.
**Critères d'acceptation** : 0 hex hors `main.css`/`@theme` ; tous les U*
rendent correctement avec la palette ; captures avant/après des 4 écrans clés ;
`primary` violet-400 contraste ≥ 4.5:1 sur `night-950`.

## [P0] R2 — Ramener la récompense au centre de l'écran avec célébration par palier
**Problème** : le résultat du tirage se rend sous la ligne de flottaison, et
commun comme shiny partagent le même gabarit « ✨ Vous avez obtenu ! ».
**Preuve** : C1 (`roll-result-new-card.png` : la carte gagnée est coupée en
1440×900) ; M1 (`showResult()` chemin unique).
**Impact** : le moment cœur du jeu — la dopamine du gacha — est littéralement
hors écran, et un légendaire (~1/500) ressemble à un Rattata.
**Recommandation** : `RollResultReveal` : commun/rare → révélation in-place au
centre du viewport roulette ; épique → modale carte + halo ; légendaire/shiny →
`UModal fullscreen` (fond dégradé rareté, fanfare existante, bouton partager) ;
mention explicite « NOUVELLE CARTE ! » vs « Doublon ×N (revendable 25 🪙) ».
**Complexité** : M (3-4 j avec les 4 paliers et reduced-motion).
**Dépendances** : R1 (tokens rareté), R3 (UModal), sons existants.
**Critères d'acceptation** : en 375×667 comme en 1440×900, le résultat est
visible sans scroll ; 4 traitements distincts vérifiables en captures ;
doublon/nouveauté verbalisé ; `aria-live` annonce le gain.

## [P0] R3 — Un seul système d'overlay accessible (UModal / USlideover / UDrawer + useOverlay)
**Problème** : trois systèmes d'overlay coexistent avec des fermetures
différentes ; aucun ne gère Escape, le focus trap ni `role="dialog"`.
**Preuve** : m1, M5 (`ui-inventory.md` §Modales : `modal-overlay`,
`replay-overlay`, `card-choice-overlay`).
**Impact** : accessibilité clavier nulle, comportements imprévisibles,
11 modales à maintenir en triple.
**Recommandation** : mapper les 11 overlays selon §3.1 : `UModal` (confirms,
choix forcé `dismissible=false`, replay fullscreen), `USlideover` (inventaire
desktop), `UDrawer` (mobile : filtres, notifs, détail carte, snap points) ;
ouverture programmatique via `useOverlay()` pour conserver la DX promesse de
`showModal`.
**Complexité** : M (mécanique — 1 j par groupe d'overlays).
**Dépendances** : R1.
**Critères d'acceptation** : Escape ferme tout overlay dismissible ; focus
trap + retour du focus à l'ouvreur ; le choix de carte forcé reste infermable ;
audit axe-core sans violation « dialog » sur les 11 overlays.

## [P1] R4 — Responsive : 3 cibles, bottom-tab-bar mobile, bannières dans le flux
**Problème** : 7 breakpoints ad hoc ; sur mobile la bannière tournoi chevauche
le HUD, la bulle de chat masque des CTAs, les tableaux débordent.
**Preuve** : `ui-inventory.md` (420→768 px) ; M2
(`home-mobile-compact.png` : bannière sur le bloc utilisateur) ; m9
(`leaderboard-mobile-compact.png`).
**Impact** : chaque page se dégrade différemment ; zones perdues et texte
illisible sur ~50 % des sessions (mobile).
**Recommandation** : grille §2.1-2.2 (base/sm/lg), `BottomTabBar` 5 onglets +
« Plus » en `UDrawer`, HUD coins dans le header, `UBanner` sous le header
(dismiss persisté par `id`), chat sans FAB mobile, tableaux → listes-cartes.
**Complexité** : L (touche toutes les pages, mais patterns réutilisables).
**Dépendances** : R1, R3.
**Critères d'acceptation** : grep `@media` custom = 0 (hors reduced-motion) ;
aucune superposition en 360×640 sur les 19 routes ; cibles tactiles ≥ 44 px ;
leaderboard lisible sans scroll horizontal en 360 px.

## [P1] R5 — Typographie dédiée : Inter + Bricolage Grotesque, chiffres tabulaires
**Problème** : `'Segoe UI', system-ui` partout — rendu différent par OS, aucun
caractère, chiffres proportionnels qui « dansent » dans compteurs et tableaux.
**Preuve** : `ui-inventory.md` (police), captures : compteurs coins/score en
Segoe gras.
**Impact** : l'app ressemble à un back-office Windows ; lisibilité des scores
et soldes sous-optimale.
**Recommandation** : §2.3 via `@nuxt/fonts` (self-host, subset latin, swap,
fallback metrics) ; `tabular-nums` sur CoinCounter/timers/tableaux/×N ;
échelle typographique unique (h1 30 px max — les titres actuels de 36 px+
violet gras redescendent d'un cran).
**Complexité** : S (1 j).
**Dépendances** : aucune (parallélisable avec R1).
**Critères d'acceptation** : ≤ 250 KB de fonts, CLS fonts = 0 (Lighthouse) ;
plus aucune référence à Segoe UI ; compteur animé sans variation de largeur.

## [P1] R6 — Skeletons structurés, lazy images et fin du layout shift
**Problème** : chaque navigation affiche « Chargement... » puis la page saute ;
300+ images de cartes pop-in sans réservation de taille.
**Preuve** : M3 (`loading/collection-loading-slow-network.png`) ; m11.
**Impact** : perception de lenteur et de fragilité à CHAQUE navigation — le
coût UX le plus fréquent de l'app.
**Recommandation** : un layout `USkeleton` par gabarit (grille collection,
3 panneaux gyms, lignes tableau, hero tournoi) affiché pendant les fetchs ;
`loading="lazy"` + `width/height` sur toutes les images de cartes ;
`aspect-ratio` fixe sur PokeCard ; virtualisation de la grille au-delà de
150 cartes visibles.
**Complexité** : M.
**Dépendances** : R1 (PokeCard tokenisée) ; s'appuie sur le data-layer Nuxt
(useAsyncData) posé par l'expert front.
**Critères d'acceptation** : CLS < 0.1 sur collection/gyms/leaderboard en
réseau lent simulé ; plus aucun texte « Chargement... » ; scroll collection
fluide (60 fps) avec 302 cartes.

## [P1] R7 — Feedback unifié : toasts globaux, boutons loading, erreurs humaines
**Problème** : feedbacks = bandeaux locaux éphémères ; erreurs techniques
brutes (`TypeError: Failed to fetch`) ; aucun canal global.
**Preuve** : M8, C3 (`errors/roll-offline-error.png`).
**Impact** : succès perdus à la navigation, erreurs anxiogènes, aucune
notification sociale.
**Recommandation** : `useToast()` (succès vente/fusion/trade, erreurs réseau
avec action Réessayer) ; interceptor API → messages humains (offline, 401 →
toast + modale de reconnexion) ; contrat §2.6 appliqué à tout bouton async ;
`aria-live` sur les zones dynamiques.
**Complexité** : S-M.
**Dépendances** : R3 (UApp/Toaster), client API de la refonte.
**Critères d'acceptation** : coupure réseau simulée → toast humain + retry, 0
message technique ; une vente suivie d'une navigation conserve son feedback ;
tout bouton async passe par `:loading`.

## [P2] R8 — Iconographie Lucide + emojis éditorialisés
**Problème** : les emojis sont l'unique iconographie (🪙🆙💰✦…), sans
alternative textuelle, avec un rendu qui varie par plateforme.
**Preuve** : `ui-inventory.md` (emojis partout) ; M5 (sens porté par emoji).
**Impact** : accessibilité (lecteurs d'écran), incohérence visuelle
inter-OS, look « chat SMS » sur les actions critiques.
**Recommandation** : Lucide (déjà installé) pour toute icône fonctionnelle
(coins, vendre, fusionner, filtres, sons…) avec `aria-label` ; les emojis
restent dans les TEXTES à personnalité (patch notes, anecdotes, classement des
tricheurs — à préserver) ; sprite/`UIcon` uniforme 16/20 px.
**Complexité** : S (au fil des pages).
**Dépendances** : R1.
**Critères d'acceptation** : aucune action interactive dont le seul label est
un emoji ; audit lecteur d'écran des 4 écrans clés OK ; le ton éditorial
français drôle est inchangé (revue de contenu).

## [P2] R9 — Motion & son : tokens de durée, reduced-motion, panneau Réglages
**Problème** : 25 keyframes non désactivables, aucun `prefers-reduced-motion`,
aucun contrôle du volume.
**Preuve** : M5, m10 (grep : 0 occurrence reduced-motion).
**Impact** : exclusion des utilisateurs sensibles au mouvement ; son
imposé = jeu coupé en open-space.
**Recommandation** : §2.7 — durées en tokens, variante crossfade de la
roulette, glows transitoires uniquement ; panneau Réglages (UDrawer) : volume/
mute, animations réduites, mode de révélation ; persistance locale.
**Complexité** : S-M.
**Dépendances** : R2 (variantes de reveal), système de son existant (inchangé).
**Critères d'acceptation** : `prefers-reduced-motion` → aucune translation/
scale > 200 ms, résultats identiques ; mute persistant ; réglages accessibles
depuis le header en ≤ 2 taps.

## [P2] R10 — Discipline des surfaces : 3 niveaux, glow unique, cartes qui respirent
**Problème** : bordures épaisses multicolores + glow permanent sur des dizaines
de cartes simultanément ; boutons or pleins au-dessus de chaque carte ; la
grille collection est une fête foraine où rien ne ressort.
**Preuve** : `collection-desktop.png`, `collection-filters-open.png` (27 glows
simultanés) ; §2.5.
**Impact** : la rareté ne se lit plus (tout brille), fatigue visuelle, la
« récompense » visuelle est dévaluée.
**Recommandation** : appliquer §2.5 : 3 niveaux de surface, rareté = bordure
2 px + halo doux, commun sans couleur, shiny seul shimmer permanent, actions de
carte en ghost au hover/drawer, or réservé économie+légendaire.
**Complexité** : S (une fois PokeCard/RarityFrame en place).
**Dépendances** : R1, R6 (PokeCard).
**Critères d'acceptation** : au repos, ≤ 1 élément lumineux animé par écran ;
un légendaire est identifiable en < 2 s dans une grille de 50 cartes (test
utilisateur rapide) ; la rareté est doublée d'un indicateur non-couleur
(pictogramme coin de carte) pour M5.

---

## 5. Ce qu'on ne touche PAS

Le théâtre (délais, Bézier de roulette, arrêts décalés du slot, battement de
cœur), la synthèse sonore, la résolution serveur + replay client, l'anti-spoiler
tournoi, les modales d'intro, les estimations de probabilité affichées, le ton
français. La refonte est un **écrin**, pas un remake.
