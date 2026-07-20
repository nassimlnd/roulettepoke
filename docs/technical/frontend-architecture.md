# Architecture frontend proposée

> Distillation des décisions du rapport `docs/experts/06-frontend-nuxt.md` (source
> détaillée avec interfaces TS complètes). Stack imposée : Nuxt 4.5, Vue 3,
> TypeScript strict, Nuxt UI v4, Tailwind (via Nuxt UI), Pinia, VueUse, Playwright.
> L'API et les règles métier ne changent pas.

## Décisions structurantes

| Décision | Choix | Motivation |
| --- | --- | --- |
| Mode de rendu | **SPA (`ssr: false`)** | Jeu 100 % authentifié derrière login ; aucun SEO utile (sauf éventuelle landing) ; pas d'intérêt à hydrater un état de jeu ; simplicité de déploiement statique + reverse proxy vers l'API. |
| Session | **JWT en `localStorage.gacha_token`** (même clé que l'ancien front) | Coexistence des deux fronts pendant la migration (même origine ⇒ session partagée) ; l'API attend un Bearer et n'émet pas de cookie. Migration vers cookie httpOnly = chantier backend noté pour plus tard. |
| Routing | Fichiers `pages/`, garde `auth.global.ts` | Convention Nuxt 4 ; 404 réelle (`[...slug].vue`) qui garde la navbar (résout m2). |
| Rendu HTML | **Zéro `v-html`** sur données serveur | Neutralise la classe de risques XSS de l'ancien front (rendu `innerHTML` interpolé) ; mitige le stockage du token en localStorage. |
| État | **Pinia, stores spécialisés** (pas de store global) | Cf. `state-management.md`. |
| Accès API | **Couche unique `$fetch` typé + repositories** | Cf. `api-integration-strategy.md` ; aucun composant ne fait de fetch. |

## Arborescence `app/`

```text
app/
├── app.vue                # UApp (toasts/overlays Nuxt UI) + NuxtLayout + NuxtPage
├── error.vue              # page d'erreur fatale (ton du jeu, clearError → /play)
├── layouts/
│   ├── default.vue        # jeu : AppNavbar + TournamentBanner + ChatWidget + <slot>
│   └── auth.vue           # public : carte centrée, sans navbar ni stores de jeu
├── middleware/auth.global.ts   # garde d'auth client (ne fetch JAMAIS /auth/me)
├── pages/                 # 1 fichier par route (play, collection, team, gyms,
│                          #   league, tournament/[index|:id], slot-machine, spin,
│                          #   leaderboard, stats, chat, trades, suggestions,
│                          #   patchnotes, rules, login…, [...slug] = 404)
├── components/            # base/ + game/{roulette,battle,capture,slot} + collection/
│                          #   team/ gym/ league/ tournament/ social/ inventory/ spin/
├── composables/           # useApi, useCoins, useCountdown, useSound, useCelebration,
│                          #   useRouletteEngine, useChatSocket, usePolling…
├── stores/                # auth, wallet, collection, inventory, team, gym, league,
│                          #   tournament, slotMachine, trades, chat, notifications,
│                          #   quotas, preferences
├── repositories/          # 1 par domaine — SEUL endroit qui parle à l'API
├── types/                 # api.ts (wire), domain.ts (normalisé), ws.ts
├── utils/                 # errors.ts, paris-time.ts, easing.ts, dedupe.ts
└── assets/css/main.css    # tokens du design system
```

## Séparation des responsabilités (règle d'or)

```text
Pages / Stores ──► Repositories ──► $api ($fetch typé) ──► /api
Composants ──► lisent les Stores, appellent leurs actions (JAMAIS de fetch direct)
Composables ──► logique réutilisable sans état global (moteur roulette, comptes à rebours, son…)
```

- **Aucune logique métier dans les composants visuels** : ils reçoivent des
  props normalisées et émettent des événements ; la logique vit dans les stores
  et composables.
- **Les repositories sont le seul point de contact avec les formes « wire »** de
  l'API (tableaux nus vs enveloppes, rareté `Alt`…) : ils exposent des types
  `domain.ts` propres au reste de l'app.

## Composants majeurs (extrait — liste complète dans le rapport 06 §3)

| Domaine | Composants clés | Responsabilité |
| --- | --- | --- |
| `base/` | `GameCard`, `RarityFrame`, `CoinBalance`, `CountdownChip`, `ConfirmDialog`, `IntroModal`, `EmptyState`/`ErrorState`/`SkeletonGrid` | Design system du jeu au-dessus de Nuxt UI |
| `game/roulette/` | `RouletteStrip`, `RouletteViewport`, **`RollResult` (au-dessus du fold — C1)**, `RevealModePicker`, `BiomePicker`, `MultiRollPanel`, `SpecialEventReveal`, `CardChoiceModal` | La boucle cœur |
| `game/battle/` | `BattleReplay` [lazy], `GaugeArc`, `BattleLog`, `ReplaySpeedControl` | Duels (arène/ligue/tournoi/entraînement) |
| `game/slot/` | `SlotMachine` [lazy], `SlotReel`, `SlotPrizeTable`, `SlotFeeds` | Jackpot |
| `collection/` | `CollectionGrid` [virtualisée], `CollectionFilters`, `MergeDialog` (corrige C5), `SellDialog` | Collection |
| `social/` | `LeaderboardTable`, `ShinyFeed`, `trade/TradeFlow`, `NotificationCenter` | Social |

Nuxt UI v4 (Reka UI) fournit modales/toasts/dropdowns accessibles par défaut
(focus trap, Escape, `role="dialog"`) : **un seul système d'overlay** (résout M5
et m1).

