# Expert 06 — Architecture frontend Nuxt 4

> Périmètre : refonte du frontend PokeRoulette dans `web/` (starter Nuxt UI vierge).
> Contraintes : Nuxt 4.5, Nuxt UI v4, Tailwind (via Nuxt UI), Pinia, VueUse, Playwright.
> L'API REST **ne change pas** (JWT Bearer en localStorage, un WebSocket chat).
> Sources : `docs/audit/api-inventory.md`, `application-map.md`, `existing-features.md`,
> `frontend-issues.md`, `artifacts/network/*.json`, scaffold `web/` actuel.

## 0. Principes directeurs

1. **Le serveur décide, le client rejoue** : l'architecture existante (résultats
   résolus côté API, animations « théâtre de suspense » côté client) est saine et
   conservée. Les moteurs d'animation (roulette, jauges, slot) deviennent des
   composables purs, testables sans DOM.
2. **Une donnée = un store propriétaire**. Le solde n'existe que dans `wallet`,
   les données navbar dans leurs stores respectifs avec TTL. Fin des re-fetch par
   navigation (C4) et du solde multi-sources (M7).
3. **Compatibilité de migration** : les deux fronts coexistent → même clé
   `localStorage.gacha_token` (et clés de préférences `gacha_*`), même origine.
   Se connecter sur l'un connecte l'autre.
4. **Zéro `v-html`** : le rendu texte de Vue échappe tout par défaut → M6 (XSS
   usernames/card names) disparaît structurellement. `v-html` interdit par règle
   ESLint (`vue/no-v-html`), exception uniquement sur contenu statique interne.

---

## 1. Rendu : SPA pure (`ssr: false`)

### Décision

**`ssr: false` global** (SPA), sortie statique (`nuxt generate`), servie par le
même hôte/nginx que l'API (préfixe `/api` same-origin, comme aujourd'hui).

### Arguments (spécifiques à ce jeu)

- **100 % du contenu utile est derrière login** avec un JWT en `localStorage` —
  invisible au serveur. Un SSR rendrait systématiquement l'état « déconnecté »
  puis re-rendrait après hydratation : flash, double travail, zéro bénéfice.
  Migrer le token en cookie pour rendre le SSR utile est exclu : l'API ne change
  pas et l'ancien front (qui coexiste pendant la migration) lit `localStorage`.
- **SEO sans valeur** : jeu privé entre amis (tournois à 16 participants,
  leaderboard top 10). La seule page « publique » utile est le Guide (`/rules`)
  — consulté connecté. Pas de landing marketing à indexer.
- **Exploitation identique à l'existant** : l'app actuelle est une SPA statique.
  `ssr: false` = pas de serveur Node à opérer, déploiement = copie de fichiers,
  coexistence triviale derrière le même nginx (`/` ancien front, `/beta/` nouveau,
  puis bascule).
- **`GET /auth/me` a un effet de bord** (crédit du bonus quotidien) : un rendu
  serveur qui « précharge » l'utilisateur serait un piège. En SPA, l'appel est
  un acte explicite et unique du store `auth` (§5).
- Réversibilité : si une landing SEO devient nécessaire un jour, Nuxt 4 permet le
  rendu hybride par `routeRules` (`'/': { prerender: true }`, `'/**': { ssr: false }`)
  au prix d'un hébergement Nitro — vérifié dans la doc Nuxt 4.x. Non justifié
  aujourd'hui.

### Hydratation & code-splitting

- Pas d'hydratation SSR ; le coût au boot est le parse JS → maîtrisé par budget (§9).
- **Code-splitting par route** (automatique, chaque page = chunk) + **chunks
  différés par zone lourde** via composants `Lazy*` (auto-import Nuxt) :
  `LazyBattleReplay`, `LazyLegendaryCapture`, `LazySlotMachine`,
  `LazyTournamentBracket`, `LazyStatsPanels`, `LazySuggestionBoard`. Le premier
  écran jouable (`/play`) n'embarque jamais le code des combats/replays.
- `spaLoadingTemplate` personnalisé : skeleton sombre aux couleurs du jeu
  (anti « écran blanc » pendant le boot — répond à M3 dès la première peinture).

### `nuxt.config.ts` cible

```ts
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt'],
  css: ['~/assets/css/main.css'],
  spaLoadingTemplate: 'spa-loading-template.html',
  // Dev : proxy vers l'API réelle/staging, WebSocket inclus (chat)
  nitro: {
    devProxy: {
      '/api': { target: process.env.NUXT_DEV_API ?? 'http://localhost:3001/api', ws: true },
      '/images': { target: process.env.NUXT_DEV_API_ORIGIN ?? 'http://localhost:3001', ws: false },
      '/spin': { target: process.env.NUXT_DEV_API_ORIGIN ?? 'http://localhost:3001' }
    }
  },
  compatibilityDate: '2026-06-30'
})
```

> À retirer du scaffold : `routeRules: { '/': { prerender: true } }` (sans objet
> en SPA statique). À ajouter en dépendances : `@pinia/nuxt`, `pinia`,
> `@vueuse/nuxt`, `@tanstack/vue-virtual` ; en dev : `vitest`,
> `@vue/test-utils`, `@nuxt/test-utils`, `happy-dom`, `@playwright/test`.

---

## 2. Pages, layouts, middleware d'auth

### Arborescence `app/`

```text
app/
├── app.vue                      # UApp (toasts/overlays Nuxt UI) + NuxtLayout + NuxtPage
├── error.vue                    # page d'erreur globale (fatale) — §10
├── layouts/
│   ├── default.vue              # jeu : AppNavbar + TournamentBanner + ChatWidget + <slot>
│   └── auth.vue                 # public : carte centrée, sans navbar ni widgets ni stores
├── middleware/
│   └── auth.global.ts           # garde d'auth client (voir ci-dessous)
├── pages/
│   ├── index.vue                # connecté → redirect /play ; sinon → redirect /login
│   ├── login.vue                # layout auth  (meta: { public: true })
│   ├── register.vue             # layout auth  (public)
│   ├── forgot-password.vue      # layout auth  (public)
│   ├── reset-password.vue       # layout auth  (public, ?token=)
│   ├── rules.vue                # Guide (public : navbar dégradée si non connecté)
│   ├── play.vue                 # Roulette (ex-#home) — cœur du jeu
│   ├── collection.vue           # grille virtualisée, vente, fusion
│   ├── team.vue                 # 6 slots, roulette d'équipe, badges
│   ├── gyms.vue                 # arènes + entraînement + historique
│   ├── league.vue               # Ligue des 4 (garde: 8 badges → sinon état verrouillé)
│   ├── tournament/
│   │   ├── index.vue            # cycle courant : inscription/préparation/bracket/parcours
│   │   └── [id].vue             # détail d'un tournoi passé
│   ├── slot-machine.vue         # jackpot quotidien
│   ├── spin.vue                 # hôte de l'iframe /spin/?iframe=true (postMessage préservé)
│   ├── leaderboard.vue          # classement + tricheurs + feed shiny
│   ├── stats.vue                # statistiques globales
│   ├── chat.vue                 # page chat (le widget flottant se masque ici)
│   ├── trades.vue               # échanges 3 étapes
│   ├── suggestions.vue          # kanban idées/roadmap
│   ├── patchnotes.vue           # notes de version (source unique — résout m5)
│   └── [...slug].vue            # 404 réelle avec lien retour (résout m2)
├── components/                  # §3
├── composables/                 # §4
├── stores/                      # §5
├── repositories/                # §6
├── types/                       # api.ts (wire), domain.ts (normalisé), ws.ts
├── utils/                       # errors.ts, paris-time.ts, easing.ts, dedupe.ts
└── assets/css/main.css
```

### Middleware d'auth — token localStorage, pas de cookie

