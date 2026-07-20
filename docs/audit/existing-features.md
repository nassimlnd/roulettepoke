# Inventaire fonctionnel complet

> Chaque règle chiffrée provient soit du Guide du jeu affiché en production
> (`#rules`), soit du code frontend, soit d'une observation directe. Les règles
> purement backend (probabilités réelles) sont reprises telles qu'affichées.

## 1. Roulette (tirage gacha) — `#home`

- Coût : **10 🪙** par tirage (coût variable si filtre biome, lu depuis `/roll/biomes`).
- Bande de 20 cartes, carte gagnante à l'index 16, animation 4 s
  (`cubic-bezier(0.15,0.85,0.35,1)`), jitter aléatoire ±40 px, ticks sonores
  synchronisés carte par carte.
- **3 modes de révélation** (persistés localStorage `gacha_reveal_mode`) :
  - `visible` : toute la bande révélée ;
  - `smart` (« Si possédée ») : seules les cartes déjà possédées sont visibles ;
  - `hidden` (« Masquées ») : tout masqué, flip de révélation après l'arrêt
    (la gagnante avec 100 ms de délai supplémentaire).
- **Filtre biome** : 9 biomes (Lac, Mer, Forêt, Montagnes, Ville, Plaines,
  Désert, Cave, Tundra), coût propre par biome, progression `possédées/total`
  par biome affichée. Persisté (`gacha_selected_biome`).
- **Multi-roll ×5** : 5 roulettes empilées lancées en cascade (décalage 550 ms),
  résultats alignés sur une rangée commune ; les événements « choix de carte »
  sont mis en attente et résolus séquentiellement à la fin de la série.
- **Événements spéciaux** (1 % par tirage standard, jamais avec filtre) :
  la carte gagnante est une carte Pokéball retournée après l'arrêt —
  - 🪙 coins (60 % des événements) : +50 à 200 🪙 ;
  - 🃏 choix de carte (30 %) : modale gauche/droite, choix persistant
    (`pendingChoice` re-proposé par `/auth/me` si la page a été quittée) ;
  - 💎 Charme Chroma (10 %) : ajouté à l'inventaire.
  Des cartes Pokéball décoratives apparaissent aussi dans la bande (1 % par carte).
- **Shiny (« alt »)** : chance 1/500, +1/500 par exemplaire du Pokémon possédé
  (pity par carte), ×2 avec Charme Chroma actif. Cadre argenté.
- Raretés : Commun (gris) / Rare = 1ʳᵉ évolution (bleu) / Épique = 2ᵉ évolution
  (violet) / Légendaire (doré).
- Le solde et le statut du charme se mettent à jour optimistiquement après tirage.

## 2. Inventaire & objets

- Objets : **Charme Chroma** (×2 shiny pendant 10 tirages), **Ticket Biome**,
  **Ticket Type** (filtrent le prochain tirage, consommés au lancement,
  désactivables avant).
- Un seul ticket actif à la fois (biome OU type) ; compatibles avec le charme.
- Ticket actif → remplace visuellement le sélecteur de biome sur `#home`
  (le filtre biome manuel est réinitialisé pour éviter un cumul silencieux).
- `combo-check` avant tirage : si aucun Pokémon ne correspond (ticket type sur
  biome incompatible), la roulette est bloquée avec avertissement.
- Sources de tickets/charme : jackpot, événements spéciaux, revente d'un Shiny.

## 3. Collection — `#collection`

