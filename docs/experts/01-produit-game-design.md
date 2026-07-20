# Expertise produit & game design — PokeRoulette

> Audit réalisé avant la refonte frontend (Nuxt 4.5 + Nuxt UI + Pinia). L'API et
> les règles métier ne changent pas : chaque recommandation précise si elle est
> réalisable **frontend seul**, avec l'**API existante**, ou si elle exige une
> **évolution backend** (avec fallback frontend).
> Sources : `docs/audit/*` (application-map, existing-features, existing-user-flows,
> states-inventory, frontend-issues, api-inventory) + captures `artifacts/screenshots/*`.

## Synthèse

PokeRoulette a une boucle hebdomadaire remarquablement saine pour 30 joueurs
(16 inscrits au tournoi, cagnotte doublée par la maison, anti-spoiler du jeudi)
et un « théâtre de suspense » de qualité (jauges ralenties, arrêts décalés).
Mais la boucle **quotidienne** est muette : le moment de récompense du tirage est
sous la ligne de flottaison, toutes les raretés partagent la même célébration,
et le doublon — la ressource centrale du jeu (pity shiny, fusion, échanges,
pool d'équipe) — n'a **aucun feedback**. Résultat : le end-game réel du jeu (la
chasse aux shiny, course au score serrée à 1 shiny d'écart au sommet) existe
côté backend mais n'est raconté nulle part ; un joueur 8/8 badges voit 5 pages
qui disent « revenez plus tard ». Le Guide contredit l'app sur les coûts biome
(0 annoncé vs 50-300 réels) : dans un jeu entre amis fondé sur des probabilités
affichées, c'est le contrat de confiance qui est entamé. La refonte peut
corriger l'essentiel **sans toucher au backend**.

---

## 1. La boucle cœur : où elle est fluide, où elle casse

Boucle nominale : **tirage 10 🪙 → collection → équipe → arènes → tournoi/ligue**.

### Ce qui est fluide (à préserver, cf. `frontend-issues.md` § forces)

- **Le tirage lui-même** : animation 4 s, ticks sonores synchronisés, 3 modes de
  révélation, multi-roll ×5 en cascade. Le suspense est déjà designé.
- **Les estimations de victoire partout** (arène, ligue, tournoi, capture
  légendaire) : le joueur peut raisonner ses combats — transparence rare dans un
  gacha.
- **Le cycle social hebdomadaire** : 16 participants sur ~30 joueurs actifs au
  tournoi du 23 juillet (📸 `tournament/tournament-desktop-fullpage.png`),
  cagnotte 640 🪙 pour 320 misés (la maison double la mise — le PvP est
  subventionné). L'anti-spoiler « Mon parcours » est excellent.

### Les quatre cassures

1. **Cassure de la récompense** (tirage → dopamine). Le résultat « ✨ Vous avez
   obtenu ! » se rend **sous la roulette, hors écran** en 1440×900 : sur
   📸 `home/roll-result-new-card.png`, la carte Pyroli gagnée est coupée par le
   bas du viewport. En multi-roll (📸 `home/multi-roll-all-results.png`), les
   5 résultats sont encore plus bas. Le paiement émotionnel du geste central du
   jeu exige un scroll (C1, `frontend-issues.md`).
2. **Cassure collection → équipe** (le sens du sacrifice). L'équipe se
   construit par pioche aléatoire **destructive** dans la collection (F4,
   `existing-user-flows.md`). C'est le parti pris différenciant du jeu (« tout
   est roulette ») mais l'UI n'outille pas la décision : après la modale de
   1ʳᵉ visite, plus aucun rappel de la destruction ; le pool éligible (collection
   moins Légendaires/Shiny) n'est jamais montré ; la vraie stratégie du jeu —
   *curer sa collection (vendre/fusionner) avant de lancer la roulette d'équipe
   pour biaiser le tirage* — n'est expliquée nulle part.
3. **Cassure équipe → arènes** (l'échec sans plan). Après une défaite :
   « 💀 Défaite… Renforcez votre équipe » (`states-inventory.md`, états d'échec)
   alors que `GET /gym/:id/estimate` fournit les matchups position par position.
   Le joueur attend 7 jours sans plan d'action précis ; le lien « perdre →
   monter le bonus d'entraînement +2 %/jour » n'est raconté que sur `#gyms`.
4. **Cassure vers le hub** (la boucle n'a pas de tableau de bord). `#home` ne
   montre ni badges, ni complétion, ni échéances (m8) : le joueur end-game voit
   exactement le même écran qu'au J1 — bande « ??? » et bouton Lancer
   (📸 `home/home-desktop-fullpage.png`, compte principal à 6 🪙). Ironie :
   la navbar **paie déjà** les requêtes d'un agenda à chaque navigation
   (`tournament/current` ×64 observés, `league/status`, `trades`,
   `notifications` — C4) mais jette la donnée.

## 2. Objectifs du joueur : J1 / semaine 1 / mois 1 / end-game

- **J1** : 200 🪙 = 20 tirages, généreux. Mais aucun objectif affiché
  (📸 `onboarding/first-visit-home.png` : bande « ??? », trois sélecteurs non
  expliqués, aucune invite — C2). La collection vide « 0 / 151 » est
  impressionnante mais froide (📸 `empty-states/collection-empty.png`). Si le
  joueur ne découvre pas seul `#team` et `#gyms`, le jeu se résume à une
  machine à sous sans but. Risque de churn J1 maximal.
- **Semaine 1** : le rythme s'installe (bonus 100/jour, entraînement +5,
  jackpot). Premier vrai objectif : l'arène 1. Bon gating : Spin exige 1 Pokémon
  de base, échanges 120 cartes uniques — mais ces jalons ne sont visibles que
  sur leurs pages respectives.
- **Mois 1** : la progression PvE est **bornée à 1 badge/semaine** (1 tentative
  hebdo) : 8 badges = 2 mois minimum, davantage avec les défaites. C'est le
  squelette de la rétention M1-M2 — une défaite crée une semaine creuse que
  seul l'entraînement (+2 %/jour cumulable) comble, s'il est compris.
- **End-game (compte principal audité)** : 8/8 badges, « Champion de Kanto »,
  6 🪙. Le quotidien = 3 clics (connexion → entraînement → jackpot gratuit),
  ~2 minutes, zéro décision, zéro célébration. Les pages disent littéralement
  d'attendre : `#gyms` « Déjà combattu aujourd'hui » + panneau statique
  (📸 `gyms/gyms-desktop.png`), `#league` une phrase sur un écran vide à 90 %
  (📸 `league/league-status.png`), `#slot-machine` « Revenez demain », `#spin`
  deux lignes « déjà obtenu cette semaine » (📸 `spin/spin-desktop.png`).
  **Or le end-game réel existe** : au sommet du classement, Emma 666 pts
  (146/146 standards, 50 shiny), Adriano 660, SenZai 651, quenting 648
  (📸 `social/leaderboard-desktop.png`) — 1 shiny = 10 pts = un dépassement
  possible ; ~100 shiny restants par joueur = des mois de contenu. Le tirage
  quotidien de doublons est **le** gameplay end-game (chaque doublon augmente le
  pity shiny de sa carte de +1/500)… et c'est précisément le doublon qui n'a
  aucun feedback (« quantité +1 silencieuse », `states-inventory.md`). Le
  end-game n'est pas vide : il est **invisible**.

## 3. Compréhension des règles : le contrat de confiance

- **Le Guide ment sur les coûts biome** (C6) : « filtrer par biome (sans
  surcoût) » vs coûts réels 50 → 300 🪙 (`GET /roll/biomes` : Ville 50, …,
  Cave/Désert 240, Tundra 300). Un joueur qui suit le Guide budgette 10 🪙 et
  se voit débiter 240. Dans un jeu dont tout l'attrait repose sur des
  probabilités **affichées** (1/500 shiny, estimations de combat, table du
  jackpot) et qui affiche même un « classement des tricheurs » comme valeur
  d'équité, une règle écrite fausse contamine la crédibilité de toutes les
  autres. Entre 30 amis, la rumeur « le Guide raconte n'importe quoi » suffit.
- **Chiffres incohérents** : la collection vide affiche « 0 / 151 cartes
  standard » quand le classement sépare 146 standards + 5 légendaires ; la
  navbar affiche v3.4.0 quand `__APP_VERSION__` vaut 1.2.0
  (`application-map.md`). Chaque incohérence de comptage nourrit le doute.
- **Libellés opaques** : les modes « Visibles / Si possédée / Masquées » sont
  incompréhensibles avant d'avoir compris le jeu (C2, m6) ; « Revenez demain »
  sans heure de reset vs compte à rebours précis de l'arène (m4) — deux
  grammaires de cooldown pour le même concept.
- **Le pity shiny est une règle écrite mais invérifiable** : le Guide annonce
  « +1/500 par exemplaire possédé », mais ni le tirage ni la collection
  n'affichent jamais la chance courante (API : « pity non exposé »,
  `api-inventory.md` § limitations). Une mécanique de fidélité qui ne se voit
  pas ne fidélise pas.

## 4. Rythme et tension : cadence, moments morts, risques d'abandon

- **Cadence quotidienne** : bonus (auto, silencieux — crédité par effet de bord
  de `GET /auth/me`, aucun état de célébration recensé dans
  `states-inventory.md`), entraînement (1 clic), jackpot (1 clic). Aucun pic de
  tension : le jackpot porte 0,5 % de légendaire mais sa défaite s'affiche
  « Ligne 1 : Rien » en petit, bouton grisé (📸 `slot-machine/slot-fresh-result.png`)
  — pas de near-miss mis en scène, pas de rendez-vous donné.
- **Cadence hebdomadaire** : bien dessinée — lundi 00:00 triple reset (arène,
  échange, Spin) + ouverture des inscriptions ; mardi 12:00 lock ; jeudi 12:00
  tournoi puis ligue ; jeudi 15:00 bannière de félicitations. Le jeudi est le
  sommet dramatique de la semaine et l'anti-spoiler le sert bien.
- **Moments morts** : vendredi 15:00 → lundi 00:00, plus aucune échéance — le
  week-end, moment où ces joueurs ont du temps, est la zone la plus vide du
  jeu. Et à tout moment, aucune vue agenda ne synthétise les quotas restants
  (le joueur visite 5 pages pour savoir où il en est,
  `existing-user-flows.md` § rythme temporel).
- **Risques d'abandon par segment** : J1 sans onboarding (brûler 200 🪙 sans
  comprendre biomes/shiny/équipe) ; S2-S8 sur défaite d'arène (7 jours sans
  plan) ; end-game sur silence (3 clics sans célébration → présence par
  habitude sociale uniquement). À 30 joueurs, la rétention est **contagieuse** :
  la masse critique du tournoi (16 inscrits) est l'actif n°1 du jeu, et chaque
  décrocheur affaiblit la grappe d'amis.

