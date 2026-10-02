# Front — Analyse DX / Clean Code, fichier par fichier

> Revue automatisée (12 analyseurs Vue/Nuxt en parallèle sur les 114 fichiers du front) sous l'angle **Developer Experience**, **Clean Code** et bonnes pratiques **Nuxt 4 / Vue 3**. Se concentre sur la structure, l'organisation, le typage, la séparation des préoccupations et la duplication — **pas** sur les bugs runtime.

## Synthèse

Le front est globalement sain sur le fond : une architecture en couches volontaire et bien commentée (repositories = seul contact API, normalize = anti-corruption wire→domaine, stores Pinia, composables, types séparés wire/domain), TS strict, tests présents. La dette est structurelle et très concentrée, pas conceptuelle. Trois symptômes dominent. (1) Des « God files » : api.ts (535 l.), domain.ts (456 l.), repositories/index.ts (297 l.) et normalize.ts (418 l.) agrègent TOUTES les features dans un seul module ; côté stores, spin.ts (854 l.) et chat.ts (174 l.) portent contenu+moteur+réseau ; côté UI, AdventureScene.vue (1133 l.), league.vue (776 l.), team.vue (657 l.), play.vue (713 l.), HoloCard.vue (433 l.) et BattleScene.vue (398 l.) mêlent template multi-états, logique métier, formatage et parfois accès données brut. (2) De la duplication systémique de patterns transverses non factorisés : pattern cache TTL (réécrit dans 6 stores), refreshBalance()/appel /auth/me brut (3 copies + pages), try/catch/toast d'action (des dizaines d'occurrences), orchestration de timers d'animation (3 composables réinventés), navigation déclarée 3 fois, moteur audio dupliqué (useSound vs useSpinAudio), helpers de présentation (probColor/typeColor/timeAgo/pluriel/pct) recopiés page par page avec des hex DIVERGENTS. (3) Des valeurs magiques et sources de vérité éclatées : couleur de marque #ee5a48/#e8402f et shiny #c9b3ff en dur dans 9-10 composants alors que des tokens existent, constantes métier (pity 1/500, seuil fusion 10, coûts) réécrites en clair à plusieurs endroits, clés localStorage aux préfixes incohérents, chemins de routes en dur. La contrainte clé : Nuxt auto-importe components/composables/stores/utils par nom de fichier, donc toute la refonte peut se faire par colocation + barrels + extraction sans casser un seul import, en incrémental et lint/typecheck/build verts.

## Problèmes DX majeurs

### 1. God files dans la couche data et types : chaque feature partage les mêmes 4 fichiers monolithiques

- **Impact :** Blast-radius maximal (toute évolution touche un fichier partagé = conflits de merge permanents), navigation pénible, un `import type` tire toute la surface produit.
- **Où :** app/types/api.ts (535 l.), app/types/domain.ts (456 l.), app/repositories/index.ts (297 l.), app/repositories/normalize.ts (418 l.)

### 2. God components / God store : pages et composants cumulent template multi-états, logique métier, formatage et accès données

- **Impact :** Illisibilité, logique métier non testable (enfouie dans getters/setTimeout), duplication de règles avec le back, CSS scoped de 150-350 lignes par fichier.
- **Où :** app/components/spin/AdventureScene.vue (1133 l.), app/stores/spin.ts (854 l.), app/pages/league.vue (776 l.), app/pages/play.vue (713 l.), app/pages/team.vue (657 l.), app/components/card/HoloCard.vue (433 l.), app/components/battle/BattleScene.vue (398 l.), app/stores/chat.ts (174 l.)

### 3. Duplication systémique de patterns transverses jamais factorisés

- **Impact :** Correctifs à appliquer en N endroits, dérive silencieuse entre copies (les hex de probColor divergent déjà entre league/gyms/tournament), testabilité nulle.
- **Où :** Cache TTL dans hub/roll/collection/inventory/team/gyms ; refreshBalance() /auth/me brut dans team.ts/gyms.ts/tournament.ts + play.vue/league.vue ; try/catch/toast dans ~12 pages ; timers d'animation dans ShinyReveal/BattleScene/SlotMachine/VersusIntro/EvolveReveal/LeagueBattle ; navigation dans AppNavbar/BottomTabBar/MobileMenu ; audio dans useSound.ts/useSpinAudio.ts

### 4. Accès données brut depuis les pages/composants, court-circuitant les stores

- **Impact :** Couche data mélangée à l'UI, impossible à mocker via le store, incohérence (login/register via store mais forgot/reset via repo direct).
- **Où :** play.vue et league.vue appellent useApi()('/auth/me') ; team.vue importe inventoryRepo ; forgot-password.vue et reset-password.vue importent authRepo ; settings.vue appelle authRepo directement

### 5. Valeurs magiques et sources de vérité dupliquées hors du design system / du domaine

- **Impact :** Incohérence visuelle silencieuse, désynchronisation front/back, refactor risqué (renommage de littéraux non typo-safe).
- **Où :** Couleur marque #ee5a48/#e8402f (10 fichiers) et shiny #c9b3ff (9 fichiers) en dur malgré des tokens --color-poke-* ; pity 1/500 et seuil fusion 10 réécrits dans collection.vue/rules.vue/BoosterReveal.vue ; RARITY_LABEL (poke.ts) vs RARITY_META.label (cardTheme.ts) ; BIOME_SLUGS vs BIOME_SLUG_TO_NAME maintenus à la main ; clés localStorage préfixes gacha_/pkr_/aucun

### 6. Types de domaine hébergés dans les stores + conventions de préfixe (Wire*/Domain*) tenues à ~2/3

- **Impact :** Composants présentationnels couplés au store, le préfixe n'est plus un signal fiable, casts `unknown`/`as` reportés sur les consommateurs.
- **Où :** AdvReward/StarterOption importés de ~/stores/spin ; Wire* absent sur ApiError/AuthResponse/MeResponse… ; Domain* absent sur TradePlayer/LeaderboardRow… ; CelebrationTier (présentation) dans domain.ts ; view-models aventure (~65 l.) dans domain.ts

### 7. Outillage de test sous-exploité : deps DOM installées mais config incompatible + couverture déséquilibrée

- **Impact :** Impossible de tester des composants, colocation des specs bloquée, la logique la plus riche (stats/roll/league) reste non couverte.
- **Où :** vitest.config.ts en environment:'node' malgré happy-dom installé, include limité à tests/unit/**/*.spec.ts ; seuls 2/~30 normalizers testés ; pas de script `check` agrégé dans package.json

## Revue fichier par fichier

Légende sévérité : 🔴 high · 🟠 medium · 🟡 low

### Configuration & shell applicatif (config, plugins, middleware, layouts)

#### 🟠 `web/app/plugins/auth-bootstrap.client.ts` — 26 l.

_Plugin client : hydrate l'utilisateur une fois au boot et affiche le toast de bonus quotidien._

**Problèmes DX**
- Mélange de préoccupations : orchestration d'auth (fetchMeOnce) + logique métier de bonus quotidien (clé localStorage, comparaison de jour Paris) + présentation (contenu du toast) dans un même plugin.
- Accès direct à localStorage et clé magique 'daily_bonus_seen' en dur, sans abstraction : logique testable difficilement extractible et couplée au plugin.
- Le contenu du toast (titre/description/couleur/icône) est du contenu UI codé en dur dans un plugin : devrait vivre dans un composable/i18n.

**Améliorations**
- Extraire la logique 'bonus déjà vu aujourd'hui' dans un composable (ex. useDailyBonus()) avec la clé localStorage encapsulée, rendant la règle testable en isolation.
- Déplacer le libellé du toast dans un helper de notifications (ou fichier de messages) pour découpler contenu et orchestration.
- Garder le plugin réduit à l'orchestration : appeler auth.fetchMeOnce() puis déléguer la célébration à useDailyBonus().

#### 🟠 `web/app/layouts/default.vue` — 21 l.

_Layout du jeu : navbar + bottom bar + widgets globaux (chat, battle) et amorçage des données navbar._

**Problèmes DX**
- Le layout déclenche de la logique de données au montage (hub.ensureShort()) avec un .catch(() => {}) qui avale silencieusement toute erreur : couplage layout↔store et gestion d'erreur muette (mauvaise DX de debug).
- Montage en dur de widgets globaux (ChatWidget, BattleStage) dans le layout : responsabilités mêlées (shell de navigation + overlays fonctionnels) ; acceptable mais à surveiller si d'autres overlays s'ajoutent (God-layout).

**Améliorations**
- Déplacer l'amorçage hub.ensureShort() dans le store/composable concerné (ou un plugin d'init) plutôt que dans le layout, et logguer/gérer l'échec au lieu du catch vide.
- Si les overlays globaux se multiplient, les regrouper dans un composant <GlobalOverlays/> pour garder le layout focalisé sur la structure de navigation.
- Éviter le catch silencieux : au minimum consoler l'erreur en dev ou remonter un toast discret.

#### 🟠 `web/vitest.config.ts` — 15 l.

_Config Vitest : tests unitaires node, alias ~/@ vers app/._