```ts
// app/middleware/auth.global.ts — SPA : ne tourne que côté client
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    // déjà connecté sur /login → renvoyer au jeu
    if (auth.isAuthenticated && ['login', 'register'].includes(String(to.name))) {
      return navigateTo('/play')
    }
    return
  }
  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { next: to.fullPath } })
  }
  // IMPORTANT : ne JAMAIS appeler /auth/me ici (effet de bord bonus quotidien).
  // L'hydratation user est faite une seule fois par auth.fetchMeOnce() (plugin d'app).
})
```

**Décision cookie vs localStorage** : `localStorage.gacha_token`, **même clé que
l'app actuelle**. Raisons : (1) coexistence — même origine ⇒ session partagée
gratuite entre les deux fronts pendant la migration ; (2) l'API n'émet pas de
cookie et ne change pas ; (3) en SPA `ssr: false`, un cookie n'apporterait rien
au rendu. Le risque XSS du localStorage est mitigé par le principe « zéro
`v-html` » (§0.4) et l'absence de scripts tiers. Une migration vers cookie
httpOnly est un chantier **backend** à noter pour plus tard.

- Expiration : pas de refresh token ⇒ le 401 est le signal d'expiration, géré
  centralement (§6). Le middleware ne valide que la présence du token (+ décodage
  `exp` local si présent, pour éviter un aller-retour perdu d'avance).

---

## 3. Composants par domaine

```text
app/components/
├── base/                        # design system du jeu (au-dessus de Nuxt UI)
│   ├── AppNavbar.vue            # navigation, solde, badges — lit les stores, ne fetch jamais
│   ├── CoinBalance.vue          # affichage animé du solde (source unique : store wallet)
│   ├── CountdownChip.vue        # compte à rebours de reset (useCountdown, Europe/Paris)
│   ├── RarityFrame.vue          # cadre/couleur de rareté + texte alternatif (a11y : pas couleur seule)
│   ├── GameCard.vue             # rendu unique d'une carte (sprite webp, shiny, quantité, dos « ??? »)
│   ├── BiomeBadge.vue / TypeBadge.vue  # pastilles biome/type avec icône + libellé
│   ├── ConfirmDialog.vue        # confirmation générique (focus trap, Escape — via UModal)
│   ├── IntroModal.vue           # modale pédagogique « première visite » réutilisable (persist vue)
│   ├── SectionBoundary.vue      # error boundary de zone + bouton réessayer (§10)
│   ├── EmptyState.vue / ErrorState.vue / SkeletonGrid.vue  # états uniformes (M3)
│   └── StatChip.vue             # petite stat (badge, complétion) pour le hub
├── game/
│   ├── roulette/
│   │   ├── RouletteStrip.vue    # bande de 20 cartes, transform piloté par useRouletteEngine
│   │   ├── RouletteViewport.vue # fenêtre + aiguille + masque ; mesure cardWidth (responsive)
│   │   ├── RollResult.vue       # zone résultat AU-DESSUS de la ligne de flottaison (C1)
│   │   ├── RevealModePicker.vue # visible / si possédée / masquées (préview + libellés clarifiés, m6)
│   │   ├── BiomePicker.vue      # filtre biome, coûts réels, progression possédées/total
│   │   ├── MultiRollPanel.vue   # orchestration ×5 (1 moteur partagé, cascade 550 ms — m12)
│   │   ├── SpecialEventReveal.vue # carte Pokéball retournée (coins / charme / choix)
│   │   ├── CardChoiceModal.vue  # choix gauche/droite (rouvert via pendingChoice de /auth/me)
│   │   └── ActiveTicketBanner.vue # ticket biome/type actif, combo-check bloquant
│   ├── battle/
│   │   ├── BattleReplay.vue     # rejoue un log de duels (arène/ligue/tournoi/entraînement) [Lazy]
│   │   ├── GaugeArc.vue         # jauge tachymètre SVG (ralenti ×5, zone verte, seuil)
│   │   ├── BattleLog.vue        # log détaillé + K.O. + résumé des équipes
│   │   └── ReplaySpeedControl.vue # ×1/×2/×4 + skip (persisté dans preferences)
│   ├── capture/
│   │   └── LegendaryCapture.vue # jauge « buguée », pokéball, secousses, étoiles/fuite [Lazy]
│   └── slot/
│       ├── SlotMachine.vue      # 3 rouleaux, arrêts décalés 700 ms, lignes gagnantes [Lazy]
│       ├── SlotReel.vue         # un rouleau (phase rapide + décélération)
│       ├── SlotPrizeTable.vue   # table des gains dynamique 1-(1-p)^N, dépliée par défaut (m3)
│       └── SlotFeeds.vue        # derniers gains + mon historique
├── collection/
│   ├── CollectionGrid.vue       # grille VIRTUALISÉE par rangées (@tanstack/vue-virtual — m11)
│   ├── CollectionFilters.vue    # onglets standard/shiny, biome, type, tri quantité
│   ├── CardDetailModal.vue      # détail + actions vente/fusion/avatar
│   ├── SellDialog.vue           # confirmation vente (prix, cas shiny → charme)
│   └── MergeDialog.vue          # confirmation fusion 10 → 1 évolution (corrige C5)
├── team/
│   ├── TeamSlots.vue            # 6 slots ordonnés, mode réorganiser (swap 2 slots)
│   ├── TeamRoulette.vue         # roulette d'équipe (réutilise le moteur ; avertissement destructif)
│   └── BadgeSidebar.vue         # badges obtenus (tooltips nom + date)
├── gym/
│   ├── GymCard.vue              # arène courante : champion, types recommandés, tentative hebdo
│   ├── WinEstimate.vue          # % global coloré + matchups repliés (réutilisé ligue/tournoi)
│   ├── TrainingPanel.vue        # entraînement quotidien + jauge bonus +2 %
│   └── GymHistory.vue           # historique des tentatives
├── league/
│   ├── LeagueChallenge.vue      # statut, estimation, enchaînement des 4 replays
│   └── LeagueRewardChoice.vue   # 500 coins sûr vs capture légendaire risquée
├── tournament/
│   ├── TournamentBanner.vue     # bannière flottante invitation/félicitations (dismiss persisté)
│   ├── RegistrationCard.vue     # fenêtre lundi→mardi 12:00, 20 coins, cagnotte
│   ├── MyAnalysis.vue           # préparation : forces/faiblesses, matchups (barres)
│   ├── TournamentBracket.vue    # bracket + byes + match 3e place [Lazy]
│   ├── MyJourney.vue            # anti-spoiler « révéler ce combat » (à préserver)
│   └── TournamentResults.vue    # podium, gains, historique
├── social/
│   ├── ChatPanel.vue            # page chat (historique 200, modération admin)
│   ├── ChatWidget.vue           # widget flottant (masqué sur /chat et déconnecté)
│   ├── LeaderboardTable.vue     # top 10 + « votre position » + couronnes/médailles
│   ├── ShinyFeed.vue            # derniers shiny/légendaires (marqueur doublon 😅)
│   ├── trade/TradeFlow.vue      # assistant 3 étapes (demande → contre-offre → confirmation)
│   ├── trade/TradeList.vue      # à traiter / en attente / historique
│   ├── trade/PlayerGrid.vue     # joueurs, cooldowns par partenaire
│   ├── SuggestionBoard.vue      # kanban votable [Lazy]
│   └── NotificationCenter.vue   # dropdown navbar, badge non-lus, « tout lu »
├── inventory/
│   ├── InventoryModal.vue       # objets, activation charme/tickets
│   └── CharmeStatus.vue         # tirages boostés restants (visible sur /play)
└── spin/
    └── SpinFrame.vue            # iframe /spin/?iframe=true + écoute postMessage spin:close (D7)
```

Règles : composants de domaine **sans fetch direct** (ils lisent stores et
appellent leurs actions) ; seuls les pages et stores parlent aux repositories.
Nuxt UI v4 fournit modales/toasts/dropdowns accessibles (focus trap, Escape,
`role="dialog"` via Reka UI) — résout M5 (modales) et m1 (3 systèmes d'overlay
→ un seul).

---

## 4. Composables (interfaces TS clés)

### `useApi` — accès à l'instance `$fetch` typée

```ts
// app/composables/useApi.ts
export function useApi(): typeof $fetch {  // instance créée par le plugin (§6)
  return useNuxtApp().$api
}
```

### `useCoins` — présentation du solde (la vérité reste dans le store)

```ts
export function useCoins() {
  const wallet = useWalletStore()
  return {
    coins: computed(() => wallet.balance),          // number | null (null = pas encore synchronisé)
    formatted: computed(() => wallet.balance === null ? '—' : fmt(wallet.balance)),
    animatedCoins: useTransition(...),              // compteur animé (VueUse) pour la navbar
    canAfford: (cost: number) => wallet.balance !== null && wallet.balance >= cost
  }
}
```

### `useCountdown` — resets quotidiens/hebdo **Europe/Paris**, DST-safe

Piège : les resets sont des heures **civiles** parisiennes (lundi 00:00, jeudi
12:00, minuit). Interdiction de faire `now + 7j` en UTC (faux d'une heure aux
changements d'heure — dernier dimanche de mars/octobre). Implémentation dans
`utils/paris-time.ts` : recomposer l'instant UTC du prochain « jour J à HH:MM »
via `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' }).formatToParts()`
(recherche de l'offset réel à la date cible, pas d'offset codé en dur).

```ts
export type ResetSpec =
  | { kind: 'daily' }                                            // minuit Europe/Paris (bonus, entraînement, jackpot)
  | { kind: 'weekly', weekday: 1|2|3|4|5|6|7, hour: number, minute?: number }
    // lundi 00:00 (arènes, trades) ; jeudi 12:00 (tournoi, reset ligue) ; mardi 12:00 (fin inscriptions)
  | { kind: 'at', date: MaybeRefOrGetter<string | Date | null> } // échéance serveur (cooldown_until…)

export function useCountdown(spec: ResetSpec, opts?: { onExpire?: () => void }) {
  return {
    target: ComputedRef<Date | null>,
    remainingMs: ComputedRef<number>,
    parts: ComputedRef<{ d: number, h: number, m: number, s: number }>,
    label: ComputedRef<string>,        // « dans 2 j 3 h » / « 03:12:45 »
    expired: ComputedRef<boolean>      // onExpire déclenche l'invalidation du store concerné
  }
}
```

Un seul `setInterval` global partagé (module scope, 1 s, en pause si onglet
caché via `useDocumentVisibility`) — pas un timer par chip.

### `useSound` — port du moteur Web Audio chiptune (zéro asset)

```ts
export function useSound() {
  // Singleton AudioContext, créé lazy au 1er geste utilisateur (autoplay policy),
  // volume/mute branchés sur le store preferences via un GainNode maître.
  return {
    resume(): void,                                   // à appeler sur le 1er clic
    tick(velocity?: number): void,                    // tick roulette (pitch selon vitesse)
    fanfare(tier: 'commun'|'rare'|'epique'|'legendaire'|'shiny'): void,
    heartbeat: { start(bpm?: number): void, stop(): void },  // duels (jauge proche du seuil)
    reelSpin(): { stop(): void },                     // rouleaux du slot
    reelStop(): void,                                 // claquement d'arrêt
    coin(): void, ko(): void
  }
}
```

Portage : reprendre les synthèses square-wave existantes telles quelles
(force n°7 de l'audit). Nouveau : contrôle volume/mute (m10) et coupure si
`prefers-reduced-motion`+préférence son off.

### `useCelebration` — hiérarchie de célébration (M1)

```ts
export type CelebrationTier = 'common'|'rare'|'epic'|'legendary'|'shiny'|'shiny-legendary'
export function useCelebration() {
  return {
    tierFor(card: DomainCard, ctx: { isNew: boolean }): CelebrationTier,
    celebrate(opts: {
      tier: CelebrationTier, card: DomainCard, isNew: boolean
    }): Promise<void>   // orchestre : fanfare (useSound) + overlay plein écran (légendaire/shiny)
  }                     // + verbalisation « NOUVELLE CARTE ! » vs « doublon (+1) »
}
```

Respecte `prefers-reduced-motion` (version statique) — M5.

### `useRouletteEngine` — LE moteur de bande (port de l'algorithme existant)

Paramètres observés à préserver : bande de 20, gagnante à l'index 16, durée
4 000 ms, easing `cubic-bezier(0.15, 0.85, 0.35, 1)` (porté en fonction JS dans
`utils/easing.ts`), **jitter ±40 px** sur l'offset final (l'arrêt ne tombe jamais
pile au centre), ticks émis **carte par carte en suivant la courbe** (le tick part
du changement d'index sous l'aiguille, pas d'un timer), cartes Pokéball
décoratives ~1 % dans la bande, purge du DOM après révélation.

```ts
export interface StripCard { key: string, card: DomainCard | null, decoy: boolean } // null = dos/pokéball

export interface RouletteEngineOptions {
  stripSize?: number                       // 20
  winnerIndex?: number                     // 16
  durationMs?: number                      // 4000
  easing?: (t: number) => number           // défaut : bezier(0.15, 0.85, 0.35, 1)
  jitterPx?: number                        // 40 (tirage uniforme dans ±jitterPx)
  decoyRate?: number                       // 0.01 — Pokéball décoratives
  cardWidth: MaybeRefOrGetter<number>      // mesurée par RouletteViewport (responsive)
  reducedMotion?: MaybeRefOrGetter<boolean> // durée ~300 ms + pas de jitter si actif
}

export interface RouletteEngine {
  state: Readonly<Ref<'idle'|'spinning'|'settling'|'revealed'>>
  offsetPx: Readonly<Ref<number>>          // à binder : transform: translate3d(-offset, 0, 0)
  strip: Readonly<Ref<StripCard[]>>
  currentIndex: Readonly<Ref<number>>      // carte sous l'aiguille (dérivé de offsetPx)

  buildStrip(winner: DomainCard, pool: DomainCard[]): void
    // pool = /roll/preview-batch (cartes plausibles, poids réels) ; winner placé à winnerIndex
  spin(): Promise<void>                    // rAF : offset(t) = target × easing(t/duration) ; résout à l'arrêt
  onTick(cb: (index: number, velocity01: number) => void): () => void  // branche useSound.tick
  cancel(): void                           // navigation/démontage : stoppe le rAF proprement
  purge(): void                            // vide la bande après révélation (libère 20 nœuds/DOM par roulette)
}

export function useRouletteEngine(opts: RouletteEngineOptions): RouletteEngine
```

- **Séquence d'un tirage** (préservée) : `POST /roll` **et** `GET /roll/preview-batch`
  en parallèle → `buildStrip(result.card, preview.cards)` → préchargement des 20
  sprites (`new Image()`) → `spin()` → révélation selon `preferences.revealMode`
  (flip +100 ms pour la gagnante en mode masqué) → `useCelebration`.
- **Multi-roll ×5 (m12)** : 5 instances d'engine mais **une seule boucle rAF
  partagée** (scheduler module-scope) ; démarrage en cascade 550 ms ; les
  événements `card_choice` sont mis en file et résolus séquentiellement à la fin
  (comportement existant). `purge()` après chaque révélation limite le DOM vivant.
- Testable sans DOM : l'engine ne touche jamais le DOM, il produit des nombres.

### `useChatSocket` — port du singleton WS (reconnexion + resync à préserver)

Vit **dans le store `chat`** (un seul socket pour la page ET le widget, comme
l'actuel `chatConnection.js`). Protocole conservé :

```ts
export interface ChatSocketApi {
  status: Readonly<Ref<'idle'|'connecting'|'authenticating'|'open'|'reconnecting'|'expired'|'banned'>>
  connect(): void                    // wss://<origin>/api/ws/chat ; 1er message {type:'auth', token}
  disconnect(): void
  send(text: string): void           // {"text": …} ≤ 300 caractères (validation avant envoi)
}
// Règles portées à l'identique :
// - attendre {type:'authenticated'} avant de considérer la connexion ouverte ;
// - reconnexion auto après 3 s, SAUF codes définitifs 4001 (expired → auth.handleSessionExpired)
//   et 4003 (banned → état affiché, pas de retry) ;
// - après CHAQUE reconnexion : GET /chat/history puis merge par id (dédup, rejeu des manqués) ;
// - {type:'purge', user_id} → retirer tous les messages de cet utilisateur du state.
```

### `usePolling` — polling léger piloté par la visibilité

```ts
export function usePolling(fn: () => Promise<unknown>, opts: {
  intervalMs: number, immediate?: boolean,
  onlyWhenVisible?: boolean,        // défaut true (useDocumentVisibility)
  refreshOnFocus?: boolean          // défaut true (revalide au retour d'onglet)
}): { start(): void, stop(): void, active: Ref<boolean> }
```

---

## 5. Stores Pinia spécialisés

Pas de store global. Persistance ciblée via VueUse `useLocalStorage` **dans le
state** (contrôle fin des clés, réutilisation des clés `gacha_*` existantes) —
pas de plugin de persistance globale. Convention TTL : chaque store « cache »
garde `fetchedAt` et expose `ensureFresh(ttlMs)` (fetch dédupliqué si périmé).

| Store | State (essentiel) | Getters clés | Actions clés | Persistance | TTL / invalidation | Dépend de |
|---|---|---|---|---|---|---|
| `auth` | `token` (LS `gacha_token`), `user`, `rewardClaimed`, `pendingChoice`, `meLoaded` | `isAuthenticated`, `userId` (JWT décodé), `isAdmin` | `login`, `register`, `logout`, **`fetchMeOnce()`**, `handleSessionExpired()`, `setAvatar` | token seul (clé existante) | `fetchMeOnce` : 1×/session app (effet de bord bonus !) ; re-arme au reset quotidien | — (alimente `wallet`) |
| `wallet` | `coins: number\|null`, `lastSync {source, at}`, `pendingDebits[]` | `balance`, `canAfford(n)` | **`reconcile(coins, source)`** (toute réponse portant un solde absolu), `debitOptimistic(n, ref)`, `confirm/rollback(ref)` | non | écrasé par chaque `reconcile` (serveur > optimiste) | `auth` (init via user.coins) |
| `collection` | `cards: OwnedCard[]` (catalogue annoté), `fetchedAt` | `owned`, `standard/shiny` (normalisés), `counts`, `mergeables (q≥10 + évolution)`, `byBiome/byType` | `ensureFresh`, `sell` (→ `wallet.reconcile(newCoins)`, cas charme → `inventory`), `merge`, `invalidate` | non | TTL 5 min + invalidation sur : roll `isNew`, merge, sell, team.roll, trade complété | `wallet`, `inventory` |
| `inventory` | `items[]`, `activeBiomeTicket`, `activeTypeTicket`, `charmeRolls` | `charmes`, `biomeTickets`, `typeTickets`, `hasActiveTicket` | `ensureFresh`, `activateCharme`, `activate/deactivateTicket` | non | TTL 5 min + invalidation : spin slot, événement spécial, vente shiny, roll (ticket consommé) | — |
| `team` | `members: TeamMember[]` | `isFull`, `isEmpty`, `positions` | `ensureFresh`, `roll` (→ invalide `collection`), `swap`, `remove` (10 🪙 → wallet), `clear` | non | invalidation par mutation uniquement | `collection`, `wallet` |
| `gym` | `gyms[]`, `badges[]`, `detail{}` par id, `history`, `training {bonus, canFightToday}` | `currentGym` (1ʳᵉ non battue), `badgeCount`, `canAttemptThisWeek`, `isChampion (8/8)` | `ensureFresh`, `loadDetail`, `battle`, `train` (→ `wallet.reconcile(coins)`) | non | TTL 5 min ; invalidation post battle/training ; reset lundi 00:00 via `quotas` | `wallet`, `team` |
| `league` | `status`, `estimate`, `lastRun` | `eligible`, `alreadyAttempted`, `navbarVisible` (8 badges) | `ensureFresh`, `challenge`, `claimCoins` (→ wallet), `attemptLegendary` (→ collection si gagné) | non | **TTL 5 min** (navbar) ; invalidation post challenge/reward ; reset jeudi 12:00 | `gym` (badges), `wallet`, `collection` |
| `tournament` | `current`, `myAnalysis`, `list`, `byId{}` | `isRegistered`, `phase` (inscription/préparation/verrouillé/terminé), `unseenResult` (badge navbar) | `ensureFresh`, `register` (20 🪙 → wallet + invalidate), `loadAnalysis`, `markResultSeen` | `seenTournamentIds` (LS) | **TTL 60 s** + `refreshOnFocus` ; poll 30 s uniquement jeudi 11:55–12:30 | `auth` (userId pour « mes matchs »), `wallet` |
| `slotMachine` | `status {canSpin, lastSpin}`, `recentWins`, `myHistory` | `canSpinToday` | `ensureFresh`, `spin(lines)` (→ `wallet.reconcile(newCoins)`, gains → `inventory`/`collection`) | non | invalidation post spin ; reset minuit via `quotas` | `wallet`, `inventory`, `collection` |
| `trades` | `trades[]`, `players[]`, `eligibility` | **`actionsRequired`** (badge navbar : pending_target/pending_initiator me concernant), `eligible`, `partnersOnCooldown` | `ensureFresh`, `create`, `respond`, `confirm`, `cancel` (chaque mutation → invalidate immédiat) | non | **TTL 60 s** + `refreshOnFocus` ; polling 60 s si page /trades visible | `auth` (userId), `collection` |
| `chat` | `messages[]` (≤200 + live), `wsStatus`, `isAdmin`, `lastReadId` (LS) | `unreadCount` (badge widget), `bannedState` | `connect`, `disconnect`, `send`, `resync` (post-reconnexion, dédup id), `applyPurge(userId)`, `markRead` | `lastReadId` | historique refetch à chaque (re)connexion ; jamais de TTL (temps réel) | `auth` (token, 4001 → session expirée) |
| `notifications` | `items[]`, `unreadCount` | `hasUnread` | `ensureFresh`, `markAllRead` (à l'ouverture du dropdown) | non | **TTL 60 s** + `refreshOnFocus` + polling 60 s (onglet visible) | — |
| `quotas` | *(aucun fetch propre — agrégateur)* | `dailyBonus` (auth.rewardClaimed), `training`, `jackpot`, `gymWeekly`, `leagueWeekly`, `tradeWeekly`, `tournamentWindow` — chacun `{ available, nextResetAt, label }` | `onResetExpired(quota)` → invalide le store source (auth/gym/slot/league/trades/tournament) | non | recalcul continu via `useCountdown` (daily minuit, lundi 00:00, jeudi 12:00, mardi 12:00 Europe/Paris) | tous les stores de jeu (lecture seule) |
| `preferences` | `revealMode` (LS `gacha_reveal_mode`), `selectedBiome` (LS `gacha_selected_biome`), `replaySpeed` (1\|2\|4), `volume`, `muted`, `reducedMotion` (auto + override), `introSeen{}`, `dismissedBanners{}` | `effectiveReducedMotion` | setters simples | **tout** (localStorage, clés existantes réutilisées → migration douce) | — | — |

### Détails d'implémentation critiques

**`wallet` (résout M7)** — une seule règle : *le serveur a toujours raison*.

```ts
// Toute réponse API contenant un solde ABSOLU appelle reconcile :
// auth/me (user.coins), training/status, slot-machine/status, POST sell (newCoins),
// POST spin (newCoins), training/battle (coins_gained → refetch status)…
reconcile(coins: number, source: string) {
  this.pendingDebits = []          // les débits optimistes en vol sont écrasés
  this.coins = coins
  this.lastSync = { source, at: Date.now() }
}
// Débit optimiste (roll 10🪙, retrait équipe 10🪙, inscription 20🪙…) :
// affiché immédiatement, confirmé par la réponse (rollCost) ou rollback sur erreur.
```

**`auth.fetchMeOnce()` (effet de bord `/auth/me`)** — promesse mémoïsée :

```ts
let mePromise: Promise<void> | null = null   // module scope, hors state réactif
fetchMeOnce() {
  if (!mePromise) mePromise = this._fetchMe()   // UN seul GET /auth/me par session app
  return mePromise
}
// _fetchMe : user → state + wallet.reconcile(user.coins, 'auth/me') ;
// rewardClaimed === false → toast « Bonus quotidien +100 🪙 (+10/badge) » ;
// pendingChoice → ouvrir CardChoiceModal au montage de /play.
// Le quota `dailyBonus` (store quotas) ré-arme mePromise au passage de minuit Paris.
```

Appelé par un plugin d'app (après restauration du token), **jamais** par le
middleware ni par les pages.

**Données navbar (résout C4)** — `AppNavbar` lit `tournament`, `league`,
`trades`, `notifications` ; chaque store fait `ensureFresh(TTL)` monté **une
fois** au layout, puis TTL + `refreshOnFocus`. Une navigation interne ne
déclenche **zéro** requête (vs 4×/navigation, 64 appels à `tournament/current`
observés).

---

## 6. Couche API : `$fetch` typé, 401 central, repositories normalisants

### Plugin `$api`

```ts
// app/plugins/api.ts
export default defineNuxtPlugin((nuxtApp) => {
  const api = $fetch.create({
    baseURL: '/api',
    timeout: 15_000,
    retry: 1,                                    // ofetch ne retente JAMAIS POST/PUT/PATCH/DELETE
    retryStatusCodes: [408, 425, 429, 502, 503, 504],  // idempotent only, pas de retry sur 500 métier
    retryDelay: 400,
    onRequest({ options }) {
      const token = useAuthStore().token
      if (token) options.headers.set('Authorization', `Bearer ${token}`)
    },
    onResponseError({ response }) {
      if (response?.status === 401) useAuthStore().handleSessionExpired()
    }
  })
  return { provide: { api } }
})
```

**401 centralisé (résout C3)** — `handleSessionExpired()` : idempotent
(1 seul déclenchement même si 4 requêtes échouent en rafale) → purge token +
stores, `toast.add({ title: 'Session expirée', description: 'Reconnectez-vous.',
color: 'warning' })`, `navigateTo('/login?next=' + route.fullPath)`. Le WS chat
fermé en 4001 emprunte le même chemin.

**Erreurs humanisées** (`utils/errors.ts`) :

```ts
export function humanizeError(err: unknown): string {
  if (err instanceof FetchError) {
    if (!err.response) return 'Connexion impossible. Vérifiez votre réseau puis réessayez.'
    const apiMsg = (err.data as ApiError | undefined)?.error
    if (apiMsg) return apiMsg                      // messages FR du backend, conçus pour l'UI
    if (err.response.status >= 500) return 'Le serveur a un souci. Réessayez dans un instant.'
  }
  return 'Une erreur inattendue est survenue.'     // plus jamais de « TypeError: Failed to fetch »
}
```

**Annulation** : les fetchs de page passent un `AbortSignal` lié au cycle de vie
(`onScopeDispose`) ; les mutations n'en reçoivent jamais (pas d'annulation d'un
roll parti). **Dédup des GET simultanés** (`utils/dedupe.ts`) : map module-scope
`clé → promesse en vol` utilisée par les `ensureFresh` des stores (deux
composants qui montent en même temps ⇒ 1 requête).

### Repositories — normalisation des réponses non uniformes

Constat (api-inventory §Limitations 5) : `/gym`, `/team`, `/trades` renvoient un
**tableau nu**, d'autres une **enveloppe** (`{cards}`, `{tournament}`) ; la
rareté d'un shiny vaut `'Alt'` dans `/collection` mais `is_alt + rareté réelle`
ailleurs. La couche repositories est **le seul endroit** qui connaît ces formes.

```ts
// app/types/api.ts    — types « wire » repris tels quels d'api-inventory.md
//                       (User, Card, OwnedCard, RollResult, BattleRound, Tournament, Trade…)
// app/types/domain.ts — types normalisés consommés par stores/composants :
export interface DomainCard {
  id: UUID; num: number; name: string; imageUrl: string
  rarity: Exclude<Rarity, 'Alt'>      // TOUJOURS la rareté réelle
  isShiny: boolean                    // 'Alt' / is_alt / suffixe ☆ réconciliés ici
  level: 1|2|3; biome: Biome; type: PokeType
  parentCardId: UUID; standardId: UUID | null
}
export interface DomainOwnedCard extends DomainCard { quantity: number; owned: boolean; obtainedAt: string | null }

// app/repositories/team.ts — tableau nu absorbé ici, une fois
export const teamRepo = {
  list: (api = useApi()) => api<TeamMember[]>('/team'),
  roll: () => useApi()<TeamMember>('/team/roll', { method: 'POST' }),
  swap: (idA: UUID, idB: UUID) => useApi()('/team/swap', { method: 'POST', body: { idA, idB } })
}

// app/repositories/collection.ts — enveloppe + normalisation 'Alt'
export const collectionRepo = {
  async all(): Promise<DomainOwnedCard[]> {
    const { cards } = await useApi()<{ cards: OwnedCard[] }>('/collection/all')
    return cards.map(normalizeOwnedCard)   // rarity 'Alt' → isShiny=true + rareté de la version standard
  },
  sell: (cardId: UUID) => useApi()<SellResult>('/collection/sell', { method: 'POST', body: { cardId } })
}
```

Un repository par domaine : `auth`, `roll`, `collection`, `team`, `gym`,
`training`, `league`, `tournament`, `slot`, `inventory`, `trades`, `chat`,
`social` (leaderboard/suggestions/notifications), `stats`. Les stores ne font
**jamais** de `$fetch` direct ; les composants ne touchent **jamais** un
repository. Si le backend uniformise un jour ses enveloppes, seuls les
repositories changent.

---

## 7. Temps réel & quasi-temps réel

- **Chat (WS)** : singleton porté dans le store `chat` (§4 `useChatSocket`).
  Connecté au montage du layout `default` (authentifié), partagé page + widget.
  Comportements préservés à l'identique : auth 1er message, reconnexion 3 s,
  4001/4003 définitifs, **resync historique + dédup par id après reconnexion**,
  purge par `user_id`, limite 300 caractères.
- **Trades / tournoi / notifications** : pas de WS côté API → **polling léger
  conditionnel** via `usePolling` : 60 s onglet visible + revalidation au
  `focus`/`visibilitychange` ; fenêtre chaude du tournoi (jeudi 11:55–12:30
  Europe/Paris, détectée par `quotas`) : 30 s sur la page tournoi. Coût réseau
  très inférieur à l'existant (4 req/navigation) tout en étant plus « frais ».
- Un WS/SSE générique (trades, notifs) est un souhait **backend** (hors périmètre,
  cf. api-inventory « Confirmé backend requis ») ; l'archi l'anticipe : les
  stores exposent déjà `applyExternalUpdate()`, le transport est interchangeable.

---

## 8. Iframe Spin

Page `spin.vue` = hôte minimal : carte d'état hebdo (`GET /spin/status`) +
`SpinFrame.vue` qui monte `<iframe src="/spin/?iframe=true">` en overlay plein
écran et écoute `message` (`spin:close`) avec **vérification `event.origin ===
location.origin`**. Le jeu interne n'est pas refondu (décision D7). Au
`spin:close` : refresh `spin/status` + `wallet` (les 250 🪙 arrivent par là) +
`collection` si transfert légendaire.

---

## 9. Performance

| Levier | Décision |
|---|---|
| **Collection 300+ cartes (m11)** | `CollectionGrid` virtualisée par **rangées** avec `@tanstack/vue-virtual` (headless, ~2 Ko gz) : hauteur de carte fixe ⇒ `rowVirtualizer` trivial, `overscan: 3`. DOM vivant ≤ ~60 cartes quel que soit le filtre. Filtres = `computed` sur le store (zéro re-fetch, zéro reconstruction innerHTML). |
| **Zones lourdes** | `Lazy*` (chunks à l'usage) : BattleReplay, LegendaryCapture, SlotMachine, TournamentBracket, SuggestionBoard, panneaux Stats. La route `/play` reste le chunk le plus léger possible. |
| **Multi-roll (m12)** | 1 boucle rAF partagée pour 5 bandes ; `purge()` après chaque révélation ; images des bandes préchargées pendant `preview-batch` ; option mobile : rendu compact (1 roulette + file de résultats) permis par le découplage engine/vue. |
| **Images** | Sprites `.webp` servis par l'API **same-origin** (`/images/...`) → **pas de proxy, pas de `@nuxt/image`** (déjà optimisées, petites). Règles : `width`/`height` fixes partout (anti-CLS, M3), `loading="lazy"` + `decoding="async"` hors viewport, préchargement ciblé des 20 sprites d'une bande avant `spin()`. Recommandation infra (hors front) : `Cache-Control: public, max-age=31536000, immutable` sur `/images/`. |
| **Skeletons (M3)** | `SkeletonGrid`/`SkeletonCard` aux dimensions finales sur chaque page ; `spaLoadingTemplate` skeleton au boot. |
| **Budget JS initial (chiffré)** | Premier écran jouable (`/login` → `/play`) : **entry commun ≤ 110 Ko gz** (Vue+Nuxt runtime ~45 + Nuxt UI utilisés ~35 + Pinia/VueUse ~8 + shell app ~20), **chunk `/play` ≤ 45 Ko gz** (moteur roulette + sons + stores du jeu), **CSS ≤ 30 Ko gz**, **total JS premier écran ≤ 180 Ko gz**. Chaque chunk lazy ≤ 40 Ko gz. Contrôle : `nuxi analyze` + assertion de taille en CI (échec du build si dépassement de 10 %). |

---

## 10. Gestion des erreurs

- **`app/error.vue`** : page d'erreur globale (erreur fatale/chunk manquant) —
  ton du jeu (« Le Ronflex a écrasé la page »), bouton `clearError({ redirect: '/play' })`,
  bouton recharger (cas de déploiement : chunk hashé disparu → reload).
- **`SectionBoundary.vue`** (wrapper de `<NuxtErrorBoundary>`) : chaque page est
  composée de sections indépendantes (ex. `gyms` : arène courante / entraînement /
  historique). Une section en échec rend `ErrorState` (message humanisé +
  « Réessayer » qui relance l'action du store) **sans casser le reste de la page**
  — fin des pages entières bloquées sur « erreur ».
- **Retry par zone** : lecture → bouton réessayer (+ retry auto unique sur
  reprise réseau via `useOnline` de VueUse) ; mutation → jamais de retry auto
  (rolls, ventes, combats : non idempotents), message + bouton explicite.
- **401** : un seul chemin (§6), y compris depuis le WS (code 4001).
- **404** : `[...slug].vue` avec navbar (l'utilisateur reste « connecté » — m2).

---

## 11. Stratégie de tests

### Répartition

| Niveau | Outils | Quoi (exemples concrets) |
|---|---|---|
| **Unit (rapide, massif)** | Vitest + happy-dom | `utils/paris-time` + `useCountdown` : **cas DST** (29/03/2026 et 25/10/2026 : « prochain lundi 00:00 Paris » exact), prochain jeudi 12:00 ; `wallet.reconcile` (optimiste écrasé, rollback, sources concurrentes) ; `useRouletteEngine` (offset final centre l'index 16 ± jitter ≤ 40 px, ticks strictement croissants, purge vide la bande, reduced-motion) ; repositories (tableau nu vs enveloppe, `'Alt'` → `isShiny` + rareté réelle) ; `humanizeError` ; getters `quotas` ; file d'événements `card_choice` du multi-roll. |
| **Composants** | Vitest + @vue/test-utils (+ mountSuspended de @nuxt/test-utils si besoin d'auto-imports) | `CollectionGrid` : ≤ 60 cartes dans le DOM pour 302 items ; `ConfirmDialog`/`MergeDialog` : la mutation n'est appelée qu'après confirmation ; `RollResult` par palier de célébration ; `CountdownChip` rendu. |
| **E2E (parcours)** | Playwright, **API mockée par fixtures** | Voir ci-dessous. |
| **E2E live (smoke, optionnel)** | Playwright tag `@live` contre staging | Lecture seule + compte de test (`+audit`) : login, `/play` s'affiche, collection se charge. **Jamais** d'action à quota/destructive (cf. décision D3 de l'audit). |

### Mocks E2E à partir de `artifacts/network/`

Les journaux d'audit (`api-log.json` : 166 entrées `{method, url, status,
requestBody, responseBody}` ; `api-log-onboarding.json` ; `websocket-log.json`)
sont des **réponses réelles de production** — matière première idéale.

1. **Générateur de fixtures** `web/tests/e2e/fixtures/build-fixtures.mjs` :
   lit les logs, groupe par `method + chemin normalisé` (UUID → `:id`), écrit un
   JSON par endpoint (dernière réponse 200 observée + variantes utiles :
   `auth_me.claimed.json` / `auth_me.unclaimed.json`, compte end-game vs
   onboarding depuis les deux logs). Fixtures **committées** (stables), script
   relançable si l'audit est refait.
2. **Harnais** `mockApi(page, overrides?)` : `page.route('**/api/**')` sert la
   fixture correspondante ; `overrides` permet de forcer un scénario (401, 500,
   `canSpin: false`, `RollResult` shiny…). Les mutations mockées mettent à jour
   un mini-état en mémoire (solde décrémenté, carte ajoutée) pour les parcours.
3. **WS chat** : `page.routeWebSocket('**/api/ws/chat', …)` rejoue
   `websocket-log.json` (auth → authenticated → messages) ; test dédié
   reconnexion : fermeture serveur simulée → vérifier re-fetch historique + dédup ;
   fermeture 4001 → redirection login.

### Specs E2E prioritaires

```text
tests/e2e/specs/
├── auth.spec.ts            # login, register, 401 → toast + redirect + next=, logout
├── roll.spec.ts            # roll simple, modes de révélation, événement spécial, multi-roll (file card_choice)
├── wallet.spec.ts          # solde identique navbar/play/collection après vente + spin (M7)
├── navbar-cache.spec.ts    # compteur de routes : 5 navigations ⇒ 0 appel tournament/current supplémentaire (C4)
├── collection.spec.ts      # virtualisation (DOM ≤ N), filtres, vente confirmée, fusion confirmée (C5)
├── trades.spec.ts          # flux 3 étapes complet côté initiateur et côté cible (fixtures des 2 rôles)
├── chat.spec.ts            # envoi, purge, reconnexion + resync (routeWebSocket)
├── quotas.spec.ts          # horloge mockée (Date fake) : compte à rebours, bascule à minuit Paris
└── errors.spec.ts          # offline → message humain (C3), section en erreur → retry sans casser la page
```

CI (le workflow `web/.github/workflows/ci.yml` existe) : lint + typecheck
(`vue-tsc`) + unit + E2E mockés sur chaque PR ; `@live` en job manuel/nightly.

---

## Recommandations

## [P0] SPA `ssr: false` + session localStorage partagée avec l'ancien front
**Problème** : le choix de rendu conditionne tout ; un SSR par défaut rendrait des pages vides (token en localStorage, invisible du serveur), compliquerait l'hébergement et risquerait de déclencher `/auth/me` côté serveur.
**Preuve** : api-inventory (« Auth : token `localStorage.gacha_token` », « GET /auth/me déclenche le bonus quotidien ») ; application-map (SPA statique actuelle, API same-origin `/api`).
**Impact** : déploiement identique à l'existant (statique), coexistence des deux fronts avec **session partagée** (même clé, même origine), zéro flash d'hydratation, aucun serveur Node à opérer.
**Recommandation** : `ssr: false` global + `nuxt generate` ; conserver la clé `gacha_token` (et `gacha_reveal_mode`, `gacha_selected_biome`) ; servir le nouveau front sur la même origine (`/beta/` puis bascule) ; `spaLoadingTemplate` skeleton ; retirer `routeRules['/'].prerender` du scaffold.
**Complexité** : S.
**Dépendances** : nginx (chemin `/beta/`) ; aucune côté API.
**Critères d'acceptation** : build sans serveur Node ; login sur l'ancien front ⇒ nouveau front connecté (et inversement) ; Lighthouse : aucun flash « déconnecté ».

## [P0] Couche API unique : `$fetch` typé, 401 centralisé, erreurs humanisées (C3)
**Problème** : aujourd'hui `TypeError: Failed to fetch` est montré tel quel ; les 401 affichent « Token invalide ou expiré » sans issue, gestion inégale par page.
**Preuve** : frontend-issues C3 (`errors/roll-offline-error.png`, `errors/invalid-token-collection.png`) ; api-inventory (« 401 silencieux ou affiché brut selon les pages »).
**Impact** : plus aucune impasse utilisateur ; un seul endroit à maintenir pour auth/timeout/retry ; messages FR cohérents (le backend en fournit déjà de bons via `{error}`).
**Recommandation** : plugin `$api` (`$fetch.create` : baseURL `/api`, Bearer auto, timeout 15 s, retry 1 GET-only sur 408/425/429/502/503/504) ; `onResponseError` 401 → `auth.handleSessionExpired()` idempotent (purge + toast unique + `navigateTo('/login?next=…')`) ; `humanizeError` obligatoire dans tous les `ErrorState`/toasts ; dédup des GET simultanés.
**Complexité** : S.
**Dépendances** : store `auth` ; Nuxt UI `useToast` (UApp déjà en place).
**Critères d'acceptation** : E2E `errors.spec.ts` (offline → message humain + bouton réessayer) et `auth.spec.ts` (fixture 401 sur n'importe quelle page → 1 seul toast, redirection avec `next`, retour à la page après re-login) verts ; grep : aucun `$fetch(` hors plugin/repositories.

## [P0] Stores à TTL pour les données navbar — fin des 4 fetchs par navigation (C4)
**Problème** : la navbar actuelle relance `tournament/current` + `league/status` + `trades` + `notifications` à chaque changement de route (64 appels à `tournament/current` observés sur une session).
**Preuve** : frontend-issues C4 ; api-inventory (« Toute navigation → 4 requêtes », limitation 9).
**Impact** : ~‑95 % de requêtes navbar, navigation instantanée, charge serveur réduite, données plus fraîches qu'avant au retour d'onglet (refreshOnFocus).
**Recommandation** : stores `tournament` (TTL 60 s), `league` (5 min), `trades` (60 s), `notifications` (60 s) avec `ensureFresh(ttl)` dédupliqué, montés une fois au layout ; revalidation sur `visibilitychange`/`focus` ; invalidation immédiate sur mutation (inscription, réponse à un trade, mark-read) ; polling 30 s limité à la fenêtre jeudi 11:55–12:30 sur la page tournoi.
**Complexité** : M.
**Dépendances** : couche API (P0 précédent) ; `usePolling` ; store `quotas` pour la fenêtre chaude.
**Critères d'acceptation** : E2E `navbar-cache.spec.ts` : 5 navigations en < 60 s ⇒ 0 requête navbar supplémentaire ; mutation trade ⇒ badge mis à jour sans reload ; retour d'onglet après TTL ⇒ 1 revalidation.

## [P0] Store `wallet` : solde unique réconcilié (M7)
**Problème** : le solde vit dans 4+ sources API et le front actuel le décrémente localement sans resynchronisation — affichages faux possibles après enchaînements (multi-roll + ticket, vente + spin).
**Preuve** : frontend-issues M7 (`home.js handleRollResult`) ; api-inventory limitation 7 (« pas d'endpoint de solde seul », sources multiples).
**Impact** : un seul chiffre vrai partout (navbar, roulette, boutiques), débits optimistes sûrs, base saine pour `canAfford` (désactivation des boutons trop chers).
**Recommandation** : store `wallet` seul propriétaire ; `reconcile(coins, source)` appelé par **toute** réponse portant un solde absolu (`auth/me`, `training/status`, `slot-machine/status`, `newCoins` de sell/spin) et prioritaire sur l'optimiste ; `debitOptimistic/confirm/rollback` pour roll (rollCost), retrait d'équipe (10), inscription tournoi (20) ; interdiction lint de lire `user.coins` ailleurs que dans `wallet`.
**Complexité** : S/M.
**Dépendances** : repositories (les réponses typées exposent les champs de solde).
**Critères d'acceptation** : unit `wallet.spec` (écrasement, rollback, ordres d'arrivée) ; E2E `wallet.spec.ts` : après vente + spin + roll, le solde navbar == solde renvoyé par la dernière fixture serveur.

## [P1] `/auth/me` appelé une seule fois par session applicative (effet de bord bonus)
**Problème** : `GET /auth/me` **crédite le bonus quotidien** (GET non idempotent). Un front Nuxt naïf l'appellerait au middleware ou à chaque page — appels multiples, toasts de bonus dupliqués, et comportement métier dépendant d'un détail technique.
**Preuve** : api-inventory (`GET /auth/me` : « déclenche le bonus quotidien », limitation 3 « à appeler UNE fois »).
**Impact** : bonus crédité et annoncé exactement une fois par jour ; `pendingChoice` (choix de carte en attente) systématiquement re-proposé.
**Recommandation** : `auth.fetchMeOnce()` avec promesse mémoïsée module-scope, appelée par un unique plugin d'app après restauration du token ; `rewardClaimed === false` ⇒ toast bonus (+100, +10/badge) ; `pendingChoice` ⇒ ouverture de `CardChoiceModal` ; le store `quotas` ré-arme la mémoïsation au passage de minuit Europe/Paris ; middleware = présence du token seulement.
**Complexité** : S.
**Dépendances** : stores `auth`, `quotas`, `wallet` (reconcile au passage).
**Critères d'acceptation** : compteur réseau en E2E : 1 seul `auth/me` sur un parcours de 10 navigations ; fixture `rewardClaimed:false` ⇒ toast unique ; fixture `pendingChoice` ⇒ modale rouverte sur `/play`.

## [P1] Repositories normalisants + types partagés + rendu texte (réponses non uniformes, M6)
**Problème** : réponses hétérogènes (tableau nu `/gym` `/team` `/trades` vs enveloppes `{cards}` `{tournament}` ; rareté `'Alt'` dans `/collection` vs `is_alt` ailleurs) ; et le front actuel interpole `username`/`card.name` en innerHTML sans échappement systématique (XSS latent).
**Preuve** : api-inventory limitation 5 ; frontend-issues M6 (`tournament.js renderParticipants`, `leaderboard.js buildRowHTML`).
**Impact** : stores/composants consomment des types `Domain*` stables (la dette d'API est confinée à une couche) ; XSS éliminé par construction (interpolation texte Vue) ; migration backend future (enveloppes uniformes) sans toucher l'UI.
**Recommandation** : `types/api.ts` (wire, repris d'api-inventory) + `types/domain.ts` (normalisé : `isShiny`, rareté réelle, camelCase) ; un repository par domaine, seul autorisé à appeler `$api` ; règle ESLint `vue/no-v-html` en erreur ; tests unitaires de normalisation (fixtures réelles).
**Complexité** : M.
**Dépendances** : couche API P0.
**Critères d'acceptation** : typecheck strict sans `any` sur la surface API ; unit repos verts (cas `'Alt'`, tableau nu) ; grep CI : 0 `v-html`, 0 `$fetch(`/`$api(` hors plugin+repositories ; un username `<img onerror>` en fixture s'affiche littéralement sur leaderboard/tournoi.

## [P1] Porter le moteur roulette en composable pur + multi-roll allégé (m12)
**Problème** : le cœur émotionnel du jeu (bande, jitter, ticks calés sur la courbe) doit survivre à la refonte à l'identique ; l'actuel monte 5×20 cartes et 5 animations DOM simultanées (risque mobile) et n'est pas testable.
**Preuve** : existing-features §1 (bande 20, index 16, 4 s, bézier 0.15/0.85/0.35/1, jitter ±40 px, ticks par carte, cascade 550 ms, file des `card_choice`) ; frontend-issues m12 ; force n°1 « théâtre de suspense » à préserver.
**Impact** : sensations identiques au pixel près, testées ; multi-roll fluide sur mobile bas de gamme ; `prefers-reduced-motion` géré (M5) sans dupliquer la logique.
**Recommandation** : `useRouletteEngine` (interface §4) : pur calcul (rAF → `offsetPx`), ticks dérivés du changement d'index (jamais d'un timer), `buildStrip` depuis `preview-batch`, jitter ±40 px, `purge()` post-révélation ; scheduler rAF unique partagé pour le ×5 ; préchargement des 20 sprites avant `spin()` ; `TeamRoulette` réutilise le même moteur.
**Complexité** : M/L (le calibrage sonore/visuel demande une comparaison côte à côte avec la prod).
**Dépendances** : `useSound`, `useCelebration`, `preferences.revealMode`, repo `roll`.
**Critères d'acceptation** : unit engine (arrêt centré sur l'index 16 ± 40 px, monotonie des ticks, purge) ; E2E `roll.spec.ts` (3 modes de révélation, événement spécial, file card_choice en ×5) ; test manuel A/B : ticks audibles synchrones avec le défilement ; 5 roulettes à 60 fps sur mobile milieu de gamme (profil Performance).

## [P1] Collection virtualisée + images disciplinées (m11, M3)
**Problème** : 300+ cartes rendues d'un bloc, re-render complet à chaque filtre/vente/fusion, pop-in d'images, layout shift massif au chargement.
**Preuve** : frontend-issues m11 et M3 (`loading/collection-loading-slow-network.png`) ; catalogue 151×2 cartes.
**Impact** : ouverture de la collection instantanée même sur mobile, mémoire DOM bornée, zéro CLS.
**Recommandation** : `@tanstack/vue-virtual` par rangées (hauteur de carte fixe, overscan 3) ; filtres en `computed` sur le store `collection` (aucun re-fetch) ; après vente/fusion : mise à jour locale du state + invalidation TTL, pas de reconstruction ; `width/height` fixes + `loading="lazy"` + `decoding="async"` sur `GameCard` ; skeletons aux dimensions finales ; demande infra (hors front) : cache immutable sur `/images/`.
**Complexité** : M.
**Dépendances** : store `collection`, `GameCard`.
**Critères d'acceptation** : test composant : ≤ 60 cartes dans le DOM pour 302 items ; changement de filtre < 16 ms de script (profil) ; CLS ≈ 0 sur `/collection` ; vente ⇒ 1 requête POST, 0 GET de re-fetch immédiat.

## [P2] Quotas & comptes à rebours centralisés Europe/Paris (m4)
**Problème** : « Revenez demain » sans heure ; chaque cooldown (jackpot, entraînement, arène, ligue, trades, fenêtre tournoi) est géré différemment ; les resets sont des heures civiles parisiennes, cassées par un calcul UTC naïf aux changements d'heure (DST).
**Preuve** : frontend-issues m4 ; existing-features (resets lundi 00:00, jeudi 12:00, quotidiens ; fenêtre d'inscription lundi→mardi 12:00).
**Impact** : chaque quota affiche « disponible dans HH:MM:SS » exact ; à l'expiration, le store source est invalidé automatiquement (le bouton se réactive sans reload) ; un seul code de fuseau à tester.
**Recommandation** : `utils/paris-time.ts` (prochain instant civil Paris via `Intl.formatToParts`, jamais d'offset codé en dur) + `useCountdown` (timer global partagé, pause onglet caché) + store `quotas` agrégateur (getters composés sur auth/gym/slot/league/trades/tournament, `onResetExpired` → invalidation ciblée) ; `CountdownChip` partout où l'actuel dit « revenez demain ».
**Complexité** : S/M.
**Dépendances** : stores de jeu existants ; aucune API nouvelle.
**Critères d'acceptation** : unit DST verts (29/03/2026, 25/10/2026, année bissextile) ; E2E `quotas.spec.ts` avec horloge mockée : le chip passe à « disponible » et le store se revalide au tick ; aucun texte « revenez demain » sans heure dans l'app.

## [P2] Pyramide de tests assise sur les fixtures réseau de l'audit
**Problème** : sans stratégie, les E2E finiraient contre l'API réelle — impossibles (quotas 1/jour ou 1/semaine, actions destructives interdites, aléatoire non forçable : événement 1 %, shiny 1/500) et flakys.
**Preuve** : decision-log D3 (interdits sur compte réel) ; existing-features « fonctionnalités impossibles à tester pendant l'audit » ; `artifacts/network/api-log.json` (166 échanges réels), `websocket-log.json`.
**Impact** : E2E déterministes couvrant même les chemins rares (shiny, événement spécial, 401, bracket complet) ; les vraies réponses de prod comme contrat ; smoke live minimal sans risque.
**Recommandation** : générateur `build-fixtures.mjs` (logs → 1 JSON/endpoint, UUID normalisés, variantes end-game/onboarding depuis les 2 logs) ; harnais `mockApi(page, overrides)` sur `page.route('**/api/**')` avec mini-état mutable ; `page.routeWebSocket` pour le chat (reconnexion/resync/purge) ; suite `@live` lecture seule sur staging (compte `+audit`) en nightly ; Vitest pour composables/stores/repos (cibles §11).
**Complexité** : M.
**Dépendances** : toutes les couches précédentes ; CI existante `web/.github/workflows/ci.yml`.
**Critères d'acceptation** : `pnpm test` (unit) < 30 s et `pnpm test:e2e` (mock) < 5 min, verts en CI sans réseau externe ; scénarios shiny/événement spécial/401 rejoués par overrides ; job `@live` sans aucune requête POST à quota.

---

## Annexe — ordre de construction suggéré

1. Socle : config Nuxt (§1), types + plugin `$api` + `humanizeError` + `auth`/`wallet` + middleware + layouts + `error.vue`.
2. Navbar & stores TTL (tournament/league/trades/notifications) + `quotas`/`useCountdown`.
3. `/play` : `useRouletteEngine` + `useSound` + `useCelebration` + inventaire/tickets.
4. Collection virtualisée, équipe, arènes (réutilise `GaugeArc`/`BattleReplay`).
5. Ligue, tournoi, slot, trades, chat (WS), social, spin (iframe), suggestions, stats.
6. En continu : fixtures + specs E2E de chaque zone au moment où elle se construit.