## 5. Économie perçue : générosité réelle, frustrations perçues

- **Flux** : ~115-185 🪙/jour passifs (bonus 100→180 selon badges +
  entraînement 5 + espérance jackpot) = 11-18 tirages/jour. Hebdo : tournoi
  (mise 20, cagnotte ×2 — le seul « achat » toujours socialement rentable du
  jeu, jamais présenté ainsi), ligue 500 🪙 ou pari légendaire, Spin 250.
  L'économie est généreuse mais **sa générosité est invisible** (bonus
  quotidien crédité sans un mot).
- **Le choc des biomes** : 10 🪙 le tirage standard vs 50-300 🪙 ciblé (×5 à
  ×30). Défendable (le ciblage doit coûter cher en fin de complétion) mais
  perçu comme punitif tant que le Guide annonce 0 (C6) et qu'aucune aide ne
  dit *quand* un tirage biome vaut son prix (ex. : Tundra 300 pour 3 cartes
  manquantes sur 8 vs standard 10 pour 3/151).
- **La double peine de l'équipe** : la carte sacrifiée est perdue **et** son
  retrait coûte 10 🪙, définitif. Sunk cost classique : on garde une équipe
  médiocre parce que la corriger détruit encore de la valeur ; et la roulette
  peut re-piocher un Commun niveau 1. Sans préview du pool ni rappel de la
  règle, la frustration est attribuée au jeu plutôt qu'au pari accepté.
