# Comparatif — PokéRoulette original v5.1.1 vs notre front, et revue de notre front

> Établi le 1ᵉʳ octobre 2026. Il remplace `comparatif-v4.md` (3 août) comme
> référence. Méthode : le code source du front original a été aspiré en
> intégralité depuis `pokeroulette.poulineau.ovh/src/` (51 fichiers, 22 115
> lignes) et lu fichier par fichier ; 44 endpoints ont été sondés avec le compte
> de test ; notre front a été parcouru page par page contre l'API de production
> (15 pages, bureau 1280 px et mobile 393 px), y compris avec un compte dont la
> génération active est Hoenn. Chaque chiffre ci-dessous est **mesuré**.
> Captures : `artifacts/audit-2026/v14-*.png`.

**Pour situer la « version 3 »** : l'original n'a pas de version 3 récente — il
est passé de la **4.0.1** (notre point de comparaison) à la **5.1.1**, avec une
version majeure **5.0.0 le 19 septembre** dont la tête d'affiche est la
**3ᵉ génération, Hoenn**. C'est de cela qu'il s'agit.

---

## 1. Ce qui s'est passé chez eux depuis notre comparatif (4.0.1 → 5.1.1)

Neuf versions en deux mois. Les notes de version (`components/patchNotes.js`,
page `#patchnotes`, codées en dur — toujours pas d'API) disent ceci :

| Version | Date | Ce qui change |
|---|---|---|
| 4.1.0 | 05/08 | Classement du jour Motus · connexion par pseudo · **vérification d'e-mail obligatoire à l'inscription** · sondages |
| 4.2.0 | 09/08 | Widget « Activités du jour » (idée de Nassim, créditée) · prime du jour « corrigée » sur la différence nette |
| 4.2.1 | 10/08 | Solde de la navbar mis à jour en direct |
| 4.3.0 | 13/08 | Activités : entraînement et échange · anecdote « Banqueroute » · ex-aequo au classement |
| 4.4.0 | 22/08 | **Checklist « Premiers pas »** (7 étapes, 150 🪙 × 2) · nouveaux comptes avec 100 🪙 Johto |
| **5.0.0** | **19/09** | **Hoenn** (135 Pokémon, 10 légendaires, 8 arènes, équipe, classement, entraînement) · **Concours hebdomadaire** · **Paintkemon** (coloriage collaboratif) · **Bureau de change** (remplace « Corriger la prime ») · tournoi : avantage type + biome de la semaine, incitation Kanto 0 % / Johto +5 % / Hoenn +10 % (temporaire) · échanges : seuil Hoenn 90, Légendaires de Kanto échangeables · collection : **« Vendre tous les doublons shiny »**, plus d'option « Tous », silhouettes · roulette d'équipe par rareté, sans bébés · stats : catégorie Concours, anecdote Motus « On te voit… » retirée |
| 5.0.1 | 23/09 | Tickets Biome utilisables depuis « Mon équipe » · correctifs mobile |
| 5.1.0 | 25/09 | **Événements surprise hebdomadaires** (bandeau) · **Objectif de la semaine** (défi collectif) · concours passés · Tournoi et Concours sortent du menu Social · Guide mis à jour |
| 5.1.1 | 28/09 | Échanges : annulation possible après avoir répondu, auto-annulation des autres négociations quand un échange est conclu |

---

## 2. Le modèle de jeu v5, tel que mesuré

### 2.1 Trois générations, et une source unique chez eux

| | v4 (août) | **v5 (mesuré aujourd'hui)** |
|---|---|---|
| Cartes | 502 | **772** (302 Kanto, 200 Johto, **270 Hoenn**) |
| Pokédex | 1 → 251 | **1 → 386** (Hoenn = 252 → 386, dont 10 légendaires) |
| Arènes | 16 | **24** (`order_num` 1 → 24, 8 par région) |
| Bourses | `coins_gen1`, `coins_gen2` | **+ `coins_gen3`** |
| Équipes | `global`, `gen1`, `gen2` | **+ `gen3`** |
| Classements | global, kanto, johto | **+ hoenn** ; `recent-shinies?generation=` |
| Seuils d'échange | 120 / 80 | **120 / 80 / 90** |
| « Bébés » | — | **16 cartes de niveau 0** (Pichu, Mélo, Toudoudou, Lippouti, Elekid, Magby, Azurill, Okéoké + shiny) |
| Catalogue stats | 251 std / 251 shiny | `pool.total_std` 365, `total_shiny` 386 |

Leur leçon d'architecture mérite d'être retenue : ils ont créé
`lib/generations.js`, **source unique** des générations (id, slug, nom, champ de
bourse, icône), et son commentaire dit explicitement qu'elle *« remplace les
maps/ternaires dupliqués qui existaient dans chaque page avant l'ajout de
Hoenn »*. Il leur reste des oublis (icône de pièce codée `generation === 2 ?
'johto' : 'kanto'` dans la modale de vente, onglets du classement codés en dur,
15 types sur 18 dans deux tables) — mais ajouter une 4ᵉ génération chez eux,
c'est une ligne dans un tableau. Chez nous, non (voir §3).

### 2.2 Le contrat `/auth/me` a changé

```
user: { …, coins_gen1, coins_gen2, coins_gen3, active_generation,
        dailyBonusGeneration, canExchangeDailyBonus }   ← nouveaux
        canCorrectDailyBonusGeneration                   ← DISPARU
rewardClaimed, pendingChoice                             ← inchangés
```

`POST /auth/correct-daily-bonus-generation` répond désormais **404**. Son
remplaçant est `POST /auth/exchange-daily-bonus { generation }` → `{ amounts:
{1: n, 2: n, 3: n}, generation }`, utilisable **autant de fois qu'on veut** dans
la journée (« bureau de change » dans le menu de génération). Les montants sont
figés au premier crédit du jour.

### 2.3 Endpoints : 109 chez eux, 77 chez nous

Nouvelles familles complètes, absentes chez nous :

- **Concours** — `/contest/current`, `/contest/:id`, `/contest/list`,
  `POST /contest/register { cardId, currency }`, `/contest/dance-key`,
  `POST /contest/dance-score { code }`, `/contest/:id/prize-options`,
  `POST /contest/:id/claim-prize { cardId }`.
- **Coloriage** — `/coloring/grid`, `POST /coloring/cells { x, y, colorId }`,
  WebSocket `/api/ws/coloring` (message `cell.colored`).
- **Événements et objectif** — `/game-events/current` → `{ events: { date,
  active[] }, goal, rollCost: { base, effective } }`.
- **Engagement** — `/activities/today`, `/onboarding/status`, `POST /onboarding/claim`.
- **Compte** — `POST /auth/verify-email`, `POST /auth/resend-verification`,
  `POST /auth/forgot-password`, `POST /auth/reset-password` (nous avons les deux
  derniers), `POST /auth/exchange-daily-bonus`.
- **Divers** — `POST /collection/sell-shiny-duplicates { generation }` →
  `{ charmesObtained }`, `/gym/history`, `/gym/badges`, `/leaderboard/hoenn`,
  `/tournament/list`, `/tournament/:id`, `/tournament/my-analysis`,
  `/slot-machine/my-history`, `/trades/players/:id/zarbi-forms`,
  `/roll/preview`, `/roll/simulate-charme`, `/chat/banned`, les 5 endpoints
  d'administration des sondages.

Endpoints que **nous seuls** utilisons encore : `/spin/start`, `/spin/claim`,
`/spin/defeat`, `/spin/legendary-attempt`, `/spin/renew`. **Ils répondent
toujours** (`/spin/start` → 200 avec les starters, `/spin/defeat` → 200,
vérifié aujourd'hui) : notre Aventure n'est pas orpheline. Leur Spin est un jeu
Angular séparé en iframe (`/spin/?iframe=true&gen=N`).

### 2.4 Contrats existants qui ont gagné des champs (et que nous ignorons)

| Endpoint | Nouveaux champs | Ce qu'ils pilotent |
|---|---|---|
| `/roll/biomes` | `effective_cost` | prix remisé les jours d'événement (Soldes −50 %, Journée −30 %) |
| `POST /roll` | `eventType: 'egg_hatch'` (`pokemon`, `shiny`, `isNew`) | éclosion de l'œuf de la pension du Spin |
| `/inventory` | `eggRollsRemaining` | état de l'œuf en incubation |
| `/slot-machine/status` | `spinsAllowed`, `spinsToday`, `generation` | « Jackpot en folie » = 2 tirages |
| `/gym` | `attempts_allowed`, `attempts_this_week` | « Arènes ouvertes » = 2 combats |
| `/league/status` | `eligibleGenerations[]` | devises et légendaires éligibles à la récompense |
| `POST /league/:run/reward/coins` | `{ currency }` | bourse qui reçoit les 500 🪙 |
| `POST /tournament/register` | `{ currency }` | bourse débitée **et créditée** |
| `/tournament/current` | `weeklyAdvantage { type, biome }` | +10 % par critère, jusqu'à +20 % |
| `POST /training/battle` | `{ generation }` | sur quel parcours porte l'entraînement |
| `/team` (membres) | `biome`, `level: 0` | avantage hebdo, bébés |
| `/stats` | `anecdotes.concours` (3 récompenses) ; `motus.on_te_voit` **retiré** | palmarès |
| `/trades` | `requested_card_target_quantity`, `offered_card_initiator_quantity`, `requested_card_generation` | « Tu possèdes X fois » |
| `/collection` (cartes) | `sang_froid`, `beaute`, `grace`, `intelligence`, `robustesse` | les 5 stats de concours |

### 2.5 Les mécaniques inédites, en détail utile

- **Concours** : chaque semaine une discipline (Sang-froid, Beauté, Grâce,
  Intelligence, Robustesse), parfois une restriction biome ou type.
  Inscriptions jeudi 00:00 → mardi 11:55, dévoilement mardi 12:00 devant un jury
  de **3 vrais joueurs non participants**. Inscription **10 🪙** dans la bourse
  de son choix ; shiny et légendaires exclus ; **la carte quitte la collection à
  l'inscription**, revient si on perd, **est perdue si on gagne**. Score = stat
  × chance (±30 %, tirée au dévoilement) + danse. **Répétition de danse** = un
  Simon à 4 panneaux, 10 manches max, +2 pts/manche, une seule tentative,
  seconde chance si échec à la 1ʳᵉ manche, score envoyé chiffré
  (`code = manches + clé du jour`). Le gagnant choisit **un Légendaire de la
  génération de la bourse utilisée**.
- **Événements surprise** (révélés le jour même, bandeau sous la navbar) :
  `generation_day` (−30 % sur une génération), `sales` (−50 % partout),
  `special_rain` (événements ×3), `daily_bonus_x2`, `jackpot_frenzy` (2
  tirages), `open_gyms` (2 combats, jusqu'à dimanche), `merchant` (rachète un
  Pokémon précis 250 🪙, premier arrivé premier servi — badge sur la carte en
  collection), `spin_lucky` (dimanche : capture 40 %, transfert 20 %).
- **Objectif de la semaine** : métrique collective (`rolls`, `spin_runs` ≥ 90 s,
  `gym_battles`, `jackpot_spins`), cible adaptative, contribution minimale par
  joueur, récompense (Charme ou ticket) versée le lundi. Aujourd'hui : 216/250
  parties de Spin, 17 contributeurs, récompense Ticket Type Feu.
- **Premiers pas** : 8 étapes serveur (tirage, Jackpot, Motus, équipe, arène,
  Spin, tournoi, concours) → **150 🪙 dans chacune des 3 bourses** ; opt-out
  définitif possible.
- **Bureau de change** : voir §2.2.
- **Tournoi** : type + biome tirés chaque semaine, +10 % par critère ; devise
  choisie à l'inscription ; analyse « Ma préparation » ; historique et replays.
- **Échanges 5.1.1** : annulation après réponse, auto-annulation des
  négociations parallèles, Légendaires de Kanto échangeables (≥ 2 exemplaires),
  exemplaires possédés affichés, cartes manquantes en premier.
- **Vente groupée shiny** côté serveur : un seul appel par génération, Zarbi
  exclu, 1 exemplaire conservé — la règle 2 de notre Vente intelligente, mais
  en **un appel** au lieu d'un par exemplaire.

---

## 3. Ce qui est cassé ou faux chez nous aujourd'hui

Le parcours de nos 15 pages contre l'API v5 ne produit **aucune erreur JS,
aucune réponse 4xx, aucun débordement**. C'est la mauvaise nouvelle : la dérive
est **silencieuse**. Tout s'affiche, et une partie est fausse.

| Gravité | Constat | Preuve |
|---|---|---|
| 🔴🔴 | **L'inscription est cassée depuis le 5 août.** `auth.register()` attend `{ user, token }` ; depuis la 4.1.0 le serveur crée le compte, envoie un e-mail de vérification et répond `{ message }` sans jeton. `reconcileUser(undefined)` lève, la page affiche une erreur… alors que le compte **existe** — la seconde tentative répond « nom déjà pris ». | `stores/auth.ts:46-50` ; `register.js` de l'original (« Compte créé. Vérifiez votre boîte mail ») ; non rejoué en réel pour ne pas créer de compte fantôme |
| 🔴 | **Hoenn n'existe pas chez nous, et ses données sont rangées dans Kanto.** `asGeneration(3)` renvoie `1` en silence : la collection « Kanto » affiche **286 cartes** (151 + 135) ; la page Arènes titre « Arènes de Kanto — 0/16 badges » et aligne les arènes **17 à 24** (Mérouville… Atalanopolis) sous Kanto ; le menu de génération ne montre que Kanto et Johto — la bourse Hoenn (**150 🪙** sur le compte de test) est invisible ; équipe, échanges, classement, sélecteur de région du tirage : deux générations partout. | `constants/generation.ts:75` ; `v14-tour-gyms.png` ; relevé « Kanto 54 / 286 » |
| 🔴 | **Un joueur dont la génération active est Hoenn** (bascule faite depuis l'original) voit chez nous « 107 Kanto » dans la navbar pendant que le serveur tire dans le pool Hoenn et débite la bourse Hoenn ; chaque réconciliation écrit alors le solde Hoenn **dans la bourse Kanto**. | `v14-hoenn-active-play.png` (serveur : `active_generation: 3`) |
| 🔴 | **« Déplacer la prime du jour ici » est mort** : le drapeau `canCorrectDailyBonusGeneration` n'existe plus et l'endpoint répond 404. Le bouton ne s'affichera plus jamais ; le bureau de change qui le remplace n'est pas câblé. | `GenerationSwitch.vue:22`, `repositories/auth.ts:29` ; sondage 404 |
| 🟠 | **Prix de tirage faux les jours d'événement** : nous lisons `cost` (jamais `effective_cost`) et `BASE_ROLL_COST = 10` (jamais `rollCost.effective`). Un jour de Soldes, nous affichons 10 et débitons 10 en optimiste quand le serveur prend 5 ; et rien n'annonce l'événement. | `repositories/roll.ts:24`, `stores/roll.ts:25` |
| 🟠 | **Une éclosion d'œuf fait planter la révélation** : `normalizeRoll` ne connaît que `coins`, `charme_chroma` et `card_choice` ; `egg_hatch` tombe dans la branche « choix » et appelle `normalizeCard(undefined)`. Le serveur a déjà fait éclore l'œuf — le joueur ne voit rien. | `repositories/roll.ts:7-18` |
| 🟠 | **Palmarès des stats** : la famille Motus affiche « On te voit… » (supprimée côté serveur, donc vide à jamais) et la famille **Concours** manque (3 récompenses). | `v14-tour-stats.png` |
| 🟠 | **Tournoi et Ligue sans devise** : nous appelons `/tournament/register` et `/league/:run/reward/coins` sans `currency` ; le serveur retombe sur `gen1`. Un joueur qui joue Johto ou Hoenn paie et est payé en pièces Kanto — et si la Ligue refuse une devise non éligible, **il ne peut pas réclamer sa récompense**. À vérifier côté serveur, impossible avec le compte de test. | `repositories/tournament.ts:15`, `repositories/league.ts:16` |
| 🟠 | **L'entraînement quotidien ne dit pas sur quel parcours il porte** : `POST /training/battle` sans `{ generation }`. Leur client envoie l'onglet actif ; sans le champ, le serveur retombe vraisemblablement sur Kanto — depuis notre page Arènes de Johto, le bonus irait au mauvais parcours. À vérifier. | `repositories/gym.ts:36` |
| 🟠 | **Jackpot en folie** : nous ignorons `spinsAllowed`/`spinsToday`. Après le 1ᵉʳ tirage, notre page retire le bouton de lancement alors qu'il en reste un. Même logique pour « Arènes ouvertes » (`attempts_allowed`), avec un impact moindre car `can_attempt` reste juste. | `types/api.ts` (`SlotStatus`, `WireGym`) |
| 🟡 | **Les notifications ne sont toujours affichées nulle part** (constat bloquant de l'audit de juillet, encore ouvert) : le store les charge, la cloche les compte, un clic les efface. Le serveur en envoie maintenant d'utiles (sondages, échange annulé, concours). | `stores/hub.ts:192`, aucun composant ne les liste |
| 🟡 | **Le Guide est périmé** : « Deux parcours indépendants de 8 arènes (Kanto et Johto) », rien sur Hoenn, le concours, les événements, le bureau de change, les Légendaires échangeables. | `pages/rules.vue:63` |
| 🟡 | **Connexion d'un compte non vérifié** : l'erreur serveur s'affiche brute, sans le bouton « Renvoyer l'e-mail » de l'original. | `pages/login.vue` |
| 🟡 | **Bébés** : 16 cartes de niveau 0 arrivent dans un type `level: 1 \| 2 \| 3` ; aucune mise en valeur « Bébé » (rose chez eux), et la roulette d'équipe de l'original les exclut désormais. | `types/domain.ts:21` |
| 🟢 | Tout le reste tient : Motus, Idées & sondages, Zarbi, échanges Kanto/Johto, classements, Aventure, Jackpot (hors folie), Vente intelligente. | parcours v14 |

---

## 4. Fonctionnalités présentes en v5, absentes chez nous

Par valeur pour le joueur, du plus au moins important :

1. **Hoenn** — prérequis de tout le reste : 135 cartes, 8 arènes, une équipe, un
   classement, une bourse, un seuil d'échange, un entraînement.
2. **Concours** — une nouvelle boucle hebdomadaire complète, avec un Légendaire
   à la clé chaque semaine et un mini-jeu. C'est la plus grosse nouveauté de
   contenu depuis Motus.
3. **Événements surprise** + prix effectif du tirage — sans eux, notre joueur
   ignore les soldes, les journées de génération, le marchand, le double Jackpot.
4. **Objectif de la semaine** — un panneau replié sur l'accueil, et une
   récompense le lundi pour ceux qui ont contribué.
5. **Premiers pas** — 450 🪙 et un fil conducteur pour les nouveaux comptes
   (qui, chez nous, ne peuvent de toute façon pas s'inscrire — voir §3).
6. **Bureau de change** — remplace notre bouton mort.
7. **Activités du jour** — notre hub a ses propres tuiles ; le serveur en expose
   maintenant la vérité (`/activities/today`), avec les tâches « entraînement »
   et « échange ».
8. **Tournoi** — avantage de la semaine affiché, choix de la devise, analyse
   « Ma préparation », historique, **replays des combats** (encore absents chez
   nous, constat de juillet).
9. **Échanges 5.1.1** — Hoenn, annulation après réponse, Légendaires, exemplaires.
10. **Ligue** — devise et générations éligibles.
11. **Collection** — vente groupée shiny en un appel (notre Vente intelligente
    pourrait l'utiliser pour sa règle 2), silhouettes, badge marchand.
12. **Inventaire** — état de l'œuf ; **Jackpot** — historique personnel.
13. **Compte** — vérification d'e-mail (renvoi), page `verify-email`.
14. **Paintkemon** — sans récompense, « moment détente ».
15. **Notes de version** — page en dur chez eux ; sans API, à notre main.
16. **Historique des arènes**, liste des badges.

---

## 5. Ce que nous avons et qu'ils n'ont pas

À garder en tête avant de courir après eux : la **Vente intelligente** par règles
avec aperçu, réserve de fusion et protection du dernier exemplaire (eux ne
vendent que les doublons shiny, sans aperçu) ; les filtres de collection
cumulables ; les sprites embarqués et le choix de style ; le mode sombre ; les
classements et duels Némésis/Souffre-douleur dans les stats ; la modale de
victoire Motus ; l'Aventure en scènes plein écran ; 95 tests, lint, typecheck et
build verts. Et une chose que leur code n'a pas : une couche *repositories* qui
isole le contrat de l'API — c'est elle qui rend la suite faisable.

---

## 6. Revue de notre front — incohérences et jouabilité

### 6.1 La cause racine : un modèle à deux générations, dispersé en neuf endroits

`asGeneration()` retourne `1` pour tout ce qu'il ne connaît pas. C'est ce choix
qui transforme l'arrivée de Hoenn en **données fausses sans erreur** — une
région entière rangée dans une autre, sans qu'aucun test, aucun log ni aucun
écran ne le signale. Un garde d'exécution doit se plaindre, pas corriger.

Le nombre de générations est codé en dur dans : `constants/generation.ts`
(`Generation = 1 | 2`, `GENERATIONS`, `TeamScope`, `teamScope`/`boardScope`),
`stores/wallet.ts` (`purses: { 1, 2 }`), `stores/team.ts` (`rosters`
global/gen1/gen2), `stores/leaderboard.ts` (`global/kanto/johto` et le ternaire
`scope === 'kanto' ? 1 : 2`), `repositories/leaderboard.ts` (`BoardScope`),
`stores/gyms.ts` (`hasSecondCircuit`), `stores/trades.ts`, `GenerationSwitch.vue`,
et le sélecteur de région de `play.vue`. La correction n'est pas « ajouter
Hoenn », c'est **faire de `GENERATIONS` la seule source** et dériver tout le
reste — exactement ce que l'original a fini par faire.

### 6.2 Les contrats wire ont dérivé sans bruit

Quatorze champs nouveaux ignorés (§2.4), un champ retiré, un endpoint 404 :
rien ne nous l'a dit. Nos types `WireX` sont écrits à la main et ne sont
confrontés à la production qu'à l'occasion d'une tâche (c'est ainsi que la page
Stats a cassé en septembre, et que le bug de bourse de la vente a été trouvé la
semaine dernière). Deux mesures peu coûteuses : un script de **sondage de
contrat** (les 44 appels de cette analyse, rejouables, qui diffent les clés
reçues contre nos interfaces) et des fixtures de tests prises sur les vraies
réponses (ce que fait déjà `stats.spec.ts`).

Incohérences internes à régler au passage : Motus consommé en camelCase sans
normalisation, Suggestions normalisé depuis le snake_case ; deux vocabulaires
pour une même notion (`gen1`/`kanto`), hérités de l'API mais exposés jusque
dans nos stores ; le solde répété en tête de 6 pages (`CoinBalance`) sans
indiquer la région, alors que celui de la navbar la nomme.

### 6.3 Jouabilité : ce qu'un joueur perd en jouant chez nous plutôt que chez eux

- Il **ne peut pas s'inscrire**, ni jouer Hoenn, ni choisir quelle bourse paie
  son tournoi ou reçoit sa récompense de Ligue.
- Il **ne sait pas** quel jour est soldé, quel Pokémon le marchand rachète 250 🪙,
  que le Jackpot offre deux tirages, que l'arène en autorise deux cette semaine.
- Il **ne voit pas** l'avantage de la semaine au tournoi — donc il ne peut pas
  composer son équipe en conséquence, alors que c'est devenu le levier tactique
  principal (jusqu'à +20 % par duel).
- Il **rate le concours**, le seul moyen hebdomadaire de gagner un Légendaire
  hors Ligue, et les 450 🪙 des Premiers pas.
- Il **ne reçoit aucune notification** (échange annulé, sondage, concours).
- Il a, en revanche, une vente de doublons plus sûre et plus lisible que
  l'original, et une collection qu'on peut vraiment filtrer.

### 6.4 Points de l'audit de juillet toujours ouverts (re-vérifiés)

- 🔴 Les 3 scènes plein écran (`BattleScene`, `AdventureScene`, `ShinyReveal`)
  n'ont ni focus initial, ni `aria-modal`, ni sortie clavier — inchangé.
- 🟠 Les filtres de la collection ne sont pas collants (0 règle `sticky`) ;
  avec 386 cartes par onglet désormais, le problème a grandi.
- 🟠 Le tournoi n'est pas rejouable (pas de tableau ni de replays ; l'original a
  les deux et un parcours « sans spoiler »).
- 🟡 Le toast « Bonus quotidien » repose sur une date en `localStorage`, pas sur
  le serveur : il annonce « +100 créditées » au premier lancement du jour dans
  ce navigateur, même si la prime a été créditée ailleurs (vu pendant les
  tests : solde à 6 🪙 et toast « +100 »). La v5 expose `dailyBonusGeneration`,
  qu'il faudrait lire pour nommer la bonne région — après un passage au bureau
  de change, la prime n'est plus forcément dans la région active.

### 6.5 Ce que cette analyse n'a pas couvert

Les flux serveur que le compte de test ne peut pas atteindre (récompense de
Ligue sans devise, inscription réelle, concours dévoilé) ; le jeu Spin en
iframe de l'original ; les contrastes et le lecteur d'écran.

---

## 7. Ordre de travail proposé

**Vague D — rattraper la v5 sans nouvelle fonctionnalité** (le front redevient
vrai). Modèle de génération piloté par les données (`GENERATIONS` à trois
entrées, `asGeneration` strict, bourses, portées, onglets, circuits, région du
tirage) ; inscription (`{ message }`, écran « vérifie ta boîte mail », bouton de
renvoi) ; bureau de change à la place du bouton mort ; prix effectif et
événements du tirage ; `egg_hatch` ; devise au tournoi et à la Ligue ;
`generation` à l'entraînement ; Jackpot en folie ; palmarès Concours ; types
wire remis d'aplomb avec un sondage de contrat rejouable ; Guide. C'est la
vague la plus importante et la moins visible.

**Vague E — l'engagement piloté par le serveur.** Bandeau d'événements,
objectif de la semaine, activités du jour depuis l'API, Premiers pas,
notifications enfin affichées. Quatre endpoints en lecture, une page d'accueil
qui gagne beaucoup.

**Vague F — les boucles de jeu.** Le Concours en entier (inscription avec
devise, picker par stat, danse, dévoilement, lot légendaire, historique), le
tournoi complet (avantage, analyse, tableau, replays, historique), les échanges
5.1.1.

**Vague G — le reste**, selon l'envie : Paintkemon, notes de version, historique
des arènes et du Jackpot, œuf dans l'inventaire, silhouettes.

Et un mot sur la **v3 avec notre propre API** que tu veux ouvrir ensuite : cette
analyse montre que l'original avance vite (neuf versions, trois nouveaux
sous-systèmes en deux mois) et que notre front en dépend pour chaque règle.
Tant que nous consommons son API, la vague D est due à chaque version majeure.
C'est l'argument principal pour la v3 — et la raison de commencer par le modèle
de génération et le sondage de contrat, qui serviront dans les deux cas.

---

# Mise à jour du 1ᵉʳ octobre 2026 — vague D livrée

## Ce qui a changé

- **Le modèle de génération est piloté par les données.** `GENERATIONS` (trois
  entrées) est la seule source : bourses, portées d'équipe, onglets de
  classement, circuits d'arènes, filtre de collection, devises en dérivent.
  `asGeneration` ne déguise plus une valeur inconnue en Kanto : elle passe
  telle quelle (« Génération N ») avec un avertissement, et une carte sans
  champ `generation` est située par son numéro de dex. Vérifié en réel :
  Kanto 151, Johto 100, Hoenn 135 cartes ; « Arènes de Hoenn » 1 à 8 ; menu de
  région à trois bourses ; Zarbi masqué hors Johto.
- **L'inscription fonctionne à nouveau** : elle attend le message du serveur,
  affiche « vérifie ta boîte mail » et propose de renvoyer le lien ; la
  connexion propose le renvoi quand le compte n'est pas vérifié. La connexion
  complète ensuite l'utilisateur depuis `/auth/me` (la réponse de login ne
  porte ni avatar, ni charme, ni bureau de change).
- **Bureau de change** à la place du bouton mort : un bouton par région qui ne
  porte pas la prime, testé en aller-retour Kanto → Johto → Kanto sur le compte
  de test.
- **Tirage** : prix effectif (`rollCost.effective`, `effective_cost` par biome)
  affiché et débité, prix de base barré les jours de remise ; éclosion d'œuf
  révélée comme une carte (« Un œuf a éclos ! ») ; un événement inconnu lève
  une erreur claire au lieu de se faire passer pour un choix de carte.
- **Devise** choisie au tournoi (sélecteur « Payer avec », solde de la bourse
  affiché, inscription dans cette devise) et à la Ligue (bourse créditée parmi
  les régions éligibles, légendaires filtrés de même) ; `generation` envoyée à
  l'entraînement ; Jackpot en folie (tirages restants) ; palmarès Concours et
  retrait de « On te voit… » ; bébés (niveau 0) nommés ; Guide mis à jour.
- **Types wire remis d'aplomb** et un sondage de contrat rejouable,
  `scripts/probe-contract.mjs`, qui diffe les clés reçues de la production
  contre `types/api.ts` (compte de test par variables d'environnement, jamais
  commité). Lancé après la vague : aucune dérive restante.
- **Sprites de Hoenn** rapatriés pour les styles qui les publient (Gen 3, 4, 5,
  HOME, Artwork) ; Gen 2 et Gen 7 s'arrêtent à Johto et le disent.

## Ce qui reste hors de cette vague (vagues E à G)

Bandeau d'événements, objectif de la semaine, activités du jour et Premiers
pas depuis l'API, notifications affichées, Concours, tournoi complet (avantage,
analyse, tableau, replays), échanges 5.1.1, Paintkemon, notes de version,
historiques.