- Grille de toutes les cartes du catalogue ; non possédées = dos « ??? » avec
  badge biome (silhouette d'information partielle).
- Onglets **Standard / ✨ Shiny** ; filtres biome (9) et type (15) ; tri par
  quantité ; compteur « X / Y cartes … obtenues ».
- **Vente** à l'unité avec confirmation : Commun 1 🪙, Rare 5, Épique 10,
  Légendaire 25 ; **vendre un Shiny donne un Charme Chroma** au lieu de coins.
- **Fusion** : 10 exemplaires identiques → 1 exemplaire de l'évolution suivante
  (bouton 🆙 visible dès `quantity ≥ 10` et s'il existe une évolution).
  Message de succès/erreur en bandeau temporaire (4 s).
- Avatar : n'importe quelle carte possédée peut devenir avatar (modale dédiée
  sur `#home`, onglets Standards/Shiny).

## 4. Équipe — `#team`

- 6 slots. Ajout uniquement via la **roulette d'équipe** : pioche aléatoire dans
  la collection (Légendaires et Shiny exclus) — **la carte quitte définitivement
  la collection** (⚠️ destructif, expliqué par modale d'intro à la 1ʳᵉ visite).
- Retirer un membre : **10 🪙**, définitif (ne revient pas en collection),
  confirmation modale. Vider l'équipe : gratuit, confirmation modale.
- Mode **Réorganiser** : sélection de 2 slots pour échanger leurs positions
  (`/team/swap`), bandeau d'instructions en 2 étapes.
- Ticket Type actif signalé (le prochain tirage d'équipe sera filtré) ;
  ticket biome non applicable ici.
- Colonne latérale : badges d'arène obtenus (tooltip nom + date).

## 5. Arènes — `#gyms`

- 8 arènes séquentielles (débloquées une à une), champion et équipe visibles,
  types recommandés affichés, **1 tentative par semaine** (reset lundi 00:00).
- **Estimation de victoire** avant combat : % global coloré (vert ≥60, orange
  ≥40, rouge <40) + matchups position par position (repliés dans un `details`).
- Combat : résolu côté serveur, puis **animation séquentielle par duel** —
  jauge tachymètre SVG demi-cercle (zone verte = victoire sous le seuil),
  aiguille qui ralentit ×5 à l'approche du seuil (suspense), battement de cœur
  sonore, accélération après franchissement (défaite), K.O. animés, mini-log.
- Victoire → badge (+10 🪙/jour de bonus de connexion, base 100), défaite →
  retenter la semaine suivante. Résultat : résumé des 2 équipes avec K.O. +
  log détaillé + liens « Gérer mon équipe / Ma collection ».
- Historique global des tentatives (date, arène, équipe engagée, résultat).
- **Entraînement quotidien** : 1 combat/jour contre un dresseur aléatoire ;
  victoire = +5 🪙 et **+2 % de bonus d'arène** (cumulable jusqu'à +100 %,
  remis à zéro à l'obtention d'un badge ; jauge de progression colorée).
  Après 8 badges : ne rapporte plus que les coins.
- État end-game : « 🎉 Champion de Kanto ! » avec bonus max +80 🪙/jour.
- Modale d'introduction à la première visite (0 badge).

## 6. Ligue des 4 — `#league`

- Débloquée avec les **8 badges** ; 1 tentative/semaine, reset le jeudi midi
  après les résultats du tournoi.
- Adversaires : les 4 meilleurs du dernier tournoi (4ᵉ → champion) ; en repli,
  membres NPC du « Conseil classique ».
- Malus cumulable par Pokémon vaincu (2 % joueur réel / 5 % NPC).
- Estimation globale + par combat + types à privilégier/éviter avant de lancer.
- Le défi enchaîne les 4 combats en **replays animés successifs** (modale).
- Victoire : couronne 👑 sur le classement 7 jours + choix de récompense —
  **500 🪙 (sûr)** ou **tenter la capture d'un légendaire au choix (risqué)**
  avec le 1ᵉʳ Pokémon affaibli ; % de capture estimé affiché par légendaire ;
  échec = aucune récompense. Confirmation modale avant le pari.
- Animation de capture dédiée : fausse jauge « buguée » (le seuil se rétracte
  sous l'aiguille) puis lancer de Pokéball, secousses, éclat d'étoiles ou fuite.

## 7. Tournoi hebdomadaire — `#tournament`

- Cycle : inscriptions **lundi 00:00 → mardi 12:00** (20 🪙, la cagnotte vaut
  ×2 soit 40 🪙/participant), équipes figées **jeudi 11:55**, combats jeudi
  12:00, gains 60/30/10 % arrondis au multiple de 5 (100 % si <3 joueurs).
- Bracket élimination directe avec byes, match pour la 3ᵉ place.
- **Préparation** (inscrit, avant le tournoi) : mon équipe, Pokémon fort/faible,
  types à privilégier/éviter contre les adversaires, matchups estimés contre
  chaque participant (barres de probabilité).
- **Anti-spoiler** (« Mon parcours ») : après le tournoi, mes combats sont
  révélés un par un (bouton « Révéler ce combat »), résultats complets repliés
  dans un `<details>` spoiler.
- **Replays** : chaque match rejouable en animation (jauges, vitesse ×1/×2/×4
  persistée, skip par clic) + résumé statique (équipes, K.O., log).
- Historique des tournois passés (modale + page détail par tournoi).
- Bannière flottante d'invitation (lundi→mardi) et de félicitations du vainqueur
  (jeudi 15h→vendredi 15h), dismissable, une seule fois par tournoi.
- Badge navbar « Social ▸ Tournoi » quand un tournoi auquel je participais est
  terminé et non consulté.
- Modale d'introduction à la première visite.

## 8. Jackpot (machine à sous) — `#slot-machine`

- **1 partie/jour**. Mise : 1 ligne (gratuit), 3 lignes (5 🪙), 3 + diagonales
  (10 🪙). Chaque case tirée indépendamment ; ligne gagnante = 3 symboles
  identiques.
- Symboles/récompenses (probabilité affichée par ligne) : Légendaire ≈0,5 %,
  Charme ≈2,4 %, Ticket Biome ≈4,6 %, Ticket Type ≈4,6 %, Coins 50-200 ≈14 %.
- Table des récompenses dynamique selon les lignes choisies
  (`1-(1-p)^N`, affichée en %).
- Animation : 3 rouleaux, phase rapide 2,2 s + décélération 1,4 s, arrêts
  décalés de 700 ms, sons de rouleaux + claquement d'arrêt, glow des cellules
  gagnantes (flip de carte pour un légendaire, révélation de l'icône
  type/biome gagnée), fanfare selon la meilleure récompense.
- Feeds : « Derniers gains » (tous joueurs) et « Mon historique » (paginé 10).

## 9. Spin (aventure) — `#spin`

- **Jeu séparé** ouvert en overlay iframe plein écran (`/spin/?iframe=true`),
  bouton retour + `postMessage spin:close`.
- Prérequis : posséder au moins un Pokémon de base (Commun non évolué) —
  sinon carte verrouillée 🔒.
- Starter tiré au hasard parmi les Pokémon de base (non retiré de la collection).
- Récompenses : 250 🪙 en battant le Conseil des 4 (1/semaine, tentatives
  illimitées) ; un légendaire caché (capture 25 %, transfert vers la collection
  10 %, +5 % par échec — pity affiché « 🔥 bonus » —, 10 captures max/semaine).
- La page hôte affiche l'état hebdo : récompense déjà obtenue, tentatives
  légendaires restantes, taux de transfert actuel.

## 10. Classement — `#leaderboard`

- Score de **diversité** : Standard 1 pt, Légendaire 5, Shiny 10, Légendaire
  Shiny 15 (les doublons ne comptent pas).
- Top 10 + bloc « Votre position » (au-dessus/en-dessous) si hors top 10.
- Compteurs dorés à la complétion (146 standards, 5 légendaires).
- Badges d'arène affichés à côté du nom ; couronne 👑 (Ligue, 7 jours)
  prioritaire sur les médailles 🥇🥈🥉 du dernier tournoi.
- **Classement des tricheurs** séparé (joueurs ayant exploité des failles).
- Feed « Derniers Shiny & Légendaires obtenus » (avec marqueur doublon 😅).

## 11. Statistiques — `#stats`

- Sections : stats globales (tirages, coins dépensés…), Spin, progression des
  arènes, stats par joueur (sélecteur de dresseur), probabilités interactives
  (chance d'obtenir une carte précise / une nouvelle carte selon le joueur),
  anecdotes (records et faits notables).

## 12. Chat — `#chat` + widget flottant

- WebSocket `wss://…/api/ws/chat`, auth par **premier message**
  `{type:'auth', token}` → `{type:'authenticated'}` (le token n'est plus dans
  l'URL). Reconnexion auto (3 s) sauf codes définitifs 4001/4003 ;
  **resync de l'historique après reconnexion** (dédup par id).
- Historique REST 200 messages ; badge « non lu » basé sur un marqueur
  localStorage ; purge des messages d'un utilisateur banni (`type:'purge'`).
- Widget flottant présent partout sauf sur `#chat` ; masqué si déconnecté.
- Modération admin : bannir/débannir (avec raison), liste des bannis
  (`isAdmin` renvoyé par l'historique).
- Limite : 300 caractères par message.

## 13. Échanges — `#trades`

- Conditions : **≥120 cartes standards uniques**, 2 exemplaires min de la carte
  cédée, 1 échange conclu/semaine (reset lundi), cooldown d'un mois par
  partenaire, cartes Légendaires/Shiny exclues, même rareté des deux côtés.
- Flux en 3 temps : initiateur demande une carte d'un joueur → le joueur cible
  accepte en choisissant la carte qu'il veut en retour (même rareté) →
  l'initiateur confirme ou refuse. Annulation possible par l'initiateur en
  attente. Statuts : conclu / refusé / annulé / expiré.
- UI : sections « À traiter » / « En attente » / historique replié, grille de
  joueurs (avatars, cooldowns), sélecteur de cartes avec badge « ✨ Nouveau »
  si je ne possède pas la carte, badge navbar du nombre d'actions attendues.

## 14. Suggestions & Roadmap — `#suggestions`

- Board kanban par statut : Proposition → À faire → En cours → Fait / Refusé /
  Archivé. Vote 👍/👎 par joueur sur chaque idée ; réponse admin éventuelle,
  elle-même votable si activé. Admin : création directe d'items roadmap,
  changement de statut, édition.

## 15. Notifications

- Centre de notifications navbar (dropdown) : liste horodatée, badge non-lus,
  « tout marquer lu » à l'ouverture, lien de navigation optionnel par item.

## 16. Compte & session

- JWT en `localStorage.gacha_token` (payload décodé côté client pour l'ID user).
- `/auth/me` à l'arrivée sur `#home` → user + `rewardClaimed` (bonus quotidien)
  + `pendingChoice` (choix de carte non résolu).
- Reset de mot de passe par email (token en query string).
- Avatar = carte possédée (bordure spéciale si shiny/légendaire).
- Patch notes : données **en dur dans le front** (`patchNotes.js`, 11 versions),
  modale à la connexion si version non vue, badge navbar.
- Bandeau « nouvelle version disponible » si `__APP_VERSION__` change
  (invite à Ctrl+F5 — gestion de cache manuelle).

## Fonctionnalités impossibles à tester pendant l'audit

| Fonctionnalité | Raison | Impact documentation |
| --- | --- | --- |
| Combat d'arène hebdomadaire (animation en direct) | Quota 1/semaine du compte (préservé) | Logique et animation reconstituées depuis le code + replays de tournoi (mêmes composants) |
| Défi de la Ligue + capture légendaire | Quota hebdo + récompense engageante | Code lu intégralement (`league.js`, `legendaryCapture.js`) |
| Aventure Spin complète (gameplay interne de l'iframe) | Jeu séparé, session longue | Écran d'accueil + page hôte capturés ; à explorer avant la phase Spin de la refonte |
| Événement spécial en conditions réelles (1 %) | Aléatoire, non forcé (aucune triche) | Code + assets lus ; non observé en 7 tirages |
| Vraie réception d'un échange / notification de trade | Nécessite l'action d'un autre joueur | Flux reconstitué depuis le code |
| Interface admin (modération chat, roadmap) | Compte non admin | Endpoints et UI conditionnelle documentés depuis le code |
| Emails (reset de mot de passe) | Hors périmètre frontend | Formulaires capturés |