- **Micro-frustrations évitables** : fusion sans confirmation qui consomme
  10 exemplaires (C5) — 10 exemplaires = précisément la ressource pity/trade ;
  « ❌ Pas assez de coins » sans lien vers les 6 sources de revenus
  (`states-inventory.md` § échecs) ; solde optimiste qui peut dériver (M7).

## 6. Récompense et dopamine : une hiérarchie plate, un pity muet

`states-inventory.md` § succès est sans appel : commun, rare, épique,
légendaire et shiny partagent le même gabarit (« ✨ Vous avez obtenu ! » +
bordure colorée + arpège de 2 à 7 notes). Un shiny (1/500) diffère d'un commun
par une bordure argent. Aucune célébration plein écran, aucune particule, et le
résultat est sous le fold (C1+M1). Le sommet actuel — la capture de légendaire
de la ligue avec sa fausse jauge « buguée » et sa Pokéball — montre que l'équipe
sait faire du spectaculaire : il n'irrigue pas le reste. Deux absences pèsent
plus que tout :

1. **Le doublon n'est pas verbalisé** (« quantité +1 silencieuse ») alors qu'il
   a cinq usages (pity +1/500, fusion ×10, échanges ≥2 ex., pool d'équipe,
   vente). 100 % des tirages d'un joueur 146/146 sont des doublons : son jeu
   quotidien entier est un non-événement.
2. **Le pity shiny est invisible** : ni compteur, ni progression, ni ✨ sur les
   cartes proches. L'API ne l'expose pas, mais `quantity` (exposé par
   `/collection`) + la formule du Guide permettent une estimation frontend.

## 7. Rejouabilité et rétention : ce que voit un joueur qui a tout fini

