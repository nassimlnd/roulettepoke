# Front — Architecture cible & plan de migration

> Proposition d'architecture visant une meilleure **DX** (Clean Code + bonnes pratiques Nuxt 4 / Vue 3), **sans rien casser** : Nuxt auto-importe `components/`, `composables/`, `stores/`, `utils/` par nom de fichier — la refonte se fait donc par **barrels + colocation + extraction**, en incrémental, `lint`/`typecheck`/`build` verts à chaque étape.

## Synthèse

Le front est globalement sain sur le fond : une architecture en couches volontaire et bien commentée (repositories = seul contact API, normalize = anti-corruption wire→domaine, stores Pinia, composables, types séparés wire/domain), TS strict, tests présents. La dette est structurelle et très concentrée, pas conceptuelle. Trois symptômes dominent. (1) Des « God files » : api.ts (535 l.), domain.ts (456 l.), repositories/index.ts (297 l.) et normalize.ts (418 l.) agrègent TOUTES les features dans un seul module ; côté stores, spin.ts (854 l.) et chat.ts (174 l.) portent contenu+moteur+réseau ; côté UI, AdventureScene.vue (1133 l.), league.vue (776 l.), team.vue (657 l.), play.vue (713 l.), HoloCard.vue (433 l.) et BattleScene.vue (398 l.) mêlent template multi-états, logique métier, formatage et parfois accès données brut. (2) De la duplication systémique de patterns transverses non factorisés : pattern cache TTL (réécrit dans 6 stores), refreshBalance()/appel /auth/me brut (3 copies + pages), try/catch/toast d'action (des dizaines d'occurrences), orchestration de timers d'animation (3 composables réinventés), navigation déclarée 3 fois, moteur audio dupliqué (useSound vs useSpinAudio), helpers de présentation (probColor/typeColor/timeAgo/pluriel/pct) recopiés page par page avec des hex DIVERGENTS. (3) Des valeurs magiques et sources de vérité éclatées : couleur de marque #ee5a48/#e8402f et shiny #c9b3ff en dur dans 9-10 composants alors que des tokens existent, constantes métier (pity 1/500, seuil fusion 10, coûts) réécrites en clair à plusieurs endroits, clés localStorage aux préfixes incohérents, chemins de routes en dur. La contrainte clé : Nuxt auto-importe components/composables/stores/utils par nom de fichier, donc toute la refonte peut se faire par colocation + barrels + extraction sans casser un seul import, en incrémental et lint/typecheck/build verts.

## Principes directeurs

