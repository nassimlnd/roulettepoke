# Audit expert 02 — UX jeux web (browser game / gacha / social)

> Rôle : expert UX senior jeux web. Périmètre : refonte frontend Nuxt 4.5 +
> Nuxt UI + Pinia, **API et règles métier inchangées**.
> Matériau : `docs/audit/*` (flows, états, issues, UI, features) + captures
> `artifacts/screenshots/` (onboarding, home, team, errors, trades, tournament,
> gyms, misc). Les références `C1…M8/m1…` renvoient à `frontend-issues.md` ;
> `F1…F11` à `existing-user-flows.md`.

## Synthèse

1. Le moment de récompense — cœur d'un gacha — est littéralement hors écran : la carte gagnée se rend sous la ligne de flottaison (`home/roll-result-new-card.png`, carte coupée à 900 px).
2. Il n'existe **aucun onboarding de la boucle cœur** : un nouveau joueur arrive devant une bande de « ??? », 8 réglages cryptiques et une bannière tournoi, sans une phrase d'explication (`onboarding/first-visit-home.png`).
3. La pédagogie existe pourtant ailleurs (modales d'intro équipe/arènes/tournoi, Guide riche) — mais elle est à usage unique, non ré-ouvrable, contradictoire avec l'app sur les coûts biome (C6) et muette sur les échanges et l'économie.
4. La friction est **inversement proportionnelle au risque** : fusionner (détruit 10 cartes) n'a aucune confirmation, vendre 1 carte en a une ; la roulette d'équipe (retrait définitif de la collection) s'exécute en un clic après une modale vue une seule fois.
5. L'état du jeu est invisible : 3 quotas quotidiens + 5 échéances hebdomadaires vivent chacun sur leur page, sans vue synthèse ni compte à rebours homogène ; le solde est recalculé de façon optimiste depuis 4+ sources API (M7).
6. La récupération après erreur est inexistante : « Erreur : Failed to fetch » affiché brut (`errors/leaderboard-offline.png`), 401 sans bouton de reconnexion, un tirage hors ligne peut éjecter vers l'écran de connexion avec une navbar encore « connectée » (`errors/roll-offline-error.png`).
7. L'échange en 3 étapes asynchrones repose sur la mémoire du joueur : un point rouge sans nombre dans un dropdown est le seul rappel, et rien n'annonce à la cible qu'accepter ne conclut pas l'échange.
8. Le cycle tournoi de 4 jours (lundi → jeudi 15h) est décrit en prose datée, sans timeline ni indication de la phase courante — le mental model repose sur la lecture de 3 phrases.
9. Les forces sont réelles et à préserver : théâtre de suspense (jauges, battement de cœur), anti-spoiler du tournoi, estimations de victoire transparentes, personnalité française drôle.
10. Priorité de refonte : rendre la récompense visible et célébrée, guider les 5 premières minutes, centraliser erreurs/solde/quotas dans des stores Pinia — l'essentiel se fait **frontend seul**.

---

## Analyse par thème

### T1. Les 5 premières minutes d'un nouveau joueur (inscription → premier tirage)

Simulation sur la base de F1/F2 et des captures `onboarding/*` :

- **0:00 — Arrivée sur `#home` après inscription.** `onboarding/first-visit-home.png` : une bande de 5 cartes « ??? » ornées d'une étincelle, un pointeur rouge, « 🎰 Lancer (10 🪙) ». Aucun texte ne dit ce qu'est ce jeu, ce qu'on gagne, ni pourquoi les cartes sont masquées. F1 le confirme : « AUCUN onboarding sur la roulette … l'utilisateur doit deviner qu'il faut cliquer Lancer ».
- **0:05 — Premier message que le jeu adresse au joueur : la bannière tournoi.** En haut à droite : « 🏆 Inscriptions au tournoi ouvertes — rejoignez-le avant mardi midi ! ». Le tout premier contenu poussé est une feature sociale end-game à 20 🪙, avec deux notions inconnues (tournoi, mardi midi), avant même le premier tirage. Sur mobile, cette bannière **recouvre le bloc utilisateur** (`home/home-mobile-compact.png` : le pseudo passe derrière la bannière — M2).
- **0:20 — Lecture des réglages.** Le sélecteur « 👁 Visibles / ✨ Si possédée / ❓ Masquées » est incompréhensible avant d'avoir compris le jeu (possédée par qui ? masquées pourquoi ?). Le hint du mode « Masquées » est contre-intuitif : « Toutes les cartes sont révélées après le lancer » (`home/roll-hidden-strip.png`, m6). « Filtrer par biome + » introduit un 2ᵉ concept non défini — dont le Guide dit qu'il est « sans surcoût » alors qu'il coûte 50–300 🪙 (C6). Le toggle multi est un bouton rond iconique + pastille « x5 » sans libellé.
- **0:40 — Premier tirage (si le joueur ose).** Animation de 4 s réussie (ticks, décélération — force à garder), puis « ✨ Vous avez obtenu ! » … dont la carte est **coupée par le bas de l'écran** (`home/roll-result-new-card.png` : titre à ~720 px, carte tronquée à 900 px — C1). Rien ne dit si c'est une nouvelle carte ou un doublon (halo discret seulement, states-inventory « Doublon : rien ne l'indique ⚠️ »).
- **2:00 — Épuisement du capital.** 200 🪙 de départ = 20 tirages. À 6 🪙 (`home/home-desktop.png`), le bouton « Lancer (10 🪙) » reste visuellement identique et actif ; l'échec n'est découvert qu'au clic : « ❌ Pas assez de coins », sans lien vers les sources de revenus (entraînement +5, jackpot gratuit, bonus quotidien) — F2.
- **3:00–5:00 — Et après ?** Aucun objectif suivant n'est proposé (m8 : la home « ne présente aucun statut de progression »). La collection neuve est « impressionnante mais froide, aucune invite à tirer » (states-inventory, états vides). Les excellentes modales d'intro équipe/arènes (`onboarding/team-intro-modal.png`, `onboarding/gyms-intro-modal.png`) n'existent que si le joueur trouve seul ces pages dans deux dropdowns différents (« Ma progression », « Défis »).

**Diagnostic** : le funnel d'activation repose à 100 % sur la curiosité. Pour un gacha, où la rétention D1 se joue sur « premier tirage mémorable + objectif suivant clair », c'est le risque n°1 du produit.

### T2. Charge cognitive de la home

`home/home-desktop.png` — autour de l'unique action utile, l'écran expose **~19 cibles interactives** :

- zone de jeu (8) : avatar (ouvre le picker), « 🎒 Inventaire », 3 segments de révélation, « Filtrer par biome + », toggle multi (2 cibles ×1/×5) ;
- navbar (9) : logo/version (patch notes), 5 dropdowns (Jeux, Ma progression, Défis, Social, Infos), Statistiques, 🔔, Déconnexion ;
- overlays (2) : bannière tournoi, bulle de chat.

Soit 1 action primaire pour ~18 secondaires, dont 3 libellés nécessitant une connaissance préalable du jeu (« Si possédée », « Masquées », biomes). Les réglages de *comment je regarde le résultat* (révélation) ont le même poids visuel que *ce que je joue* (biome, ×5) et que des méta-actions (avatar, inventaire). Aucun regroupement, aucune hiérarchie de fréquence d'usage : le mode de révélation, réglé une fois puis persisté (`gacha_reveal_mode`), occupe une ligne centrale permanente.

### T3. Hiérarchie des actions par écran

- **Home** : primaire correct (« Lancer », dégradé violet, plus gros élément) mais concurrencé (cf. T2) et le résultat — la vraie « suite » de l'action — est sous le fold (C1).
- **Multi-roll** : le bouton devient « Lancer 5 fois (50 🪙) » et **la position des éléments change** (bouton au-dessus des 5 roulettes empilées au lieu d'en dessous, `home/multi-roll-all-results.png`) ; les 5 résultats s'affichent encore plus bas, hors écran.
- **Collection** : sur chaque carte possédée, 💰 (vendre) et 🆙 (fusionner) sont deux boutons jumeaux de même taille pour deux gravités opposées — vendre 1 exemplaire vs consommer 10 exemplaires (C5).
- **Leaderboard** : « le bouton “voir le classement des tricheurs” [est] mis au même niveau visuel que l'action primaire » (m7).
- **Guide** : `misc/rules-desktop-fullpage.png` — 13 accordéons **tous fermés** ; la page primaire d'apprentissage s'ouvre sur un mur de portes closes (« Cliquez sur une section pour la développer »).
- **Trades** : `trades/trades-page.png` — hiérarchie correcte (« Accepter » primaire violet, « Refuser » outline) mais précédée d'un paragraphe de 5 règles en 4 lignes denses avant toute action.

### T4. Visibilité de l'état courant (quotas, solde, échéances)

Le rythme du jeu (tableau final de `existing-user-flows.md`) : 3 actions quotidiennes (bonus auto, entraînement, jackpot) et 5 échéances hebdomadaires (arène lundi, tournoi lundi→jeudi, ligue jeudi, échange lundi, Spin lundi). Constat :

- **Aucune vue synthèse** : « le joueur doit visiter chaque page pour connaître ses quotas restants » (flows) ; la home n'affiche ni badges, ni complétion, ni échéances (m8).
- **Patterns de cooldown incohérents** (m4) : l'arène affiche « Prochain combat disponible lundi dans Xj Xh », mais l'entraînement dit « ⏳ Déjà combattu aujourd'hui » sans heure (`gyms/gyms-desktop.png`) et le jackpot « Revenez demain » sans heure de reset.
- **Solde incohérent** : décrément optimiste local après tirage (`user.coins -= card.rollCost`, M7) sans resync ; « le solde vit dans 4+ sources API différentes selon la page » (M7) ; l'API n'a « pas d'endpoint de solde seul » (`api-inventory.md` §7) — il arrive via `auth/me`, `training/status`, `slot-machine/status`, réponses de vente/spin. Deux onglets divergent (states-inventory, temps réel).
- **Le bonus quotidien est silencieux** : crédité automatiquement au premier `/auth/me` (F1) ; aucun état de `states-inventory.md` ne matérialise sa réception. Le seul affichage du « +80 coins/jour (total : 180 🪙) » vit sur la page arènes (`gyms/gyms-desktop.png`) — le rituel de connexion quotidien, levier de rétention classique, n'est ni visible ni célébré.

### T5. Confirmations & prévention d'erreur — friction inversée au risque

| Action | Gravité | Garde-fou actuel |
| --- | --- | --- |
| Vendre 1 carte | Faible (1 exemplaire, prix connu) | ✅ Modale « Es-tu sûr ? » (F3) |
| Retirer un membre d'équipe (−10 🪙, définitif) | Moyenne | ✅ Confirmation (F4) |
| Vider l'équipe | Moyenne | ✅ Confirmation (features §4) |
| **Fusionner (consomme 10 exemplaires)** | **Élevée** | ❌ **Aucune confirmation** — exécution au clic 🆙 (C5, `collection.js` `handleMerge` sans `showModal`) |
| **Roulette d'équipe (carte aléatoire retirée à jamais de la collection)** | **Élevée** | ❌ Aucune confirmation au clic ; modale d'intro **une seule fois** (`gacha_team_intro_seen`) + bandeau d'avertissement passif sous le bouton (`team/team-desktop.png` : « ⚠️ Le Pokémon tiré quitte définitivement votre collection ») |
| Choix de carte (événement) | Moyenne | ❌ Modale sans fermeture ni annulation (« cliquer = choisir », F2, m1) |
| Pari légendaire (ligue) | Élevée | ✅ Confirmation modale + % affiché (F8 — le bon modèle) |

Nuance importante vs `existing-user-flows.md` (F4 « plus aucun rappel ») : le rappel écrit **existe** sur la page équipe, mais c'est un texte passif sous le bouton, pas une étape — la seule explication bloquante est la modale d'intro, non ré-affichable. Le système de confirmation de la ligue (récap + % + choix explicite) montre que le pattern correct existe déjà dans le produit ; il n'est simplement pas appliqué là où le risque est maximal.

### T6. Récupération après erreur

- **Messages techniques bruts** : « Erreur : Failed to fetch » en bandeau rouge, doublé d'un second bandeau « Impossible de charger les derniers Shiny. » (`errors/leaderboard-offline.png`) — deux erreurs empilées, zéro bouton de retry (C3).
- **401 sans issue** : « Token invalide ou expiré » affiché brut sur les pages internes, « sans action proposée » (states-inventory). `errors/invalid-token-collection.png` : bandeau « Impossible de charger la collection. Veuillez réessayer. » — le texte prescrit un retry impossible (aucun bouton) et inutile (la cause est le token : seule une reconnexion aiderait).
- **État mixte incohérent** : `errors/roll-offline-error.png` — après un tirage hors ligne, le joueur se retrouve sur le **formulaire de connexion** alors que la navbar affiche encore l'état connecté (Jeux/Ma progression/…/Déconnexion). Le joueur semble déconnecté sans l'être ; son contexte de jeu est perdu.
- **Données perdues** : « Session expirée en cours d'action : message brut, saisie perdue » (states-inventory) ; pas de bannière réseau globale, pas de file de toasts (M8), « Chargement... » sans timeout possible à l'infini.
- Chat : reconnexion silencieuse correcte, mais bannissement = fermeture sans aucun message (states-inventory, temps réel).

### T7. Échange en 3 étapes asynchrone — charge mnésique maximale

Flux F9 : demande (initiateur) → acceptation avec contre-choix (cible) → confirmation (initiateur). Trois problèmes spécifiques :

1. **Le modèle mental n'est jamais montré.** `trades/trades-page.png` : la demande entrante dit « DARKDRIANO souhaite échanger contre ta carte Ectoplasma (Épique) » avec Accepter/Refuser. Rien n'annonce qu'« Accepter » ouvre un choix de contrepartie, ni que l'échange ne sera conclu **qu'après une 3ᵉ étape** chez l'initiateur. Les statuts « À traiter / En attente » ne disent pas *qui doit agir* ni *ce qui se passera ensuite*.
2. **Le seul rappel est un point rouge sans nombre**, agrégé dans le dropdown « Social » (ui-inventory : « pastilles rouges sans nombre »), recalculé à la navigation. Aucun toast, aucune notification push d'étape (M8) ; un échange peut expirer (statut « expiré », features §13) sans que le joueur ait jamais su qu'on l'attendait.
3. **5 règles d'éligibilité en préambule dense** (120 uniques, 2 exemplaires min, 1/semaine, 1 mois par partenaire, même rareté, légendaires/shiny exclus) au lieu d'être injectées au moment où chacune s'applique. Et le gating est présenté comme une erreur : `empty-states/trades-locked-progress.png` montre un unique bandeau **rouge** « Il faut au moins 120 cartes standards uniques pour échanger. » — même composant qu'une panne réseau, sans compteur de progression visible ni CTA vers la roulette.

### T8. Cycle tournoi sur 4 jours — un état-machine à mémoriser

Le cycle (features §7) : inscriptions lundi 00:00 → clôture mardi 12:00 → gel des équipes jeudi 11:55 → combats jeudi 12:00 → résultats ~15:00. `tournament/tournament-desktop-fullpage.png` montre la phase « INSCRIPTIONS OUVERTES » : les trois échéances y sont **trois phrases datées** dispersées (« Tournoi du jeudi 23 juillet », « Inscriptions jusqu'au mardi 21 juillet à 12h00 », « Votre équipe sera figée le jeudi à 11h55 ») — aucune timeline, aucun compte à rebours, aucun indicateur « vous êtes ici ». La phase intermédiaire (mardi→jeudi : affiner son équipe, consulter les matchups) n'est découvrable qu'en revenant sur la page. Risques concrets : s'inscrire lundi (20 🪙), oublier, et voir son équipe gelée en l'état jeudi ; ou rater la fenêtre d'inscription faute de rappel autre que la bannière du lundi (dismissable une fois, `tourn_banner_dismissed`). Les bonnes pièces existent déjà — bannière, badge navbar, anti-spoiler « Mon parcours », préparation riche — il manque l'ossature temporelle qui les relie.

### T9. Onboarding progressif : l'existant vs le manquant

**Existant (à préserver et généraliser)** :
- 3 modales d'intro pédagogiques — équipe (`onboarding/team-intro-modal.png` : 4 blocs, avertissement destructif en rouge), arènes (`onboarding/gyms-intro-modal.png` : 5 blocs, déblocage progressif), tournoi. Bon format : blocs courts, hiérarchisés, un CTA.
- Guide complet 13 sections (`misc/rules-desktop-fullpage.png`), accessible même déconnecté.
- Gating de progression avec explication (Spin verrouillé, ligue à 8 badges, arènes séquentielles — states-inventory).

**Manquant / défaillant** :
- **Aucune intro de la boucle cœur** : ni roulette, ni économie (coins : sources/dépenses), ni raretés/shiny/biomes (C2) — précisément les concepts nécessaires dans les 5 premières minutes.
- Modales d'intro **à usage unique** (flags localStorage), non ré-ouvrables — aucune icône « ? » pour relire.
- **Ton incohérent entre les deux modales d'intro** : équipe tutoie (« ta collection »), arènes vouvoie (« Vous ne pouvez tenter ») — M4, visible en comparant les deux captures.
- Guide **contredit l'app** sur les coûts biome (C6 : « sans surcoût » vs 50–300 🪙) et **n'a aucune section Échanges** (les 13 sections listées sur `rules-desktop-fullpage.png` vont de Tirages à Idées & Roadmap, sans Échanges).
- Aucun système d'objectif suivant (« next best action ») : après le premier tirage, le jeu ne propose jamais « obtiens 1 Pokémon de base → Spin », « 6 Pokémon → équipe », « équipe → arène » — alors que cette chaîne de déblocage existe dans les règles.

---

## Recommandations

## [P1] Rendre le résultat du tirage visible sans scroll et à hiérarchie de rareté

**Problème** : la carte gagnée s'affiche sous la ligne de flottaison (desktop 900 px et mobile), et toutes les raretés partagent le même gabarit « ✨ Vous avez obtenu ! » ; le doublon n'est pas verbalisé.
**Preuve** : `home/roll-result-new-card.png` (carte tronquée par le fold), C1, M1, states-inventory (« Doublon : rien ne l'indique ⚠️ », « résultat souvent sous le fold »).
**Impact** : le moment de récompense — la raison de jouer à un gacha — est invisible ou plat ; un légendaire (~1/500) ne produit aucun pic mémorable ; le joueur ne sait pas s'il a progressé (nouvelle carte) ou non (doublon).
**Recommandation** : afficher le résultat dans la zone déjà visible (overlay léger ancré sur la roulette, ou scroll automatique + layout compacté pour tenir en 900 px) ; créer 3 paliers de célébration (commun/rare-épique = inline, légendaire/shiny = plein écran avec l'animation de capture comme référence de qualité) ; verbaliser explicitement « NOUVELLE CARTE » vs « Doublon ×N » ; respecter `prefers-reduced-motion` (M5).
**Complexité** : Moyenne
**Dépendances** : frontend seul
**Critères d'acceptation** :
- En 1440×900 et 375×812, la carte gagnée est intégralement visible sans scroll manuel après l'animation.
- Un tirage légendaire ou shiny déclenche une célébration plein écran distincte ; commun/rare restent inline.
- Le résultat affiche « Nouvelle carte ! » ou « Doublon ×N » en texte, pas seulement par halo/bordure.
- Avec `prefers-reduced-motion`, la célébration se réduit à un état statique équivalent en information.

## [P1] Onboarder la boucle cœur : premier tirage guidé + concepts économiques

**Problème** : aucun tutoriel, tooltip ou invite n'explique la roulette, les coins, les raretés, les biomes ni les modes de révélation au premier contact ; les modales d'intro n'existent que pour équipe/arènes/tournoi.
**Preuve** : `onboarding/first-visit-home.png` (bande « ??? » + 8 réglages sans explication), C2, F1 (« l'utilisateur doit deviner qu'il faut cliquer Lancer »).
**Impact** : funnel d'activation en roue libre ; risque maximal d'abandon D0/D1, sur l'écran où arrive 100 % des inscrits.
**Recommandation** : au premier `#home`, séquence courte au format des modales d'intro existantes (3–4 blocs : « tire des cartes à 10 🪙 », « 4 raretés + shiny », « gagne des coins via entraînement/jackpot/bonus quotidien ») + mise en avant du bouton Lancer (les réglages avancés masqués tant qu'aucun tirage n'a eu lieu) ; après le premier tirage, proposer l'objectif suivant (collection → équipe → arène) ; toutes les modales d'intro deviennent ré-ouvrables via une icône « ? » par page.
**Complexité** : Moyenne
**Dépendances** : frontend seul
**Critères d'acceptation** :
- Un compte neuf voit une intro roulette/économie avant ou pendant son premier `#home` (flag persisté, ré-ouvrable ensuite).
- Avant le premier tirage, l'écran ne présente que l'action Lancer + solde (réglages repliés ou masqués).
- Après le premier tirage, une invite « prochaine étape » contextuelle apparaît (ex. lien équipe dès 6 cartes de base).
- Chaque modale d'intro (roulette, équipe, arènes, tournoi) est ré-affichable à la demande.

## [P1] Stratégie d'erreur globale : humaniser, proposer une issue, préserver la session

**Problème** : erreurs techniques brutes (« Failed to fetch »), 401 sans bouton de reconnexion, textes prescrivant un retry sans bouton, éjection vers le login avec navbar « connectée », saisies perdues, aucun état réseau global ni toasts.
**Preuve** : `errors/leaderboard-offline.png` (« Erreur : Failed to fetch » + 2ᵉ bandeau), `errors/invalid-token-collection.png` (« Veuillez réessayer » sans bouton), `errors/roll-offline-error.png` (login affiché sous navbar connectée), C3, M8, states-inventory (« Session expirée en cours d'action : saisie perdue »).
**Impact** : chaque incident réseau ou expiration de session se solde par une impasse ou une perte de contexte ; perception d'un jeu cassé ; charge support.
**Recommandation** : intercepteur unique côté client (composable/fetch wrapper) : 401 → modale « Session expirée » avec bouton Se reconnecter et retour à la page d'origine après login ; erreurs réseau → message humanisé + bouton Réessayer effectif + bannière hors-ligne globale (`navigator.onLine` + échecs) ; file de toasts (Nuxt UI) pour succès/erreurs asynchrones ; jamais de message d'exception brute ; skeletons avec timeout et état d'échec réessayable (M3).
**Complexité** : Moyenne
**Dépendances** : frontend seul
**Critères d'acceptation** :
- Aucun texte d'exception technique (TypeError, stack, « Failed to fetch ») n'est visible dans l'UI.
- Tout 401 en cours de session ouvre une reconnexion sans perdre la route courante ; après login, l'utilisateur revient où il était.
- Tout bandeau d'erreur de chargement comporte un bouton Réessayer fonctionnel.
- Une coupure réseau affiche un indicateur global unique ; les pages ne s'empilent plus en bandeaux rouges multiples.

## [P1] Aligner la friction sur le risque : fusion et roulette d'équipe

**Problème** : la fusion consomme 10 exemplaires sans confirmation alors que la vente d'1 carte en a une ; la roulette d'équipe retire définitivement une carte aléatoire de la collection en un clic (explication bloquante une seule fois, avertissement ensuite réduit à un texte passif).
**Preuve** : C5 (`handleMerge` sans `showModal`), F3/F4, `team/team-desktop.png` (bandeau passif « quitte définitivement votre collection »), `onboarding/team-intro-modal.png` (explication one-shot).
**Impact** : destruction irréversible d'inventaire par mauvais clic — dans un jeu où les doublons ont 3 usages concurrents (vente, fusion, échange à 2 exemplaires min) ; perte de confiance durable en cas d'accident.
**Recommandation** : modale de confirmation sur la fusion (récap : « 10 × Salamèche → 1 × Reptincel », impact sur l'éligibilité échange) avec case « Ne plus demander » ; sur la roulette d'équipe, confirmation au clic reprenant l'avertissement destructif (même modèle que le pari légendaire de la ligue : récap + choix explicite), désactivable après validation ; conserver la modale de choix d'événement sans annulation (règle métier) mais l'annoncer (« ce choix est définitif »).
**Complexité** : Faible
**Dépendances** : frontend seul
**Critères d'acceptation** :
- Un clic sur 🆙 ouvre une confirmation détaillant cartes consommées et carte produite ; l'action directe n'existe plus par défaut.
- Le premier « Ajouter un Pokémon » de chaque session demande une confirmation mentionnant la perte définitive.
- Les deux confirmations offrent une option « ne plus me demander » persistée.
- La vente, le retrait d'équipe et la fusion présentent le même pattern visuel de confirmation (cohérence du traitement du risque).

## [P2] Home : hiérarchiser l'écran autour de Lancer et clarifier les libellés

**Problème** : ~19 cibles interactives autour d'une seule action primaire ; libellés cryptiques (« Visibles / Si possédée / Masquées », hint contre-intuitif), multi ×5 iconique sans libellé, avatar/inventaire au même niveau que les réglages de jeu ; bannière tournoi qui chevauche le bloc utilisateur sur mobile.
**Preuve** : `home/home-desktop.png` (comptage T2), `home/roll-hidden-strip.png` (« Masquées » + « Toutes les cartes sont révélées après le lancer »), m6, M2 + `home/home-mobile-compact.png` (chevauchement).
**Impact** : charge cognitive d'entrée disproportionnée pour l'écran le plus fréquenté ; les réglages one-shot (révélation) consomment l'attention à chaque visite ; collisions mobiles sur le hub principal.
**Recommandation** : regrouper les réglages en deux niveaux — « ce que je joue » (biome avec **coût affiché avant tirage**, ×1/×5 labellisé avec coût total) visibles, « comment je révèle » dans un popover Réglages avec libellés reformulés (« Tout révélé / Suspense sur les inconnues / Révélation après tirage ») et micro-préview ; déplacer avatar/inventaire dans une zone profil ; bannières converties en toasts/entrées du centre de notifications, jamais en overlay recouvrant du contenu (mobile).
**Complexité** : Moyenne
**Dépendances** : frontend seul
**Critères d'acceptation** :
- Au-dessus du fold : solde, roulette, Lancer, et au plus 2 groupes de réglages ; le reste est replié.
- Le coût total affiché sur le bouton reflète biome et multi sélectionnés avant le clic.
- Chaque mode de révélation a un libellé auto-porteur compréhensible sans hint (test sur 3 nouveaux joueurs).
- Sur 375 px, aucun élément flottant ne recouvre le bloc utilisateur ni les boutons de bas de page.

## [P2] Vue synthèse « Aujourd'hui / Cette semaine » + solde unique (store Pinia)

**Problème** : quotas quotidiens (entraînement, jackpot) et hebdomadaires (arène, tournoi, ligue, échange, Spin) éparpillés sur 7 pages sans vue agrégée ; solde recalculé optimistement depuis 4+ sources, divergent entre pages/onglets ; bonus quotidien crédité silencieusement.
**Preuve** : flows (« Aucune vue “agenda” … le joueur doit visiter chaque page »), M7, `api-inventory.md` §7 (pas d'endpoint de solde seul) et « Affichage du solde cohérent partout : ✅ store unique », `gyms/gyms-desktop.png` (bonus +80/j visible uniquement là), F1 (bonus auto au premier `/auth/me`).
**Impact** : le rythme quotidien/hebdo — principal moteur de rétention du jeu — est invisible ; des actions gratuites (jackpot 1 ligne, entraînement) sont oubliées ; un solde faux mine la confiance dans l'économie.
**Recommandation** : store Pinia unique du solde alimenté par toutes les réponses API qui le renvoient (réconciliation à chaque fetch, fin de l'optimisme non resynchronisé) ; sur la home, panneau « Aujourd'hui / Cette semaine » : entraînement ✓/✗, jackpot ✓/✗, arène (compte à rebours), tournoi (phase courante), ligue, échange restant ; matérialiser la réception du bonus quotidien (toast « +X 🪙 bonus (+badges) » à la première connexion du jour).
**Complexité** : Moyenne
**Dépendances** : API existante
**Critères d'acceptation** :
- Le solde affiché est identique sur toutes les pages et se resynchronise après chaque réponse serveur le contenant.
- La home affiche l'état des 2 actions quotidiennes et des échéances hebdo sans navigation supplémentaire.
- La connexion du jour produit un feedback visible du bonus crédité (montant + origine).
- Chaque item du panneau lie vers la page concernée en 1 clic.

## [P2] Échanges : rendre les 3 étapes visibles et rappelées activement

**Problème** : le flux asynchrone en 3 étapes n'est jamais représenté ; « Accepter » n'annonce pas le choix de contrepartie ni la confirmation finale de l'initiateur ; seul rappel = point rouge sans nombre dans un dropdown ; règles d'éligibilité en paragraphe dense ; gating présenté comme une erreur rouge.
**Preuve** : `trades/trades-page.png` (demande + Accepter/Refuser sans annonce des étapes, paragraphe de 5 règles), F9, M8 (aucun toast/notification), ui-inventory (« pastilles rouges sans nombre »), `empty-states/trades-locked-progress.png` (bandeau rouge sans compteur ni CTA).
**Impact** : échanges qui expirent faute d'action, incompréhension (« j'ai accepté, pourquoi rien ne se passe ? »), charge mnésique reportée sur le joueur ; la feature sociale la plus riche sous-performe.
**Recommandation** : stepper visuel 1-Demande → 2-Réponse → 3-Confirmation sur chaque carte d'échange, avec « à vous / en attente de X » explicite ; badge navbar numéroté ; entrée dans le centre de notifications à chaque changement d'état (polling léger via l'endpoint trades existant) ; règles injectées contextuellement (au choix de carte : « même rareté », « 2 exemplaires min ») ; état verrouillé reformulé en jalon de progression (« 87/120 cartes uniques — continuez à tirer ! » + CTA roulette).
**Complexité** : Moyenne
**Dépendances** : API existante (temps réel instantané : évolution backend, optionnelle)
**Critères d'acceptation** :
- Chaque échange affiche l'étape courante sur 3 et la personne dont on attend l'action.
- Le badge navbar affiche le nombre d'actions attendues ; un changement d'état crée une notification consultable.
- Avant d'accepter, l'UI annonce les 2 étapes restantes (choix de contrepartie, confirmation de l'initiateur).
- L'état < 120 cartes montre un compteur de progression et un CTA, sans style d'erreur.

## [P2] Tournoi : timeline du cycle de 4 jours avec phase courante et échéance

**Problème** : le cycle lundi→jeudi est décrit par 3 phrases datées sans timeline, sans indicateur de phase courante ni compte à rebours ; la phase d'affinage (mardi→jeudi) est invisible ; le rappel repose sur une bannière dismissable une fois.
**Preuve** : `tournament/tournament-desktop-fullpage.png` (3 échéances en prose), features §7 (cycle complet), F6, `tourn_banner_dismissed` (states-inventory, persistance).
**Impact** : inscriptions manquées, équipes gelées par oubli (20 🪙 engagés), charge mentale de calendrier reportée sur le joueur pour l'événement social central.
**Recommandation** : stepper horizontal permanent en tête de page — Inscriptions → Préparation → Combats → Résultats — avec position courante, compte à rebours de la prochaine échéance (« Équipes figées dans 1j 4h ») et le même composant en résumé dans le panneau « Cette semaine » de la home ; pour les inscrits, rappel notification à J-1 du gel (généré client à partir des dates déjà renvoyées par `tournament/current`).
**Complexité** : Faible
**Dépendances** : API existante
**Critères d'acceptation** :
- La page tournoi affiche en permanence la phase courante parmi 4 et un compte à rebours vers la prochaine transition.
- Un joueur inscrit voit un état distinct (« Inscrit — affinez votre équipe jusqu'à jeudi 11h55 »).
- La home reflète la phase du tournoi sans visiter la page.
- La bannière d'inscription redevient visible tant que la fenêtre est ouverte si l'utilisateur n'est pas inscrit (dismiss par jour, pas définitif).

## [P2] Uniformiser les cooldowns : toujours une heure ou un compte à rebours

**Problème** : trois patterns coexistent — compte à rebours (arène), « Déjà combattu aujourd'hui » sans heure (entraînement), « Revenez demain » sans heure (jackpot).
**Preuve** : m4, `gyms/gyms-desktop.png` (« ⏳ Déjà combattu aujourd'hui »), states-inventory (jackpot « sans heure précise » ; arène « lundi dans Xj Xh »).
**Impact** : le joueur ne peut pas planifier son retour — précisément ce qu'un jeu à quotas doit optimiser ; incohérence qui fait paraître le système arbitraire.
**Recommandation** : composant unique `CooldownBadge` (Nuxt UI) affichant « Disponible dans Xh Xm » (ou « demain à 00h00 »), utilisé par entraînement, jackpot, arène, ligue, échange ; les resets sont des règles fixes (minuit, lundi 00:00, jeudi midi) calculables côté client à partir des statuts existants (`training/status`, `slot-machine/status`, etc.).
**Complexité** : Faible
**Dépendances** : frontend seul
**Critères d'acceptation** :
- Plus aucun état verrouillé temporel sans heure de retour ou compte à rebours.
- Le même composant visuel est utilisé sur les 5 fonctionnalités à quota.
- À l'échéance atteinte (page ouverte), l'état se déverrouille sans rechargement manuel.

## [P3] Guide fiable, contextuel et cohérent dans le ton

**Problème** : le Guide contredit l'app (biomes « sans surcoût » vs 50–300 🪙), n'a aucune section Échanges, s'ouvre en 13 accordéons tous fermés ; tutoiement et vouvoiement mélangés jusque dans les deux modales d'intro.
**Preuve** : C6, `misc/rules-desktop-fullpage.png` (13 sections fermées, pas d'Échanges), M4, `onboarding/team-intro-modal.png` (« ta collection ») vs `onboarding/gyms-intro-modal.png` (« Vous ne pouvez tenter »).
**Impact** : confiance érodée (un joueur qui suit le Guide budgette 10 🪙 et paie jusqu'à 300) ; la documentation de la feature sociale la plus complexe n'existe pas ; ton incohérent = produit perçu comme non fini.
**Recommandation** : corriger les coûts biome (afficher la grille réelle depuis `/roll/biomes` plutôt qu'un texte statique) ; ajouter une section Échanges (les 3 étapes + règles) ; ouvrir par défaut la section pertinente quand on arrive via un lien contextuel (« ? » depuis chaque page → ancre du Guide) ; trancher le ton (recommandé : tutoiement, aligné sur la personnalité fun du produit) et l'appliquer via une passe complète des chaînes.
**Complexité** : Faible
**Dépendances** : API existante
**Critères d'acceptation** :
- Les coûts biome affichés dans le Guide proviennent de la même source que la roulette (aucune divergence possible).
- Une section Échanges documente les 3 étapes et les 6 règles d'éligibilité.
- Chaque page de jeu offre un accès direct à sa section de Guide, ouverte à l'arrivée.
- 100 % des chaînes UI utilisent le même registre (audit grep tutoiement/vouvoiement à zéro exception).

## [P3] Transformer les états verrouillés en jalons de progression

**Problème** : les fonctionnalités verrouillées sont présentées en négatif (bandeau rouge type erreur pour les échanges) ou en silence (collection neuve « froide, aucune invite à tirer », équipe vide muette), sans chemin vers le déblocage.
**Preuve** : `empty-states/trades-locked-progress.png` (bandeau rouge unique), states-inventory (états vides : collection « aucune invite à tirer », équipe « 6 slots vides silencieux »), F2 (« Pas assez de coins » sans lien vers les moyens d'en gagner).
**Impact** : les moments où le joueur n'a « rien à faire » — les plus dangereux pour la rétention — ne redirigent vers aucune action ; le gating, pourtant bien conçu côté règles, est vécu comme un refus.
**Recommandation** : gabarit unique d'état verrouillé/vide : icône + objectif (« Débloque les échanges »), progression chiffrée (barre 87/120), et CTA vers l'action qui fait avancer (roulette, entraînement…) ; appliquer aussi à « Pas assez de coins » (lister les 3 sources de coins avec liens) et à la collection vide (« Lance ton premier tirage ! »).
**Complexité** : Faible
**Dépendances** : frontend seul
**Critères d'acceptation** :
- Aucun état verrouillé n'utilise le style d'erreur ; tous affichent progression + CTA.
- « Pas assez de coins » propose au moins 2 actions concrètes cliquables pour en gagner.
- Les états vides principaux (collection, équipe, trades, notifications) contiennent une invite d'action.

## [P3] Accessibilité de base du jeu : mouvement, focus, information non chromatique

**Problème** : 25 keyframes sans `prefers-reduced-motion`, modales sans focus trap/Escape/`role="dialog"`, information par couleur seule (jauges, bordures de rareté), emojis porteurs de sens sans alternative, cibles < 40 px, aucun `aria-live` pour les résultats, aucun réglage de son.
**Preuve** : M5 (grep : 0 occurrence reduced-motion/aria-live/role=dialog), m10 (aucun réglage utilisateur), ui-inventory (3 systèmes d'overlay aux fermetures différentes, m1).
**Impact** : jeu inutilisable ou pénible pour une partie des joueurs (photosensibilité, lecteurs d'écran, daltonisme) ; le son non coupable est un motif de fermeture d'onglet en contexte social.
**Recommandation** : profiter de la refonte Nuxt UI (modales accessibles par défaut : focus trap, Escape, rôles) ; variante réduite de chaque animation sous `prefers-reduced-motion` + toggle in-app ; doubler la couleur d'un signe (libellé de rareté en texte, pourcentage sur les jauges) ; panneau réglages minimal : son on/off + volume, animations, thème ; `aria-live="polite"` sur zone de résultat et toasts.
**Complexité** : Moyenne
**Dépendances** : frontend seul
**Critères d'acceptation** :
- Toutes les modales se ferment à Escape, piègent le focus et exposent `role="dialog"` (un seul système d'overlay).
- `prefers-reduced-motion` désactive spins/pulses/shakes tout en conservant l'information des résultats.
- La rareté d'une carte est identifiable sans percevoir la couleur (texte ou icône).
- Un réglage de son (mute/volume) est accessible depuis toutes les pages et persisté.

---

## Priorisation finale

| Ordre | Rec. | Pourquoi maintenant | Effort |
| --- | --- | --- | --- |
| 1 | [P1] Résultat visible + célébration | Le cœur du gacha est cassé ; gain de rétention immédiat, zéro dépendance | Moyen |
| 2 | [P1] Onboarding boucle cœur | 100 % des nouveaux joueurs passent par cet écran ; conditionne toute l'activation | Moyen |
| 3 | [P1] Stratégie d'erreur globale | Fondation transverse (interceptor + toasts) dont dépendent toutes les pages de la refonte — à poser en premier techniquement | Moyen |
| 4 | [P1] Friction alignée sur le risque | Quasi gratuit (modales existantes), protège l'inventaire des joueurs dès la v1 | Faible |
| 5 | [P2] Solde unique + vue quotas | Store Pinia = décision d'architecture à prendre tôt ; la vue « semaine » réutilise les statuts existants | Moyen |
| 6 | [P2] Home hiérarchisée | S'appuie sur 1, 2 et 5 ; refonte du hub une fois les fondations posées | Moyen |
| 7 | [P2] Timeline tournoi | Faible effort, gros gain de clarté sur l'événement social central | Faible |
| 8 | [P2] Échanges en étapes visibles | Feature la plus complexe ; nécessite le centre de notifications (rec 3/5) | Moyen |
| 9 | [P2] Cooldowns uniformes | Composant unique, réutilisé partout — quick win de cohérence | Faible |
| 10 | [P3] Guide fiable + ton unifié | Corrige la confiance (C6) ; passe de contenu à faire pendant la migration des textes | Faible |
| 11 | [P3] États verrouillés motivants | Gabarit unique appliqué au fil des pages migrées | Faible |
| 12 | [P3] Accessibilité de base | En grande partie « gratuite » avec Nuxt UI si exigée dès le design system, coûteuse si rattrapée après | Moyen |

Lecture d'ensemble : les quatre P1 traitent les deux moments décisifs (premier tirage, premier incident) et le seul risque de perte irréversible ; les P2 construisent la lisibilité temporelle du jeu (quotas, tournoi, échanges) sur les fondations Pinia ; les P3 sont des passes de cohérence à intégrer au fil de la migration plutôt qu'en chantier séparé. Tout est réalisable **frontend seul ou avec l'API existante** — aucune recommandation n'exige d'évolution backend (seule l'instantanéité temps réel des échanges en bénéficierait, en option).