Cinq écrans d'attente (« Champion de Kanto ! », « Ce défi s'ouvrira après le
prochain tournoi », « Revenez demain », « déjà obtenu cette semaine », home
identique au J1) — preuves : 📸 `gyms/gyms-desktop.png`,
`league/league-status.png`, `slot-machine/slot-fresh-result.png`,
`spin/spin-desktop.png`, `home/home-desktop-fullpage.png`. Ce que le jeu
**pourrait** lui montrer avec l'API existante : sa course au score (delta de
quelques points avec le joueur au-dessus, `GET /leaderboard` playerContext),
sa complétion shiny (50/151, `/collection` onglet Shiny), les shiny récents de
la communauté (`/leaderboard/recent-shinies`, aujourd'hui confiné au
classement), les gains du jackpot des autres (`/slot-machine/recent-wins`),
ses replays de ligue (`league/status.lastRun`) et l'historique des tournois.
La matière de rétention existe ; elle est dispersée et jamais adressée au
joueur comme un objectif (« à 1 shiny de SenZai » vaut tous les compteurs).

## 8. La session type : avant / pendant / après

- **Avant** : rien n'appelle le joueur (une seule bannière : inscriptions
  tournoi lundi-mardi). Le bonus quotidien — la première dopamine possible de
  la session — est crédité en silence.
- **Pendant** : quotidien = 2 minutes, 3 clics, 0 décision, sur 3 pages
  différentes sans lien entre elles ; jeudi = 10-20 minutes de vrai spectacle
  (parcours anti-spoiler, replays, ligue) — c'est la meilleure session du jeu.
- **Après** : aucune sortie de session designée : pas de « prochain
  rendez-vous » (reset entraînement/jackpot sans heure, m4), pas de teaser
  (« lundi : arène + échange + Spin »), pas de récapitulatif. La session se
  termine par un bouton grisé.

---

# Recommandations prioritaires

## [P1] Remonter le résultat du tirage et hiérarchiser les célébrations

**Problème** : le moment de récompense du geste central (tirage) s'affiche sous
la ligne de flottaison, et toutes les raretés partagent le même gabarit — un
shiny 1/500 ressemble à un commun.
**Preuve** : 📸 `home/roll-result-new-card.png` (carte coupée par le viewport),
`home/multi-roll-all-results.png` ; `frontend-issues.md` C1 + M1 ;
`states-inventory.md` § succès (« aucune célébration plein écran »).
**Impact** : chaque tirage de chaque joueur ; c'est le levier dopamine n°1 du
jeu et le plus rentable de la refonte.
**Recommandation** : résultat rendu dans le viewport (zone réservée au-dessus
du fold ou overlay après l'arrêt) ; 4 paliers de célébration — commun sobre,
rare/épique halo + son (existant), légendaire/shiny **plein écran** (particules,
fanfare, pause avant révélation, sur le modèle de la capture légendaire de la
ligue) ; en multi-roll, récapitulatif final groupé avec mise en avant du
meilleur tirage. Respecter `prefers-reduced-motion`.
**Complexité** : moyenne.
**Dépendances** : frontend seul (`RollResult.rarity/is_alt/isNew` déjà fournis).
**Critères d'acceptation** : en 1440×900 et 375×812, la carte gagnée est
entièrement visible sans scroll ; un tirage légendaire ou shiny déclenche une
séquence plein écran distincte ; un test utilisateur distingue la rareté du
tirage sans lire le nom de la bordure.

## [P1] Faire du Guide la source de vérité (coûts biome dynamiques, chiffres harmonisés)

**Problème** : le Guide annonce le filtre biome « sans surcoût » alors que
l'app facture 50-300 🪙 ; les comptages divergent (« 0/151 cartes standard »
vs 146 standards + 5 légendaires ; navbar v3.4.0 vs `__APP_VERSION__` 1.2.0).
**Preuve** : `frontend-issues.md` C6 ; `api-inventory.md` (`GET /roll/biomes`,
coûts observés + § limitations n°2) ; 📸 `empty-states/collection-empty.png`
(« 0 / 151 ») vs 📸 `social/leaderboard-desktop.png` (146 standards).
**Impact** : confiance — dans un jeu entre 30 amis fondé sur des probabilités
affichées, une règle écrite fausse jette le doute sur toutes les autres (taux
shiny, estimations, jackpot).
**Recommandation** : dans la refonte, le Guide lit les coûts depuis
`GET /roll/biomes` (tableau dynamique biome/coût/progression) ; unifier la
terminologie des comptages (146 standards + 5 légendaires, partout) ; une seule
source de version affichée ; ajouter au Guide les règles observées absentes
(pity shiny chiffré, prix de vente, économie de l'équipe).
**Complexité** : faible.
**Dépendances** : API existante (contenu du front).
**Critères d'acceptation** : aucun écart entre un chiffre du Guide et le
comportement de l'app (revue croisée sur tirage, biomes, vente, fusion,
équipe, arènes, tournoi, jackpot) ; le coût affiché d'un biome dans le Guide
provient du même endpoint que celui de la roulette.