- Colocation par feature plutôt que par type technique, MAIS sans jamais casser les auto-imports Nuxt : on découpe les God files en sous-modules et on expose un barrel index.ts qui réexporte tout, de sorte que les imports existants (~/types, ~/repositories, ~/utils) restent inchangés.
- Séparation stricte des couches : Vue (pages/composants) = rendu + binding ; composables/stores = orchestration + état ; repositories = accès HTTP ; normalize = transformation pure wire→domaine ; utils = fonctions pures. Aucune page/composant n'appelle useApi()/un repository directement — tout passe par un store ou un composable.
- Une seule source de vérité par donnée : une constante/token/type est défini une fois et importé partout (couleurs de marque = tokens CSS, constantes métier = module de règles de jeu, routes = module de constantes, navigation = config unique).
- Toute logique métier ou de calcul (pity, dégâts, cotes d'aventure, décodage JWT, formatage) vit dans une fonction pure testable (utils/) ou un composable, jamais dans un getter Pinia, un setTimeout de composant ou un bloc <script> de page.
- Factoriser les patterns transverses en primitives réutilisables : un helper de cache TTL, un composable useAsyncAction (busy+toast), un composable de séquence temporelle animée, un moteur audio unique, une couche de fixtures de test.
- Respecter les conventions Nuxt 4 : répertoire app/, components pathPrefix:false (donc noms de fichiers uniques et parlants), auto-imports de composables/stores/utils — on ne crée pas de sous-dossiers utils/ profonds sans vérifier que Nuxt les auto-importe (il ne scanne que le premier niveau de app/utils et app/composables : les sous-modules internes doivent être réexportés par un fichier de premier niveau).
- Étapes réversibles et non-breaking d'abord (barrels, extraction, constantes), changements de signature/comportement (factory de repos, suppression de wrappers) plus tard et isolément.

## Conventions cibles

- Types : préfixe Wire* pour TOUS les DTO bruts, Domain* pour TOUS les types normalisés — appliqué à 100% ou abandonné, jamais partiel. Primitives et unions de statut (TradeStatus, TournamentStatus, CardLevel, MedalPlacement) définies une seule fois dans types/primitives.ts et importées côté api ET domain. Les view-models purement front (aventure) et les concepts de présentation (CelebrationTier) ne vivent pas dans domain.ts. Aucun type de domaine dans un store : AdvReward/StarterOption → types/domain, réexportés.
- Barrels : chaque dossier découpé (types/, repositories/, normalize/) expose un index.ts qui réexporte tout. Les imports publics restent ~/types, ~/repositories — le découpage interne est invisible aux consommateurs. Règle : un barrel ne contient QUE des réexports, aucune logique.
- Repositories : un fichier par feature, un repo = un objet ou une factory useXxxRepo(api = useApi()) capturant api une fois (cible, étape breaking tardive). Les repos renvoient TOUJOURS du domaine (jamais unknown[] ni WireX brut). Chemins d'endpoints centralisés. Toute normalisation vit dans normalize/, jamais inline dans le repo.
- Normalizers : fonctions pures, une par feature, découpées en sous-fonctions à responsabilité unique (normalizeOdds/normalizeGymStats… au lieu d'un normalizeStats de 60 lignes). La règle shiny passe par un unique isShinyRarity(). Aucune préoccupation UI (couleurs ODDS_META → constants/tokens).
- Stores Pinia : convention unique = setup stores (plus idiomatique Nuxt 4) — à terme, préférences déjà en setup sert de modèle. Un store = état + cache + orchestration, PAS de labels FR/routes/navigateTo/useToast/calcul pur. Cache via createTtlResource() partagé. Couplage cross-store passé par les actions publiques (wallet.credit() et non wallet.coins +=). L'état non-sérialisable (socket, resolver) reste hors state mais est encapsulé dans un composable/service, pas en variable module dans le store.
- Composables : préfixe use*, une responsabilité. La logique répétée (async action, page data, séquence animée, tilt de carte, socket chat) devient un composable. Accès API uniquement via store ou repo — jamais useApi() dans une page.
- Utils : fonctions pures, auto-importées depuis le 1er niveau de app/utils uniquement (les sous-modules game/adventure/* sont importés explicitement ou réexportés par un fichier de 1er niveau). Un helper générique (hexA, plural, toPct, timeAgo, probColor) vit dans un util thématique partagé, pas colocalisé dans un module feature.
- Design system : zéro couleur hex de marque/shiny/succès en dur dans un <style scoped> — uniquement var(--color-poke-*), --color-shiny, --color-success, --tone-*. Les primitives UI répétées (pilule active, avatar rond, frame de carte, bouton icône, pastille pièce, segmented control) sont des composants/classes partagés.
- Constantes : toute valeur magique métier (pity, seuils, coûts, splits), de cache (TTL), de routing, de storage et d'animation est nommée dans constants/ et importée. Les clés localStorage adoptent un préfixe unique (pkr_).
- Contenu & i18n-readiness : les gros tableaux éditoriaux FR (guide, ACTS/MECHANICS, features landing, anecdotes, options de réglages) sortent des composants vers app/content/*, prêts pour une future i18n.
- Tests : specs colocables + tests/unit pour la couche pure ; fixtures partagées via factories (makeWireCard). Priorité de couverture : normalizers à forte logique, moteur d'aventure/combat, helpers extraits (isShinyRarity, computePity).

## Arborescence cible

```
web/
├─ app/
│  ├─ app.vue
│  ├─ app.config.ts                # NOUVEAU : tokens UI (toaster, couleurs marque), source SEO partagée
│  ├─ assets/css/
│  ├─ config/                       # NOUVEAU : config déclarative (auto-importée si réexportée via utils, sinon import explicite)
│  │  ├─ navigation.ts              # source unique nav → AppNavbar/BottomTabBar/MobileMenu
│  │  └─ activity-tiles.ts          # labels+routes des tuiles hub (hors store)
│  ├─ constants/                    # NOUVEAU : valeurs magiques centralisées
│  │  ├─ routes.ts                  # LOGIN, REGISTER, HOME='/play'…
│  │  ├─ cache.ts                   # CACHE_TTL_SHORT=60_000, CACHE_TTL_LONG=120_000
│  │  ├─ storage-keys.ts            # toutes les clés localStorage (préfixe unifié pkr_)
│  │  └─ game.ts                    # SHINY_PITY_DENOM=500, MERGE_COST=10, DEFAULT_PREVIEW_COUNT=19, PRIZE_SPLIT…
│  ├─ types/
│  │  ├─ index.ts                   # BARREL : réexporte tout (imports ~/types inchangés)
│  │  ├─ primitives.ts              # UUID, ISODate, Rarity, Biome, PokeType, CardLevel, MedalPlacement, TradeStatus, TournamentStatus
│  │  ├─ api/                       # types wire par feature (auth, cards, roll, gym, league, tournament, slot, trade, stats, chat)
│  │  ├─ domain/                    # types domaine par feature
│  │  └─ adventure.ts               # view-models rogue-lite sortis de domain.ts
│  ├─ repositories/
│  │  ├─ index.ts                   # BARREL : réexporte tous les repos
│  │  ├─ auth.ts  roll.ts  gym.ts  league.ts  tournament.ts  trade.ts  chat.ts  stats.ts … (1 fichier/feature)
│  │  └─ normalize/                 # normalizers par feature + barrel
│  │     ├─ index.ts
│  │     ├─ shared.ts               # isShinyRarity(), buildQuery(), realRarity()
│  │     └─ card.ts gym.ts stats.ts roll.ts …
│  ├─ stores/
│  │  ├─ auth.ts wallet.ts preferences.ts collection.ts inventory.ts
│  │  ├─ hub.ts                     # allégé : données+cache, tuiles déléguées à un composable
│  │  ├─ roll.ts team.ts gyms.ts league.ts tournament.ts trades.ts slot.ts leaderboard.ts stats.ts battle.ts
│  │  └─ chat.ts                    # allégé : état applicatif seul (transport → useChatSocket)
│  ├─ composables/
│  │  ├─ useApi.ts useCelebration.ts useViewportLock.ts
│  │  ├─ useAsyncAction.ts          # NOUVEAU : busy+try/catch+toast (remplace ~12 copies)
│  │  ├─ usePageData.ts             # NOUVEAU : onMounted→store.ensureFresh + loading/error
│  │  ├─ useTimedSequence.ts        # NOUVEAU : timers+cleanup+reduced-motion (animations)
│  │  ├─ useThemeToggle.ts useDailyBonus.ts useAuthForm.ts
│  │  ├─ useCardTilt.ts useCardVisuals.ts   # extraits de HoloCard/TeamCard
│  │  ├─ useBattlePlayback.ts useAdventureFlow.ts useChatSocket.ts
│  │  └─ audio/useAudioEngine.ts + useSound.ts/useSpinAudio.ts (façades)
│  ├─ utils/                        # fonctions pures auto-importées (1er niveau)
│  │  ├─ cache.ts                   # createTtlResource()
│  │  ├─ poke.ts color.ts (hexA…) format.ts (num/rate/pct/plural/toPct) time.ts (timeAgo/formatCountdown)
│  │  ├─ probability.ts (probColor) mappers.ts (championToMember) jwt.ts (decodeUserId)
│  │  ├─ cardTheme.ts slot.ts errors.ts paris-time.ts dedupe.ts
│  │  └─ game/adventure/            # data + moteur de règles pur (odds.ts, starters.ts, gyms.ts…)
│  ├─ schemas/auth.ts               # NOUVEAU : emailSchema/passwordSchema zod partagés
│  ├─ content/                      # NOUVEAU : contenu éditorial FR (guide, adventure, landing) sorti des composants
│  ├─ components/
│  │  ├─ base/ ui/ card/ battle/ slot/ chat/ leaderboard/ league/ settings/ team/ trade/ gym/ stats/ spin/ game/
│  │  └─ (nouveaux partagés : Avatar.vue, CardFrame.vue, CoinPip.vue, SegmentedControl.vue, IconButton.vue, sous-composants de league/*, stats/*)
│  ├─ pages/  layouts/  middleware/  plugins/
│  └─ dev/                          # NOUVEAU : showcases sortis de pages/ (non routables en prod)
├─ tests/
│  ├─ unit/                         # specs couche pure (normalize, utils, stores)
│  └─ fixtures/                     # makeWireCard(), makeOwnedCard() partagés
└─ nuxt.config.ts app.config.ts eslint.config.mjs vitest.config.ts package.json
```

## Plan de migration (ordonné, risque croissant)

| # | Étape | Risque | Breaking | Effort |
|---|-------|--------|----------|--------|
| 1 | Phase 0 | low | non | XS (~30 min) |
| 2 | Phase 1 | low | non | XS |
| 3 | Phase 2 | low | non | M (itératif, plusieurs petits PR) |
| 4 | Phase 3 | low | non | M |
| 5 | Phase 4 | low | non | L |
| 6 | Phase 5 | low | non | M |
| 7 | Phase 6 | medium | non | L |
| 8 | Phase 7 | medium | non | L |
| 9 | Phase 8 | medium | non | XL |
| 10 | Phase 9 | medium | non | M |
| 11 | Phase 10 | medium | non | L |
| 12 | Phase 11 | high | ⚠️ oui | XL |
| 13 | Phase 12 | medium | non | M |

### Détail des étapes

#### 1. Phase 0 — Outillage : ajouter les scripts npm `check` (nuxt typecheck && eslint . && vitest run), `test:watch`, `test:coverage` ; nettoyer eslint.config.mjs (retirer le placeholder, décider d'une source unique pour la config stylistic).

- **Risque :** low · non-breaking · effort XS (~30 min)
- **Pourquoi :** Fluidifie la boucle de vérification qui sera exécutée après chaque étape suivante ; aucun code applicatif touché.

#### 2. Phase 1 — Introduire les barrels SANS découper : créer app/types/index.ts et app/repositories/normalize reste tel quel, mais ajouter un index.ts qui réexporte l'existant. Objectif : figer le point d'entrée public (~/types, ~/repositories) avant tout move.

- **Risque :** low · non-breaking · effort XS
- **Pourquoi :** Un barrel qui réexporte le fichier God actuel ne change aucun import ni comportement, mais permet ensuite de déplacer le contenu derrière lui de façon transparente.

#### 3. Phase 2 — Centraliser les constantes et tokens (pur ajout, remplacement mécanique) : app/constants/{cache,routes,storage-keys,game}.ts et app/config/navigation.ts ; définir les tokens CSS manquants (--color-shiny, --color-success, --tone-*). Remplacer progressivement les littéraux (TTL 5*60_000, '/play', clés localStorage, pity 500, seuil 10, coûts) et les hex de marque/shiny par ces sources uniques.

- **Risque :** low · non-breaking · effort M (itératif, plusieurs petits PR)
- **Pourquoi :** Supprime la classe entière des valeurs magiques et l'incohérence visuelle sans changer le comportement (mêmes valeurs, une seule définition). Chaque remplacement est vérifiable par typecheck/build.

#### 4. Phase 3 — Extraire les fonctions pures vers utils/ (auto-import, non-breaking) : jwt.ts (decodeUserId), format.ts (num/rate/pct/plural/toPct), time.ts (timeAgo/formatCountdown), probability.ts (probColor unifié), color.ts (hexA), mappers.ts (championToMember), collection.ts (estimatedShinyChance), et isShinyRarity()/buildQuery() dans normalize/shared. Remplacer les copies locales par l'appel auto-importé. Ajouter des tests unitaires sur ces fonctions.

- **Risque :** low · non-breaking · effort M
- **Pourquoi :** Élimine la duplication de helpers (probColor/typeColor/timeAgo/pluriel), fige les règles métier (shiny, pity) par des tests, sans modifier les signatures publiques des stores/pages. Les utils de 1er niveau sont auto-importés par Nuxt.

#### 5. Phase 4 — Extraire les composables transverses : useAsyncAction (busy+toast), usePageData (ensureFresh+loading/error), useTimedSequence (timers+reduced-motion), useThemeToggle, useDailyBonus, useAuthForm, useCardTilt/useCardVisuals. Les adopter page par page / composant par composant.

- **Risque :** low · non-breaking · effort L
- **Pourquoi :** Supprime la duplication massive de try/catch/toast, d'onMounted→ensureFresh et des timers d'animation réinventés ; rend la logique testable. Adoption incrémentale, un fichier à la fois, comportement inchangé.

#### 6. Phase 5 — Découper les God files de types DERRIÈRE le barrel : éclater api.ts et domain.ts en types/{api,domain}/<feature>.ts + primitives.ts + adventure.ts ; index.ts réexporte tout. Uniformiser les préfixes Wire*/Domain*, remplacer les `unknown` par des interfaces dédiées, sortir CelebrationTier et les view-models aventure.

- **Risque :** low · non-breaking · effort M
- **Pourquoi :** Réduit le blast-radius et rend le préfixe fiable. Comme l'index réexporte tout, les imports ~/types restent identiques : pur move de code validé par typecheck.

#### 7. Phase 6 — Découper repositories/index.ts et normalize.ts par feature derrière leurs barrels ; déplacer les normalisations inline (normalizeRoll, biomes, legendaryEstimate, leaderboard) vers normalize/, décomposer normalizeStats en sous-fonctions, sortir ODDS_META (couleurs) vers les tokens. Normaliser getBadges/getHistory vers du domaine.

- **Risque :** medium · non-breaking · effort L
- **Pourquoi :** Colocation par feature, frontière repo/normalizer nette, contrat 'les repos renvoient du domaine' tenu. Reste non-breaking tant que les objets repo exportés gardent le même nom/forme.

#### 8. Phase 7 — Alléger les stores God (données+cache seulement) : sortir les tuiles hub vers useActivityTiles + config/activity-tiles ; extraire le contenu et le moteur de spin.ts vers utils/game/adventure (data + odds purs, testables) ; extraire le transport WebSocket de chat.ts vers useChatSocket. Factoriser refreshBalance en wallet.refreshFromMe()/syncBalanceFromMe et le pattern mutate→ensureFresh(true). Uniformiser dedupe() (league/stats) et le cache via createTtlResource.

- **Risque :** medium · non-breaking · effort L
- **Pourquoi :** Ramène les stores à un rôle d'orchestrateur, rend le moteur de jeu testable, supprime les 3 copies de refreshBalance. Le contenu déplacé est ré-exporté/ré-importé sans changer les getters publics consommés par l'UI.

#### 9. Phase 8 — Découper les God components en sous-composants + primitives partagées : Avatar, CardFrame, CoinPip, SegmentedControl, IconButton, HubTileList, TicketSection, RevealTile, sous-composants league/* et stats/* ; extraire useBattlePlayback/useAdventureFlow. Remonter tout accès données brut des pages vers les stores (play/league/team/settings/forgot/reset → store, plus aucun useApi()/repo direct en page).

- **Risque :** medium · non-breaking · effort XL
- **Pourquoi :** Fait tomber league.vue/team.vue/play.vue/AdventureScene.vue/HoloCard sous des tailles saines, rétablit la séparation UI/données. Comportement identique côté utilisateur ; à faire par petits lots avec revue visuelle.

#### 10. Phase 9 — Externaliser le contenu éditorial (app/content/*) et centraliser les schémas zod (app/schemas/auth.ts) ; sortir les showcases de pages/ vers app/dev/ (non routable en prod).

- **Risque :** medium · non-breaking · effort M
- **Pourquoi :** Sépare contenu/présentation, prépare l'i18n, retire les pages de démo du routing de prod. Le déplacement des showcases modifie les routes de démo (à confirmer qu'aucune n'est utilisée).

#### 11. Phase 10 — Fusionner les deux moteurs audio (useSound/useSpinAudio) sur un useAudioEngine unique (un AudioContext, une source mute/volume via preferences store, une convention de notes) exposant deux façades.

- **Risque :** medium · non-breaking · effort L
- **Pourquoi :** Supprime la double source de vérité mute/volume et la duplication du socle Web Audio. Risque de régression sonore subtile → nécessite un test manuel dédié.

#### 12. Phase 11 — CHANGEMENTS DE SIGNATURE (breaking, en dernier et isolés) : convertir les repositories en factories useXxxRepo(api) pour supprimer le paramètre `api` répété ; passer previewBatch/comboCheck à un objet d'options typé ; homogénéiser tous les stores en setup stores. Chaque conversion touche les call-sites → à faire feature par feature avec typecheck.

- **Risque :** high · ⚠️ **breaking** · effort XL
- **Pourquoi :** Élimine le boilerplate d'injection et le typage positionnel faible, mais modifie les signatures consommées partout : à réserver à la fin, une feature à la fois, jamais en big-bang.

#### 13. Phase 12 — Testabilité UI : migrer vitest vers defineVitestConfig (@nuxt/test-utils) + environnement happy-dom, élargir le glob pour la colocation des specs, ajouter les fixtures partagées (tests/fixtures). Couvrir en priorité le moteur d'aventure/combat et les normalizers restants.

- **Risque :** medium · non-breaking · effort M
- **Pourquoi :** Débloque les tests de composants et la colocation, aligne alias/auto-imports avec le runtime. Changement de config de test isolé, sans impact runtime.

## Quick wins (sûrs, immédiats)

- Corriger 'PokeRoulette' → 'PokéRoulette' dans app.vue et faire pointer useSeoMeta vers la même source que nuxt.config (ou le supprimer) pour lever la divergence SEO ; déplacer les options du toaster dans app.config.ts.
- Ajouter les scripts npm `check` (typecheck && lint && test), `test:coverage` et `test:watch`.
- Créer app/constants/cache.ts (CACHE_TTL_SHORT=60_000, CACHE_TTL_LONG=120_000) et remplacer les littéraux 5*60_000 / 60_000 dupliqués dans roll/collection/inventory/hub/stores.
- Créer app/constants/routes.ts (LOGIN, REGISTER, HOME='/play') et remplacer les '/play' et '/login' en dur dans login/register/[...slug]/middleware.
- Créer app/constants/storage-keys.ts regroupant toutes les clés localStorage (auth daily_bonus, préférences, spin_muted, team_roll_skip) sous un préfixe unifié pkr_.
- Introduire les tokens --color-shiny (#c9b3ff), --color-success, --color-gold et remplacer les hex correspondants dans les ~20 composants concernés (remplacement pur, rendu inchangé).
- Créer app/config/navigation.ts comme source unique {to,label,icon,primary?} et faire dériver AppNavbar/BottomTabBar/MobileMenu (supprime la triple déclaration).
- Extraire utils/format.ts (plural, toPct, num/rate/pct), utils/time.ts (timeAgo) et utils/probability.ts (probColor unifié) auto-importés, puis supprimer les copies locales divergentes des pages.
- Extraire utils/jwt.ts::decodeUserId et utils/collection.ts::estimatedShinyChance hors des stores, avec tests unitaires.
- Extraire un helper isShinyRarity(rarity, isAltFlag?) et remplacer les ~6 implémentations divergentes de la règle shiny dans normalize.ts.
- Extraire un composable useAsyncAction (busy+try/catch+toast) — le helper `run` de trades.vue en est déjà le prototype — et l'appliquer sur les pages qui répètent le bloc.
- Déplacer AdvReward et StarterOption de ~/stores/spin vers ~/types/domain (réexport) pour découpler RewardReveal/StarterSelect/StarterHud du store.
- Extraire un composable useThemeToggle et l'utiliser dans ThemeToggle.vue et MobileMenu.vue (supprime la logique dupliquée mot pour mot).
- Dériver BIOME_SLUG_TO_NAME de BIOME_SLUGS par inversion, unifier RARITY_META.label sur RARITY_LABEL, et aligner la liste PokeType entre poke.ts et cardTheme.ts (Fée).
- Remplacer wallet.coins += outcome.amount (x2 dans roll.ts) par wallet.credit(outcome.amount, 'roll') pour passer par l'API publique du store.
- Corriger le naming trompeur de collection.vue (sortByPity trie en réalité par quantity) : renommer ou trier réellement par chance estimée.
- Remplacer l'import explicite useBattleStore dans BattleStage.vue par l'auto-import ; supprimer les préfixes props. superflus dans les templates (CoinBalance/ConfirmDialog/RarityBadge).
- Typer la ref impérative de SlotMachine via InstanceType<typeof SlotMachine> au lieu d'un contrat manuel ; ajouter un onError (toast) dans les catch silencieux d'AvatarPicker et CardPicker.
- Remplacer les catch vides silencieux (default.vue hub.ensureShort, HubPanel ensureLong) par un log en dev.
- Introduire un barrel app/types/index.ts réexportant api.ts + domain.ts pour préparer le découpage futur sans toucher aux imports existants.