**Problèmes DX**
- environment: 'node' alors que happy-dom est installé : les tests de composants Vue ne sont pas exécutables avec cette config unique (pas d'environnement DOM), ce qui bride la testabilité de la couche UI.
- Le glob include se limite à tests/unit/**/*.spec.ts : pas de colocation possible des tests à côté des features (app/**/*.spec.ts ignoré), à contre-courant de la structure feature-based visée.
- Alias dupliqués ~ et @ pointant au même endroit sans nécessité apparente ; @nuxt/test-utils est installé mais non utilisé ici (config Vitest brute au lieu de defineVitestConfig de Nuxt), risque de divergence des alias/auto-imports avec le runtime.

**Améliorations**
- Passer à defineVitestConfig de @nuxt/test-utils pour hériter automatiquement des alias et auto-imports Nuxt, évitant de maintenir les alias à la main.
- Ajouter un projet/environnement happy-dom (ou environmentMatchGlobs) pour permettre des tests de composants colocalisés.
- Élargir include pour autoriser la colocation des specs par feature, ou documenter la convention tests/unit.

#### 🟠 `web/app/app.vue` — 14 l.

_Composant racine : UApp + toaster, NuxtLayout/NuxtPage, useSeoMeta._

**Problèmes DX**
- useSeoMeta redéfinit title 'PokeRoulette' (sans accent) et une description qui divergent de nuxt.config (SITE_TITLE avec accent, SITE_DESC différente) : incohérence de nommage/branding et duplication de la source SEO.
- Config du toaster (position 'top-center') en dur dans le composant racine : paramètre UI qui gagnerait à vivre dans app.config.

**Améliorations**
- Supprimer le useSeoMeta redondant ou le faire pointer vers la même source (runtimeConfig/appConfig) que nuxt.config pour une seule vérité SEO, et corriger 'PokeRoulette' → 'PokéRoulette'.
- Déplacer les options du toaster dans app.config.ts (ui.toaster) pour centraliser la config UI.

#### 🟡 `web/nuxt.config.ts` — 143 l.

_Configuration racine Nuxt : SEO/OG, proxy dev API, polices, icônes, colorMode, modules._

**Problèmes DX**
- Fichier qui commence à cumuler plusieurs préoccupations dans un seul bloc : métadonnées SEO/OG, config proxy réseau, fontes, icônes, colorMode. Encore lisible mais tend vers le God-config.
- Constantes SEO (SITE_URL, SITE_TITLE, SITE_DESC, OG_IMAGE, theme-color '#e8402f') définies en dur en tête de fichier alors qu'elles relèvent d'un runtimeConfig/appConfig réutilisable ailleurs (app.vue redéfinit d'ailleurs son propre title/description → duplication).
- Duplication directe de la couleur de marque '#e8402f' (theme-color) qui existe forcément aussi dans les tokens CSS/Tailwind : valeur magique dupliquée hors du design system.
- Liste d'icônes incluses manuellement (icon.clientBundle.icons) : couplage fragile — toute icône dynamique ajoutée ailleurs doit être répétée ici manuellement, sans garde-fou.
- Le versioning de cache favicon via '?v=2' est répété sur 4 liens : magic string dupliquée, facile à désynchroniser au prochain bump.

**Améliorations**
- Extraire les constantes SEO/site dans runtimeConfig.public (ou app.config.ts) et les consommer à la fois ici et dans app.vue via useAppConfig()/useRuntimeConfig, éliminant la duplication du title/description.
- Centraliser la couleur de marque dans les tokens (app.config ui.colors / CSS var) et référencer une seule source pour theme-color.
- Regrouper les blocs par domaine avec des commentaires de section déjà présents, ou externaliser la config head/SEO dans un fichier dédié importé (ex. config/seo.ts) pour alléger nuxt.config.
- Documenter/centraliser le suffixe de cache favicon dans une seule constante FAVICON_VERSION.

#### 🟡 `web/app/layouts/auth.vue` — 81 l.

_Layout public des pages d'authentification : décor animé (blobs) + slot centré._

**Problèmes DX**
- Valeurs de design en dur dans le <style scoped> : couleurs des blobs (#ffb2a6, #ffe1a2, #aad4f5), gradient, tailles, durées d'animation — hors design system/tokens, non réutilisables.
- Décor purement présentationnel dupliqué potentiellement d'autres écrans (halos pastel) : candidat à un composant DecorBlobs réutilisable plutôt qu'inline dans le layout.
- Markup répétitif de 3 <span class='blob blob--x'> : duplication qui gagnerait à être générée par un v-for sur une config.

**Améliorations**
- Extraire le décor dans un composant réutilisable <AuthDecor/> ou <DecorBlobs :blobs=... />, piloté par une liste de config, supprimant la répétition des 3 spans.
- Remplacer les couleurs/tailles en dur par des tokens CSS (var(--...)) du design system pour cohérence et thème sombre.
- Conserver le layout minimal (structure) et déléguer la déco au composant extrait (séparation structure/présentation).

#### 🟡 `web/package.json` — 42 l.

_Manifeste : scripts (dev/build/lint/typecheck/test) et dépendances._

**Problèmes DX**
- Pas de script agrégé de vérification (ex. 'check' = lint && typecheck && test) alors que le workflow CI/local enchaîne visiblement ces étapes : friction DX répétée.
- Pas de script de couverture de tests (vitest --coverage) ni de test:watch : la boucle de feedback tests n'est pas outillée.
- @nuxt/test-utils, @pinia/testing, @vue/test-utils, happy-dom sont installés mais la config Vitest (env node, glob restreint) ne permet pas d'en tirer parti : dette latente entre deps et config.

**Améliorations**
- Ajouter 'check': 'nuxt typecheck && eslint . && vitest run' et 'test:watch'/'test:coverage' pour fluidifier la DX.
- Aligner les deps de test avec une config Vitest capable de tester des composants (voir vitest.config.ts).
- Envisager un scope/engines pour figer la version Node attendue.

#### 🟡 `web/app/plugins/api.ts` — 29 l.

_Plugin fournissant une instance $fetch typée ($api) : Bearer, retry, timeout, 401 centralisé._

**Problèmes DX**
- Bonne séparation, mais valeurs magiques en dur (timeout 15_000, retry 1, retryDelay 400, liste des retryStatusCodes) non centralisées : difficiles à réutiliser/tester et à ajuster globalement.
- provide.api renvoie une instance non typée pour les consommateurs : selon la déclaration de type ($api dans NuxtApp) le typage peut être perdu — à vérifier qu'un declare module expose le type de retour.
- baseURL '/api' en dur ici alors que le proxy et l'origine backend sont configurés dans nuxt.config : la constante d'API vit à deux endroits.

**Améliorations**
- Extraire les paramètres réseau (timeout, retry, delay, statusCodes) dans une constante partagée (ex. utils/http-config.ts) réutilisable dans les tests.
- S'assurer d'un declare module '#app' { interface NuxtApp { $api: typeof api } } pour un typage fort côté repositories.
- Sourcer baseURL depuis runtimeConfig.public pour éviter la double définition avec le proxy.

#### 🟡 `web/app/middleware/auth.global.ts` — 16 l.

_Middleware global : redirige selon présence de token et meta.public._

**Problèmes DX**
- Noms de routes en dur dans un tableau littéral (['login','register']) : couplage fragile au nommage des pages, sans constante partagée.
- Chaînes de chemins en dur ('/play', '/login') dispersées : les routes de redirection ne sont pas centralisées (réutilisées ailleurs probablement).
- String(to.name) trahit un typage lâche du nom de route ; la logique reste petite mais mêle deux règles (redirection des pages publiques déjà connecté + garde des pages privées) sans nommage explicite des cas.

**Améliorations**
- Centraliser les routes clés (LOGIN, REGISTER, HOME_AUTHED) dans une constante/enum partagée réutilisée par middleware, plugin et pages.
- Extraire de petits prédicats nommés (isAuthPage(to), redirectToLogin(to)) pour rendre l'intention explicite.
- Typer les noms de routes si le typedPages de Nuxt est activé pour supprimer String(to.name).

#### 🟡 `web/tsconfig.json` — 10 l.

_tsconfig racine déléguant aux projects générés par Nuxt via references._

**Problèmes DX**
- Standard Nuxt 4, rien à redire côté architecture. Aucun compilerOptions projet propre : impossible d'ajouter un strict/paths custom sans savoir qu'ils vont dans .nuxt.
- DX faible pour un nouveau contributeur : rien n'indique où ajouter des options TS (elles se mettent dans nuxt.config.typescript).

**Améliorations**
- Ajouter un court commentaire pointant vers nuxt.config `typescript.tsConfig` pour toute personnalisation, afin d'éviter les modifications erronées de ce fichier généré-adjacent.

#### 🟡 `web/eslint.config.mjs` — 6 l.

_Config ESLint minimale déléguant tout au preset Nuxt (withNuxt)._

**Problèmes DX**
- Config vide : aucune règle projet (ordre des imports, exhaustivité des règles Vue/TS, interdiction explicite de any). Le style stylistic est piloté depuis nuxt.config, ce qui éclate la config lint sur deux fichiers.
- Le placeholder 'Your custom configs here' laissé tel quel indique une config non finalisée.

**Améliorations**
- Rapatrier la config stylistic depuis nuxt.config vers ce fichier (ou l'inverse) pour une source unique de vérité du lint.
- Ajouter au minimum quelques règles projet explicites (no-explicit-any en warn, ordre d'imports, vue/component-name-in-template-casing) pour verrouiller la DX.
- Retirer le commentaire placeholder.

**Patterns transverses (groupe)**
- Duplication de la source SEO/branding entre nuxt.config.ts et app.vue (title/description divergents, 'PokeRoulette' sans accent vs 'PokéRoulette') : pas de source unique.
- Valeurs magiques et constantes en dur récurrentes hors design system : couleur de marque #e8402f, couleurs des blobs, paramètres réseau ($fetch), clés localStorage, noms/chemins de routes.
- Chemins et noms de routes ('/play', '/login', 'login', 'register') dispersés sans module de constantes partagé, créant un couplage fragile au nommage.
- Petits mélanges de préoccupations dans la couche shell : plugin d'auth mêlant orchestration + métier bonus + contenu UI ; layout déclenchant du fetch de données avec erreur avalée.
- Outillage de test sous-exploité : deps de test DOM installées mais config Vitest en env node + glob restreint empêchant la colocation et les tests de composants.

**Quick wins (groupe)**
- Corriger 'PokeRoulette' → 'PokéRoulette' et faire pointer le useSeoMeta de app.vue vers la même source que nuxt.config (ou le supprimer) pour éliminer la divergence SEO.
- Ajouter un script npm 'check' (typecheck + lint + test) et 'test:coverage' pour fluidifier la boucle de vérification.
- Centraliser les routes clés (LOGIN, REGISTER, HOME_AUTHED) dans app/constants/routes.ts et les réutiliser dans le middleware.
- Remplacer le catch vide de default.vue par un log/gestion explicite de l'échec de hub.ensureShort().
- Extraire la clé 'daily_bonus_seen' et la règle 'déjà vu aujourd'hui' dans un composable useDailyBonus() testable.
- Extraire les paramètres réseau du plugin api.ts (timeout/retry/delay/statusCodes) dans une constante partagée.


### app/types (wire + domain type contracts)

#### 🟠 `web/app/types/api.ts` — 535 l.

_Types « wire » représentant la forme brute des réponses de l'API existante, consommés uniquement par la couche repositories qui les normalise ensuite en types domaine._

**Problèmes DX**
- Fichier « God » : ~535 lignes / 60+ types regroupant toutes les features du produit (auth, roll, biomes, arènes, ligue, tournoi, jackpot, trades, stats, chat, spin/aventure) dans un seul module. La navigation et le blast-radius d'un changement sont maximaux ; un `import type` sur ce fichier tire toute la surface.
- Convention de préfixe `Wire` incohérente : la majorité des types API la portent (WireUser, WireCard...) mais un tiers ne l'a pas alors qu'ils sont tout autant des DTO wire (ApiError, AuthResponse, CardChoice, MeResponse, SellResult, TrainingStatus, SlotStatus, SpinStatus, LeagueStatus, TradeEligibility, NotificationsResponse). Le lecteur ne peut pas se fier au préfixe pour savoir si un type est brut ou normalisé.
- Typage lâche via `unknown` : `matches?: unknown[]` et `snapshots?: Record<UUID, WireCard[]>` dans WireTournament, et `card?: unknown` dans WireSpinLegendary. Ces trous obligent chaque consommateur à caster, et masquent la vraie forme de la donnée.
- Duplication de shapes d'union : WireRollResult et WireLineResult redéclarent inline des variantes (`isSpecialEvent`/`eventType`, `type: 'coins'|'charme'|...`) qui sont réexprimées presque à l'identique dans domain.ts (RollOutcome, LineReward). La correspondance wire→domaine n'est garantie par aucun type partagé.
- Littéraux magiques répétés non nommés : `level: 1 | 2 | 3` (WireCard), `tournament_medal_placement: 1 | 2 | 3 | null` (WireLeaderboardRow), unions de `status` de trades/tournois écrites en toutes lettres. Aucun type alias (CardLevel, MedalPlacement, TradeStatus, TournamentStatus) n'est extrait, alors que les mêmes littéraux réapparaissent côté domaine.
- Types anonymes inline répétés : `{ player: string, champion: string, probability: number }[]` (matchups) apparaît dans WireGymEstimate ; `{ name: string, image_url: string, color: string }[]`, `{ item_type: string, quantity: number }[]`, les blocs `results`/`participants` du tournoi... Ces objets ad hoc devraient être des interfaces nommées et réutilisables plutôt que dupliqués littéralement.
- Bloc Stats très verbeux (WireStats* : ~65 lignes, 10 interfaces) mélangeant global/gyms/players/pool/anecdotes dans le même fichier généraliste ; candidat évident à une colocation par feature `stats`.
- `item_type: string` (WireInventory) et `source: string` (WireRecentShiny) sont des `string` nus alors que ce sont des énumérations fermées côté serveur : typage trop permissif qui n'aide pas l'autocomplétion.

**Améliorations**
- Découper en barrel `app/types/` colocalisé par feature : `api/auth.ts`, `api/cards.ts`, `api/roll.ts`, `api/gym.ts`, `api/league.ts`, `api/tournament.ts`, `api/slot.ts`, `api/trade.ts`, `api/stats.ts`, `api/chat.ts`, plus un `api/primitives.ts` (UUID, ISODate, Rarity, Biome, PokeType) réexporté par un `index.ts`. Pur move de code, zéro changement de comportement, imports inchangés si un index réexporte tout.
- Uniformiser la convention : préfixer TOUS les DTO bruts en `Wire*` (ou décider d'un suffixe `*Dto`) pour que le préfixe soit un signal fiable. Renommage mécanique et sûr.
- Remplacer les `unknown` par des interfaces dédiées (WireTournamentMatch, WireSpinLegendaryCard) même partielles, quitte à les marquer optionnelles, pour supprimer les casts en aval.
- Extraire les littéraux récurrents en alias nommés : `type CardLevel = 1 | 2 | 3`, `type MedalPlacement = 1 | 2 | 3`, et centraliser les unions de statut (TradeStatus, TournamentStatus) pour les partager avec domain.ts.
- Nommer les objets inline répétés (Matchup, RecommendedType, InventoryItem, TournamentResultRow) en interfaces réutilisables.

#### 🟠 `web/app/types/domain.ts` — 456 l.

_Types « domaine » normalisés (camelCase, rareté réconciliée en isShiny + RealRarity) consommés par les stores et composants, plus quelques view-models purement front (aventure rogue-lite)._

**Problèmes DX**
- Fichier « God » symétrique à api.ts (~456 lignes, ~50 types) couvrant toutes les features ; même problème de blast-radius et de navigation.
- Mélange de préoccupations : le fichier contient à la fois (a) des types domaine normalisés depuis le wire (DomainCard, DomainTrade, LeaderboardRow...) et (b) des view-models 100 % front sans contrepartie API (AdventureMon, AdvTrainer, AdvNode, AdvChoice, AdvPath, GymGimmick, AdvNodeKind — ~65 lignes de logique « rogue-lite »). Ces derniers relèvent d'une feature `adventure/` et n'ont rien à faire dans le contrat de normalisation.
- Préoccupation UI dans les types domaine : `CelebrationTier` ('shiny-legendary'...) est un concept purement présentation (paliers d'animation de célébration) ; il devrait vivre côté composant/composable de célébration, pas dans domain.ts.
- Convention de préfixe `Domain` incohérente : certains types la portent (DomainCard, DomainTrade, DomainTournament, DomainGym, DomainStats, DomainLeagueStatus, DomainAnecdotes) et d'autres, de même nature normalisée, non (TradePlayer, TradeCard, ChampionMon, GymDetail, BattleResult, TrainingOutcome, LeaderboardRow, RecentShiny, TeamMember...). Le préfixe ne veut plus rien dire.
- Incohérence de représentation de la rareté : `RealRarity` est en français capitalisé ('Commun'|'Rare'|'Épique'|'Légendaire') tandis que `OddsKey` ('commun'|'rare'|'epic'|'shiny'|'legendary') est en anglais minuscule, et 'shiny' y est traité comme une rareté à part. Deux vocabulaires concurrents pour la même dimension → mapping manuel et source de confusion.
- Duplication de littéraux avec api.ts : TradeStatus et TournamentStatus sont redéclarés mot pour mot dans les deux fichiers au lieu d'être définis une fois et partagés. `level: 1 | 2 | 3` et `medal: 1 | 2 | 3 | null` sont eux aussi des littéraux magiques non nommés (mêmes qu'en wire).
- Objets anonymes inline non nommés et parfois dupliqués : `badges: { imageUrl: string, name: string }[]` (LeaderboardRow) est l'équivalent domaine de WireBadgeRef mais n'a pas de type nommé ; `recommendedTypes: { name, imageUrl, color }[]` (GymDetail) et `matchups: { player, champion, probability }[]` (GymEstimate) sont aussi anonymes.
- Grosse union `AdvNodeKind` (14 variantes) et union `GymGimmick.key` (8 variantes) en littéraux inline documentés par commentaire : correct mais lourd ; ces domaines gagneraient un module dédié où le lien kind→forme serait modélisé par une union discriminée plutôt qu'un `AdvNode` fourre-tout à champs tous optionnels.

**Améliorations**
- Extraire les view-models d'aventure (AdventureMon, AdvTrainer, AdvNode, AdvChoice, AdvPath, GymGimmick, AdvNodeKind) dans `app/types/adventure.ts` (ou colocalisés dans une feature `features/adventure/`), séparant nettement le contrat de normalisation des modèles de scène purement front.
- Déplacer CelebrationTier vers le composable/composant de célébration (ex. `app/composables/useCelebration` ou `app/components/celebration/`), là où il est réellement consommé.
- Uniformiser le préfixe des types normalisés (tout en `Domain*`, ou l'abandonner partout) pour un signal cohérent ; renommage mécanique et sûr.
- Définir TradeStatus / TournamentStatus / CardLevel / MedalPlacement une seule fois dans un module de primitives partagées et les importer aussi bien dans api.ts que domain.ts, supprimant la duplication des unions.
- Nommer les objets inline récurrents (BadgeRef, RecommendedType, Matchup) en interfaces domaine réutilisables.
- Unifier le vocabulaire de rareté : choisir une seule casse/langue et dériver OddsKey de RealRarity (ou documenter explicitement la table de correspondance dans un mapper) pour éviter les deux référentiels concurrents.
- Après découpage par feature, exposer un `index.ts` barrel qui réexporte tout, pour que les imports existants restent inchangés.

**Patterns transverses (groupe)**
- Anti-corruption layer volontaire et globalement propre : chaque type Wire* a un équivalent domaine normalisé (snake_case→camelCase, rareté 'Alt'→isShiny+RealRarity). L'intention est bonne et bien commentée ; les problèmes sont structurels, pas conceptuels.
- Deux « God files » symétriques : api.ts (~535 l.) et domain.ts (~456 l.) concentrent chacun toutes les features du produit. Le découpage naturel par feature (auth, cards, gym, league, tournament, slot, trade, stats, chat, adventure) est absent alors qu'il est trivial et sans risque via un barrel.
- Conventions de préfixe non tenues dans les DEUX fichiers : `Wire*` et `Domain*` sont appliqués à ~2/3 des types seulement, ce qui annule leur valeur de signal.
- Duplication inter-fichiers de littéraux : unions de statut (trade/tournoi), littéraux `1|2|3` de niveau et de médaille, et shapes d'union roll/slot sont réécrits des deux côtés sans type partagé garantissant la correspondance wire↔domaine.
- Objets anonymes inline répétés (matchups, badges, recommendedTypes, inventory items) au lieu d'interfaces nommées : friction d'autocomplétion et duplication silencieuse.
- Fuites de concerns dans domain.ts : view-models purement front (aventure) et concept de présentation (CelebrationTier) cohabitent avec le contrat de normalisation.
- Quelques échappatoires de typage (`unknown`, `string` nus pour des énumérations fermées) qui reportent le casting sur les consommateurs.

**Quick wins (groupe)**
- Extraire les alias manquants (`CardLevel = 1|2|3`, `MedalPlacement = 1|2|3`) et centraliser TradeStatus/TournamentStatus dans un seul module partagé importé par api.ts et domain.ts : supprime la duplication de littéraux en quelques lignes.
- Nommer les objets inline récurrents (BadgeRef, Matchup, RecommendedType, InventoryItem) en interfaces réutilisables ; pur ajout de types, zéro impact runtime.
- Uniformiser les préfixes Wire*/Domain* par renommage mécanique pour rendre le signal fiable.
- Déplacer CelebrationTier hors de domain.ts vers son composant/composable de célébration.
- Sortir le bloc aventure (AdventureMon, AdvTrainer, AdvNode, AdvChoice, AdvPath, GymGimmick, AdvNodeKind) dans `app/types/adventure.ts` : simple move, isole ~65 lignes de view-models front.
- Remplacer les `unknown` (matches, snapshots card, WireSpinLegendary.card) par des interfaces dédiées même partielles pour éliminer les casts en aval.
- Introduire un barrel `app/types/index.ts` réexportant tout, préparant un futur découpage par feature sans toucher aux imports existants.


### app/repositories

#### 🔴 `web/app/repositories/normalize.ts` — 418 l.

_Ensemble de fonctions pures qui réconcilient les formes « wire » (snake_case, rareté 'Alt') de l'API en types domaine (camelCase, isShiny + rareté réelle)._

**Problèmes DX**
- Fichier long (~418 lignes) regroupant les normalizers de toutes les features (cartes, gym, league, tournament, trades, stats, chat, spin...) : même problème de colocation que index.ts, un seul module partagé pour des préoccupations indépendantes.
- Duplication du calcul de shiny : la règle « est shiny » est réimplémentée de façons légèrement différentes à plusieurs endroits — `c.is_alt || c.rarity === 'Alt'` (normalizeCard), `r.rarity === 'Alt'` (normalizeChampionMon, normalizeTeamMember), `!!r.avatar_is_alt || r.avatar_rarity === 'Alt'` (leaderboard), `!!p.avatar_is_alt` (tradePlayer/tournament) : logique métier dispersée et incohérente, pas de source unique de vérité.
- Duplication du motif snake_case→camelCase mappé à la main dans chaque normalizer (image_url→imageUrl, avatar_is_alt→avatarIsShiny...) : très répétitif, aucune aide de transformation.
- Valeurs magiques métier en dur : `realRarity` renvoie 'Commun' comme fallback (magique) et 'Légendaire'/'Alt' sont des littéraux répétés ; `totalWeight = p.total_weight || 1` masque un cas limite sans nom explicite.
- Constante `ODDS_META` (labels + couleurs hex '#b0a79a'...) mélange des préoccupations de présentation/UI (couleurs d'affichage) dans une couche de transformation de données : ces couleurs devraient vivre dans un thème/config UI, pas dans le normalizer.
- Incohérence sur l'ordre des raretés : `normalizeStats` déclare `keys = ['commun','rare','epic','legendary','shiny']` alors que `ODDS_META` les liste dans un ordre différent ('shiny' avant 'legendary') — source de confusion et de bugs de maintenance.
- `normalizeStats` est une fonction très longue (~60 lignes) qui fait tout : calcul de probabilités, tri des gyms, tri des players (localeCompare fr), aplatissement des anecdotes (~10 sous-objets mappés inline) — viole la responsabilité unique et est difficile à lire/tester par morceaux.
- Logique de tri (métier/présentation) enfouie dans le normalizer (`.sort` sur odds par probabilité, gyms par holders, players par username) : mélange normalisation de données et règles de tri d'affichage.

**Améliorations**
- Extraire un helper unique `isShinyRarity(rarity, isAltFlag?)` (source de vérité) et l'utiliser dans tous les normalizers pour supprimer la duplication et l'incohérence de la règle shiny.
- Découper normalize.ts par feature en miroir des repositories (`normalize/card.ts`, `normalize/gym.ts`, `normalize/stats.ts`...) avec un barrel, ou au minimum via les séparateurs de section déjà présents.
- Sortir `ODDS_META` (couleurs/labels) dans une config UI/thème (`~/constants/odds.ts` ou composable) et n'y injecter que les données chiffrées depuis le normalizer, séparant présentation et données.
- Décomposer `normalizeStats` en sous-fonctions pures nommées (`normalizeOdds`, `normalizeGymStats`, `normalizePlayerStats`, `normalizeAnecdotes`) pour respecter la responsabilité unique et faciliter les tests.
- Nommer les constantes magiques (`DEFAULT_RARITY = 'Commun'`, `LEGENDARY_BIOME = 'Légendaire'`, `SHINY_RARITY = 'Alt'`) et unifier la liste/ordre des raretés dans une seule constante partagée réutilisée par `keys` et `ODDS_META`.
- Envisager d'externaliser les règles de tri (par probabilité, holders, username) côté store/composant d'affichage plutôt que dans la couche de normalisation, pour garder le normalizer purement transformationnel.

#### 🔴 `web/app/repositories/index.ts` — 297 l.

_Barrel unique regroupant tous les repositories (auth, roll, collection, team, gym, league, tournament, spin, trades, chat, etc.), seul point de contact avec l'API HTTP._

**Problèmes DX**
- Fichier « God » / barrel monolithique : ~20 objets repository de features totalement distinctes (auth, roll, gym, league, tournament, trades, chat, stats, leaderboard...) cohabitent dans un seul fichier de ~300 lignes ; toute évolution d'une feature touche ce fichier partagé et le rend un point de conflit de merge permanent.
- Bloc d'imports de types géant (2 imports groupés de ~15 lignes chacun depuis ~/types/api et ~/types/domain, plus tous les normalizers) : difficile à lire/maintenir, et masque quel repository consomme quel type.
- Injection manuelle de `api: Api` en premier paramètre de CHAQUE méthode de CHAQUE repository : boilerplate répété des dizaines de fois, couplage fort au call-site (chaque appelant doit récupérer et passer `useApi()`), là où un composable/factory `useXxxRepo()` capturant `api` une seule fois serait idiomatique Nuxt.
- Incohérence de pattern d'implémentation : certaines méthodes sont des fléchées one-liner qui renvoient la promesse brute non normalisée (ex. `getBadges`, `getHistory` renvoyant `WireBadge[]`/`unknown[]`), d'autres sont `async` avec `.map(normalize...)` ; le contrat « les repositories normalisent toujours en domaine » annoncé en en-tête n'est pas tenu uniformément.
- Typage lâche : `getHistory: (api) => api<unknown[]>('/gym/history')` expose un `unknown[]` non normalisé au reste de l'app ; `getBadges` renvoie du type wire brut (`WireBadge[]`) au lieu d'un type domaine.
- Chemins d'endpoints en chaînes magiques dispersées ('/auth/login', '/gym/${id}/battle'...), sans constantes centralisées ; risque de divergence et pas d'inventaire des routes.
- Construction de query-string dupliquée : le motif `new URLSearchParams` + `if (biome) params.set(...)` + `if (type) params.set(...)` est copié quasi à l'identique entre `rollRepo.previewBatch` et `rollRepo.comboCheck`.
- Valeurs par défaut métier en dur dans la couche data (`previewBatch(count = 19, ...)`) : le 19 est une constante magique sans nom.
- Logique métier `normalizeRoll` (discrimination d'union isSpecialEvent / eventType 'coins'/'charme_chroma'/choice) définie inline dans index.ts alors que toutes les autres normalisations vivent dans normalize.ts : incohérence de colocation.
- Normalisation inline plutôt que déléguée pour plusieurs endpoints (`rollRepo.biomes` mappe les champs snake→camel à la main, `leagueRepo.legendaryEstimate` construit l'objet domaine inline, `leaderboardRepo.get` assemble la structure player inline) : mélange « accès données » et « transformation » dans le repo au lieu d'un normalizer dédié testable.

**Améliorations**
- Découper par feature (colocation) : un fichier repository par domaine (`repositories/auth.ts`, `roll.ts`, `gym.ts`, `league.ts`...) et un `index.ts` barrel qui ne fait que ré-exporter, pour réduire les conflits et clarifier la responsabilité.
- Introduire une factory/composable par repository capturant `api` une fois (`export function useGymRepo(api = useApi())`) pour supprimer le paramètre `api` répété sur chaque méthode et alléger tous les call-sites.
- Extraire un helper `buildQuery(params: Record<string,string|null>)` (ou réutiliser URLSearchParams via une petite fonction) pour dédupliquer la construction de query-string de `previewBatch`/`comboCheck`.
- Déplacer `normalizeRoll` dans normalize.ts avec les autres normalizers pour homogénéiser la colocation et le rendre testable unitairement.
- Extraire les normalisations inline restantes (`biomes`, `legendaryEstimate`, `leaderboard.get`) en fonctions `normalizeBiome`, `normalizeLegendaryOdds`, `normalizeLeaderboardData` dans normalize.ts.
- Centraliser les chemins d'API dans un objet/const `API_ROUTES` (ou au moins par feature) et nommer les constantes magiques (`DEFAULT_PREVIEW_COUNT = 19`).
- Normaliser aussi `getBadges` et `getHistory` vers des types domaine (ou au minimum typer `getHistory` autrement qu'en `unknown[]`) pour tenir le contrat « les repos renvoient du domaine ».

#### 🟠 `web/tests/unit/normalize.spec.ts` — 54 l.

_Tests unitaires Vitest couvrant normalizeCard (mapping, réconciliation Alt/shiny, détection légendaire via biome) et normalizeOwnedCard (quantity null→0, conservation quantité/statut)._

**Problèmes DX**
- Couverture très partielle : seuls 2 des ~30 normalizers exportés sont testés (normalizeCard, normalizeOwnedCard) ; toute la logique riche et à risque (normalizeStats avec ses probabilités/tris, normalizeRoll, normalizeTradeCard, normalizeLeagueRun, la règle shiny dupliquée...) n'a aucun test.
- Aucun test sur la couche repository (index.ts) : la construction de query-string, le contrat de normalisation, la discrimination `normalizeRoll` ne sont pas couverts (bien que testables via un mock d'`api`).
- Le fixture `base: WireCard` est défini localement dans ce fichier ; s'il faut tester d'autres normalizers de cartes ailleurs, il sera dupliqué faute de factory de fixtures partagée.
- Cas limites non couverts pour les fonctions testées : rareté 'Alt' avec `is_alt=false` (shiny déduit via rarity seule), fallback 'Commun' de realRarity, standard_id fourni vs absent.

**Améliorations**
- Étendre la couverture aux normalizers à forte logique en priorité : `normalizeStats` (probabilités + ordre de tri), `normalizeRoll` (chaque branche de l'union special-event), et la règle shiny dans ses variantes.
- Une fois `isShinyRarity` extrait, le tester directement pour figer la règle métier centralisée.
- Extraire les fixtures wire (ex. `makeWireCard(overrides)`) dans un helper de test partagé (`tests/fixtures/`) pour éviter la duplication à mesure que les tests grandissent.
- Ajouter des tests de la couche repository avec un `api` mocké, notamment pour vérifier la query-string de `previewBatch`/`comboCheck` et le contrat de normalisation.

**Patterns transverses (groupe)**
- Architecture en couche data bien intentionnée (repositories = seul contact API, normalize = wire→domaine) et correctement documentée en en-tête, mais matérialisée par deux fichiers monolithiques ~300-420 lignes qui agrègent toutes les features au lieu d'une colocation par feature.
- Frontière repository/normalizer poreuse : plusieurs normalisations vivent inline dans index.ts (normalizeRoll, biomes, legendaryEstimate, leaderboard.get) au lieu d'être dans normalize.ts, tandis que normalize.ts contient de la préoccupation UI (couleurs ODDS_META) — les responsabilités fuient entre les couches.
- Duplication récurrente de trois motifs : la règle 'shiny' (is_alt/rarity==='Alt') réimplémentée ~6 fois de façons divergentes, le mapping manuel snake_case→camelCase dans chaque normalizer, et la construction de query-string dupliquée dans le repo.
- Constantes/valeurs magiques non nommées disséminées ('Commun', 'Légendaire', 'Alt', count=19, couleurs hex) au lieu d'un module de constantes partagé.
- Boilerplate d'injection : `api: Api` passé en 1er paramètre de chaque méthode de chaque repo, là où une factory/composable Nuxt capturant `api` une fois éliminerait le bruit.
- Couverture de tests fortement déséquilibrée : la logique la plus riche et la plus à risque (stats, roll, league) est non testée alors que le mapping le plus simple l'est.

**Quick wins (groupe)**
- Extraire un helper `isShinyRarity(rarity, isAltFlag?)` et remplacer les ~6 implémentations dispersées de la règle shiny (comportement identique, source unique de vérité).
- Nommer les constantes magiques : `SHINY_RARITY = 'Alt'`, `LEGENDARY_BIOME = 'Légendaire'`, `DEFAULT_RARITY = 'Commun'`, `DEFAULT_PREVIEW_COUNT = 19`.
- Factoriser la construction de query-string de `previewBatch`/`comboCheck` dans un petit helper `buildQuery`.
- Déplacer `normalizeRoll` de index.ts vers normalize.ts pour homogénéiser la colocation des normalizers.
- Sortir les couleurs/labels de `ODDS_META` vers une config UI/thème et unifier l'ordre des raretés avec la liste `keys` de normalizeStats.
- Typer `gymRepo.getHistory` autrement qu'en `unknown[]` (ou le normaliser) pour tenir le contrat de la couche.
- Ajouter une factory de fixtures `makeWireCard(overrides)` dans les tests pour préparer l'extension de la couverture sans duplication.


### stores (Pinia)

#### 🔴 `web/app/stores/hub.ts` — 169 l.

_Store agrégateur du hub/navbar : charge en parallèle trades, tournoi, ligue, notifications, quotas d'entraînement/slot/spin/arènes et calcule les tuiles d'activités._

**Problèmes DX**
- Store « God » : agrège 8 domaines distincts (training, slot, league, tournament, spin, trades, gyms, notifications) dans un seul fichier — responsabilité unique violée, plus gros fichier du groupe.
- Fort mélange de préoccupations : accès données (5+ repositories), logique de cache TTL, ET logique de présentation UI (construction des `QuotaTile` avec labels français en dur, routes `to`).
- Libellés UI en dur ('Entraînement','Jackpot','Ligue des 4','Échange'…) et routes ('/gyms','/slot-machine','/tournament'…) dans un store : couplage vue/logique, non i18n-able, difficile à faire évoluer.
- Duplication : `state.gyms.find(g => !g.hasBadge)` calculé dans le getter `currentGym` ET recalculé dans `weeklyTiles` (`const gym = ...`).
- Couplage cross-store non déclaré : `tradeActionsRequired` appelle `useAuthStore().userId` dans un getter.
- `ensureShort`/`ensureLong` répètent exactement le même pattern TTL+Promise.all+catch-fallback, dupliqué aussi dans roll/collection/inventory sous des variantes légèrement différentes.
- `.catch(() => [] / null)` avale silencieusement toutes les erreurs réseau sans traçabilité — mauvaise DX de debug.

**Améliorations**
- Extraire la construction des tuiles (`dailyTiles`/`weeklyTiles`) dans un composable de présentation `useActivityTiles()` prenant l'état en entrée ; garder le store centré sur données+cache.
- Externaliser labels et routes des tuiles dans une config déclarative (`~/config/activity-tiles.ts`) pour découpler l'UI.
- Factoriser le pattern TTL/dedupe en un helper commun (`createTtlResource`) réutilisé par hub/roll/collection/inventory pour supprimer la duplication.
- Réutiliser le getter `currentGym` dans `weeklyTiles` au lieu de recalculer le `find`.
- Envisager un découpage feature-based (stores par domaine : trades, tournament, gyms…) avec un store hub léger qui compose, plutôt qu'un mégastore.
- Logger les erreurs avalées (au moins en dev) au lieu d'un catch muet.

#### 🔴 `web/app/stores/auth.ts` — 123 l.

_Store d'authentification : token JWT persisté, profil utilisateur, bonus quotidien via /auth/me, avatar et compteur Charme Chroma._

**Problèmes DX**
- Etat mutable module-level `mePromise` (ligne 23) hors du state Pinia : casse la testabilité (non réinitialisable entre tests sans hack), non-SSR-safe et invisible dans les devtools ; le pattern de mémoïsation est dupliqué implicitement avec les caches `fetchedAt` des autres stores mais sous une forme différente.
- Le store fait de l'orchestration cross-store en dur : `useWalletStore().reconcile(...)` appelé dans login/register/_fetchMe crée un couplage fort auth→wallet non déclaré dans les types.
- `decodeUserId` (décodage JWT, atob/JSON.parse) est de la logique utilitaire noyée dans le fichier store ; devrait vivre dans un util testable isolément.
- `userId` est un getter qui re-décode le JWT à chaque accès (pas de mémoïsation) alors que le token change rarement.
- Effets de navigation (`navigateTo`) et UI (`useToast` dans handleSessionExpired) dans un store : mélange logique métier / effets de bord de présentation, rend le store difficile à tester unitairement.
- Convention de nommage incohérente : action « privée » préfixée `_fetchMe` alors que Pinia n'a pas de vraie visibilité ; convention maison non documentée et non appliquée ailleurs (`_apply` dans inventory mais pas partout).
- Chaînes littérales de `source` ('login','register','auth/me') dupliquées comme valeurs magiques partagées avec wallet, sans type union ni constantes.

**Améliorations**
- Extraire `decodeUserId` vers `~/utils/jwt.ts` (ou `~/utils/auth`) et le couvrir de tests.
- Remonter les effets de navigation/toast hors du store : soit un composable `useAuthGuard`, soit laisser le plugin/handler appelant décider, le store n'exposant que l'état.
- Remplacer `mePromise` module-level par un champ de state (ex. `meInFlight`) ou une factorisation commune de « fetch-once/TTL » partagée avec hub/roll/collection/inventory (un util `createCachedFetch`/`useResourceCache`).
- Introduire un type union `type SyncSource = 'login' | 'register' | 'auth/me' | 'hub' | 'sell' | ...` et l'utiliser dans wallet.reconcile/credit pour éliminer les chaînes magiques.
- Mémoïser `userId` en cachant le résultat du décodage tant que `token` ne change pas (computed dérivé).

#### 🟠 `web/app/stores/inventory.ts` — 97 l.

_Store de l'inventaire : Charme Chroma et tickets biome/type à usage unique, avec activation/désactivation et mapping slug→nom._

**Problèmes DX**
- Deux formes de l'état des items : `items` typé inline `{ item_type: string, quantity: number }[]` (type anonyme dupliqué, devrait être un type nommé) tandis que WireInventory est importé — modélisation hétérogène.
- Préfixes de slug en dur et dupliqués ('tirage_biome_', 'tirage_type_', 'charme_chroma') dans plusieurs getters : valeurs magiques répétées, fragiles au moindre changement backend.
- Logique de mapping/parsing répétée entre `biomeTickets` et `typeTickets` (même filter+replace+map, seul le préfixe/dictionnaire change) : duplication factorable.
- `activateCharme` : fallback `res.charme_chroma_rolls ?? res.rolls ?? 0` révèle un contrat d'API instable/ambigu absorbé dans le store (typage lâche de la réponse repo).
- Couplage cross-store : `activateCharme` écrit dans `useAuthStore().setCharmeRolls`.
- `item_type` string libre plutôt qu'un union de types d'items connus.

**Améliorations**
- Nommer et exporter le type des items (`interface InventoryItem { itemType: string; quantity: number }`) et l'utiliser dans le state.
- Extraire les préfixes ('tirage_biome_', 'tirage_type_', 'charme_chroma') en constantes et factoriser un helper `mapTickets(items, prefix, dict)` réutilisé par les deux getters.
- Fiabiliser le contrat de `activateCharme` côté repository/type (un seul champ) au lieu du triple fallback.
- Uniformiser la casse des champs (snake_case API vs camelCase domaine) via la couche repository, pour que le store manipule un modèle domaine cohérent.

#### 🟠 `web/app/stores/roll.ts` — 81 l.

_Store des tirages gacha : cache des biomes/coûts et exécution d'un tirage ou d'un lot avec débits optimistes._

**Problèmes DX**
- Duplication forte entre `perform` et `performBatch` : même séquence débit optimiste → repo.perform → confirm → recrédit 'coins' → rollback ; la logique d'un tirage unitaire devrait être partagée.
- Manipulation directe de l'état d'un autre store : `wallet.coins += outcome.amount` (roll écrit dans le champ interne de wallet) au lieu de passer par une action `wallet.credit()` — casse l'encapsulation et double le chemin de mutation du solde.
- `previewBatch(count, biome, type)` : signature à paramètres positionnels multiples et `type: string | null` faiblement typé (le type de carte devrait être un union), risque d'inversion d'arguments.
- Format de `ref` (`roll-${Date.now()}`, `roll-batch-...`) construit ici : convention couplée à wallet, dispersée.
- Cache TTL `5 * 60_000` réécrit en dur (valeur magique répétée à l'identique dans collection/inventory/hub sans constante partagée).

**Améliorations**
- Extraire un `performSingleRoll(wallet, biome, unitCost, ref)` privé réutilisé par `perform` et `performBatch` pour supprimer la duplication.
- Remplacer `wallet.coins += ...` par `wallet.credit(outcome.amount, 'roll')` afin de passer par l'API publique du wallet.
- Passer un objet d'options à `previewBatch({ count, biome, type })` et typer `type` avec l'union de types de cartes.
- Extraire la constante TTL commune (ex. `~/utils/cache` `RESOURCE_TTL`) partagée par les stores à cache.

#### 🟠 `web/app/stores/collection.ts` — 67 l.

_Store de la collection/dex du joueur : cache des cartes possédées, getters de comptage/filtrage, vente et fusion._

**Problèmes DX**
- Seuil `FUSION_THRESHOLD = 10` et surtout `c.level >= 3` (niveau max en dur) et la formule `(quantity + 1) / 500` (`estimatedShinyChance`) : règles métier avec constantes magiques enfouies dans le store, dupliquant probablement des règles serveur.
- Getter `mergeables` : logique métier non triviale (double filtre + recherche d'évolution parent) dans un getter, difficile à tester isolément et peu lisible (fonction longue).
- Pattern cache TTL (`TTL`, `fetchedAt`, `ensureFresh`) redupliqué à l'identique de inventory/roll/hub.
- `estimatedShinyChance` est une fonction pure de calcul métier logée comme action de store (ne touche pas au state) — mauvais emplacement, devrait être un util testable.
- Couplage cross-store implicite : `sell` appelle `useWalletStore().reconcile`.

**Améliorations**
- Centraliser les constantes de règles (FUSION_THRESHOLD, MAX_LEVEL, SHINY_BASE=500) dans `~/utils/rules.ts` ou `~/config/game.ts` avec des noms révélateurs.
- Extraire `estimatedShinyChance` et la logique de `mergeables` dans des fonctions pures utilitaires (`~/utils/collection.ts`) testables et réutilisables.
- Factoriser le cache TTL commun (helper partagé).
- Documenter/typer la duplication des règles avec le backend pour éviter la dérive.

#### 🟠 `web/app/stores/preferences.ts` — 33 l.

_Préférences utilisateur persistées en localStorage (mode de révélation, biome, vitesse replay, volume, mute, reduced-motion)._

**Problèmes DX**
- Seul store en style setup alors que tous les autres sont en Options API : incohérence de pattern structurelle sur l'ensemble du dossier stores.
- Clés de localStorage en dur et hétérogènes ('gacha_reveal_mode', 'replay_speed', 'pkr_volume', 'pkr_muted', 'pkr_reduced_motion') : préfixes incohérents (gacha_ vs pkr_ vs aucun), valeurs magiques dispersées.
- Valeurs par défaut magiques inline (0.7 volume, replaySpeed 1) sans constantes nommées.
- Types union littéraux (`1 | 2 | 4`, `'auto'|'on'|'off'`) définis inline plutôt qu'exportés/réutilisables par l'UI.

**Améliorations**
- Centraliser toutes les clés de storage dans un `~/utils/storage-keys.ts` (constantes) pour éviter les collisions/typos et documenter la migration.
- Exporter les types (`RevealMode` déjà exporté ; faire de même pour `ReplaySpeed`) pour réutilisation dans les composants.
- Uniformiser le préfixe des clés (choisir pkr_ partout) via une petite couche de migration, ou au minimum documenter le mélange.
- Décider d'une convention unique (setup stores partout de préférence, plus idiomatique Vue 3/Nuxt 4) et homogénéiser le dossier.

#### 🟡 `web/app/stores/wallet.ts` — 53 l.

_Source de vérité unique du solde de pièces avec réconciliation serveur et débits optimistes (reconcile/credit/debit/rollback/confirm)._

**Problèmes DX**
- `source: string` non typé partout (reconcile/credit) : accepte n'importe quelle chaîne, perd l'auto-complétion et laisse diverger les libellés ('auth/me' vs 'hub' etc.).
- `PendingDebit.ref` est une string libre construite ad hoc chez l'appelant (`roll-${Date.now()}`) : la convention de format du ref est implicite et dispersée dans roll.ts, couplage par convention non typé.
- Getter `balance` est un simple alias de `coins` (duplication sémantique) ; deux façons d'accéder à la même donnée sans valeur ajoutée.

**Améliorations**
- Typer `source` avec un union partagé (voir auth) et `ref` avec un type de marque ou un helper `makeDebitRef(kind, id)` centralisé.
- Supprimer le getter `balance` redondant ou documenter clairement pourquoi il existe (façade vs coins nullable).
- Ajouter des tests unitaires : ce store est pur et facilement testable, c'est un bon candidat pour verrouiller la logique optimiste (debit→rollback/confirm).

**Patterns transverses (groupe)**
- Duplication systémique du pattern cache TTL : `fetchedAt`/`biomesFetchedAt`/`shortFetchedAt` + `Date.now() - x < TTL` + `dedupe(...)` réécrit dans hub, roll, collection et inventory (et sous forme de promesse mémoïsée module-level dans auth). Candidat évident à un helper unique `createTtlResource`/`useCachedFetch`.
- Incohérence de style Pinia : preferences est en setup store, les 6 autres en Options API. Choisir une convention unique (setup stores, plus idiomatique Nuxt 4).
- Couplage cross-store non déclaré et omniprésent : auth→wallet, roll→wallet, collection→wallet, inventory→auth. Fonctionne mais crée un graphe de dépendances implicite ; à documenter ou à médiatiser (roll écrit même directement `wallet.coins`, violant l'encapsulation).
- Valeurs magiques métier et de config dispersées et non centralisées : TTL (5*60_000 répété), coûts (BASE_ROLL_COST vs débits 10/20 commentés), seuils de fusion/niveau, formule shiny/500, clés localStorage, préfixes de slug, libellés UI et routes.
- Typage lâche des chaînes de contrôle : `source: string`, `ref: string`, `item_type: string`, `type: string | null` — beaucoup de chaînes libres qui gagneraient à devenir des unions typés et perdent l'auto-complétion.
- Mélange UI/logique/données dans les stores : labels français et routes en dur (hub), navigateTo/useToast (auth), fonctions de calcul pur logées comme actions/getters (estimatedShinyChance, decodeUserId, mergeables) — à extraire en utils/composables testables.
- Gestion d'erreur silencieuse récurrente (`.catch(() => null)`, catch vides) qui nuit à la DX de debug.

**Quick wins (groupe)**
- Créer `~/utils/cache.ts` avec `const RESOURCE_TTL = 5 * 60_000` et remplacer les littéraux 5*60_000 dupliqués (roll, collection, inventory, hub).
- Créer `~/utils/storage-keys.ts` regroupant toutes les clés localStorage (auth + preferences) en constantes nommées.
- Extraire `decodeUserId` (auth) et `estimatedShinyChance` (collection) vers `~/utils/` comme fonctions pures, avec tests unitaires.
- Introduire un type union `SyncSource` et l'appliquer à `wallet.reconcile/credit` et aux appels des autres stores pour supprimer les chaînes magiques.
- Dans roll.ts, remplacer `wallet.coins += outcome.amount` (x2) par `wallet.credit(outcome.amount, 'roll')` pour passer par l'API publique.
- Réutiliser le getter `currentGym` dans `weeklyTiles` (hub) au lieu de recalculer le `find(g => !g.hasBadge)`.
- Nommer le type des items d'inventaire et factoriser un helper `mapTickets(items, prefix, dict)` pour les getters biomeTickets/typeTickets.
- Extraire les préfixes de slug ('tirage_biome_', 'tirage_type_', 'charme_chroma') en constantes dans `~/utils/poke`.


### app/stores (Pinia — logique de jeu gacha)

#### 🔴 `web/app/stores/spin.ts` — 854 l.

_Store options-API du mode Aventure rogue-lite : contient à la fois toutes les données de contenu (starters, arènes, Conseil, gimmicks, événements), le moteur de règles (cotes, XP, évolution, économie de run) et le câblage backend._

**Problèmes DX**
- Fichier « God » massif (854 lignes) : c'est ~10x la taille moyenne des autres stores et il concentre au moins 4 responsabilités distinctes (contenu narratif, table de types/gimmicks, moteur de combat/économie, appels réseau).
- Mélange contenu métier (data) et logique : ~250 lignes de constantes en dur (STARTERS, WILDMON, LEGENDARIES, GYMS, COUNCIL, CHAMPION, EVENTS, dialogues intro/concede/taunt) vivent dans le même fichier que les actions — un changement d'équilibrage ou de texte force à rouvrir le store entier.
- Foisonnement de valeurs magiques dispersées : cotes de base des arènes/Conseil (`gymBase=[86,80,73,...]`, `eBase=[42,38,...]`), gains d'XP/pièces par type de nœud (`champ?90:elite?70:...`), probabilités de loot (`roll<0.35`, `<0.6`), taux légendaire (`25 + losses*5`, transfert `10`), bonus (12, -12, 8, 6, 40...) codées inline dans les actions plutôt que nommées.
- Logique dupliquée du pattern « objet tenu » : la fusion/création de heldItem (`this.heldItem ? {...bonus+N} : {name, bonus}`) est répétée à l'identique dans campForge, merchantItem, merchantBag, applyEvent(search/gamble) avec seuls les nombres qui changent.
- Pattern répété de construction de `lastReward` (kind/title/amount/sub) dans ~20 endroits — aucune factory, chaque récompense recopie la forme de l'objet.
- Getter `chanceFor` = fonction de ~25 lignes avec une cascade de `if/else if` sur les gimmicks (rock/grass/water/electric/fire/ground/poison) : c'est le cœur de l'équilibrage, illisible et non testable isolément (enfoui dans un getter qui retourne une closure).
- Typage lâche par endroits : plusieurs casts `as AdventureMon` / `as StarterOption` / `as AdvNode` (ex. `G[0] as AdvNode`, `s.chain[0] as AdventureMon`) qui masquent des accès potentiellement undefined ; `starterId: '' as string` redondant.
- Couplage fort : le store dépend de battleStore, walletStore, useApi et spinRepo, ET orchestre l'animation de combat (`battle.present`) en construisant les titres/sous-titres d'UI (chaînes avec emojis 👑🏅) — de la présentation dans un store.
- Testabilité faible : les helpers purs et déterministes-clés (typeMod, coverageMod, clampChance, buildNodes, chanceFor) ne sont pas exportés → impossible de les tester unitairement sans instancier tout le store, et l'aléatoire (`pick`, `Math.random`) est appelé en dur, non injectable.

**Améliorations**
- Extraire tout le contenu statique dans des modules data dédiés et typés (ex. app/game/adventure/starters.ts, gyms.ts, council.ts, wildmons.ts, legendaries.ts, events.ts) — le store n'importe plus que des tableaux typés.
- Extraire le moteur de règles pur dans un module sans état (ex. app/game/adventure/odds.ts) exportant typeMod, coverageMod, clampChance, computeChance(state, node), buildNodes(...) — fonctions pures, testables, réutilisables ; le store ne fait qu'appeler.
- Centraliser les constantes d'équilibrage dans un objet `BALANCE` nommé (gymBase, eliteBase, xpByKind, coinsByKind, lootWeights, legendaryRate...) pour rendre le tuning lisible et localisé.
- Introduire une factory `makeReward(kind, title, amount, sub): AdvReward` et un helper `upgradeHeldItem(current, delta, fallback)` pour supprimer la duplication répétée.
- Sortir la construction des libellés d'UI de combat (titres/sous-titres, emojis) vers un composable ou une fonction de présentation, en gardant le store centré sur l'état/les transitions.
- Découper les actions par domaine via des fonctions module externes que les actions délèguent (économie de run : center/merchant/camp), pour ramener le store à un orchestrateur mince.

#### 🔴 `web/app/stores/chat.ts` — 174 l.

_Store du tchat temps réel : gère un WebSocket singleton (module-level) avec historique REST, reconnexion backoff+jitter, purge/ban admin et compteur non-lus._

**Problèmes DX**
- Deuxième plus gros store et seul à porter une logique d'infrastructure lourde (gestion bas niveau du WebSocket, timers de reconnexion) directement dans un store options-API — mélange transport réseau + état applicatif + logique de non-lus.
- État critique du transport (socket, reconnectTimer, reconnectAttempts, manualClose) stocké en variables module hors de Pinia : invisible aux devtools, non réinitialisé par un reset de store, et rend le module non ré-instanciable/non testable (état global partagé).
- Actions préfixées `_` (_loadHistory, _connect, _onFrame, _onClose, _scheduleReconnect) pour simuler du « privé » : convention non standard en Pinia (tout est public de fait) et signalant que ces méthodes gagneraient à sortir du store.
- `_onFrame` fait du parsing/normalisation de frame + logique de dédup + compteur non-lus dans une seule fonction à branches multiples ; les codes de fermeture magiques (4001/4003) et les délais (2500/30000) sont des constantes, mais la sémantique protocolaire est enfouie dans le store.
- Accès direct au DOM/global (`location`, `WebSocket`, `window`) dans le store : couple le store à l'environnement navigateur (mitigé par le guard SSR mais rend le test difficile).

**Améliorations**
- Extraire la mécanique WebSocket (connexion, backoff, parsing de frames) dans un composable/service dédié (ex. useChatSocket) qui expose des événements/callbacks ; le store ne garde que l'état applicatif (messages, unread, status).
- Remonter l'état de transport (status au minimum) dans le state Pinia et éviter les variables module pour l'état observable ; réserver le module aux handles non-sérialisables si nécessaire.
- Nommer les codes de fermeture et délais dans des constantes explicites (CLOSE_BANNED=4003, CLOSE_EXPIRED=4001) déjà partiellement fait — étendre à toute la sémantique.
- Isoler la normalisation de frame (déjà via normalizeChatMessage) et la dédup dans des helpers purs testables.

#### 🟠 `web/app/stores/gyms.ts` — 87 l.

_Store des 8 Arènes : liste + détails/estimations mis en cache par id, statut d'entraînement, actions battle/train synchronisées au solde._

**Problèmes DX**
- `refreshBalance` dupliqué (identique à team.ts et tournament.ts) — même appel `/auth/me` en dur.
- `ensureFresh` déclenche `refreshTraining()` en fire-and-forget (non attendu), pattern implicite d'effets de bord en cascade récurrent dans plusieurs stores (cf. leaderboard/slot/tournament) sans convention claire.
- Caches `details`/`estimates` en Record sans invalidation TTL propre : `loadDetail` renvoie le cache indéfiniment (pas de fraîcheur), alors que `gyms` a un TTL — incohérence de stratégie de cache au sein du même store.
- `TOTAL_GYMS = 8` exporté mais non utilisé dans ce fichier (constante métier posée là où elle n'est pas consommée).

**Améliorations**
- Mutualiser `refreshBalance` (voir team.ts).
- Documenter/normaliser la stratégie de cache par sous-ressource (TTL vs cache permanent) ou aligner details/estimates sur le même mécanisme dedupe/TTL que la liste.
- Vérifier l'usage de TOTAL_GYMS et le colocaliser avec son consommateur (ou un module de constantes de jeu) s'il sert ailleurs.

#### 🟠 `web/app/stores/trades.ts` — 82 l.

_Store des échanges entre joueurs : liste/éligibilité/joueurs en cache, getters de tri par statut, actions create/respond/confirm/cancel._

**Problèmes DX**
- Getters `toHandle`/`waiting` appellent `useAuthStore().userId` à chaque évaluation et dupliquent une logique de statut proche (mêmes statuts, initiator/target inversés) — la règle « à qui le tour » est éclatée en deux filtres jumeaux difficiles à garder cohérents.
- Les 4 mutations (create/respond/confirm/cancel) répètent le pattern `await repo.x(...) ; await this.ensureFresh(true)` — duplication du refresh post-mutation commune à la majorité des stores.
- `playerCards` expose directement le repository (retourne la promesse du repo sans passer par l'état) : mélange léger des rôles store/repo côté appelant.
- Constante métier `TRADE_MIN_CARDS = 120` posée ici mais non consommée dans le fichier (valeur d'affichage/garde vivant loin de son usage).

**Améliorations**
- Extraire un helper pur `pendingSide(trade, me)` ou un enum de rôle pour unifier toHandle/waiting et supprimer la logique jumelle.
- Mémoïser `me` en tête de getter (déjà fait) et envisager de dériver un seul getter catégorisant chaque trade (mine/theirs/history) plutôt que trois filtres indépendants.
- Envelopper les mutations dans un helper `mutate(fn)` commun (await + ensureFresh(true)).

#### 🟠 `web/app/stores/team.ts` — 73 l.

_Store de l'équipe (roster de 6) : lecture avec cache TTL/dedupe et actions roll/remove/swap/clear synchronisées au backend._

**Problèmes DX**
- Duplication transverse : le trio pattern `invalidate() → ensureFresh(true)` est répété dans roll/remove/clear/swap, et `refreshBalance()` (fetch `/auth/me` + reconcile wallet) est copié à l'identique dans team/gyms/tournament.
- `refreshBalance` fait un appel HTTP brut `useApi()<{user:{coins:number}}>('/auth/me')` en dur dans le store plutôt que de passer par un repository comme le reste des accès — incohérence d'accès données.
- Couplage implicite via auto-imports (useCollectionStore, useWalletStore, useApi) non importés explicitement : pratique Nuxt valide mais rend les dépendances inter-stores invisibles à la lecture.

**Améliorations**
- Factoriser `refreshBalance` dans un composable/util partagé (ex. useWalletSync() ou walletStore.syncFromMe()) réutilisé par team/gyms/tournament au lieu de trois copies.
- Router l'appel `/auth/me` via un authRepo/walletRepo pour homogénéiser la couche données.
- Éventuel helper `withRefresh(fn)` interne pour encapsuler le pattern invalidate+ensureFresh(true) commun aux mutations.

#### 🟠 `web/app/stores/league.ts` — 60 l.

_Store de la Ligue des 4 : statut hebdo/estimation en cache, défi (1/sem) et choix de récompense (pièces ou capture légendaire)._

**Problèmes DX**
- Incohérence de pattern de cache : ce store n'utilise PAS `dedupe(...)` alors que team/gyms/slot/trades/tournament/leaderboard l'utilisent systématiquement pour ensureFresh — divergence non justifiée.
- `legendaryOdds` retourne un `Promise.reject(new Error(...))` avec message en français en dur (chaîne UI dans la couche store) au lieu d'un type d'erreur/état structuré.
- Mutation directe d'un champ imbriqué du statut serveur (`this.status.alreadyAttempted = true`) : couplage à la forme exacte du DTO backend depuis une action.
- Absence de gestion d'erreur/`try-catch` sur ensureFresh/loadEstimate contrairement à d'autres stores (ex. tournament.loadAnalysis, slot.loadRecentWins) — incohérence de robustesse.

**Améliorations**
- Aligner ensureFresh/loadEstimate sur `dedupe(...)` comme les stores voisins pour un comportement de cache homogène.
- Remplacer le reject avec chaîne UI par une garde côté appelant ou un état `run` requis typé, en laissant la traduction à la couche présentation.
- Uniformiser la politique try-catch/silencieux entre les stores de jeu (convention explicite).

#### 🟠 `web/app/stores/tournament.ts` — 50 l.

_Store du Tournoi hebdo : tournoi courant + analyse en cache, inscription payante et resync du solde._

**Problèmes DX**
- `refreshBalance` dupliqué (3e copie identique après team.ts et gyms.ts) — appel `/auth/me` en dur.
- `ensureFresh` enchaîne `loadAnalysis()` en fire-and-forget selon `isRegistered` — même pattern d'effet de bord implicite que gyms/leaderboard, sans convention partagée.
- Commentaire de règle métier (`débite 20 🪙, fenêtre lundi → mardi 12:00`) encode une constante temporelle en prose sans constante correspondante, alors que `TOURNAMENT_ENTRY_FEE = 20` existe — la fenêtre horaire, elle, n'est nulle part typée.

**Améliorations**
- Mutualiser `refreshBalance` (voir team.ts).
- Adopter une convention explicite pour les chargements secondaires non bloquants (nommage `void this.loadX()` ou méthode `hydrate()` dédiée) partagée entre stores.

#### 🟡 `web/app/stores/battle.ts` — 53 l.

_Store de service pour l'overlay de combat plein écran : present(config) affiche la scène et retourne une promesse résolue à la fermeture._

**Problèmes DX**
- Le `resolver` de promesse est un singleton au niveau module (variable `let resolver`) hors de l'état Pinia : un second `present()` avant `close()` écrase silencieusement le premier resolver → couplage caché et non observable via devtools.
- Mélange léger de préoccupations : le store définit aussi les interfaces d'entrée d'UI (BattleStageInput, BattleConfig) qui contiennent des champs purement présentation (titles/sub, badgeUrl, themeColor) — acceptable mais lie fort le store à la forme du composant BattleScene.
- Aucun garde-fou si `present` est appelé alors qu'un combat est déjà `active` (pas de file ni de rejet).

**Améliorations**
- Documenter/garantir l'usage séquentiel (un combat à la fois) ou gérer explicitement le cas ré-entrant (rejeter/chaîner) pour rendre le contrat robuste.
- Déplacer les interfaces BattleConfig/StageInput dans un module types partagé si BattleScene et les stores appelants (spin/gyms/league) les consomment, pour clarifier le contrat UI.

#### 🟡 `web/app/stores/slot.ts` — 43 l.

_Store du Jackpot (machine à sous) : statut journalier + gains récents en cache, action spin qui reconcilie le solde._

**Problèmes DX**
- Valeurs de coûts/modes décrites uniquement en commentaire (`mode 2 = 3 lignes (5🪙), 3 = 3+diag (10🪙)`) : règles métier non typées ni exportées, seul le type littéral `1|2|3` existe.
- `ensureFresh` déclenche `loadRecentWins()` en fire-and-forget (même pattern d'effet de bord implicite que gyms/tournament/leaderboard).
- Mutation optimiste directe `this.status.canSpin = false` en supposant la forme du DTO — couplage au shape backend depuis l'action (récurrent : cf. league.status.alreadyAttempted).

**Améliorations**
- Typer les modes de jeu (nom + coût + lignes) dans une petite table `SLOT_MODES` exportée plutôt qu'en commentaire.
- Standardiser les chargements secondaires non bloquants (convention partagée avec les autres stores).

#### 🟡 `web/app/stores/leaderboard.ts` — 43 l.

_Store du classement : données principales + feed shiny (arrière-plan) et liste de tricheurs (chargée à la demande), avec barème de score exposé._

**Problèmes DX**
- `SCORE_RULES` (barème de points) est une donnée de contenu/affichage vivant dans le store ; commentaire indique qu'il duplique le « Guide » — risque de divergence avec une source de vérité ailleurs.
- Le chargement du feed shiny utilise un `.then().catch(()=>{})` inline dans ensureFresh (style différent du try-catch async utilisé partout ailleurs) — incohérence stylistique de gestion d'erreur.
- Deux stratégies de fraîcheur cohabitent : TTL pour data, flag booléen one-shot `cheatersFetched` pour cheaters — pattern « fetch once » non partagé/formalisé.

**Améliorations**
- Déplacer SCORE_RULES vers un module de constantes de jeu partagé (source unique consommée par le store ET le Guide).
- Homogénéiser le style de gestion d'erreur des chargements secondaires (await+try/catch) sur l'ensemble des stores.
- Formaliser un petit helper `fetchOnce(flag, fn)` pour les ressources chargées une seule fois.

#### 🟡 `web/app/stores/stats.ts` — 22 l.

_Store des statistiques globales : un seul gros payload agrégé mis en cache avec TTL long (120s)._

**Problèmes DX**
- Incohérence mineure : n'utilise pas `dedupe(...)` pour son ensureFresh alors que la plupart des autres stores l'utilisent (comme league.ts) — un simple appel repo direct.
- Le TTL (120_000) est une constante locale par fichier ; tous les stores redéfinissent leur propre `const TTL` (60_000 le plus souvent) — pas de source commune pour ces durées.

**Améliorations**
- Aligner sur dedupe si la déduplication de requêtes concurrentes est souhaitée ici aussi.
- Centraliser les TTL (ex. constants/cache.ts : SHORT=60s, LONG=120s) pour éviter les magic numbers répétés dans chaque store.

**Patterns transverses (groupe)**
- Deux stores « God » sortent du lot (spin.ts ~854 loc, chat.ts ~174 loc) et concentrent plusieurs responsabilités, tandis que les 9 autres sont des stores CRUD-cache courts et homogènes (20–90 loc) : la dette est très concentrée.
- Duplication systémique de `refreshBalance()` : appel HTTP brut identique à `/auth/me` + wallet.reconcile copié-collé dans team, gyms et tournament (et la logique de resync du solde éparpillée dans slot/spin autrement) — candidat évident à une extraction unique.
- Pattern de mutation répété `await repo.x(...) → invalidate()/ensureFresh(true)` dans presque toutes les actions d'écriture (team, trades, gyms, tournament) sans helper commun.
- Chaque store redéclare sa propre `const TTL` (60_000 / 120_000) et son propre schéma de cache (TTL vs flag one-shot `xFetched` vs cache permanent en Record), sans source ni convention partagée.
- Incohérence d'usage de `dedupe(...)` : présent dans team/gyms/slot/trades/tournament/leaderboard, absent dans league et stats sans raison apparente.
- Effets de bord secondaires en fire-and-forget lancés depuis ensureFresh (refreshTraining, loadRecentWins, loadAnalysis, feed shinies) avec des styles de gestion d'erreur divergents (try/catch async vs .then().catch(()=>{})).
- Mélange données de contenu/barème et logique : constantes de jeu et textes (SCORE_RULES, tout le contenu de spin.ts, règles de coûts en commentaire dans slot) vivent dans les stores plutôt que dans des modules data typés colocalisés par feature.
- Couplage au shape des DTO backend via mutations imbriquées directes (league.status.alreadyAttempted, slot.status.canSpin) et un appel `/auth/me` non passé par un repository.
- État non-Pinia au niveau module pour la mécanique réseau (resolver dans battle, socket/timers dans chat) : invisible aux devtools et difficile à tester.

**Quick wins (groupe)**
- Extraire un unique `syncBalanceFromMe()` (composable ou action walletStore) et remplacer les 3 copies de refreshBalance dans team/gyms/tournament — suppression pure de duplication, comportement inchangé.
- Centraliser les TTL dans un module partagé (ex. app/constants/cache.ts : CACHE_TTL_SHORT=60_000, CACHE_TTL_LONG=120_000) et importer partout au lieu des `const TTL` locaux.
- Aligner league.ts et stats.ts sur `dedupe(...)` comme les autres stores pour une stratégie de cache homogène.
- Router l'appel `/auth/me` (refreshBalance) et l'appel wallet via un repository dédié plutôt qu'un `useApi()<...>()` brut, pour homogénéiser la couche données.
- Dans spin.ts, introduire une factory `makeReward(...)` et un helper `upgradeHeldItem(...)` pour éliminer ~25 constructions d'objets récupérables et la fusion d'objet tenu répétée — refactor mécanique sûr.
- Extraire les helpers purs de spin.ts (typeMod, coverageMod, clampChance, buildNodes, computeChance) dans un module `game/adventure/odds.ts` exporté et testable, sans toucher au comportement.
- Homogénéiser le style des chargements secondaires non bloquants (await+try/catch) : convertir le `.then().catch(()=>{})` de leaderboard.ts au même pattern que slot/gyms.
- Typer les modes du jackpot (SLOT_MODES avec coût/lignes) au lieu du commentaire, à partir du type littéral 1|2|3 déjà présent.
- Renommer/documenter la contrainte 'un combat à la fois' de battle.ts (ou garder le resolver dans un état plus visible) pour clarifier le contrat.


### app/composables + app/utils (audio, moteur roulette, célébration, viewport, thème carte, utilitaires)

#### 🔴 `web/app/composables/useSpinAudio.ts` — 222 l.

_Moteur audio chiptune complet (musique bouclée multi-thèmes + percussions + SFX + mute persistant) pour le mode Spin/Aventure._

**Problèmes DX**
- Fichier « God » : ~220 lignes mêlant données musicales (partitions ADVENTURE/BATTLE/BOSS/EVOLVE), parseur de notation (m/seq), synthèse audio (tone/noise), ordonnanceur temps réel (scheduler/setInterval), table de SFX et persistance localStorage — au moins 5 responsabilités distinctes dans un seul fichier.
- Duplication du socle audio avec useSound.ts (AudioContext singleton, détection webkit, synthèse d'oscillateur, mute) : deux moteurs à maintenir en parallèle.
- Gestion du mute par localStorage direct (clé 'spin_muted' en dur) et ref module-level muted, alors que useSound passe par le store preferences : deux stratégies de préférences incohérentes, source de vérité éclatée.
- Casts répétés (v.bass[i] as number, musicGain as GainNode, sfxGain as GainNode) et accès index non gardés révélant un typage lâche autour des tableaux de partition.
- Nombreuses constantes magiques (0.5, 0.55, 0.9 gains ; 0.12 lookahead ; 25 ms d'intervalle ; multiplicateurs de durée 1.8/0.9/1.6) sans nommage ni regroupement.
- État global mutable au niveau module (ctx, timer, stepIdx, nextTime, current...) : composable non isolable/non testable, effets de bord partagés entre tous les appelants.

**Améliorations**
- Découper par responsabilité : (1) un module de partitions/data (tracks.ts), (2) un parseur de notation (noteParser.ts), (3) un moteur de synthèse (audioEngine.ts partagé avec useSound), (4) un ordonnanceur, (5) une table SFX. Le composable ne devient qu'une façade fine.
- Fusionner le socle AudioContext avec useSound (voir sa suggestion) : une seule source de vérité pour le contexte et le mute.
- Router le mute/volume via le store preferences plutôt que localStorage direct, en supprimant la clé en dur.
- Typer strictement les partitions (readonly number[] de longueur steps) pour éliminer les casts 'as number'.
- Regrouper les constantes de mixage et de timing dans un objet AUDIO_CONFIG nommé.

#### 🔴 `web/app/composables/useSound.ts` — 87 l.

_Moteur audio chiptune (Web Audio) pour ticks et fanfares de célébration, piloté par le store preferences._

**Problèmes DX**
- Duplication forte avec useSpinAudio.ts : deux singletons AudioContext concurrents, deux implémentations de ensureCtx/ensure, de la détection webkitAudioContext, de la synthèse d'oscillateurs (tone/arc). Deux systèmes audio parallèles = double source de vérité pour le mute/volume.
- État singleton au niveau module (ctx, master) mêlé à un composable qui lit le store : la fonction ensureCtx prend volume/muted en paramètres alors que le reste lit prefs, incohérence de flux de données.
- Cast unknown as { webkitAudioContext } et valeurs magiques d'enveloppe (0.12, 0.007, 0.11, 0.1, 0.065, 1100 Hz...) disséminées sans constantes nommées.
- Table FANFARES en fréquences brutes (Hz) alors que useSpinAudio raisonne en MIDI : deux conventions de notes différentes dans la même codebase.

**Améliorations**
- Fusionner useSound et useSpinAudio en un seul moteur audio partagé (un AudioContext, une primitive tone/oscillator, une source de vérité mute/volume), puis exposer deux façades (celebration vs spin) au-dessus.
- Extraire une primitive commune synth (ensureContext, oscillator envelope) dans un module utilitaire pur, réutilisée par les deux façades.
- Nommer les constantes d'enveloppe et de fréquence (TICK_FREQ, TICK_VOL, ATTACK...) pour les rendre lisibles et cohérentes.
- Unifier la convention de notes (tout en MIDI via un helper) entre les deux moteurs.

#### 🟠 `web/app/composables/useRouletteEngine.ts` — 82 l.

_Moteur d'animation de la bande de roulette : construit la strip, calcule l'offset cible et pilote l'état idle/spinning/revealed sans toucher au DOM._

**Problèmes DX**
- Constantes magiques en dur (STRIP_SIZE 20, WIN_INDEX 16, SPIN_MS 4000, REDUCED_MS 600, JITTER_PX 40, marge +60 ms) non regroupées dans un objet de config nommé ni exportées pour réutilisation/test.
- spin() renvoie une Promise construite manuellement avec double requestAnimationFrame + setTimeout : mélange orchestration temporelle et calcul de géométrie, difficile à tester unitairement (dépend de window, rAF, timers réels).
- Dépendance directe à window (window.setTimeout) et à Math.random dans targetOffset : couplage à l'environnement navigateur et non-déterminisme non injecté, testabilité faible.
- buildStrip mute strip.value par effet de bord tandis que targetOffset est pur : responsabilités mêlées (état réactif + calcul géométrique pur) dans le même composable.

**Améliorations**
- Extraire les constantes dans un objet ROULETTE_CONFIG exporté (ou options avec valeurs par défaut) pour les rendre testables et ajustables.
- Isoler le calcul géométrique pur (buildStrip, targetOffset, pitch) dans un module utilitaire testable sans Vue, en injectant random via les options.
- Injecter un ordonnanceur (raf/setTimeout) via options pour permettre le test déterministe de spin(), et remplacer window.setTimeout par setTimeout auto-importable côté SPA.
- Documenter le contrat de sortie (offset px à binder en transform, durationMs en transition) via des types/JSDoc sur le retour.

#### 🟠 `web/app/utils/paris-time.ts` — 82 l.

_Calcul DST-safe des instants de reset (quotidien/hebdomadaire) en heure civile Europe/Paris via Intl._

**Problèmes DX**
- Deux constructeurs Intl.DateTimeFormat quasi identiques (parisOffsetMinutes et parisParts) recréés à chaque appel : duplication de configuration et coût de recréation, pas de cache du formateur.
- Construction manuelle de maps depuis formatToParts avec assertions non-null (map.year!, map.hour!...) répétées : typage lâche autour d'un parsing fragile.
- Tableau des jours ['Sun','Mon',...] et logique ISO weekday en dur dans parisParts : constante magique non nommée.
- Fichier globalement dense (logique temporelle pointue) mais correctement à responsabilité unique ; la duplication des formateurs est le principal point DX.

**Améliorations**
- Factoriser un unique formateur Intl mémoïsé (ou deux constantes module-level réutilisées) au lieu de les reconstruire à chaque appel.
- Extraire un helper partsToMap<T> typé pour éviter la répétition du remplissage de map et les assertions non-null.
- Nommer le tableau des abréviations de jours en constante (WEEKDAY_ABBR) et isoler la conversion en ISO weekday.
- Ajouter des tests unitaires autour des bascules DST (mars/octobre) — la logique est critique et actuellement peu couverte structurellement.

#### 🟠 `web/app/utils/cardTheme.ts` — 65 l.

_Tokens de présentation de la carte (dégradés par type, méta de rareté, holo, HP cosmétique, labels de stade)._

**Problèmes DX**
- Mélange de données de thème (tables TYPE_GRADIENT, RARITY_META) et de logique (hexA conversion couleur, cosmeticHp calcul dérivé) dans un même fichier utilitaire présentation.
- Valeurs magiques dans cosmeticHp (base par rareté + (num*7)%25) et hexA (opérations de bits) sans explication du barème au-delà du commentaire, testabilité correcte mais lisibilité perfectible.
- hexA est un utilitaire couleur générique qui n'a rien de spécifique à la carte : mal colocalisé (devrait vivre dans un util couleur partagé).
- Duplication de labels : RARITY_META[*].label répète les mêmes chaînes que RARITY_LABEL dans poke.ts (deux sources de vérité pour le libellé de rareté).

**Améliorations**
- Déplacer hexA vers un module utils/color.ts réutilisable, séparant l'utilitaire couleur générique des tokens de carte.
- Faire dériver RARITY_META.label de la source unique RARITY_LABEL (poke.ts) pour supprimer la duplication de libellés.
- Extraire les constantes numériques de cosmeticHp (multiplicateur 7, modulo 25) en constantes nommées pour documenter le barème décoratif.
- Envisager de scinder tokens purs (data) et helpers dérivés (fonctions) si le fichier grossit.

#### 🟠 `web/app/utils/poke.ts` — 42 l.

_Correspondances métier partagées (biomes, types, slugs, labels de rareté, prix de vente)._

**Problèmes DX**
- Deux tables inverses maintenues à la main (BIOME_SLUGS et BIOME_SLUG_TO_NAME) : source de vérité dupliquée, risque de désynchronisation lors d'ajout d'un biome.
- TYPE_SLUG_TO_NAME liste 15 types alors que cardTheme.TYPE_GRADIENT en liste 16 (Fée présent dans l'un, absent de l'autre) : incohérence de couverture entre deux fichiers, symptôme de tables non dérivées d'une source unique.
- RARITY_LABEL duplique les libellés déjà présents dans RARITY_META (cardTheme.ts) : deux sources de vérité pour le label de rareté.
- typeSlug utilise un range Unicode brut dans le replace pour retirer les diacritiques ; peu lisible/fragile visuellement (dépend de l'encodage du fichier).

**Améliorations**
- Dériver BIOME_SLUG_TO_NAME depuis BIOME_SLUGS (ou inversement) via une inversion programmatique pour une seule source de vérité.
- Aligner la couverture des types entre poke.ts et cardTheme.ts (idéalement une liste canonique de PokeType d'où découlent slugs et gradients).
- Unifier RARITY_LABEL et RARITY_META.label en une seule constante importée.
- Utiliser \p{Diacritic} (regex unicode) ou un commentaire explicite pour la suppression d'accents dans typeSlug afin de la rendre lisible.

#### 🟡 `web/app/utils/slot.ts` — 46 l.

_Configuration et barème de la machine à sous Jackpot (symboles, lignes de paie, mises, probabilités)._

**Problèmes DX**
- Probabilités et récompenses (SLOT_ODDS) codées en dur côté front : duplication potentielle du barème serveur (le commentaire dit « repris du Guide/backend »), risque de divergence silencieuse avec la source d'autorité.
- Chaînes de récompense en français en dur dans SLOT_ODDS (mélange données de barème + libellés de présentation).
- Cellules LINE_CELLS encodées en chaînes 'col_row' ('0_top') plutôt qu'en structures typées : parsing implicite requis côté conscommateur, typage lâche.
- Coûts de mise (0/5/10) et labels en dur dans BET_TIERS sans lien avec une source de config partagée.

**Améliorations**
- Documenter/valider que SLOT_ODDS reflète le backend (ou le récupérer de l'API) pour éviter la divergence de barème.
- Séparer les libellés de récompense (présentation) des probabilités (donnée) ou les typer via une clé i18n.
- Remplacer les cellules 'col_row' par des objets typés { col: number, row: 'top'|'mid'|'bot' } pour supprimer le parsing de chaîne.
- Fichier bien colocalisé et à responsabilité unique ; changements surtout autour du typage et de la source de vérité du barème.

#### 🟡 `web/app/composables/useViewportLock.ts` — 39 l.

_Verrou de gouttière de scrollbar par comptage de références pour éviter la bande claire sous les overlays plein écran._

**Problèmes DX**
- Nom de classe CSS 'viewport-locked' en dur, couplage implicite avec main.css sans constante partagée ni référence typée.
- Compteur global module-level (locks) manipulant document.documentElement : logique correcte mais accès DOM direct rendant le composable difficile à tester isolément.
- Pas de garde SSR explicite sur document (acceptable en ssr:false mais fragile si le contexte change).

**Améliorations**
- Extraire le nom de classe dans une constante partagée (ex. VIEWPORT_LOCK_CLASS) importée aussi côté style/documentation pour éviter la désynchronisation silencieuse.
- Ajouter un commentaire/typage sur l'invariant du compteur et éventuellement une garde import.meta.client pour l'explicite.
- Composable propre et à responsabilité unique dans l'ensemble : peu de changements nécessaires.

#### 🟡 `web/app/composables/useCelebration.ts` — 27 l.

_Dérive le palier de célébration (tier) d'une carte et déclenche la fanfare correspondante._

**Problèmes DX**
- Cascade de if/return pour tierFor et liste en dur dans isFullscreen : la logique de mapping rareté→tier est du savoir métier codé en impératif, non piloté par une table (couplage aux littéraux 'Légendaire', 'Épique'...).
- isFullscreen liste manuellement les tiers plein écran ; toute nouvelle valeur de CelebrationTier oblige à penser à mettre à jour cette fonction (pas d'exhaustivité garantie).
- celebrate() n'est qu'un passe-plat vers sound.fanfare(tier), responsabilité floue entre ce composable et useSound.

**Améliorations**
- Remplacer la cascade tierFor par une table de correspondance ou un ordre de priorité déclaratif, et isFullscreen par un Set/Record<CelebrationTier, boolean> pour forcer l'exhaustivité via le typage.
- Extraire les seuils (quels tiers sont plein écran, quels tiers déclenchent quelle intensité) dans une constante colocalisée avec le type CelebrationTier.
- Clarifier la frontière : soit celebrate orchestre plusieurs effets (son + overlay + haptique), soit le supprimer au profit d'un appel direct à useSound.

#### 🟡 `web/app/utils/errors.ts` — 21 l.

_Transforme une erreur (FetchError/Error) en message utilisateur en français._

**Problèmes DX**
- Messages utilisateur en dur dans la fonction (i18n impossible sans refactor) : chaînes de présentation mêlées à la logique de classification d'erreur.
- Codes de statut magiques (500, 404) et seuils dispersés dans les if sans table de correspondance ; ajout d'un nouveau cas = nouvelle branche.
- Cast err.data as ApiError | undefined : typage lâche autour du payload d'erreur, acceptable mais non gardé.

**Améliorations**
- Externaliser les messages dans un dictionnaire (constante ou i18n) séparé de la logique de mapping statut→clé.
- Remplacer la cascade de statuts par une petite table statut→messageKey pour l'extensibilité.
- Ajouter une garde de forme sur err.data plutôt qu'un cast direct (fonction de type guard isApiError).

#### 🟡 `web/app/utils/dedupe.ts` — 15 l.

_Déduplication des requêtes GET simultanées via une map de promesses in-flight._

**Problèmes DX**
- Map globale au niveau module partagée par tout le runtime : en SPA c'est acceptable, mais aucun mécanisme d'expiration/annulation et cast 'as Promise<T>' non typé sur la valeur récupérée (unknown → T sans garde).
- Le typage stocke Promise<unknown> puis re-cast à la lecture : perte de sûreté de type si deux clés identiques renvoient des T différents (aucune garantie de cohérence).

**Améliorations**
- Rendre le cache générique par instance (factory createDeduper) plutôt qu'un singleton module, pour l'isolation en test et la réinitialisation.
- Documenter l'hypothèse « une clé ⇒ un type de retour stable » ou encoder le type via une map typée pour réduire le cast.
- Fichier petit et à responsabilité unique : peu de risque, changements optionnels.

#### 🟡 `web/app/composables/useApi.ts` — 5 l.

_Raccourci d'accès à l'instance $fetch typée injectée par le plugin api.ts._

**Problèmes DX**
- Wrapper d'une seule ligne autour de useNuxtApp().$api : couche d'indirection dont la valeur ajoutée est faible tant qu'elle n'apporte pas de typage ou de garde supplémentaire.
- Aucune annotation de type de retour explicite : le type de $api dépend entièrement de l'augmentation dans le plugin, couplage implicite non visible depuis ce fichier.

**Améliorations**
- Ajouter un type de retour explicite (ex. ReturnType du plugin ou un alias ApiClient) pour rendre le contrat visible et faciliter le mock en test.
- Documenter en une ligne d'où vient $api (référence au plugin) pour l'auto-import ; sinon envisager de consommer directement useNuxtApp().$api aux points d'appel si le wrapper n'apporte rien.

**Patterns transverses (groupe)**
- Deux moteurs audio parallèles (useSound.ts et useSpinAudio.ts) dupliquent tout le socle Web Audio : singleton AudioContext, détection webkitAudioContext, synthèse d'oscillateur et gestion du mute — avec en plus deux stratégies de préférences incohérentes (store preferences vs localStorage direct) et deux conventions de notes (Hz vs MIDI).
- Sources de vérité dupliquées entre fichiers de constantes : labels de rareté (RARITY_LABEL dans poke.ts vs RARITY_META.label dans cardTheme.ts), tables biome inverses maintenues à la main, et couverture divergente des PokeType entre poke.ts (15) et cardTheme.ts (16, avec Fée).
- État mutable au niveau module (locks, ctx, timer, inFlight, muted) omniprésent dans composables et utils : correct pour une SPA mais nuit systématiquement à la testabilité et à l'isolation (pas de reset, pas d'injection).
- Constantes magiques non nommées récurrentes : géométrie de roulette, enveloppes/gains audio, gains de mixage, seuils de statut HTTP, multiplicateurs de HP cosmétique — peu regroupées dans des objets de config nommés.
- Typage lâche localisé : casts 'as' répétés (webkitAudioContext, GainNode, Promise<T>, ApiError, partitions 'as number') et assertions non-null en série dans le parsing Intl, là où des type guards ou des types stricts élimineraient le risque.
- Mélange présentation/logique/données dans certains utils : messages FR en dur (errors, slot), libellés dans les tables de données, et helpers génériques (hexA couleur) mal colocalisés dans des modules feature.
- Bonne discipline générale par ailleurs : responsabilités globalement uniques par fichier, moteur de roulette découplé du DOM, composables courts (useApi, useViewportLock, useCelebration), commentaires explicatifs de qualité.

**Quick wins (groupe)**
- Extraire les constantes magiques du moteur roulette dans un objet ROULETTE_CONFIG exporté (aucun changement de comportement).
- Dériver BIOME_SLUG_TO_NAME depuis BIOME_SLUGS par inversion programmatique pour supprimer la table dupliquée.
- Unifier le label de rareté en une seule source (RARITY_LABEL) et faire pointer RARITY_META.label dessus.
- Déplacer hexA vers un utils/color.ts générique et remplacer isFullscreen (useCelebration) par un Record<CelebrationTier, boolean> pour l'exhaustivité typée.
- Aligner la liste des PokeType entre poke.ts et cardTheme.ts (ajouter/retirer Fée de façon cohérente, idéalement depuis une liste canonique).
- Mémoïser les Intl.DateTimeFormat de paris-time.ts au niveau module au lieu de les recréer à chaque appel.
- Externaliser les messages FR de errors.ts dans un dictionnaire séparé et remplacer la cascade de statuts par une petite table statut→message.
- Extraire un VIEWPORT_LOCK_CLASS partagé pour supprimer le nom de classe CSS en dur couplé à main.css.


### app/pages (jeu gacha Pokémon)

#### 🔴 `web/app/pages/play.vue` — 713 l.

_Page « Ouverture de booster » orchestrant les 3 phases (idle/opening/reveal), l'ouverture simple, l'ouverture ×5, les tickets, le charme et les choix d'événement._

**Problèmes DX**
- Fichier « God » : ~310 lignes de script orchestrant tirage simple, tirage batch, choix simples, choix de batch, tickets, charme, shiny, synchronisation solde/collection/inventaire — au moins 6 responsabilités dans une seule page.
- Mélange des préoccupations : accès données direct (`eventRepo.confirmCardChoice(useApi(), …)` dans pickChoice/pickBatchChoice, `useApi()<{user}>('/auth/me')` dans refreshBalance) au milieu de la logique UI d'une page.
- refreshBalance() réimplémente à la main un fetch `/auth/me` + `wallet.reconcile` au lieu de passer par une méthode dédiée du walletStore : logique data dupliquée et couplée à la forme de la réponse API.
- Duplication forte entre open() et open5() : mêmes resets d'état (outcome/resolvedCard/errorMsg/phase), même pattern `Promise.all([roll, wait(orbitMs)])`, mêmes messages « il te manque X pièce(s) », mêmes refreshCollection/refreshBalance.
- Duplication entre pickChoice() et pickBatchChoice() : même séquence confirmCardChoice → celebrate → refreshCollection → refreshBalance → gestion resolving/erreur.
- qtyFor() et le `qtyOf` interne de buildTiles() calculent tous deux la quantité résultante depuis collection.cards : même règle métier écrite deux fois.
- Valeurs magiques : BATCH_SIZE=5, REVEAL_MS {3000,1400,60}, orbit fallback 60, `TIER_ORDER` en dur — l'ordre des tiers redéfini ici en `string[]` alors qu'un type/const de rareté existe sûrement côté domaine.
- Typage lâche / casts : `prefs.selectedBiome as Biome` (deux fois), `biome as string` implicite via `string | null`, `TIER_ORDER` non typé sur le type de tier réel (indexOf sur string).
- Logique de célébration métier (celebrateBest via TIER_ORDER.indexOf) codée dans la page : devrait vivre dans useCelebration.
- Le CSS `.coin` (dégradé radial doré) est redéfini ici et réapparaît quasi identique dans rules.vue et le rendu solde — pastille pièce non factorisée en composant.

**Améliorations**
- Extraire un composable useBooster() (ou useBoosterOpening) portant phase, outcome, resolvedCard, batchTiles, open(), open5(), pickChoice(), pickBatchChoice(), finish() — la page ne garderait que le binding template.
- Factoriser la synchro post-tirage dans le store : une méthode wallet.refreshFromMe() (fetch /auth/me + reconcile) et un helper syncAfterRoll() réutilisés par open/open5/pick*.
- Fusionner open() et open5() autour d'un helper interne guard/reset + Promise.all(roll, wait) paramétré par la taille du lot ; idem pour un seul resolveChoice(choiceId, cardId) partagé par les deux pick*.
- Centraliser BATCH_SIZE, REVEAL_MS, l'ordre des tiers et BASE_ROLL_COST dans stores/roll (ou un module constants) et les importer, plutôt que redéfinir TIER_ORDER en dur.
- Extraire un helper de pluralisation (ex. plural(n, 'pièce')) pour supprimer les `n > 1 ? 's' : ''` répétés dans les messages.
- Sortir la pastille pièce en composant <CoinPip/> partagé (play, rules, settings) et typer boosters/BoosterOption via les types du rollStore pour éliminer les casts `as Biome`.

#### 🟠 `web/app/pages/index.vue` — 500 l.

_Landing page publique (vitrine marketing) : hero, chips, 4 sections features avec mockups téléphone et cartes holo live._

**Problèmes DX**
- Fichier volumineux (500 lignes, ~430 de template+CSS) : 4 sections features quasi identiques (copy + media) répétées à la main en markup au lieu d'être générées par boucle sur des données.
- toCard() reconstruit des DomainOwnedCard à partir de Sample avec des champs bidons (`parentCardId:''`, `standardId:null`, `id = name+'-s'`) — fabrication d'objets de domaine dans la page à des fins de démo, couplage fragile au type domaine.
- Données de démo (heroCard, collectionSamples, chips) codées en dur au milieu de la vitrine ; couleurs des chips en hex dispersées.
- Duplication structurelle : chaque `.lp-feat` répète tag/h2/p/ul/li + `.lp-phone > .lp-phone__scr > img` — un composant FeatureSection piloté par props éliminerait des dizaines de lignes.
- Valeurs en dur dans le template (`:cost="10"` du BoosterPack de démo) sans lien avec BASE_ROLL_COST utilisé ailleurs.
- Palette locale redéfinie dans `.lp { --teal/--green/--gold/--purple/--blue }` avec des hex qui doublonnent ceux des chips et d'autres pages.

**Améliorations**
- Extraire un composant <LandingFeature :tag :title :points :media :reversed/> et rendre les 4 sections par v-for sur un tableau de données features typé.
- Déplacer les échantillons de démo (heroCard, collectionSamples, chips) et le mapping toCard dans un module ~/content/landing.ts ; envisager un type dédié SampleCard plutôt que de forger des DomainOwnedCard partiels.
- Centraliser la palette d'accents (teal/green/gold/purple/blue) dans les tokens de thème globaux et y référer, au lieu de la redéclarer localement.
- Réutiliser BASE_ROLL_COST pour le coût affiché du booster de démo.

#### 🟠 `web/app/pages/settings.vue` — 429 l.

_Page Réglages : profil/avatar/stats, préférences (thème, son, volume, animations, révélation) et compte (reset mot de passe, déconnexion)._

**Problèmes DX**
- Accès données direct dans la page : `authRepo.avatarCards(useApi())`, `authRepo.forgotPassword(useApi(), email)` — la page appelle le repository et gère loading/toasts, mélangeant couche data et UI.
- Pattern « segmented control » (`.seg` + boucle sur *_OPTS avec `--on` sur égalité) répété 3 fois (thème, animations, révélation) : duplication de markup+CSS qui mériterait un composant <SegmentedControl>.
- Listes d'options (THEME_OPTS, MOTION_OPTS, REVEAL_OPTS) déclarées dans la page ; typage hétérogène (deux `as const`, une annotation explicite `{value:RevealMode,...}[]`) — patterns incohérents pour le même concept.
- Incohérence de libellés déroutante dans MOTION_OPTS : value:'off' → label:'Activées', value:'on' → label:'Réduites' (l'inversion sémantique off/on est un piège de maintenance).
- Le CSS de la pastille pièce et les couleurs de stats (#f6c453, #c9b3ff…) sont réintroduits ici, comme dans play/rules — tokens de couleur non partagés.

**Améliorations**
- Extraire un composant <SegmentedControl v-model :options> réutilisé par thème/animations/révélation, supprimant la triple duplication markup+CSS.
- Envelopper les appels authRepo dans le authStore (ex. auth.sendPasswordReset(), auth.loadAvatarCards()) pour que la page ne dépende plus de useApi()/repositories.
- Homogénéiser la déclaration des *_OPTS (même forme typée, mêmes clés) et clarifier les couples value/label des animations pour lever l'inversion off/on.
- Mutualiser les tokens de couleur (coin, charme) via variables de thème/partiel commun.

#### 🟠 `web/app/pages/collection.vue` — 399 l.

_Page « Ma collection » : classeur de cartes standard/shiny avec tri, progression, détail, vente et fusion._

**Problèmes DX**
- Mélange logique métier + UI : calcul de chance shiny (`shinyChance`), prix de vente (`sellPrice` via SELL_PRICE), éligibilité fusion (`canMerge`), et enchaînements sell/merge (toasts + ensureFresh) tous dans la page.
- Constante magique 500 en dur dans shinyChance(): `(quantity+1)/500` — même « pity 1/500 » écrit en clair dans rules.vue, aucune source unique.
- Naming trompeur : le tri `sortByPity` et son commentaire parlent de « chance shiny estimée décroissante » mais la comparaison trie en réalité par `quantity` brut (`b.quantity - a.quantity`) — l'intention et le code divergent.
- Duplication de la logique de pluralisation (`quantity > 1 ? 's' : ''`) inline dans le template, comme dans play.vue.
- Le rendu du prix de vente est dupliqué (bouton `Vendre (${sellPrice} 🪙)` + message du ConfirmDialog) ; l'emoji 🪙 sert d'icône monétaire en dur.
- La règle « fusion = 10 exemplaires » apparaît en texte codé en dur dans le message du ConfirmDialog alors que le seuil est une constante métier.

**Améliorations**
- Extraire un composable useCollectionActions() encapsulant sell()/merge() (loading, toasts, ensureFresh) pour alléger la page et rendre la logique testable.
- Déplacer shinyChance()/canMerge()/sellPrice dans un module utilitaire poke (à côté de SELL_PRICE) et remplacer le 500 magique par une constante SHINY_BASE_DENOM partagée avec rules.vue.
- Renommer sortByPity/`shinyChance` cohéremment (soit trier réellement par chance shiny estimée, soit renommer en sortByQuantity) pour que nom, commentaire et code concordent.
- Injecter le seuil de fusion (ex. MERGE_COST=10) dans le message du dialog au lieu de le coder en dur, et réutiliser un helper plural().

#### 🟡 `web/app/pages/spin.vue` — 337 l.

_Écran de lancement du mode Aventure : statut hebdomadaire des récompenses + pédagogie (actes/mécaniques) + bouton de démarrage._

**Problèmes DX**
- Données de contenu (ACTS, MECHANICS) codées en dur dans le composant avec des clés ultra-abrégées (`n`, `c`, `desc`) — mélange contenu éditorial et présentation, noms peu révélateurs.
- Couleurs d'accent des actes en dur (#37b06a, #8b5cc4, #e8952f) au lieu des variables de thème utilisées ailleurs (var(--color-poke-*)), incohérence de palette.
- Valeurs magiques `nextWeekly(1, 0)` (jour/heure du reset) sans constante nommée ; la même règle « lundi 00:00 Paris » est dite en commentaire et devrait être partagée avec le hub.
- transferPct fait `Math.round(r*100)` — logique de formatage de pourcentage répétée telle quelle dans d'autres pages (collection, settings).

**Améliorations**
- Externaliser ACTS/MECHANICS dans un module de contenu (ex. ~/content/adventure.ts) typé, avec des clés explicites (number/color/description), la page ne faisant que boucler dessus.
- Remplacer les couleurs hex des actes par des tokens de thème ou une constante partagée pour uniformiser la palette.
- Nommer la règle de reset (ex. SPIN_WEEKLY_RESET = { day:1, hour:0 }) et la réutiliser côté hub pour garantir la cohérence.
- Factoriser un helper toPct(rate) partagé pour les formatages de pourcentage.

#### 🟡 `web/app/pages/rules.vue` — 252 l.

_Page Guide/Règles publique : sections explicatives statiques + table des coûts de tirage par biome lue en direct._

**Problèmes DX**
- Contenu métier en dur et dispersé : le texte des règles interpole BASE_ROLL_COST mais code en clair le pity « 1/500 », le seuil de fusion « 10 exemplaires », et les prix de vente « Commun 1 · Rare 5 · Épique 10 · Légendaire 25 » — ces valeurs existent aussi ailleurs (SELL_PRICE dans collection, 500 dans collection), donc source de vérité dupliquée et risque de divergence.
- Le tableau des coûts vit dans la page ; couleurs de rareté (#dd3322, #e0a92e…) et pastille pièce CSS répétées comme dans les autres pages.
- Grand tableau `sections` de contenu éditorial inline dans le script (`as const`) : mélange contenu et composant, difficile à faire évoluer/traduire.

**Améliorations**
- Générer les prix de vente et le seuil de fusion du texte à partir des constantes partagées (SELL_PRICE, MERGE_COST, SHINY_BASE_DENOM) au lieu de les réécrire en français, garantissant l'alignement avec collection.vue.
- Externaliser le tableau `sections` dans un module de contenu (~/content/guide.ts) typé, éventuellement prêt pour l'i18n.
- Réutiliser le composant <CoinPip> et les tokens de couleur partagés pour la colonne coût.

**Patterns transverses (groupe)**
- Business logic dans les pages : plusieurs pages (play, collection, settings) appellent directement repositories/useApi et enchaînent loading+toasts+refresh, au lieu de déléguer à un composable ou store — la séparation UI/logique/données préconisée par Nuxt 4 n'est pas tenue.
- Constantes métier dupliquées et codées en clair au lieu d'une source unique : BASE_ROLL_COST est bien importé, mais le pity 1/500, le seuil de fusion 10, les prix de vente et BATCH_SIZE sont réécrits en dur à plusieurs endroits (rules vs collection vs play).
- Duplication de micro-logique UI : pluralisation `n > 1 ? 's' : ''`, formatage de pourcentage `Math.round(r*100)`, et le CSS de la pastille pièce dorée apparaissent quasi identiques dans 3+ fichiers.
- Contenu éditorial inline : de gros tableaux de données (ACTS/MECHANICS spin, chips/features index, sections rules, *_OPTS settings) sont déclarés dans les composants, mélangeant contenu et présentation et gênant réutilisation/traduction.
- Patterns UI répétés non factorisés en composants : segmented control (settings ×3), section feature de landing (index ×4), pastille pièce — candidats évidents à des composants partagés.
- Typage lâche ponctuel : casts `as Biome`/`as string`, ordre des tiers en `string[]`, formes API réimplémentées à la main (refreshBalance), et déclarations d'options hétérogènes (as const vs annotation explicite).
- Palette : nombreuses couleurs hex dispersées dans les <style scoped> qui doublonnent les tokens var(--color-*) — pas de source unique de couleurs d'accent.

**Quick wins (groupe)**
- Créer un helper plural(n, mot) et un helper toPct(rate) auto-importés pour supprimer les `n>1?'s':''` et `Math.round(r*100)` répétés.
- Extraire un composant <CoinPip/> à partir du CSS `.coin` dupliqué (play/rules/settings) et le réutiliser partout.
- Centraliser les constantes métier manquantes (BATCH_SIZE, SHINY_BASE_DENOM=500, MERGE_COST=10) dans un module et importer, notamment pour aligner rules.vue et collection.vue.
- Corriger le naming trompeur de collection.vue : soit trier réellement par chance shiny estimée, soit renommer sortByPity/shinyChance en cohérence avec le tri par quantity.
- Remplacer les couleurs hex d'accent (spin ACTS, index chips, rules sections) par les tokens de thème existants pour uniformiser la palette.
- Extraire un composant <SegmentedControl v-model :options> et l'utiliser pour les 3 réglages segmentés de settings.vue.
- Déplacer refreshBalance() de play.vue vers une méthode wallet.refreshFromMe() pour retirer l'accès /auth/me en dur de la page.


### Pages de jeu (league, team, gyms, tournament, leaderboard, stats, slot-machine, trades)

#### 🔴 `web/app/pages/league.vue` — 776 l.

_Page Ligue des 4 : orchestration d'une machine a etats multi-phase (locked/waiting/ready/attempted/result), defi, et double recompense (pieces / capture de legendaire)._

**Problèmes DX**
- Fichier God (776 lignes) : ~150 de script, ~350 de template a 6 branches de phase imbriquees + 2 modales, ~185 de CSS scoped. Melange orchestration de phase + appels store + acces API brut + presentation combat + logique recompense dans un seul fichier.
- Acces donnees brut dans la page : refreshBalance() appelle useApi()('/auth/me') puis wallet.reconcile(...) directement — logique data/wallet qui devrait vivre dans un store, pas dans une page.
- Duplication : probColor() est repris a l'identique (seuils 60/40) dans gyms.vue et tournament.vue, mais avec des hex DIVERGENTS ('#c98a1a'/'#d1463a' ici vs '#cc6f16'/'#c62617' ailleurs) — incoherence visuelle silencieuse. pct() et typeColor() aussi dupliques.
- Typage lache : typeColor(type: string) puis `typeSlug(type as PokeType)` alors que tournament.vue::typeColor prend directement PokeType — signatures incoherentes pour la meme fonction.
- Valeurs magiques : LEAGUE_THEME '#8b5cc4' redefini en litteral dans le <style> (.replay, color-mix) au lieu d'un token partage ; seuils 60/40 et hex de probColor en dur.
- Logique de phase (computed `phase`) et presentRun() (mapping run->stages pour BattleStore) noyees dans la page : candidates naturelles a un composable.
- Messages FR en dur dans le script (titres/sous-titres de combat, toasts) melanges a la logique — non i18n-ready.

**Améliorations**
- Extraire chaque branche de phase en sous-composant colocalise (components/league/LeagueLocked.vue, LeagueWaiting, LeagueReady, LeagueAttempted, LeagueResult) pour ramener la page sous ~200 lignes.
- Deplacer refreshBalance()/refreshCollection() dans les stores concernes (wallet.refreshFromApi(), collection.refresh()).
- Factoriser probColor/pct dans utils/probability.ts et typeColor dans utils/format.ts (auto-imports Nuxt), avec une seule palette (tokens CSS --color-prob-*) pour eliminer les hex divergents.
- Extraire presentRun() dans un composable useLeaguePresenter().
- Remplacer le litteral LEAGUE_THEME par un token CSS unique reutilise en JS et en CSS.

#### 🔴 `web/app/pages/team.vue` — 657 l.

_Page Equipe (6 slots) : roulette destructive (carte piochee quitte la collection), retrait payant, reorganisation par swap de 2 slots, vidage complet._

**Problèmes DX**
- Fichier God (657 lignes, ~200 de CSS scoped) cumulant plusieurs flux (roll multi-phase, remove, clear, swap) dans un seul composant.
- Acces donnees brut / court-circuit des stores : `import { inventoryRepo } from '~/repositories'` puis `inventoryRepo.get(useApi())` dans onMounted pour recuperer le ticket type actif — une page ne devrait pas parler directement a un repository.
- Etat serveur gere localement : activeTypeTicket/activeTypeLabel sont des ref() de page au lieu d'un getter de store — non partages, non reutilisables ailleurs.
- Machine a etats de la roulette (type RollPhase 'confirm'|'rolling'|'result') + timing d'animation (helper `wait`, motionOn) codee dans la page : candidate a un composable useTeamRoll.
- Regle metier dupliquee dans un computed de page : eligibleCount filtre `owned && !isShiny && rarity !== 'Legendaire'` (string magique 'Legendaire') — la meme regle existe cote roll serveur.
- Cle de storage en dur 'pkr_team_roll_skip_confirm' dans useStorage, sans registre central des cles.
- Bloc try/catch/toast/actionLoading repete a l'identique dans confirmRemove/confirmClear.

**Améliorations**
- Deplacer le ticket type actif dans un store (inventory/quotas) et l'exposer via un getter activeTypeLabel.
- Extraire la roulette (RollPhase, wait, openRoll/startRoll) dans un composable useTeamRoll().
- Sortir la regle d'eligibilite en getter de store (ex. collection.eligibleForTeamRoll).
- Centraliser les cles useStorage dans utils/storageKeys.ts.
- Factoriser le wrapper busy+toast dans un composable useAsyncAction().

#### 🟠 `web/app/pages/gyms.vue` — 557 l.

_Page Arenes : grille de 8 arenes, modale detail avec estimation/matchups, combat hebdomadaire (BattleStore) et entrainement quotidien._

**Problèmes DX**
- Duplication majeure : le computed `champions` construit a la main un TeamMember 'factice' (cardId: '', teamEntryId: String(c.position), typeImageUrl: null) — mapping STRICTEMENT identique a toMember() dans tournament.vue. Objet de domaine detourne + logique copiee.
- probColor() dupliquee (seuils 60/40, hex '#3f9e66'/'#cc6f16'/'#c62617') — 3e copie sur les pages, variante des hex de league.vue.
- Valeurs magiques : teinte '#8aa0c8' ("dojo") en dur dans train(), seuils 60/40.
- Heuristique metier subtile dans un computed de page : teamEmpty = `selectedId in gym.estimates && estimate === null` — logique fragile logee dans l'UI.
- Flux combat/train (present + toasts + loading) repete le meme pattern try/catch que league/team.

**Améliorations**
- Creer utils/mappers.ts::championToMember(c) et remplacer les deux mappings inline (gyms + tournament) — supprime la duplication et centralise l'objet TeamMember.
- Factoriser probColor dans utils/probability.ts avec tokens partages.
- Extraire le contenu de la modale detail en composant GymDetail.vue.
- Exposer teamEmpty via un getter de store plutot qu'une heuristique de page.

#### 🟠 `web/app/pages/tournament.vue` — 524 l.

_Page Tournoi hebdomadaire : recap (dates/cagnotte/prix), inscription, resultats, analyse (equipe figee / strategie de types / matchups) et participants._

**Problèmes DX**
- Mapping toMember() (ChampionMon -> TeamMember) duplique a l'identique avec gyms.vue::champions.
- probColor() dupliquee (3e occurrence) ; typeColor(type: PokeType) dupliquee avec stats.vue et divergente de league.vue (string + cast).
- Regles metier de repartition des gains codees dans la page : `prizes` avec r(p)=Math.round(pool*p/5)*5 et ratios 0.6/0.3/0.1 en dur, plus medalFor() — devraient etre des constantes nommees / util partage.
- Tri refait dans des computed de page (`matchups` et `results` font [...].sort(...)) au lieu d'un getter de store.
- Nommage cryptique : alias `t` (= tourney.current) et `a` (= tourney.analysis) — noms non revelateurs utilises dans tout le template.

**Améliorations**
- Sortir prizes/medalFor/ratios dans utils/tournamentPrizes.ts avec constantes nommees (PRIZE_SPLIT).
- Reutiliser championToMember partage ; probColor/typeColor factorises.
- Renommer `t`->`current`/`tournament` et `a`->`analysis`.
- Deplacer les tris matchups/results en getters du store.

#### 🟠 `web/app/pages/leaderboard.vue` — 515 l.

_Page Classement : podium top 3, liste des rangs, bloc "ta position" hors top, feed des derniers shiny/legendaires, onglet secondaire tricheurs._

**Problèmes DX**
- timeAgo() dupliquee (quasi identique a slot-machine.vue, a une branche pres) — helper de formatage de date repete et deja legerement divergent.
- Union litterale `'main' | 'cheaters'` repetee 3 fois (ref, param switchTab) au lieu d'un type nomme.
- Onglets refaits a la main (role=tablist/tab, gestion .tab--on) alors que Nuxt UI fournit UTabs et que le reste de la page utilise UModal/USelectMenu — incoherence de pattern.
- Couplage fragile : isYou() compare par username plutot que par un identifiant stable.
- Logique de presentation du podium (podiumOrder : find(2)/find(1)/find(3) pour l'ordre 2-1-3) melee dans la page.

**Améliorations**
- Extraire timeAgo dans utils/time.ts (auto-import), partage avec slot-machine.
- Definir `type LbTab = 'main' | 'cheaters'` et l'utiliser partout.
- Extraire le feed en composant ShinyFeed.vue.
- Envisager UTabs pour la coherence avec le reste du design system.

#### 🟠 `web/app/pages/stats.vue` — 443 l.

_Page Statistiques : un payload agrege unique rendu en sections (vue d'ensemble, spin, arenes, stats par joueur, probabilites, anecdotes)._

**Problèmes DX**
- Le computed `anecdotes` construit 8 objets a la main avec libelles FR en dur, acces profonds (a.mostShinyDupes.names) et indices [0]?.x — vue et forme des donnees fortement couplees, difficile a tester.
- typeColor() dupliquee (3e copie).
- Formatters num/rate/pct locaux (toLocaleString 'fr-FR') — reimplementes ici, aucun util de format central ; pct a une logique de fractionDigits ad hoc.
- Beaucoup de contenu textuel FR en dur dans le script (labels d'anecdotes) melange a la logique — non i18n-ready et gonfle le composant.
- Logique derivee (calc : per/oneIn) et selection player/rarity logees dans la page.

**Améliorations**
- Deplacer la construction des anecdotes dans un util testable buildAnecdotes(data) (utils/stats.ts).
- Factoriser num/rate/pct/typeColor dans utils/format.ts (auto-import).
- Extraire les sous-sections lourdes en composants (StatsGyms, StatsPlayer, StatsOdds, StatsAnecdotes).

#### 🟠 `web/app/pages/slot-machine.vue` — 416 l.

_Page Jackpot (machine a sous) : selection de mise, spin pilote via ref imperative sur SlotMachine, affichage resultat, feed des gros lots, bareme dynamique._

**Problèmes DX**
- timeAgo() dupliquee avec leaderboard.vue mais LEGEREMENT divergente (pas de branche >7j ici) — pire cas de duplication car les deux copies derivent.
- Ref imperative typee a la main : ref<{ spin: (cells, lines) => Promise<void> }>() redeclare le contrat du composant au lieu d'utiliser InstanceType<typeof SlotMachine> — fragile face aux evolutions de SlotMachine.
- Trois switch sur l.type cote page (rewardLabel/rewardShort/symOf) — logique de presentation des recompenses qui devrait vivre pres du type LineReward (utils/slot.ts).
- pct() local (encore une variante de formateur pourcentage).
- Non-null assertion BET_TIERS[0]!.

**Améliorations**
- Typer la ref via InstanceType<typeof SlotMachine>.
- Deplacer rewardLabel/rewardShort/symOf dans utils/slot.ts, colocalises avec LineReward.
- Reutiliser timeAgo/pct partages (utils/time.ts, utils/format.ts).

#### 🟠 `web/app/pages/trades.vue` — 388 l.

_Page Echanges : eligibilite (>=120 standards uniques, 1/semaine, cooldown), flux create -> respond -> confirm, sections a traiter / en attente / historique, grille de partenaires._

**Problèmes DX**
- Regle metier dans la page : respondLoad mappe collection.cards -> TradeCard avec le filtre `owned && !isShiny && rarity === r && quantity >= 2` — regle de contre-offre codee en UI.
- Valeurs de domaine en dur : createRarities = ['Commun','Rare','Epique'] (raretes echangeables) devraient venir d'une constante/type partage.
- eligReason melange messages FR en dur et logique d'eligibilite.
- Logique de date repetee : cooldownLabel/isOnCooldown avec 86_400_000 magique.
- Le helper local `run(fn, okMsg)` (busy + toast succes/erreur) est un bon reflexe mais reimplemente ici alors que league/team/gyms/tournament refont le meme try/catch/toast — signe qu'il manque un composable partage.

**Améliorations**
- Extraire un composable useAsyncAction() (busy + toast) et l'utiliser sur TOUTES les pages — supprime ~8 blocs try/catch identiques.
- Deplacer la regle de contre-offre en getter de store (trades.respondableCards(rarity)).
- Constante partagee TRADEABLE_RARITIES + constante MS_PER_DAY.
- Externaliser les messages d'eligibilite hors de la logique.

**Patterns transverses (groupe)**
- Duplication de helpers de presentation sur plusieurs pages : probColor (league/gyms/tournament, seuils 60/40 identiques mais hex DIVERGENTS = incoherence visuelle silencieuse), typeColor (league/tournament/stats, avec signatures divergentes string+cast vs PokeType), timeAgo (leaderboard/slot-machine, deja divergent), et pct/num/rate reimplementes localement partout. Aucun util de format/probability central.
- Le triplet try { ... } catch (err) { toast.add({ title: humanizeError(err), color:'error' }) } finally { busy=false } est repete des dizaines de fois (doChallenge, claimCoins, captureLegendary, confirmRemove, confirmClear, fight, train, register, doSpin, create, respond, run...). Un composable useAsyncAction eliminerait cette duplication massive.
- Le pattern onMounted -> store.ensureFresh() avec loading/errorMsg est copie a l'identique sur les 8 pages — candidat a un composable usePageData(loader).
- Mapping ChampionMon -> TeamMember 'factice' (cardId:'', teamEntryId=position, typeImageUrl:null) duplique dans gyms.vue et tournament.vue : objet de domaine detourne, aucune source unique.
- Pages = God components : chacune melange template multi-etats, logique metier, formatage et parfois acces donnees, avec 150-490 lignes de CSS scoped. Tres peu de sous-composants par feature ; pas de colocation feature-based (tout est a plat dans pages/ et components/).
- Acces donnees brut depuis des pages, court-circuitant les stores : league.vue appelle useApi()('/auth/me'), team.vue importe et appelle inventoryRepo directement.
- Regles metier et seuils codes en dur dans les pages : ratios de gains 0.6/0.3/0.1 (tournament), raretes echangeables (trades), eligibilite roll (team), regle de contre-offre (trades), MS_PER_DAY 86_400_000, cles de storage litterales.
- Contenu textuel FR en dur dans le script (anecdotes stats, messages d'eligibilite trades, sous-titres de combat league, toasts) melange a la logique — non i18n-ready et gonfle les composants.
- Petites incoherences de pattern/nommage : onglets faits main vs UTabs (leaderboard), unions litterales repetees au lieu de types nommes, alias cryptiques t/a (tournament), non-null assertions ([0]!).

**Quick wins (groupe)**
- Creer utils/probability.ts (probColor + pct), utils/format.ts (num, rate, pct, typeColor) et utils/time.ts (timeAgo), auto-importes par Nuxt, puis supprimer les copies locales — supprime toute la duplication d'un coup et aligne sur une seule palette/token (sans changement de comportement une fois la palette unifiee).
- Creer utils/mappers.ts::championToMember(c) et remplacer les deux mappings inline dans gyms.vue et tournament.vue.
- Extraire un composable useAsyncAction({ busy, onError }) encapsulant busy+try/catch+toast, et remplacer les blocs identiques (le helper `run` de trades.vue en est deja le prototype).
- Definir les types nommes manquants (type LbTab = 'main' | 'cheaters') et renommer les alias cryptiques t/a en tournament.vue.
- Typer la ref imperative de slot-machine via InstanceType<typeof SlotMachine> au lieu d'un contrat manuel.
- Centraliser les cles useStorage dans utils/storageKeys.ts et les constantes de domaine en dur (ratios de prix, raretes echangeables, MS_PER_DAY).
- Extraire les sous-sections/branches les plus lourdes en composants feature (components/league/*, components/stats/*) pour ramener league.vue et team.vue sous ~250 lignes.


### Pages Auth + Showcase + Catch-all (7 fichiers)

#### 🔴 `web/app/pages/reset-password.vue` — 105 l.

_Page de réinitialisation : lit le token en query, formulaire nouveau mot de passe appelant authRepo.resetPassword, affiche un état 'terminé'._

**Problèmes DX**
- Même incohérence que forgot-password : appel direct authRepo.resetPassword + useApi() depuis la page au lieu du store utilisé par login/register.
- Lecture/normalisation du token (typeof === 'string' ? ... : '') dupliquée du pattern identique de login.vue (route.query.next) : extraction de query param non factorisée.
- Validation 'lien invalide' gérée à la main dans onSubmit avec message FR codé en dur, alors qu'une garde/composable de token serait plus clair.
- passwordSchema min 8 + hint '8 caractères minimum' dupliqués comme dans register (valeur magique répétée).
- Réimplémentation du trio state/loading/error/try-catch.

**Améliorations**
- Remonter resetPassword dans useAuthStore pour homogénéiser la couche d'accès aux données.
- Extraire un helper useQueryParam(name) (ou useRouteToken) pour normaliser les query params, réutilisé par login (next) et reset (token).
- Partager passwordSchema et dériver le hint; centraliser les messages.
- Utiliser le composable useAuthForm commun.

#### 🔴 `web/app/pages/forgot-password.vue` — 91 l.

_Page mot de passe oublié : formulaire e-mail qui appelle authRepo.forgotPassword et affiche un état 'envoyé'._

**Problèmes DX**
- Incohérence d'architecture majeure : login/register passent par useAuthStore, mais cette page appelle directement authRepo + useApi() depuis la couche page (accès données mélangé à l'UI, court-circuitant le store).
- Import explicite `import { authRepo } from '~/repositories'` alors que les stores sont auto-importés : couplage direct page->repository fragile et non testable (impossible de mocker via le store).
- useApi() est instancié dans onSubmit et passé manuellement au repo à chaque appel : plomberie répétée qui devrait vivre dans un store/composable.
- Réimplémente encore le trio state/loading/error + try/catch/finally (duplication transverse).

**Améliorations**
- Déplacer forgotPassword dans useAuthStore (auth.forgotPassword(email)) pour aligner toutes les pages auth sur la même couche et masquer useApi()/authRepo.
- Réutiliser le composable useAuthForm partagé pour l'état et la gestion d'erreur.
- Supprimer l'import direct du repository dans la page une fois la logique remontée au store.

#### 🟠 `web/app/pages/showcase-cards.vue` — 159 l.

_Page de démo temporaire présentant HoloCard/PButton avec un jeu de données Pokémon en dur et un style Mochidex scoped._

**Problèmes DX**
- Fichier 'God-fixture' : ~25 objets de données Pokémon en dur (heroes/grid) mélangés à la présentation dans une page ; long tableau littéral difficile à maintenir.
- Page de démo TEMPORAIRE laissée dans app/pages (routable, public:true) : pollue le routing de prod et l'arbre de pages métier.
- Valeurs magiques dans la logique de template : `:is-new="c.name === 'Artikodin'"` et clés basées sur des noms ('Artikodin') couplent le rendu à des données spécifiques.
- Couleurs hexadécimales en dur dans le <style> (#f6f7f9, #6a5b48, gradients) au lieu des tokens de design (var(--ui-*)) utilisés ailleurs dans le même fichier : incohérence de theming.
- toCard/Sample dupliquent une partie de la construction d'un DomainOwnedCard qui devrait être une factory de test/fixture partagée.

**Améliorations**
- Déplacer les showcases hors de app/pages (ex. dossier dev/ non buildé, story dédiée, ou route protégée par flag) pour ne pas les livrer en prod.
- Externaliser les données de démo dans un module fixtures (app/fixtures/cards.ts) et une factory makeOwnedCard() réutilisable par showcase et tests.
- Remplacer les hex en dur par les tokens de design existants pour cohérence dark/light.
- Remplacer le flag `is-new` codé sur un nom par une propriété explicite dans la fixture.

#### 🟠 `web/app/pages/register.vue` — 116 l.

_Page d'inscription : formulaire username/email/password (UForm + zod) déléguant à useAuthStore.register puis redirigeant vers /play._

**Problèmes DX**
- Duplication quasi complète du script et du template de login.vue (même state/loading/error, même onSubmit, mêmes UFormField/UInput).
- Redirection '/play' en dur, dupliquée par rapport à login.vue.
- Règle 'min 8 caractères' présente à la fois dans le schéma zod (message) et dans le texte hint du template : valeur magique dupliquée, risque de désynchronisation.
- Messages de validation FR codés en dur dans le schéma, non mutualisés avec les autres pages auth qui répètent les mêmes libellés ('Adresse e-mail invalide', 'Au moins 8 caractères').

**Améliorations**
- Mutualiser via le même composable useAuthForm que login et un PAuthForm/descriptif de champs.
- Partager passwordSchema (min 8) et dériver le hint depuis la contrainte, pour une seule source de vérité sur la longueur minimale.
- Regrouper les messages de validation dans un objet constants (auth messages) importé par toutes les pages auth.

#### 🟠 `web/app/pages/login.vue` — 112 l.

_Page de connexion : formulaire e-mail/mot de passe (UForm + zod) déléguant à useAuthStore.login puis redirigeant vers ?next ou /play._

**Problèmes DX**
- Bloc script quasi identique à register.vue et à la moitié de forgot/reset (état loading/error, pattern try/catch/finally, onSubmit) : duplication structurelle non factorisée.
- Le pattern de soumission (loading, error, humanizeError, finally) est réimplémenté à la main dans chaque page au lieu d'un composable useSubmit/useAsyncForm partagé.
- Fallback de redirection '/play' en dur au milieu de la logique (valeur magique de routing dispersée dans les pages).
- Le schéma zod et le type Schema sont redéfinis localement alors que les règles (email valide, min password) sont réutilisées ailleurs : pas de source de validation partagée.

**Améliorations**
- Extraire un composable useAuthForm()/useSubmit() encapsulant loading, error, humanizeError et le try/catch, pour ne garder dans la page que l'appel métier.
- Centraliser les schémas zod réutilisés (emailSchema, passwordSchema) dans un module app/schemas/auth.ts et les composer.
- Sortir la route par défaut post-login dans une constante partagée (ex. ROUTES.afterLogin) plutôt que la chaîne '/play' inline.
- Envisager un composant PAuthForm générique piloté par un descriptif de champs pour supprimer la duplication de template entre les 4 pages auth.

#### 🟠 `web/app/pages/showcase-battle.vue` — 107 l.

_Page de démo dev déclenchant BattleStage plein écran via useBattleStore avec des rounds/ligue factices et des thèmes en dur._

**Problèmes DX**
- Page de démo dev laissée routable en public dans app/pages (comme showcase-cards) : surface de prod involontaire.
- Données factices volumineuses (MONS, rounds, leagueStages, THEMES) codées en dur dans la page : mélange fixtures/présentation.
- Couleurs de thèmes en hex en dur (#7fc98a, #8b5cc4, ...) dupliquant vraisemblablement la palette de types déjà définie ailleurs : source de vérité des couleurs de type dispersée.
- Chemins d'assets en dur répétés ('/images/badges/Kanto_1.png', '/images/*.webp') sans constante ni helper.
- launch/launchLeague construisent des payloads battle.present volumineux inline : logique de présentation qui gagnerait à être des fixtures nommées.

**Améliorations**
- Sortir la page des routes de prod (dossier dev/story/flag).
- Externaliser MONS/rounds/leagueStages en fixtures partagées et référencer la palette de types centrale au lieu d'hex inline.
- Introduire un mapping typeColor(label) réutilisé par l'app et le showcase.
- Centraliser les chemins d'images (helper spriteUrl/badgeUrl) déjà probablement présent dans le domaine.

#### 🟡 `web/app/pages/[...slug].vue` — 24 l.

_Page catch-all 404 affichant un message 'Page introuvable' et un bouton retour vers /play._

**Problèmes DX**
- Utilise UButton brut alors que le reste de l'app a standardisé sur PButton (wrapper maison) : incohérence de composant.
- Lien de retour '/play' en dur (même valeur magique de route par défaut que login/register).
- Pas de setPageMeta title / status 404 explicite : la page 404 ne pose pas de code de statut ni de titre (structurel pour SEO/UX même en SPA).

**Améliorations**
- Uniformiser sur PButton pour la cohérence du design system.
- Réutiliser la constante de route par défaut partagée pour le lien retour.
- Ajouter un title/heading via useHead et, si pertinent, un composant NotFoundState réutilisable pour d'autres cas d'erreur.

**Patterns transverses (groupe)**
- Duplication transverse du pattern de soumission de formulaire : les 4 pages auth réimplémentent chacune state/loading/error + try/catch/finally + humanizeError. Un composable useAuthForm/useSubmit supprimerait ~60% du script de chaque page.
- Incohérence de couche d'accès aux données : login/register passent par useAuthStore (auto-importé), mais forgot/reset importent directement authRepo et manipulent useApi() dans la page. Toutes les opérations auth devraient transiter par le store.
- Valeur magique de routing récurrente : la chaîne '/play' est codée en dur comme destination par défaut dans login, register et [...slug]. À centraliser dans des constantes de routes.
- Schémas et messages de validation zod redéfinis et dupliqués page par page (email valide, min 8, mêmes libellés FR) au lieu d'être composés depuis un module de schémas/messages partagé ; la contrainte min-8 est même dupliquée entre schéma et hint.
- Les pages showcase sont des fixtures 'God' (grosses données en dur mélangées à l'UI) et restent routables/public en prod ; couleurs hex et chemins d'assets codés en dur au lieu des tokens de design et helpers existants.
- Incohérences de composants du design system : [...slug] utilise UButton alors que PButton est le standard ailleurs.

**Quick wins (groupe)**
- Extraire un composable useAuthForm() (loading/error/humanizeError + wrapper try/catch) et l'utiliser dans les 4 pages auth : suppression immédiate de duplication, zéro changement de comportement.
- Ajouter forgotPassword/resetPassword à useAuthStore et faire consommer le store par forgot/reset pour supprimer les imports directs authRepo + useApi() des pages.
- Créer app/constants/routes.ts (ou similaire) et remplacer les '/play' en dur dans login, register et [...slug].
- Centraliser emailSchema/passwordSchema et les messages FR dans app/schemas/auth.ts ; dériver le hint '8 caractères' de la contrainte.
- Remplacer UButton par PButton dans [...slug].vue pour la cohérence du design system.
- Déplacer showcase-cards.vue et showcase-battle.vue hors des routes de prod (dossier dev/story ou flag) et externaliser leurs données en fixtures partagées.
- Remplacer les couleurs hex en dur des showcases par les tokens var(--ui-*) / la palette de types existante.


### base + ui + card (shell, primitives, carte)

#### 🔴 `web/app/components/card/HoloCard.vue` — 433 l.

_Carte holographique complète : rendu par type/rareté/shiny + tilt/holo/glare au pointeur._

**Problèmes DX**
- Fichier « God component » : ~230 lignes de <style> + logique de pointeur + dérivations métier (hp cosmétique, n° de set, stage, gemmes) dans un seul SFC à responsabilités multiples (présentation, interaction, calculs).
- Manipulation impérative directe du DOM via refs (`el.style.transform/backgroundPosition/opacity/willChange`) : logique d'interaction non testable et hors du modèle réactif Vue.
- Constante `WIDTHS` (mapping taille→px) en dur dans le composant, susceptible d'être partagée avec d'autres vues de carte.
- Nombreuses valeurs magiques d'interaction en dur (14deg de tilt, scale 1.05, perspective 900px, +0.4 d'opacité holo) sans constantes nommées.
- Le computed `holoAnimated` encode une règle métier (quelles raretés scintillent : Épique/Légendaire/shiny) en dur dans l'UI, dupliquant la connaissance de rareté de cardTheme.
- Chaîne d'imports depuis ~/utils/cardTheme mêlant données (TYPE_GRADIENT, RARITY_META), helpers (hexA) et logique (cosmeticHp) — module fourre-tout.

**Améliorations**
- Extraire l'interaction pointeur dans un composable `useCardTilt(rootRef, options)` réutilisable et testable, retournant des styles réactifs plutôt que des mutations DOM impératives.
- Extraire les dérivations d'affichage (hp, setNo, stage, gems, holoBase, frameColor) dans un composable `useCardPresentation(card)` pour alléger le SFC.
- Sortir les constantes d'interaction (angles, scale, perspective) et WIDTHS vers utils/cardTheme (ou un fichier de constantes) et nommer les seuils.
- Déplacer la règle « quelles raretés scintillent » dans cardTheme (RARITY_META.animated) pour une source unique.
- Envisager de scinder le gros bloc CSS en sous-composants (art, foil/holo, badges) si la réutilisation le justifie.

#### 🔴 `web/app/components/base/MobileMenu.vue` — 249 l.

_Tiroir mobile plein écran exposant toutes les sections + profil + thème + logout._

**Problèmes DX**
- Troisième déclaration de la navigation (`groups`), dupliquant labels/routes/icônes déjà présents dans AppNavbar et BottomTabBar : forte duplication à trois endroits.
- Mélange de préoccupations : navigation + logique de thème (toggleTheme) + logique d'auth (onLogout appelant auth.logout) + lecture wallet/auth pour le solde, dans un composant de présentation.
- `toggleTheme` est dupliqué à l'identique avec ThemeToggle.vue (même corps `colorMode.preference = isDark ? 'light':'dark'`).
- Fallback de solde `wallet.balance ?? auth.user?.coins ?? 0` : règle métier (source de vérité du solde) codée dans l'UI, divergente de CoinBalance qui n'utilise que wallet.balance.
- Locale 'fr-FR' de nouveau en dur ; gradient actif et hex de marque encore recopiés.

**Améliorations**
- Dériver `groups` de la source de nav centralisée (structure de groupes définie une fois).
- Extraire un composable `useThemeToggle()` partagé par ThemeToggle et MobileMenu.
- Centraliser la résolution du solde dans un getter du walletStore (ex. `displayBalance`) pour une source unique, utilisée par CoinBalance et MobileMenu.
- Sortir `onLogout` vers un composable/action (useSession) pour ne pas coupler le composant aux détails du store.

#### 🟠 `web/app/components/base/AppNavbar.vue` — 186 l.

_Navbar desktop : marque, navigation en pilules, solde, thème, notifications, avatar._

**Problèmes DX**
- La liste `links` (9 entrées to/label/icon) est dupliquée conceptuellement avec `tabs` de BottomTabBar.vue et `groups` de MobileMenu.vue : trois sources de vérité pour la même navigation, à maintenir en parallèle.
- Couleurs de marque en dur dans le <style> (#ee5a48, #fff) au lieu des tokens --color-poke-* déjà utilisés ailleurs, ce qui crée une incohérence de source de couleur.
- Le composant appelle directement `hub.markNotificationsRead()` sur un simple clic de cloche : logique métier (marquer lu) mêlée à l'action d'ouverture, sans navigation vers un panneau de notifications.
- Dépendance implicite à des composants auto-importés non colocalisés (TourneyAvatar, PokeBall, CoinBalance, ThemeToggle) — couplage fort au shell global.

**Améliorations**
- Extraire un module de navigation unique (ex. app/config/navigation.ts ou composable useNavLinks()) exposant les entrées + un flag `primary` pour dériver BottomTabBar/MobileMenu/AppNavbar d'une seule source.
- Remplacer les hex en dur du gradient actif par var(--color-poke-500/700) et factoriser le gradient « pilule active » en une classe/CSS custom property partagée avec BottomTabBar et MobileMenu.
- Extraire le gradient `.nav__link--on` (répété à l'identique dans 3 fichiers) dans le CSS global sous une classe utilitaire, ex. `.pill-active`.

#### 🟠 `web/app/components/base/BottomTabBar.vue` — 122 l.

_Barre de navigation mobile : 4 destinations principales + onglet Menu ouvrant MobileMenu._

**Problèmes DX**
- `tabs` redéfinit un sous-ensemble des liens de la navbar (duplication de la 2e source de nav).
- Gradient actif `.dock__tab--on` copié-collé depuis AppNavbar (mêmes hex #ee5a48/#f... et box-shadow) : duplication de style et valeurs magiques.
- Le badge d'onglet Menu lit `hub.tradeActionsRequired` en dur alors que MobileMenu affiche le même badge sur le lien Échanges : la sémantique (compteur d'échanges = badge Menu) est codée en dur et non centralisée.

**Améliorations**
- Dériver `tabs` de la source de nav unique en filtrant `primary === true`.
- Factoriser la classe de pilule active partagée avec la navbar.
- Exposer un getter agrégé côté hubStore (ex. `menuBadgeCount`) plutôt que de recâbler `tradeActionsRequired` dans deux composants.

#### 🟠 `web/app/components/ui/PButton.vue` — 93 l.

_Bouton maison (wrapper UButton) avec style relief « bonbon » piloté par une rampe de couleurs._

**Problèmes DX**
- `useAttrs()` + `inheritAttrs:false` + forwarding manuel de tous les slots : pattern puissant mais peu typé (attrs non typés) et fragile à maintenir.
- La table `RAMP` (7 rôles × 4 hex) duplique une palette qui recoupe la RAMP de couleurs utilisée ailleurs (PButton primary #ee5a48 = gradient navbar/dock) : couleurs de marque redéfinies dans un 4e endroit sans token partagé.
- Type `PColor` redéclaré localement alors qu'il correspond aux couleurs Nuxt UI — risque de divergence avec le thème.
- Commentaire très long tenant lieu de doc : signale une complexité de wrapper qui gagnerait à être documentée hors code.

**Améliorations**
- Générer RAMP à partir des CSS custom properties de marque (--color-poke-*) pour une source unique de la palette.
- Exporter `PColor` depuis un module de types UI partagé plutôt que le redéfinir.
- Envisager d'exposer les CSS vars de la rampe globalement pour que navbar/dock/PButton lisent le même gradient.

#### 🟠 `web/app/components/base/RarityBadge.vue` — 32 l.

_Badge textuel + couleur de rareté (avec variante shiny)._

**Problèmes DX**
- La map rareté→classe (Commun/Rare/Épique/Légendaire) est une correspondance métier dupliquée avec RARITY_META de utils/cardTheme (source de vérité de la rareté ailleurs).
- Les clés de rareté sont des chaînes littérales françaises en dur, fragiles si le type RealRarity évolue (pas de garantie d'exhaustivité au build).
- `props.` explicite dans le script/template.

**Améliorations**
- Dériver la classe/couleur depuis la source unique de rareté (RARITY_META) au lieu d'une seconde map locale.
- Typer la map avec `Record<RealRarity, string>` pour forcer l'exhaustivité à la compilation.

#### 🟠 `web/app/components/base/CountdownChip.vue` — 25 l.

_Puce de compte à rebours vers une date cible (formatage j/h/min ou hh:mm:ss)._

**Problèmes DX**
- Logique de formatage de durée (calcul j/h/m/s, seuils) intégralement dans le computed du composant : logique pure testable enfermée dans l'UI.
- Bug latent de présentation (non demandé) mis à part, la construction de la chaîne mélange deux formats sans constantes nommées pour les seuils (86400, 3600, 60).
- Import explicite `useNow` depuis @vueuse/core alors que le projet semble utiliser des auto-imports VueUse ailleurs (usePreferredReducedMotion, useTransition sans import) — incohérence d'import.

**Améliorations**
- Extraire un util pur `formatCountdown(ms): string` dans utils/ (testable unitairement sans monter le composant).
- Nommer les constantes de durée (SECONDS_PER_DAY, etc.) ou utiliser un helper de durée.
- Aligner la stratégie d'import VueUse (tout auto-import, ou tout explicite) pour la cohérence.

#### 🟡 `web/app/components/ui/PAuthPanel.vue` — 83 l.

_Coque visuelle des écrans d'authentification (couronne PokeBall, titre, body, footer)._

**Problèmes DX**
- Recouvrement fonctionnel avec PPanel.vue (même intention « surface panneau Mochidex » : bg-elevated, border, radius, box-shadow) mais valeurs différentes et non factorisées.
- Utilise `<h1>` en dur : impose une hiérarchie de titre au niveau du composant coque, ce qui contraint son usage.
- Ombres/rayons en valeurs magiques inline non tokenisés.

**Améliorations**
- Construire PAuthPanel au-dessus de PPanel (composition) pour partager la surface de base.
- Tokeniser les rayons/ombres partagés (--panel-radius, --panel-shadow) réutilisés par PPanel et PAuthPanel.
- Rendre le niveau de titre configurable (prop `as`/`level`) si réutilisé hors page login.

#### 🟡 `web/app/components/ui/PokeBall.vue` — 54 l.

_Emblème Poké Ball décoratif en CSS pur, réutilisable._

**Problèmes DX**
- Couleurs Poké Ball en hex en dur (#ef5a48, #17171c) au lieu des tokens de marque — même rouge que la navbar mais valeur non partagée.
- Composant propre et à responsabilité unique : peu de dette, principal point étant la non-tokenisation des couleurs.

**Améliorations**
- Référencer var(--color-poke-500) pour le rouge afin d'aligner l'emblème sur le reste de la marque.
- RAS majeur : bon exemple de primitive isolée (gère déjà prefers-reduced-motion).

#### 🟡 `web/app/components/base/CoinBalance.vue` — 53 l.

_Pilule de solde en pièces avec compteur animé (useTransition)._

**Problèmes DX**
- Locale 'fr-FR' codée en dur (répétée dans MobileMenu) — pas de helper de formatage centralisé.
- Palette ambre entièrement en hex en dur (#fff2d6, #ffe0a0, #f0d189, #e6bd63, #8a5a12…) hors système de tokens.
- Durée/courbe d'animation (400, cubic bezier) en valeurs magiques inline.
- La lecture `props.size` avec un ternaire de classe est verbeuse là où `:class="{ 'coins--sm': size==='sm' }"` serait plus lisible ; `props.` explicite non nécessaire en template.

**Améliorations**
- Extraire un util `formatCoins(n)` / `useNumberFormat()` réutilisé par CoinBalance et MobileMenu pour centraliser locale et arrondi.
- Déplacer la palette « bonbon » vers des CSS custom properties (--coin-*) dans les tokens globaux.
- Retirer les préfixes `props.` inutiles dans le template et simplifier le binding de classe.

#### 🟡 `web/app/components/base/ConfirmDialog.vue` — 52 l.

_Boîte de confirmation générique réutilisable (wrapper UModal avec slots body/footer)._

**Problèmes DX**
- Labels par défaut en français en dur ('Confirmer', 'Annuler') — pas d'i18n mais surtout couplage au français dans un composant primitif.
- `props.` explicite dans le template alors que les props sont déjà déstructurables/accessibles directement.

**Améliorations**
- Centraliser les libellés par défaut dans une constante partagée (ou via i18n) pour éviter la divergence de wording entre dialogs.
- Simplifier l'accès aux props dans le template (retirer le préfixe `props.`).

#### 🟡 `web/app/components/base/ThemeToggle.vue` — 41 l.

_Bouton bascule clair/sombre._

**Problèmes DX**
- `toggle()` (colorMode.preference = isDark ? 'light':'dark') est dupliqué mot pour mot dans MobileMenu.toggleTheme.
- Style `.theme-toggle` (grille 38px, radius 11px, hover) quasi identique à `.icon-btn` de AppNavbar : duplication de la primitive « bouton icône ».

**Améliorations**
- Extraire `useThemeToggle()` (état isDark + toggle) partagé.
- Factoriser un composant/classe `IconButton` réutilisé par ThemeToggle, la cloche de la navbar, etc.

#### 🟡 `web/app/components/ui/PPanel.vue` — 20 l.

_Surface panneau générique (primitive de mise en page)._

**Problèmes DX**
- Duplication d'intention avec PAuthPanel (deux définitions de « carte Mochidex » aux valeurs proches mais non partagées).
- Valeurs de radius/padding/ombre en dur non tokenisées.

**Améliorations**
- Faire de PPanel la primitive de base et composer PAuthPanel par-dessus.
- Tokeniser radius/ombre partagés.

**Patterns transverses (groupe)**
- Navigation triplée : la même liste routes/labels/icônes est redéfinie dans AppNavbar (links), BottomTabBar (tabs) et MobileMenu (groups) — trois sources de vérité à maintenir en parallèle.
- Palette de marque en hex en dur partout (#ee5a48 / #dd3322 / #17171c, ambre coins, RAMP de PButton) alors que des tokens --color-poke-* existent : la couleur n'a pas de source unique et se recopie dans navbar, dock, menu, PButton, PokeBall, CoinBalance.
- Style « pilule active » (gradient 150° + box-shadow d'arête) dupliqué à l'identique dans AppNavbar, BottomTabBar et MobileMenu au lieu d'une classe/CSS var partagée.
- Logique métier logée dans des composants de présentation : bascule de thème (dupliquée ThemeToggle/MobileMenu), résolution du solde (wallet.balance ?? user.coins), logout, règles de rareté (RarityBadge, HoloCard) qui redoublent cardTheme.
- Formatage récurrent non factorisé : locale 'fr-FR' et arrondis répétés (CoinBalance, MobileMenu), formatage de durée enfermé dans CountdownChip — aucun util partagé.
- Deux primitives de « panneau Mochidex » concurrentes (PPanel vs PAuthPanel) et deux primitives de « bouton icône » (ThemeToggle .theme-toggle vs AppNavbar .icon-btn) non composées.
- Incohérence d'imports VueUse : certains explicites (useNow, useTransition), d'autres via auto-import (usePreferredReducedMotion) — pas de convention.
- Deux gros fichiers concentrent la dette (MobileMenu 249 l., HoloCard 433 l.) ; les autres sont bien à responsabilité unique — la dette est très localisée.

**Quick wins (groupe)**
- Créer app/config/navigation.ts (une entrée = { to, label, icon, primary?, group? }) et faire dériver AppNavbar/BottomTabBar/MobileMenu de cette source unique.
- Extraire un composable useThemeToggle() (isDark + toggle) et l'utiliser dans ThemeToggle et MobileMenu pour supprimer la logique dupliquée.
- Ajouter un util formatCoins(n) (locale + arrondi) réutilisé par CoinBalance et MobileMenu.
- Remplacer les hex de marque en dur par var(--color-poke-*) dans AppNavbar, BottomTabBar, MobileMenu, PokeBall et générer RAMP de PButton depuis ces tokens.
- Factoriser la classe CSS de pilule active dans le CSS global et la réutiliser dans les trois composants de nav.
- Extraire un util pur formatCountdown(ms) hors de CountdownChip (testable unitairement).
- Faire dériver RarityBadge de RARITY_META (source unique de rareté) au lieu de sa map locale.
- Retirer les préfixes props. superflus dans les templates (CoinBalance, ConfirmDialog, RarityBadge) et typer les maps en Record<Union, …> pour l'exhaustivité.


### Composants de jeu (game / battle / slot) — front gacha Pokémon Nuxt 4

#### 🔴 `web/app/components/battle/BattleScene.vue` — 398 l.

_Moteur de combat animé rejouant un battleLog serveur (duels, PV, K.O., multi-stages Ligue) avec verdict final._

**Problèmes DX**
- Fichier « God » de la feature combat : ~140 lignes de script mêlant orchestration asynchrone (play/strike/wait), état réactif (foe/me/message/phase/stageNo…), mapping de données (stageList/totalDuels/wonDuels) et règles d'animation métier — trop de responsabilités dans un composant.
- Règles de combat « inventées » côté client en dur : dégâts 42/100, `Math.max(28, round(prob*0.6))`, ordre des strikes — logique de simulation qui devrait être un composable/util pur (useBattlePlayback) testable, pas noyée dans le rendu.
- Nombres magiques omniprésents : durées 180/240/160/760/1050/720 ms, seuils HP 50/20, dégâts 42/100/28, cap 30 pour reduced — aucun nommé.
- Couleurs HP en dur dans des fonctions (hpColor/hpText : gradients et hex répétés) au lieu de tokens ; duplication des seuils entre les deux fonctions.
- Gestion manuelle des timers + flag `cancelled` + `wait()` maison, idiome dupliqué avec ShinyReveal — pas de composable partagé.
- Accès aux tableaux avec `!` implicite et gardes `if (!stage) continue` / `if (!r) continue` révèlent un typage d'index lâche (noUncheckedIndexedAccess) contourné à la main.
- Beaucoup de defaults de props textuels en dur (winTitle/loseSub…) mélangeant contenu et composant.

**Améliorations**
- Extraire useBattlePlayback(stageList, options) : renvoie foe/me/message/phase + start()/cancel(), déplaçant toute la boucle async hors du composant → composant = rendu pur.
- Isoler les règles de simulation (dégâts, PV restants, séquence de strikes) dans une pure fn utils/battle testable unitairement.
- Centraliser les durées dans une const TIMING et les seuils/couleurs HP dans utils/battle (hpColor/hpText partagés, seuils uniques).
- Mutualiser l'utilitaire de timers annulables (useTimers()) avec ShinyReveal.
- Sortir les libellés par défaut vers une config i18n/const.

#### 🔴 `web/app/components/game/ShinyReveal.vue` — 337 l.

_Cinématique plein écran « rencontre shiny » (Poké Ball → flash → carte holo) séquencée par timers, skippable._

**Problèmes DX**
- Orchestration temporelle impérative dans le composant : machine à états phase (intro/burst/card) pilotée par des setTimeout manuels (at(1000)/at(1250)/at(2450)) avec gestion maison de timers, ready et closing — logique séquentielle qui gagnerait à être un composable useRevealSequence().
- Timings magiques en dur (1000/1250/2450/320 ms, seuil `Math.min(ms,30)`) éparpillés, non nommés ni centralisés — difficiles à ajuster/tester.
- Double source de gestion du reduced-motion : `usePreferencesStore().effectiveReducedMotion` ici vs `usePreferredReducedMotion()` (composable) dans BattleScene/SlotMachine — deux mécanismes concurrents pour la même préoccupation, incohérence de pattern.
- Préchargement d'image impératif (`new Image()`) et effets sonores (sound.resume/fanfare) mêlés à la logique de vue — effets de bord métier dans le setup du composant.
- Flags `let closing` / `let cancelled`-like en variables locales non réactives, pattern de garde manuel répété entre ShinyReveal et BattleScene (même idiome clearTimers/cancelled dupliqué).

**Améliorations**
- Extraire un composable useCinematic(steps) gérant phases + timers + clear + skip + reduced-motion, réutilisable pour ShinyReveal ET BattleScene.
- Centraliser les durées dans une const `SHINY_TIMELINE = { orb: 1000, burst: 1250, ready: 2450, fadeOut: 320 }`.
- Uniformiser la lecture du reduced-motion : choisir une seule source (le store OU le composable) et l'exposer partout de façon identique.
- Sortir le préchargement d'image dans un util preloadImage(url) et l'appel sonore dans un handler dédié pour clarifier les responsabilités.

#### 🟠 `web/app/components/game/BagModal.vue` — 337 l.

_Modale « Sac à dos » listant Charme Chroma et tickets biome/type, avec activation/désactivation via le store inventaire._

**Problèmes DX**
- Duplication structurelle forte : les sections « Tickets Biome » et « Tickets Type » sont deux blocs de template quasi identiques (~50 lignes chacun) ne différant que par l'icône, le libellé et le tint — devrait être un unique composant/boucle paramétré.
- Logique de construction des lignes dupliquée : biomeRows et typeRows font le même map + unshift du ticket actif orphelin ; seule change la source (biomeTickets/typeTickets) et les champs active/blocked.
- Mélange des préoccupations : construction de view-model (Row), orchestration d'appels store (activateCharme, toggleTicket), gestion des toasts et présentation cohabitent dans un composant — la logique métier gagnerait à passer dans un composable useBag().
- La clé de mutation en cours est un string ad hoc (`${row.kind}-${row.slug}`, 'charme') recomparé côté template (`busy === \`biome-${row.slug}\``) : couplage fragile par convention de chaînes, non typé.
- Valeurs magiques en dur : fallback couleur `#6d7280`, `#a8a77a`, seuil `rolls > 1` répété pour le pluriel.
- Pluriel/i18n en dur dans le code (`rolls > 1 ? 's' : ''`) répété — pas de helper de pluralisation.

**Améliorations**
- Extraire un composant TicketSection (props: title, icon, rows, kind, busy) rendu deux fois, supprimant ~90 lignes de template dupliqué.
- Extraire un composable useBagRows() (ou getter du store) construisant biomeRows/typeRows via une fonction générique makeRows(tickets, kind, activeSlug, activeName, blocked).
- Extraire useBagActions() encapsulant activateCharme/toggleTicket + toasts, laissant le composant purement présentationnel.
- Typer la clé busy (ex. `type BusyKey = 'charme' | \`${'biome'|'type'}-${string}\`` ou objet {kind,slug}) et un helper busyKey(row).
- Centraliser un helper plural(n) et les couleurs fallback dans utils/poke ou un tokens partagé.

#### 🟠 `web/app/components/game/BoosterRevealBatch.vue` — 304 l.

_Révélation d'une ouverture ×5 en grille (cartes/pièces/charme + choix résolus sur place) avec ligne de résumé._

**Problèmes DX**
- Duplication conceptuelle avec BoosterReveal : mêmes kinds (card/coins/charme/choice), mêmes médailles/burst/emerge redéclarés — deux composants qui devraient partager tuiles et helpers.
- Non-null assertions répétées `t.resolved!.card` / `t.resolved!.isNew` / `t.resolved!.quantity` dans le template : typage contourné par `!` là où un computed normalisant la tuile éviterait les assertions.
- Logique d'agrégation métier (newCount, coinsTotal, charmeCount, summary) dans le composant — devrait être un composable/pure function testable useBatchSummary(tiles).
- Construction de la chaîne summary avec pluriels en dur (`> 1 ? 's'`) répétés, comme dans BagModal — même dette de pluralisation.
- Constante d'animation `i * 0.07` (stagger delay) en dur, dupliquée sur 4 branches de template.

**Améliorations**
- Extraire une pure fn/composable summarizeTiles(tiles) renvoyant {cards,newCount,coins,charme,summary} — testable sans monter le composant.
- Ajouter un computed `displayTiles` qui aplatit choice-résolu → card (retire tous les `!`), template plus simple et sûr.
- Partager un sous-composant RevealTile (carte/pièces/charme) entre BoosterReveal et BoosterRevealBatch.
- Extraire le stagger (0.07s) et helper plural() en constantes/utils partagés.

#### 🟠 `web/app/components/game/BoosterReveal.vue` — 262 l.

_Révélation d'une ouverture simple (carte / pièces / charme / choix) via une union discriminée RevealView._

**Problèmes DX**
- Logique métier dans un composant de présentation : le calcul de « pity » (chance shiny = `q/500*1000/10`) contient une constante magique 500 et une formule métier qui devrait vivre dans un utilitaire/composable partagé (probablement dupliquée côté serveur).
- Le type RevealView est déclaré et exporté ici mais fortement couplé à BoosterRevealBatch (BatchTile est une quasi-réplique avec choiceId/resolved) — deux types de vue proches non factorisés.
- Duplication de blocs stage/burst/emerge pour coins et charme (structure identique, seul le contenu central change).
- Titres/sous-titres/labels en dur dans les computed (chaînes FR) — pas d'i18n ni de table de config par kind.
- isBig() encode une règle de rareté en dur ('Épique'/'Légendaire') redéfinie localement — risque d'incohérence avec la même règle ailleurs.

**Améliorations**
- Extraire computePityChance(quantity) et la constante SHINY_PITY_CAP=500 dans utils/poke (ou un composable), réutilisable et testable.
- Centraliser les prédicats de rareté (isHighRarity/isBig) dans utils/poke pour une source unique.
- Factoriser une petite table `REVEAL_META[kind] = { title, sub, icon, finishLabel, color }` pour supprimer les switch parallèles title/sub.
- Mutualiser RevealView / BatchTile (types partagés dans types/domain) pour éviter la dérive entre single et batch.

#### 🟠 `web/app/components/slot/SlotMachine.vue` — 198 l.

_Machine à sous 3×3 : reconstruit les rouleaux (padding + cibles) et les fait défiler avec arrêts décalés, puis illumine les lignes gagnantes._

**Problèmes DX**
- Logique d'animation impérative dense dans le composant (spin async, reflow forcé `void offsetHeight`, gestion noTransition/spun, wait maison) — candidat naturel à un composable useSlotReels().
- Constantes magiques : PAD=16, DURATIONS [1.9,2.3,2.7], marge +180 ms, cap reduced non présent ici mais seuils ROWS/[0,1,2] codés en dur et répétés (`[0,1,2].map` trois fois).
- API impérative via defineExpose({ spin }) piloté par un `ref` parent : couplage impératif fort et faible testabilité (il faut monter le composant pour tester la séquence) — la construction des strips pourrait être une pure fn.
- Répétition du littéral d'indices de colonnes `[0, 1, 2]` (idle, spin, stripStyle via strips) au lieu d'un dérivé de REELS/longueur.
- `wait()` maison redéfini (déjà présent dans BattleScene/ShinyReveal sous des formes différentes) — utilitaire non partagé.
- Accès `strips.value[col]!` avec non-null assertion — index typé lâche contourné.

**Améliorations**
- Extraire buildStrips(cells) et winningSet(lines) en pures fns dans utils/slot (testables sans DOM).
- Extraire un composable useSlotReels() portant l'orchestration (spun/noTransition/spin) ; le composant ne garde que le rendu.
- Nommer PAD/DURATIONS/tail-margin dans utils/slot et dériver les colonnes d'une const REEL_COUNT=3.
- Mutualiser wait()/timers avec les autres scènes animées via un util partagé.

#### 🟠 `web/app/components/battle/BattleStage.vue` — 111 l.

_Overlay plein écran (Teleport) hébergeant BattleScene, piloté par le store battle avec bouton Continuer._

**Problèmes DX**
- Import explicite `import { useBattleStore } from '~/stores/battle'` alors que les autres composants utilisent les stores en auto-import (useInventoryStore, useHubStore, usePreferencesStore sans import) — incohérence du pattern d'auto-imports Nuxt.
- Fallback couleur `'#7fc98a'` dupliqué ici ET dans BattleScene (default themeColor) — magie répétée à deux endroits.
- Le composant relaie ~8 props une à une depuis battle.config vers BattleScene (prop drilling verbeux) là où BattleScene pourrait consommer le store ou recevoir l'objet config.
- Le flag `finished` local + watch reset duplique une préoccupation d'état qui pourrait vivre dans le store battle.

**Améliorations**
- Supprimer l'import manuel du store pour s'aligner sur l'auto-import et rester cohérent avec le reste du repo.
- Passer un seul prop `:config="battle.config"` (ou consommer le store) à BattleScene plutôt que 8 props.
- Centraliser la couleur de thème par défaut (const DEFAULT_ARENA_COLOR) partagée.
- Envisager de porter l'état `finished` dans le store battle pour une source unique.

#### 🟡 `web/app/components/game/BoosterPack.vue` — 155 l.

_Carte visuelle d'un booster teintée par biome (Poké Ball, coût, progression), purement présentationnelle._

**Problèmes DX**
- Cast lâche `props.biome as Biome` : `biome` est typé `string` mais forcé en `Biome` pour biomeSlug — le typage réel (union Biome | '') n'est pas exprimé, le cast masque le cas ''.
- Constante WIDTHS en dur dans le composant (152/212/256) mêlant design tokens et logique ; facteurs 0.3 (ballSize) et ratios CSS multiples (0.46, 0.12…) non nommés.
- Le sentinelle '' pour « Tous les biomes » est une valeur magique implicite plutôt qu'un type/prop explicite (ex. biome?: Biome | null).

**Améliorations**
- Typer `biome: Biome | ''` (ou `Biome | null`) pour supprimer le cast et rendre le cas « tous biomes » explicite.
- Sortir WIDTHS et le facteur ballSize vers utils/booster ou des tokens partagés si réutilisés ailleurs.
- Composant déjà bien scindé (UI pure) — RAS majeur côté architecture.

#### 🟡 `web/app/components/game/OrbitSwirl.vue` — 131 l.

_Animation de tourbillon de dos de cartes autour d'un halo doré pendant l'ouverture d'un booster (purement décoratif)._

**Problèmes DX**
- Palette d'accents en dur dans le JS (`['#f4b53c', '#4f9fd6']`) mélangée à la logique de génération — devrait être une constante nommée ou un token.
- Constantes magiques (RADIUS=168, décalage 26, angles, delays 0.06) non nommées, dispersées entre computed et CSS (168px/236px répliqués en dur dans le style).
- Styles inline calculés (filter/zIndex/background) construits en JS alors que la plupart pourraient être des variables CSS (--i) pilotées par le style scoped — logique de présentation qui déborde dans le script.

**Améliorations**
- Nommer les constantes (ORBIT_RADIUS, BACK_ACCENTS) en tête de fichier ou dans utils.
- Déplacer un maximum du calcul de style vers des custom properties (--i, --n) et du CSS, ne garder en JS que l'index — réduit le couplage JS/CSS.
- Composant purement décoratif et isolé (aria-hidden) — impact DX faible, cosmétique.

#### 🟡 `web/app/components/game/HubPanel.vue` — 89 l.

_Panneau Hub « Aujourd'hui / Cette semaine » affichant les tuiles daily/weekly issues du store hub._

**Problèmes DX**
- Duplication des deux sections (Aujourd'hui / Cette semaine) : markup de liste + NuxtLink quasi identique, seules changent la source (dailyTiles/weeklyTiles), l'icône et les libellés d'état.
- Libellés d'état et icônes (« Disponible » / « À jouer », circle-dot/lock…) en dur dans le template plutôt que portés par la donnée de la tuile.
- `.catch(() => {})` silencieux sur ensureLong() — perte d'observabilité (aucun log/état d'erreur).

**Améliorations**
- Extraire un composant HubTileList (props: title, icon, tiles, availableLabel, lockedIcon) rendu deux fois.
- Porter label/état/icône d'état dans le modèle de tuile côté store pour un template agnostique.
- Composant léger et bien câblé au store (pas de fetch en plus) — bon exemple de séparation UI/données à généraliser.

#### 🟡 `web/app/components/slot/SlotSymbolTile.vue` — 36 l.

_Pastille présentant l'icône teintée d'un symbole de slot d'après la table SLOT_SYMBOLS._

**Problèmes DX**
- Accès `SLOT_SYMBOLS[props.symbol]` sans garde : si un symbole inconnu arrivait, meta serait undefined (typage dépend de la robustesse de la table) — pas de fallback explicite.
- Très bon composant atomique : responsabilité unique, data-driven — quasi aucun problème structurel.

**Améliorations**
- Ajouter un fallback meta (ou garantir via type que SlotSymbol ⊆ keys de SLOT_SYMBOLS) pour robustesse.
- Servir de modèle : c'est la granularité cible (petit, présentationnel, piloté par une table).

**Patterns transverses (groupe)**
- Orchestration temporelle impérative dupliquée : ShinyReveal, BattleScene et SlotMachine réimplémentent chacun leur propre wait()/setTimeout + gestion/annulation de timers + gardes cancelled/closing. Aucun composable partagé (useTimers/useCinematic) — duplication et testabilité faible.
- Logique métier logée dans des composants de présentation : formule de pity (BoosterReveal), règles de simulation de combat/dégâts (BattleScene), construction des rouleaux (SlotMachine), agrégats de résumé (BoosterRevealBatch). Ces calculs devraient être des pures fns/composables testables, conformément à la séparation UI/logique de Nuxt 4.
- Nombres et couleurs magiques omniprésents : durées d'animation, seuils HP (50/20), dégâts (42/100), PAD/DURATIONS slot, palettes hex, fallback couleurs (#7fc98a dupliqué). Peu de constantes nommées, peu de tokens partagés.
- Duplication de blocs de template proches : BagModal (sections biome/type), HubPanel (aujourd'hui/semaine), BoosterReveal vs BoosterRevealBatch (kinds card/coins/charme/choice + médailles). Autant de sous-composants génériques non encore extraits.
- Typage contourné localement : casts (biome as Biome) et non-null assertions répétées (t.resolved!, strips.value[col]!, gardes if(!r)) traduisent un noUncheckedIndexedAccess/unions mal normalisés plutôt que des computed de normalisation.
- Incohérences de pattern Nuxt : reduced-motion lu via le store (ShinyReveal) vs via usePreferredReducedMotion() (BattleScene/SlotMachine) ; store importé explicitement (BattleStage) vs auto-import ailleurs.
- Pluralisation/libellés FR en dur répétés (`n > 1 ? 's' : ''`, titres/sous-titres dans des switch) — aucun helper plural() ni couche i18n, chaînes disséminées dans les composants.
- Types de vue proches non factorisés : RevealView (BoosterReveal) et BatchTile (BoosterRevealBatch) partagent 3 kinds sur 4 mais sont déclarés séparément — risque de dérive.

**Quick wins (groupe)**
- Supprimer l'import explicite `import { useBattleStore }` dans BattleStage.vue pour s'aligner sur l'auto-import (zéro changement de comportement).
- Extraire une const partagée DEFAULT_ARENA_COLOR = '#7fc98a' consommée par BattleStage et BattleScene (dé-duplique la magie).
- Ajouter un helper plural(n) (utils) et remplacer les `n > 1 ? 's' : ''` de BagModal et BoosterRevealBatch.
- Nommer les timelines : SHINY_TIMELINE (ShinyReveal), TIMING combat (BattleScene), SLOT { PAD, DURATIONS } déjà semi-fait — les regrouper en tête de fichier/util.
- Extraire computePityChance(quantity)/SHINY_PITY_CAP=500 et les prédicats de rareté (isHighRarity) dans utils/poke, réutilisés par BoosterReveal.
- Ajouter des computed de normalisation pour retirer les non-null assertions (`displayTiles` dans BoosterRevealBatch, cast biome typé Biome|'' dans BoosterPack).
- Uniformiser la source du reduced-motion (choisir usePreferredReducedMotion() partout, ou le store partout).
- Factoriser HubPanel et BagModal en sous-composants de liste paramétrés (HubTileList, TicketSection) — pur découpage, comportement inchangé.


### Composants de jeu (spin / chat / leaderboard / league / settings / team / trade / gym / stats / tournament)

#### 🔴 `web/app/components/spin/AdventureScene.vue` — 1133 l.

_Overlay plein écran orchestrant toute l'aventure (sélection starter, carte à nœuds, dialogues, choix, combats VS, récompenses, évolutions, verdicts, audio)._

**Problèmes DX**
- Fichier « God » : ~430 lignes de script pilotent à elles seules la machine à états du run (step/phase), la construction des données VS, la séquence post-combat (file d'attente evolve/reaction/milestone), l'audio, le mapping icônes/CTA/choix par kind, et 700 lignes de template+CSS. Responsabilité unique largement violée.
- Machine à états implicite dispersée : `step` (6 valeurs) et `spin.phase` sont croisés dans onDialogueDone/onRewardDone/onEvolveDone/onChoice/onCta sans état centralisé — logique difficile à suivre et à tester.
- État mutable hors du système réactif (`combatTrack`, `vsNode`, `vsBattle`, `reactSpeaker`, `reactLine` en `let`) mélangé avec des refs : couplage temporel fragile, non testable en isolation.
- Logique métier dans le composant : `versusFrom()` recalcule un index de combat en refiltrant `spin.nodes`, la table `ICON`, les maps `cta`/`choices` (prix, %, libellés) encodent des règles de jeu qui appartiennent au store/domaine.
- Valeurs magiques en dur : coûts (30/40/45/25/35/15 pièces), bonus (+8 %, +12 %, +45 XP…), délais (750/1100 ms), z-index 55, couleur fallback '#8b5cc4' répétée.
- Le mapping kind→libellé (heading 'CONSEIL DES 4', 'ARÈNE', 'Sauvage'…) est dupliqué entre `versusFrom`, `cta`, `choices` et le template.
- Chaînes de `if (n.kind === …)` répétées dans onChoice et onCta (grand switch manuel par kind) — candidat idéal à une table de handlers.
- Gestion d'erreur d'image ad hoc (`portraitBroken`) répétée à l'identique de VersusIntro/LeagueBattle.

**Améliorations**
- Extraire un composable `useAdventureFlow()` (ou machine XState-like) qui possède step/phase, la séquence post-combat et les transitions ; le composant ne fait plus que rendre + déléguer les events.
- Extraire un composable `useAdventureAudio(spin, phase, step, vs)` regroupant updateMusic + les 3 watchers audio.
- Sortir `versusFrom`, la map `ICON`, et les fabriques `cta`/`choices` vers un module `~/utils/adventure` (ou le store) et exposer les libellés/coûts comme constantes nommées partagées.
- Remplacer les cascades `if (n.kind === …)` par un `Record<AdvNode['kind'], Handler>` (table de dispatch).
- Découper le template en sous-composants : `<AdventureNodeScene>` (les 8 variantes de scène), `<AdventureVerdict>` (victoire/défaite), `<AdventureChoices>` — chacun avec son CSS colocalisé.
- Centraliser les constantes de coût/bonus/délais dans le domaine pour partage avec le back.

#### 🟠 `web/app/components/chat/ChatWidget.vue` — 381 l.

_Widget de tchat flottant global (FAB + panneau/feuille) : rendu, scroll, autogrow, envoi, modération, cycle de vie de la connexion._

**Problèmes DX**
- Composant à responsabilités multiples : présentation + gestion du scroll (nearBottom), autogrow du textarea, submit, mapping statut→label, modération, start/stop du temps réel.
- Logique DOM impérative (scrollToBottom, onScroll, autogrow via style.height, seuils 90 px / 96 px en dur) mêlée à la logique métier — peu testable.
- `statusLabel` (mapping d'état) est de la logique de présentation qui gagnerait à être colocalisée avec le store ou un helper partagé (le statut est aussi rendu via `dot--${status}`).
- `nearBottom` en `let` non réactif : état implicite fragile.

**Améliorations**
- Extraire `useStickyScroll(listEl)` (nearBottom + scrollToBottom) et `useAutogrow(inputEl, max)` en composables.
- Déplacer le mapping statut→label dans le store chat (getter) ou un util partagé.
- Découper un sous-composant `<ChatComposer>` (textarea + bouton + logique d'envoi) pour alléger le widget.

#### 🟠 `web/app/components/spin/VersusIntro.vue` — 340 l.

_Transition d'écran « VS » façon arène (bannières, sprites, éclat, flash) séquencée par timers, émet reveal/done._

**Problèmes DX**
- Durées d'animation en dur dupliquées dans le JS (IN 700 / HOLD 820 / OUT 560) ET dans le CSS (slide .7s, vsFade .56s…) : deux sources de vérité à garder synchronisées manuellement.
- Pattern timer + onBeforeUnmount + reduced-motion réimplémenté à l'identique dans EvolveReveal et LeagueBattle (duplication).
- Gestion d'image cassée (`meBroken`/`foeBroken`) dupliquée d'AdventureScene.
- `font-family: Nunito, …` codé en dur dans le style au lieu du token `--font-body`/`--font-display` utilisé partout ailleurs (incohérence).
- Second `<Teleport to="body">` alors que le parent AdventureScene téléporte déjà : double téléportation à raisonner.

**Améliorations**
- Extraire un composable `useTimedSequence(steps, { reducedMotion })` réutilisable par VersusIntro/EvolveReveal/LeagueBattle qui gère timers, cleanup et le raccourci reduced-motion.
- Exposer les durées via des custom properties CSS injectées depuis le JS (une seule source), ou centraliser les durées dans un module de constantes d'animation.
- Factoriser un composable/directive `useBrokenImage()` pour l'état de fallback d'image partagé.
- Utiliser les tokens de police au lieu de « Nunito » littéral.

#### 🟠 `web/app/components/league/LeagueBattle.vue` — 255 l.

_Rejoue étape par étape le défi de la Ligue (révélation séquencée des maîtres/duels puis verdict)._

**Problèmes DX**
- Réimplémente le pattern timers + onBeforeUnmount + reduced-motion (3e occurrence).
- Cadence `step = 720` ms et offset 300 ms en dur dans le composant.
- `stageLabel()` (npc→'Maître', player→'Dresseur') est de la logique de libellé qui gagnerait à vivre près du domaine LeagueRun.
- Bloc avatar+fallback (`duel__av` avec img/UIcon) dupliqué deux fois (joueur/champion) et similaire à TourneyAvatar.

**Améliorations**
- Réutiliser `useTimedSequence` (révélation incrémentale).
- Réemployer le composant `<Avatar>` proposé pour les côtés de duel.
- Déplacer les libellés de type d'adversaire dans un helper de domaine.

#### 🟠 `web/app/components/team/TeamCard.vue` — 233 l.

_Carte de membre d'équipe (langage visuel HoloCard adapté aux données réduites : type, rareté, holo, shiny)._

**Problèmes DX**
- Réutilise bien cardTheme (TYPE_GRADIENT/RARITY_META/hexA) mais la logique holo (`holoAnimated` sur rareté Épique/Légendaire, `frameColor` shiny) recopie vraisemblablement celle de HoloCard : duplication de règles de rendu de carte entre deux composants.
- Comparaisons de rareté par chaîne littérale ('Épique', 'Légendaire') : fragile au renommage, non typo-safe.
- `WIDTHS` (sm/md/lg) en dur — cohérent mais dupliqué si HoloCard a sa propre échelle.
- Bloc CSS très volumineux (135 lignes) fortement couplé à la structure HoloCard : coût de maintenance double.

**Améliorations**
- Extraire un composable `useCardVisuals(member|card)` centralisant grad/rarity/holo/frameColor/shiny, partagé par HoloCard et TeamCard.
- Remplacer les tests de rareté littéraux par un flag dérivé de RARITY_META (ex. `rarity.animatedHolo`).
- Mutualiser les échelles de largeur et, si possible, le CSS de face de carte.

#### 🟠 `web/app/components/spin/RewardReveal.vue` — 215 l.

_Révélation animée d'une récompense de run (ruban, disque brillant, confettis, montant)._

**Problèmes DX**
- Type métier `AdvReward` importé depuis `~/stores/spin` : un type de domaine réside dans un store, couplant tout consommateur au store (devrait être dans `~/types/domain`).
- Deux maps parallèles `ICONS` et `BANNERS` indexées par `reward.kind` avec fallback dupliqué — deux sources à maintenir en phase, et `kind` typé `string` (Record<string,…>) plutôt que l'union des kinds.
- Nombres magiques de décor (16 confettis, 8 sparks) et palette par kind en dur, non partagée avec les teintes équivalentes ailleurs.

**Améliorations**
- Déplacer `AdvReward` (et les autres types du store) vers `~/types/domain` et réexporter.
- Fusionner ICONS/BANNERS en une seule table `REWARD_META: Record<AdvReward['kind'], { icon; banner; c1; c2 }>` typée sur l'union.
- Nommer les constantes de décor (CONFETTI_COUNT, SPARK_COUNT).

#### 🟠 `web/app/components/trade/CardPicker.vue` — 187 l.

_Modale de sélection de carte à échanger (onglets de rareté + grille, chargement via `load(rarity)`)._

**Problèmes DX**
- Duplique la structure de AvatarPicker (modale + load async + loading + try/catch + grille de cartes rondes) : deux implémentations quasi jumelles à maintenir.
- `catch {}` silencieux (comme AvatarPicker).
- La vignette carte (`pcard` frame/img/name/qty) recoupe TradeCardMini sans le réutiliser.

**Améliorations**
- Factoriser un composant générique `<CardGridPicker>` (props: rarities, load, busy, événement pick) dont AvatarPicker et CardPicker sont des cas.
- Réutiliser TradeCardMini pour la vignette de grille.
- Gérer l'erreur de `load` (toast/état).

#### 🟠 `web/app/components/settings/AvatarPicker.vue` — 168 l.

_Modale de choix d'avatar : charge les cartes possédées via prop `load`, tri (shiny > rareté > nom), marque l'actuel._

**Problèmes DX**
- Table `RANK` (rareté→ordre) définie localement ; un ordre de rareté similaire est probablement nécessaire ailleurs (CardPicker trie aussi par rareté) — duplication potentielle de la logique de tri par rareté.
- Pattern « modale qui reçoit une fonction `load` async + gère loading/try-catch/reset » identique à CardPicker : duplication structurelle.
- Couleur shiny `#c9b3ff` en dur (cf. RankAvatar).
- `catch {}` avale l'erreur sans feedback utilisateur ni log.

**Améliorations**
- Extraire `useAsyncPickerData(load)` (loading + data + erreur) partagé avec CardPicker.
- Centraliser l'ordre de rareté (ex. dans cardTheme `RARITY_META` ou un `RARITY_ORDER`) et réutiliser partout.
- Remonter au moins un toast/onError sur échec de chargement.

#### 🟠 `web/app/components/trade/TradeRow.vue` — 164 l.

_Ligne d'échange (cartes demandée/en retour, acteurs, statut, actions contextuelles selon rôle/étape)._

**Problèmes DX**
- La logique de rôle/étape→actions (`canAcceptOffer`/`canConfirm`/`canCancel`) encode des règles de workflow d'échange dans le composant : gagnerait à vivre dans le domaine/store pour être réutilisée et testée.
- Map `STATUS` (statut→label/cls) en dur dans le composant : à colocaliser avec le domaine DomainTrade (réutilisable dans une liste, un détail, etc.).
- 5 émissions distinctes (accept/decline/confirm/reject/cancel) très proches : surface d'événements large.

**Améliorations**
- Déplacer STATUS et les prédicats d'action vers un helper de domaine `tradeActions(trade, me)` retournant la liste d'actions disponibles ; le composant boucle dessus.
- Envisager un seul événement `action: TradeAction` au lieu de 5 émissions.

#### 🟠 `web/app/components/spin/StarterSelect.vue` — 136 l.

_Écran de choix du starter (une carte pastel par starter avec aperçu de la chaîne d'évolution)._

**Problèmes DX**
- Type `StarterOption` importé du store `~/stores/spin` (type de domaine dans un store, cf. RewardReveal).
- Map de couleurs `TYPE_HEX` locale (4 types seulement) qui duplique/contredit `TYPE_GRADIENT` déjà défini dans `~/utils/cardTheme` : deux sources de vérité pour les couleurs de type.
- Cast `(s.chain[0]?.type ?? 'Feu') as PokeType` : cast lâche masquant une hypothèse non garantie (chaîne potentiellement vide).

**Améliorations**
- Déplacer `StarterOption` vers `~/types/domain`.
- Réutiliser `TYPE_GRADIENT`/une fonction `typeColor(type)` de cardTheme au lieu d'une table locale partielle.
- Garantir un starter non vide en amont (typage) pour supprimer le cast et le `?? 'Feu'`.

#### 🟠 `web/app/components/spin/StarterHud.vue` — 123 l.

_Bandeau HUD du starter pendant le run (sprite, niveau, XP, badges, pièces, vies, objet, stades)._

**Problèmes DX**
- Consomme directement `useSpinStore()` en global : couplage fort au store (pas de props), rend le composant non réutilisable/non testable hors contexte run.
- Le composant lit une dizaine de champs du store (level, badges, badgeGoal, runCoins, lives, heldItem, xpPct, evoChain, stage) — surface de couplage large.
- Chips (badge/coins/life/item) très répétitives : structure quasi identique copiée 4 fois.

**Améliorations**
- Passer les données en props (objet `starter`/`progress`) pour découpler du store et permettre les stories/tests ; laisser le parent brancher le store.
- Boucler sur une liste de descripteurs de chips (`{ icon, cls, value, title, show }`) plutôt que 4 blocs copiés.

#### 🟠 `web/app/components/leaderboard/RankAvatar.vue` — 88 l.

_Avatar joueur avec anneau teinté par rareté (iridescent si shiny) et pastille d'honneur (couronne/médaille)._

**Problèmes DX**
- Le mapping médaille→emoji/label (1/2/3) est de la donnée de présentation en dur qui existe aussi implicitement côté tournoi (risque de divergence).
- Couleur shiny `#c9b3ff` en dur, répétée dans 9 composants (AvatarPicker, TeamCard, TourneyAvatar, TradeCardMini…).
- Le style d'anneau shiny (box-shadow) est quasi identique à celui de TourneyAvatar/AvatarPicker : duplication de motif.

**Améliorations**
- Introduire un token `--color-shiny`/`SHINY_COLOR` unique et l'utiliser partout.
- Extraire un composant `<Avatar>` bas niveau (frame + anneau + shiny) réutilisé par RankAvatar/TourneyAvatar/AvatarPicker.
- Centraliser le mapping médaille dans un util partagé avec le tournoi.

#### 🟡 `web/app/components/leaderboard/LeaderRow.vue` — 154 l.

_Ligne de classement (rang, avatar, pseudo, badges, compteurs standard/légendaire/shiny, score)._

**Problèmes DX**
- Purement présentational et propre ; seule friction : `row.badges.slice(0, 8)` — le plafond 8 est une valeur magique non nommée.
- Les couleurs des pastilles de compteur (std/leg/shy) sont en dur et rejouent des teintes de rareté définies ailleurs (cardTheme).

**Améliorations**
- Nommer une constante `MAX_BADGES_SHOWN`.
- Tirer les teintes leg/shy des tokens de rareté partagés.

#### 🟡 `web/app/components/gym/GymTile.vue` — 152 l.

_Tuile d'arène teintée par type, badge en évidence, statut (obtenu/à défier/verrouillé)._

**Problèmes DX**
- Bon usage de `typeSlug` + tokens `--color-type-*` (référence de bonne pratique dans ce lot).
- Le calcul `status` (hasBadge/canAttempt→label+kind) est de la logique de présentation qui pourrait être partagée si l'état d'arène est affiché ailleurs.
- Teintes succès `#5bbf82`/`#8fd6a8` en dur (répétées dans tout le lot).

**Améliorations**
- Optionnel : exposer le statut d'arène via un getter de domaine si réutilisé.
- Tirer les teintes succès d'un token partagé `--color-success`.

#### 🟡 `web/app/components/spin/EvolveReveal.vue` — 150 l.

_Animation d'évolution façon Pokémon (silhouettes clignotantes, flash, révélation) avec CTA de continuation._

**Problèmes DX**
- Répète le pattern timer/onBeforeUnmount/reduced-motion (voir VersusIntro).
- Délai 2100 ms en dur qui doit correspondre exactement à la durée des keyframes CSS flashFrom/flashTo (2.1s) — couplage caché entre JS et CSS.
- Keyframes flashFrom/flashTo entièrement inversées l'une de l'autre : duplication verbeuse (24 paliers) difficile à maintenir.

**Améliorations**
- Réutiliser le composable `useTimedSequence`.
- Dériver la durée d'une constante partagée avec le CSS (custom property).
- Générer les clignotements via une seule keyframe + animation-direction/alternance plutôt que deux keyframes miroir.

#### 🟡 `web/app/components/spin/DialogueBox.vue` — 133 l.

_Boîte de dialogue à effet machine à écrire (clic pour compléter/avancer), émet done en fin._

**Problèmes DX**
- Vitesse de frappe (24 ms) et cap reduced-motion en dur dans le composant.
- Logique de typewriter (timer, clear, watch lines) mêlée à la présentation : peu testable en l'état.
- `--tc` consommé en fallback dans le CSS mais fourni par un ancêtre (AdventureScene) : dépendance implicite non documentée dans les props.

**Améliorations**
- Extraire un composable `useTypewriter(lines, { speed, reduced })` retournant { shown, typing, isLast, tap } — réutilisable et unit-testable.
- Exposer la vitesse en prop avec valeur par défaut nommée.

#### 🟡 `web/app/components/chat/ChatMessageBubble.vue` — 103 l.

_Bulle de message (mienne/autre, pseudo coloré déterministe, horodatage, bouton bannir)._

**Problèmes DX**
- Deux logiques réutilisables enfouies : hash de pseudo→couleur et formatage de date relative fr-FR, toutes deux susceptibles d'être réutilisées ailleurs (leaderboard, etc.).
- Palette `NAME_COLORS` en dur, distincte des autres palettes du projet (encore une liste de couleurs isolée).

**Améliorations**
- Extraire `colorFromString(str, palette)` et `formatChatTime(date)` en utils partagés/testables.
- Centraliser les palettes décoratives dans un module unique de tokens.

#### 🟡 `web/app/components/league/LegendaryStrip.vue` — 71 l.

_Bandeau des légendaires en jeu (aperçu décoratif, ou boutons sélectionnables pour choix de récompense)._

**Problèmes DX**
- `<component :is="pickable ? 'button' : 'div'">` : polymorphisme d'élément qui complique l'a11y (le div ne réagit pas au clavier, seul le button oui) et rend le contrat ambigu.
- Couleur or `#e0a92e`/`#f6c453` en dur, répétée dans d'autres composants (leaderboard, verdicts).

**Améliorations**
- Toujours rendre un `<button>` (désactivé si non pickable) ou séparer clairement les deux modes, pour une a11y cohérente.
- Tirer les teintes or d'un token partagé.

#### 🟡 `web/app/components/stats/StatTile.vue` — 70 l.

_Tuile de statistique (grand nombre + intitulé + sous-texte, icône teintée par ton)._

**Problèmes DX**
- Propre et réutilisable ; mêmes remarques que AnecdoteCard : les variantes de ton (poke/shiny/gold/ocean/leaf) redéfinissent des couleurs déjà présentes ailleurs.
- Les palettes de tons ne sont pas partagées avec les autres composants qui utilisent les mêmes teintes (shiny #c9b3ff, or #f6c453…).

**Améliorations**
- Centraliser les couleurs de ton dans des tokens (`--tone-shiny`, `--tone-gold`…) réutilisés par StatTile/AnecdoteCard et le reste.

#### 🟡 `web/app/components/stats/AnecdoteCard.vue` — 68 l.

_Carte anecdote (icône teintée par ton + intitulé + vedette + détail)._

**Problèmes DX**
- Composant présentational propre ; le mapping ton→(accent/wash) est en CSS via classes `anec--*`, cohérent avec StatTile mais dupliquant la même mécanique de « tons ».

**Améliorations**
- Mutualiser la convention de « tons » (accent/wash par variante) entre AnecdoteCard et StatTile via des tokens/classes utilitaires partagées.

#### 🟡 `web/app/components/trade/TradeCardMini.vue` — 65 l.

_Vignette compacte d'une carte échangée (sprite + nom + rareté, teinte par rareté)._

**Problèmes DX**
- Bien factorisé via RARITY_META ; le motif frame rond teinté (radial-gradient + inset ring) est répété tel quel dans CardPicker/AvatarPicker/LegendaryStrip — candidat à une primitive commune.
- Nom de fichier `TradeCardMini` vs classe CSS `tcm` : abréviation opaque (naming peu révélateur en CSS).

**Améliorations**
- Extraire une primitive `<CardFrame :rarity>` (le cercle/carré teinté) réutilisée par tous les pickers.
- Préférer des noms de classes lisibles ou une convention documentée.

#### 🟡 `web/app/components/settings/SettingRow.vue` — 57 l.

_Primitive de mise en page d'une ligne de réglage (icône + titre + description + slot contrôle)._

**Problèmes DX**
- Composant propre et à responsabilité unique — aucun problème structurel notable.

**Améliorations**
- RAS ; éventuellement documenter qu'il s'agit d'une primitive de layout réutilisable (bon exemple à suivre).

#### 🟡 `web/app/components/tournament/TourneyAvatar.vue` — 45 l.

_Avatar compact (sprite carte-avatar) pour participants/matchups/résultats, variante shiny._

**Problèmes DX**
- Recoupe fortement RankAvatar et le frame de AvatarPicker (même cercle + anneau + halo shiny) sans base commune : duplication d'un motif d'avatar présent au moins 3 fois.
- Couleur shiny `#c9b3ff` en dur (9e occurrence).

**Améliorations**
- Fonder RankAvatar/TourneyAvatar (et le frame d'AvatarPicker) sur un composant `<Avatar>` unique paramétré (size/shiny/ring).
- Utiliser le token `--color-shiny` partagé.

**Patterns transverses (groupe)**
- Couleurs en dur massivement dupliquées au lieu de tokens : shiny #c9b3ff dans 9 composants, vert succès 5bbf82 dans 17, gradient rouge poke ee5a48 dans 10, or f6c453/e0a92e un peu partout. Le projet a déjà des tokens (--color-poke-*, --color-type-*, cardTheme) mais les composants les court-circuitent souvent.
- Types de domaine hébergés dans les stores : AdvReward, StarterOption (et probablement d'autres) sont importés depuis ~/stores/spin au lieu de ~/types/domain, couplant les composants purement présentationnels au store.
- Pattern d'animation séquencée (setTimeout + onBeforeUnmount + court-circuit reduced-motion + durées JS qui doublent les durées CSS) réécrit à l'identique dans VersusIntro, EvolveReveal et LeagueBattle — aucun composable partagé.
- Motif d'avatar rond (frame + anneau teinté + variante shiny) réimplémenté dans RankAvatar, TourneyAvatar et AvatarPicker ; motif de « frame de carte teinté par rareté » réimplémenté dans TradeCardMini, CardPicker, AvatarPicker.
- Modales-pickers (AvatarPicker, CardPicker) partagent une mécanique quasi identique (prop load async, loading, try/catch silencieux, grille) sans abstraction commune ; les erreurs de load sont avalées sans feedback.
- Logique métier/règles de jeu dans les composants : coûts et bonus chiffrés (AdventureScene), mappings statut→label et prédicats d'action (TradeRow, ChatWidget, LeagueBattle) qui appartiennent au domaine/store.
- Un fichier God dominant (AdventureScene, 1133 lignes) concentre machine à états, audio, données VS, séquence post-combat et rendu — de loin le principal foyer de dette DX du lot.
- Valeurs magiques non nommées récurrentes (délais ms, seuils px, plafonds de listes comme slice(0,8), tailles de décor).

**Quick wins (groupe)**
- Introduire les tokens manquants (--color-shiny, --color-success, --color-gold) et remplacer les hex en dur correspondants (#c9b3ff, 5bbf82/8fd6a8, f6c453/e0a92e) par ces variables dans les ~20 composants — pur remplacement, sans changement de rendu.
- Déplacer AdvReward et StarterOption de ~/stores/spin vers ~/types/domain et réexporter : découple RewardReveal/StarterSelect du store sans toucher au comportement.
- Fusionner ICONS+BANNERS de RewardReveal en une seule REWARD_META typée sur l'union des kinds.
- Nommer les valeurs magiques évidentes : MAX_BADGES_SHOWN (LeaderRow), TYPEWRITER_SPEED (DialogueBox), les délais/cadences (VersusIntro, LeagueBattle, EvolveReveal), CONFETTI_COUNT/SPARK_COUNT (RewardReveal).
- Extraire useTimedSequence() et l'appliquer à VersusIntro/EvolveReveal/LeagueBattle : supprime trois copies du même pattern timers/cleanup/reduced-motion.
- Extraire un composant <Avatar> bas niveau et l'utiliser dans RankAvatar/TourneyAvatar/AvatarPicker + un <CardFrame :rarity> pour TradeCardMini/CardPicker/AvatarPicker.
- Remplacer 'font-family: Nunito, …' en dur (VersusIntro) par les tokens de police du projet.
- Ajouter un onError (toast) dans les catch silencieux de AvatarPicker et CardPicker.
- Centraliser un RARITY_ORDER dans cardTheme et réutiliser pour les tris de AvatarPicker et CardPicker.