## [P1] Verbaliser le doublon et afficher le pity shiny estimé

**Problème** : le doublon — 100 % des tirages d'un joueur en fin de collection
— n'a aucun feedback (« quantité +1 silencieuse »), et le pity shiny
(+1/500 par exemplaire, règle écrite du Guide) est invisible partout.
**Preuve** : `states-inventory.md` § succès (ligne Doublon ⚠️) ;
`existing-features.md` § 1 (règle du pity) ; `api-inventory.md` § limitations
n°6 (pity non exposé) ; 📸 `social/leaderboard-desktop.png` (le end-game est la
chasse aux shiny : 40-50 shiny au top, écarts de 3-15 points).
**Impact** : donne un sens à chaque tirage du mid/end-game — transforme « je
n'ai rien eu » en « ma chance shiny sur Pyroli vient de monter » ; c'est la
réponse frontend au problème « plus rien à faire au quotidien ».
**Recommandation** : au résultat d'un doublon, afficher « Doublon ×N — chance
shiny estimée ~(N+1)/500 ✨ » (formule du Guide appliquée à `quantity`,
libellée « estimation ») ; dans la collection, badge/tri « chance shiny » et
compteur shiny global mis en avant. Marquer l'exactitude au tirage près comme
**évolution backend** (endpoint pity) — fallback : l'estimation frontend
ci-dessus, clairement étiquetée.
**Complexité** : faible (estimation) ; l'exactitude serveur est hors périmètre.
**Dépendances** : API existante (`/collection` expose `quantity`) ; exactitude
= évolution backend.
**Critères d'acceptation** : tout tirage doublon affiche le compteur
d'exemplaires et l'estimation de pity ; la collection permet de trier par
chance shiny estimée ; le libellé « estimation (règle du Guide) » est présent ;
si l'endpoint backend arrive, l'estimation est remplacée sans changement d'UI.

## [P1] Transformer #home en hub de session (« Aujourd'hui / Cette semaine »)