## Composables porteurs de la valeur

- **`useRouletteEngine`** : port de l'algorithme existant (bande 20, gagnante
  index 16, 4 000 ms, `cubic-bezier(0.15,0.85,0.35,1)`, jitter ±40 px, ticks
  carte par carte, purge DOM). **Ne touche jamais le DOM** (produit des nombres)
  ⇒ testable sans navigateur, et permet un rendu mobile compact du multi-roll.
- **`useCountdown`** : resets Europe/Paris **DST-safe** (jamais `now+7j` en UTC ;
  offset réel recherché à la date cible via `Intl…formatToParts`). Un seul
  `setInterval` global en pause si onglet caché.
- **`useSound`** : port du moteur Web Audio chiptune (zéro asset), + contrôle
  volume/mute (m10) et coupure sous préférence.
- **`useChatSocket`** (dans le store `chat`) : port du singleton WS (auth 1er
  message, reconnexion 3 s, 4001/4003 définitifs, resync + dédup par id).
- **`useCelebration`** : hiérarchie des 7 niveaux (M1), respecte reduced-motion.
- **`usePolling`** : polling léger piloté par `visibilitychange`/`focus`.

## Performance (cibles chiffrées)

- **Collection virtualisée** par rangées (`@tanstack/vue-virtual`, ~2 Ko) :
  DOM vivant ≤ ~60 cartes quel que soit le filtre (résout m11) ; filtres =
  `computed` sur le store (zéro re-fetch, zéro reconstruction).
- **Chunks lazy** : BattleReplay, LegendaryCapture, SlotMachine,
  TournamentBracket, SuggestionBoard, Stats — la route `/play` reste minimale.
- **Images** : sprites `.webp` same-origin, `width`/`height` fixes (anti-CLS),
  `loading="lazy"` hors viewport, préchargement des 20 sprites avant un spin.
  Pas de proxy ni `@nuxt/image` (déjà optimisées).
- **Budget JS premier écran** : entry ≤ 110 Ko gz, chunk `/play` ≤ 45 Ko gz,
  CSS ≤ 30 Ko gz, **total ≤ 180 Ko gz** ; assertion de taille en CI.

## Gestion des erreurs (architecture)

- `error.vue` : erreur fatale (chunk manquant après déploiement → reload).
- `SectionBoundary.vue` (`<NuxtErrorBoundary>`) : chaque page est composée de
  sections indépendantes ; une section en échec rend `ErrorState` réessayable
  **sans casser le reste** (fin des pages entières bloquées).
- **401** : un seul chemin centralisé (cf. `api-integration-strategy.md`), y
  compris depuis le WS (code 4001).
- Lecture → retry (auto unique à la reprise réseau via `useOnline`) ; mutation →
  jamais de retry auto (rolls/ventes/combats non idempotents).

## Ordre de construction (résumé — détail dans migration-plan.md)

1. Socle + tokens + couche API + stores `auth`/`wallet`.
2. Design system (`base/`) + stratégie d'erreur/toasts.
3. `/play` (moteur roulette, célébrations) + hub.
4. Collection virtualisée, équipe, arènes.
5. Ligue, tournoi, jackpot, trades, chat (WS), social, spin, stats.
6. En continu : fixtures + specs E2E de chaque zone.