**Problème** : le hub du jeu est un écran de machine isolé — ni quotas du jour,
ni échéances de la semaine, ni progression ; le joueur visite 5 pages pour
savoir ce qu'il lui reste à faire, et le end-game y voit le même écran qu'un
compte neuf.
**Preuve** : `frontend-issues.md` m8 ; `existing-user-flows.md` § rythme
(« aucune vue agenda ») ; 📸 `home/home-desktop-fullpage.png` (end-game, 6 🪙,
zéro information) vs `onboarding/first-visit-home.png` (identique au J1).
**Impact** : structure chaque session (avant/pendant/après), réduit la charge
mentale hebdomadaire, expose les contenus oubliés (Spin, échanges) ; capitalise
sur des requêtes déjà payées par la navbar (C4).
**Recommandation** : sous la roulette, deux rangées de tuiles d'état —
« Aujourd'hui » : bonus crédité (+X 🪙), entraînement fait/à faire, jackpot
dispo ; « Cette semaine » : arène (`can_attempt`), tournoi (statut/inscription),
ligue (`league/status`), échange (`trades/eligibility.tradedThisWeek`), Spin
(`spin/status`) — chaque tuile lie vers sa page avec compte à rebours. Servi
par un store Pinia unique avec TTL (règle la sur-sollicitation C4 au lieu de
l'aggraver).
**Complexité** : moyenne.
**Dépendances** : API existante (`auth/me`, `training/status`,
`slot-machine/status`, `gym`, `tournament/current`, `league/status`,
`trades/eligibility`, `spin/status`).
**Critères d'acceptation** : depuis #home, l'état des 3 quotas quotidiens et
des 5 échéances hebdo est lisible sans navigation ; le nombre total d'appels
API par navigation n'augmente pas (store + TTL mesuré) ; chaque tuile « à
faire » est cliquable vers l'action.

## [P2] Onboarder la boucle cœur au J1

**Problème** : après inscription, aucune explication de la roulette, des coins,
des raretés, des biomes ni du but du jeu ; les 3 sélecteurs de révélation sont
cryptiques avant d'avoir joué.
**Preuve** : `frontend-issues.md` C2 ; 📸 `onboarding/first-visit-home.png` ;
F1 dans `existing-user-flows.md` (« l'utilisateur doit deviner qu'il faut
cliquer Lancer »).
**Impact** : churn J1 — 200 🪙 = 20 tirages pour convaincre ; si le joueur ne
découvre pas collection/équipe/arènes, le jeu se réduit à une machine à sous.
**Recommandation** : réutiliser le pattern « modale d'intro » déjà accepté
(équipe/arènes/tournoi) pour la roulette : 3-4 étapes contextuelles au premier
tirage (solde et coût → lancer → résultat/rareté → « ta carte est dans ta
collection, construis ton équipe ») ; masquer les options avancées (modes de
révélation, multi ×5, biomes) tant que ~5 tirages n'ont pas été faits ;
checklist de premiers objectifs sur le hub (tirer 5 fois, voir sa collection,
créer son équipe, tenter l'arène 1).
**Complexité** : moyenne.
**Dépendances** : frontend seul (localStorage, pattern intro existant).
**Critères d'acceptation** : un compte neuf voit l'intro une seule fois et peut
la rejouer depuis le Guide ; les options avancées apparaissent progressivement ;
la checklist J1 disparaît une fois complétée.

## [P2] Des objectifs adaptés à l'état du compte (missions calculées côté front)

**Problème** : le jeu n'énonce jamais d'objectif : ni « prochaine arène », ni
« X cartes avant les échanges », ni objectif shiny en end-game — la motivation
repose sur la mémoire du joueur.
**Preuve** : § 2 de cette analyse ; `states-inventory.md` § verrouillés (les
jalons existent : 120 cartes, 8 badges, 1 Pokémon de base) mais ne sont visibles
que sur leurs pages ; 📸 `gyms/gyms-desktop.png` (end-game : « Voir ma
collection » comme seul horizon).
**Impact** : rétention S1→M2 (toujours un « prochain pas ») et end-game (la
complétion shiny par biome devient un programme de jeu).
**Recommandation** : un bloc « Objectifs » sur le hub, dérivé de l'état du
compte sans stockage serveur : progression badges (n/8, prochaine arène),
progression échanges (n/120), complétion par biome (« Forêt 12/14 — tirage
Forêt 60 🪙 »), et en end-game des cibles shiny (« 3 shiny Ville manquants ») +
delta de score avec le joueur au-dessus. Aucune récompense inventée (les
récompenses restent celles du backend) : ce sont des **caps de navigation**,
pas une nouvelle économie.
**Complexité** : moyenne.
**Dépendances** : API existante (`/collection/all`, `/gym`,
`/trades/eligibility`, `/leaderboard`, `/roll/biomes`).
**Critères d'acceptation** : à tout stade (compte neuf, 3 badges, 8/8), le hub
affiche au moins 2 objectifs pertinents et actionnables (lien direct) ; aucun
objectif n'annonce de récompense que l'API ne donne pas.

## [P2] Mettre en scène la course au score et le fil social

**Problème** : la compétition réelle (écarts de 3-15 points au sommet, 1 shiny
= 10 points = un dépassement) et les feeds existants (shiny récents, gains du
jackpot) sont enfouis sur des pages secondaires ; rien ne dit au joueur qu'il
peut doubler quelqu'un.
**Preuve** : 📸 `social/leaderboard-desktop.png` (666/660/651/648) ;
`api-inventory.md` (`/leaderboard` playerContext above/below,
`/leaderboard/recent-shinies`, `/slot-machine/recent-wins`).
**Impact** : rétention end-game et pression sociale positive — dans une
communauté de 30 amis, « à 1 shiny d'Adriano » est le meilleur moteur de
tirages quotidiens.
**Recommandation** : sur le hub et le classement, afficher le delta nominal
avec le joueur au-dessus et en-dessous (« +9 pts sur Vince, −6 sur Jdsd ») avec
équivalence en prises (« = 1 shiny ») ; intégrer un fil compact « il se passe
quoi » (derniers shiny/légendaires, gains jackpot marquants) sur le hub ;
notification visuelle locale quand mon rang change entre deux sessions
(comparaison avec le rang mémorisé en localStorage).
**Complexité** : faible.
**Dépendances** : API existante.
**Critères d'acceptation** : un joueur hors top 10 voit son delta exact avec
ses voisins de classement depuis le hub ; le fil social du hub affiche les
5 derniers événements communautaires ; le changement de rang depuis la dernière
session est signalé.

## [P2] Sécuriser l'économie destructive (pool d'équipe visible, rappels, confirmation de fusion)

**Problème** : trois actions détruisent des ressources avec trop peu de
garde-fous ou d'information : la roulette d'équipe (carte retirée à jamais,
règle rappelée une seule fois à vie), le retrait payant (10 🪙, définitif), et
la fusion **sans confirmation** qui consomme 10 exemplaires — la ressource
même du pity et des échanges.
**Preuve** : `frontend-issues.md` C5 (fusion), F4 `existing-user-flows.md`
(« plus aucun rappel de la destruction ») ; `existing-features.md` § 4.
**Impact** : frustration et sunk cost — une perte mal comprise est attribuée au
jeu, pas au pari ; à l'inverse, un pari bien exposé (pool visible) devient une
mécanique stratégique assumée (curer sa collection avant de lancer).
**Recommandation** : avant chaque lancer de roulette d'équipe, afficher le pool
éligible (nombre de candidats, répartition par rareté, liste consultable —
dérivée de `/collection` moins Légendaires/Shiny, sans annoncer de
probabilités exactes non confirmées) + micro-rappel permanent « la carte tirée
quitte ta collection » ; confirmation de fusion avec bilan explicite (« consomme
10 × Chenipan — tu en garderas N ; impact pity/échanges ») ; sur le retrait,
rappeler le coût ET la non-restitution dans la même modale.
**Complexité** : faible.
**Dépendances** : API existante (`/collection`, `/team/preview-batch`).
**Critères d'acceptation** : impossible de fusionner sans confirmation
explicite ; le pool éligible (taille + composition) est visible avant tout
lancer d'équipe ; le rappel de destruction est présent à chaque lancer, pas
seulement à la première visite.

## [P3] Un end-game affiché : remplacer les écrans d'attente par du contenu

**Problème** : pour un joueur 8/8 badges, `#gyms` se fige sur un panneau
statique et `#league` hors cycle est une phrase sur un écran vide à 90 % ; le
jeu dit « attendez » sur ses pages de défi.
**Preuve** : 📸 `gyms/gyms-desktop.png`, `league/league-status.png` ;
`application-map.md` (compte principal : « plus rien à faire au quotidien »).
**Impact** : rétention end-game — ces pages sont visitées chaque jour
(entraînement) et chaque semaine (ligue) par les joueurs les plus investis.
**Recommandation** : `#gyms` end-game : conserver l'entraînement en tête,
ajouter mes stats de règne (badges datés, historique des tentatives via
`gym/history`, série de victoires d'entraînement) ; `#league` en attente :
afficher le dernier run (`league/status.lastRun` + replays), les 4 adversaires
probables du prochain cycle (top du tournoi en cours via
`tournament/current`/`tournament/:id`), le compte à rebours d'ouverture
(jeudi après résultats) et le rappel de l'enjeu (500 🪙 vs capture).
**Complexité** : moyenne.
**Dépendances** : API existante.
**Critères d'acceptation** : plus aucune page privée ne se réduit à une phrase
d'attente ; depuis `#league` hors cycle, je peux revoir mon dernier run et voir
la date/heure du prochain ; depuis `#gyms` end-game, l'historique et les stats
sont accessibles sans quitter la page.

## [P3] Célébrer le bonus quotidien et unifier les resets

**Problème** : la première récompense de chaque session (+100 à +180 🪙) est
créditée par effet de bord de `GET /auth/me` sans aucun feedback ; les
cooldowns parlent deux langues (« Revenez demain » sans heure vs compte à
rebours précis de l'arène).
**Preuve** : `api-inventory.md` (§ auth/me, effet de bord + `rewardClaimed`) ;
`frontend-issues.md` m4 ; `states-inventory.md` § succès (aucune entrée
« bonus quotidien ») ; 📸 `slot-machine/slot-fresh-result.png` (« Revenez
demain »).
**Impact** : ancre le rituel quotidien (raison de se connecter rendue visible)
et donne une sortie de session (« prochain rendez-vous à … »).
**Recommandation** : quand `rewardClaimed` passe à faux → toast/séquence
« Bonus quotidien +1XX 🪙 (100 + 10 × badges) » ; harmoniser tous les cooldowns
sur un même composant compte à rebours (entraînement/jackpot → heure de reset
quotidienne confirmée avec le backend, sinon libellé date ; arène/échange/Spin
→ lundi 00:00 ; tournoi → jalons mardi 12:00/jeudi 12:00) ; en fin de session
quotidienne (3 quotas consommés), afficher le prochain rendez-vous.
**Complexité** : faible.
**Dépendances** : API existante (l'heure exacte des resets quotidiens est à
confirmer ; fallback : afficher la date sans heure).
**Critères d'acceptation** : le premier chargement du jour affiche la
célébration du bonus avec le montant exact ; tous les états « déjà joué »
affichent le même composant de compte à rebours ; `auth/me` n'est appelé
qu'une fois par session (effet de bord maîtrisé).

## [P3] Scénariser la défaite du jackpot (near-miss et rendez-vous)

**Problème** : l'unique moment de loterie quotidien se termine, en cas de
défaite, par « Ligne 1 : Rien » et un bouton grisé — aucun near-miss, aucun
lot de consolation perçu, aucune projection vers demain ; la table des
probabilités est repliée par défaut.
**Preuve** : 📸 `slot-machine/slot-fresh-result.png` ; `frontend-issues.md` m3,
m4 ; `existing-features.md` § 8 (les `cells` complètes sont renvoyées par
`POST /slot-machine/spin`).
**Impact** : le jackpot est 1 des 3 clics quotidiens de tout joueur — son
« presque » quotidien est le teaser naturel du lendemain.
**Recommandation** : détecter côté front les lignes à 2 symboles identiques et
les mettre en scène (« ⭐ Presque ! 2 légendaires sur la ligne 2 ») ; remplacer
« Rien » par un message qui projette (« Pas de gain aujourd'hui — nouvelle
chance demain à [reset] », + dernier gain marquant de la communauté via
`recent-wins`) ; déplier par défaut la ligne clé de la table des récompenses
selon la mise choisie (gain espéré affiché avant de lancer). Aucune
modification des probabilités réelles : uniquement de la mise en scène de
données déjà renvoyées.
**Complexité** : faible.
**Dépendances** : API existante.
**Critères d'acceptation** : un spin perdant avec 2 symboles identiques sur une
ligne jouée affiche le near-miss ; l'état « déjà joué » affiche compte à
rebours + feed des gains ; le choix de mise affiche les probabilités clés sans
ouvrir de dépliant.

## [P3] Donner un contenu au creux du vendredi → dimanche

**Problème** : après la bannière de félicitations (vendredi 15:00), plus
aucune échéance avant lundi 00:00 — le week-end, moment de disponibilité des
joueurs, est la zone la plus vide de la semaine.
**Preuve** : `existing-user-flows.md` § rythme temporel + F6 (calendrier
tournoi) ; `existing-features.md` § 5-7 (tous les resets hebdo tombent lundi
ou jeudi).
**Impact** : lisse la courbe d'activité hebdomadaire et prépare le pic du
lundi (arène + échange + Spin + inscriptions).
**Recommandation** : sans nouvelle mécanique serveur, faire du week-end la
« préparation du lundi » sur le hub : replays du tournoi de jeudi à revoir
(matches des autres, `tournament/:id`), bilan de la semaine (mes shiny et ceux
de la communauté via `recent-shinies`, résultat de mon tournoi/ligue), et
plan du lundi (arène ciblée + estimation actuelle, épargne conseillée pour un
tirage biome, candidat d'échange dont le cooldown expire). Marquer « défis du
week-end » avec récompenses dédiées comme **évolution backend** — fallback :
les objectifs frontend ci-dessus, sans récompense inventée.
**Complexité** : moyenne.
**Dépendances** : API existante ; défis récompensés = évolution backend.
**Critères d'acceptation** : entre vendredi 15:00 et lundi 00:00, le hub
propose au moins 3 contenus datés (revoir, bilan, préparer) ; le lundi, le plan
préparé pointe vers les 3 resets du jour ; aucune récompense non servie par
l'API n'est promise.

---

## Classement final des recommandations

| Rang | Priorité | Recommandation | Impact | Effort |
| --- | --- | --- | --- | --- |
| 1 | P1 | Résultat de tirage visible + hiérarchie de célébrations | Très fort (chaque tirage) | Moyen |
| 2 | P1 | Guide = source de vérité (coûts biome, chiffres, version) | Fort (confiance) | Faible |
| 3 | P1 | Doublon verbalisé + pity shiny estimé | Très fort (end-game quotidien) | Faible |
| 4 | P1 | Hub « Aujourd'hui / Cette semaine » sur #home | Fort (toutes sessions) | Moyen |
| 5 | P2 | Onboarding de la boucle cœur (J1) | Fort (churn J1) | Moyen |
| 6 | P2 | Course au score et fil social mis en scène | Fort (end-game) | Faible |
| 7 | P2 | Économie destructive sécurisée (pool, rappels, confirmation fusion) | Moyen-fort | Faible |
| 8 | P2 | Objectifs calculés selon l'état du compte | Moyen-fort | Moyen |
| 9 | P3 | Bonus quotidien célébré + resets unifiés | Moyen | Faible |
| 10 | P3 | Jackpot : near-miss et défaite scénarisée | Moyen | Faible |
| 11 | P3 | End-game affiché sur #gyms/#league | Moyen | Moyen |
| 12 | P3 | Contenu du creux vendredi→dimanche | Moyen | Moyen |

Lecture du classement : les rangs 1-4 réparent la boucle quotidienne (récompense
visible, confiance, sens du doublon, agenda) — c'est le socle de la refonte ;
les rangs 5-8 sécurisent l'entrée (J1) et la compétition sociale ; les rangs
9-12 densifient le rituel et l'end-game. Tout est réalisable avec l'API
existante ; seules l'exactitude du pity (rang 3) et d'éventuels défis
récompensés du week-end (rang 12) sont marqués « évolution backend », chacun
avec son fallback frontend.
