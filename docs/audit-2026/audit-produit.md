# Audit produit — frontend PokéRoulette (juillet 2026)

> Porte sur le front **reconstruit** (21 pages), pas sur l'ancien front de
> production audité dans `docs/audit/`. Backend **figé** : aucune modification
> serveur possible.


## ⚠️ Statut de cet audit — à lire avant tout

Cet audit est **incomplet**, et il faut le savoir pour s'en servir correctement.

| | |
|---|---|
| Axes couverts | 4 sur 8 : game design/rétention, onboarding, parcours & navigation, UI/finition |
| Axes **manquants** | **accessibilité**, **mobile**, **performance perçue**, **contenu & wording** |
| Vérification adverse | **n'a pas tourné** |
| Cause | limite d'usage hebdomadaire atteinte : 9 des 13 agents ont échoué |


Conséquence directe : **les constats ci-dessous ne sont pas validés**, sauf les
quelques-uns que j'ai vérifiés à la main (marqués `CONFIRMÉ` ou `RÉFUTÉ`).
Deux constats se sont déjà révélés **faux** au premier contrôle — preuve que la
passe adverse manquante n'était pas une formalité. Traiter la liste comme des
**pistes à instruire**, pas comme un verdict.


## Ce que la vérification manuelle a déjà tranché

**Confirmés (vus à l'écran) :**

- La **navbar desktop** ne contient ni Ligue des 4, ni Tournoi, ni Échanges,
  alors que les trois pages existent et que le menu mobile les expose.
  Preuve : `artifacts/audit-2026/desktop-trades.png` (navbar visible).
  → **corrigé** (vague 1) : regroupement « Compétition » + source unique de
  navigation `app/config/navigation.ts` + test anti-régression.

- **Une page en échec de chargement était un cul-de-sac** : l'erreur s'affichait
  dans une alerte, sans aucun moyen de réessayer, dans les 8 pages concernées.
  → **corrigé** (vague 1) : `usePageData` expose `retry`, et le composant
  `PageError` l'affiche partout.

**Réfutés :**

- ⚠️ **CORRECTION D'UNE ERREUR DE MA PART.** J'avais d'abord classé « la page
  Échanges n'affiche jamais son écran de verrouillage » comme *confirmé*, en me
  fiant à une capture montrant « Connexion impossible ». C'était faux : ce
  message est celui d'une **absence de réponse**, pas d'un refus métier. Les
  endpoints renvoient bien `200` avec
  `{uniqueStandardCount: 46, minRequired: 120, eligible: false}`, et la page
  affiche correctement « Échanges verrouillés — Il te faut 120 cartes standards
  uniques (tu en as 46) » **avec la jauge 46/120**
  (`artifacts/audit-2026/trades-verrou-reel.png`). La capture d'origine avait
  été prise pendant un hoquet du serveur de développement. **L'écran de
  verrouillage existe et il est bien fait.**


**Réfutés :**

- « Le mode sombre n'est implémenté par aucun composant : zéro règle `.dark` » —
  **faux**. `app/assets/css/main.css:119` redéfinit toute la palette `--ui-*`,
  `colorMode` est configuré, et le rendu est correct à l'écran
  (`artifacts/audit-2026/dark-collection.png`). Les 685 couleurs en dur relevées
  sont décoratives (dégradés, ombres, couleurs de type) et doivent le rester.

- « Le sélecteur de style de sprites n'affiche aucun aperçu » — **artefact de
  mesure**. Les vignettes viennent d'un CDN inaccessible depuis l'environnement
  de capture ; elles affichent alors le repli prévu. À revérifier chez un joueur
  réel avant toute action.


## Vague 2 — instruite puis livrée (lisibilité)

Sur 6 pistes de la vague 2, **2 étaient fausses** et une n'est pas réalisable
côté front. Détail, pour que la trace serve :

| Piste | Verdict | Suite |
|---|---|---|
| Landing : « Pity garanti vers les raretés supérieures » | ✅ **confirmé** — le pity ne concerne que le shiny (`rules.vue:38`) | corrigé (3 endroits) |
| Guide : documente un réglage de tirage inexistant | ✅ **confirmé** — « Visibles / Si possédée / Masquées » alors que les réglages disent « Complète / Rapide / Directe » | corrigé |
| Fusion non découvrable dans la collection | ✅ **confirmé** — le bouton n'existait que dans la modale de détail | badge « Fusion » dans la grille |
| Le hub ne dit jamais ce qu'on gagne | ✅ **confirmé** — les tuiles n'avaient que libellé + échéance | gain affiché sur les 7 tuiles |
| Trois taux de shiny contradictoires (Guide vs Stats) | ❌ **réfuté** — Stats étiquette « Taux de shiny **observé** », le Guide donne le 1/500 théorique. Deux grandeurs différentes, correctement nommées | rien à faire |
| Le doublon ne rapporte rien à la révélation | ❌ **réfuté** — `BoosterReveal.vue:43` affiche « Doublon ×N · chance shiny estimée ~X % » | rien à faire |
| Le bonus quotidien n'annonce pas son montant | ⚠️ **confirmé mais NON corrigé** | voir ci-dessous |

**Pourquoi le montant du bonus quotidien n'a pas été corrigé.** Le constat est
juste : le toast dit « Ta récompense de connexion a été créditée » sans chiffre.
Mais l'API ne renvoie **pas** le montant crédité — `/auth/me` le crédite par
effet de bord et ne retourne que le solde final, sans le solde antérieur. Le
déduire exigerait de mémoriser le dernier solde connu côté client et d'en faire
une différence, ce qui donnerait un chiffre **faux** dès qu'une autre source
modifie le solde entre deux sessions. Afficher un mauvais montant sur l'écran
qui doit donner envie de revenir est pire que n'en afficher aucun. C'est le
seul point de l'audit réellement bloqué par le backend figé.

Bonus au passage : le hub appelait ce mode « Spin » alors que la navbar, la page
et le Guide disent « Aventure » — corrigé (constat de vocabulaire n°51).

## Un enseignement inattendu : le backend n'est presque jamais le blocage

Sur les 56 constats, **aucun** n'est classé « impossible sans le backend ».
48 sont corrigeables avec l'API actuelle, 8 sont partiellement améliorables.
La contrainte que tu craignais n'est donc pas le facteur limitant : l'essentiel
de ce qui gêne les joueurs se règle côté front.


## Bloquants (10)

_Ils cassent une boucle de jeu ou laissent le joueur sans issue._


### Le combat d'arène — 1 tentative par semaine, irréversible — se déclenche en un clic, sans confirmation ni avertissement préalable

`/gyms, modale de détail d'arène (desktop-gyms.png, mobile-gyms.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/pages/gyms.vue:363 `@click="fight"` appelle directement `fight()` (gyms.vue:57-78) : aucun ConfirmDialog dans le fichier (`rg 'ConfirmDialog|confirm' app/pages/gyms.vue` → 0 résultat, alors que app/pages/league.vue:347 et 461 en ont un). Le corps de la modale (gyms.vue:203-330) ne mentionne nulle part la limite hebdomadaire ; le libellé « Déjà tenté cette semaine » (gyms.vue:357) n'apparaît qu'une fois la tentative consommée. Le commentaire d'en-tête gyms.vue:8-9 affirme pourtant « Confirmations là où l'action est limitée (combat 1/semaine) ».

- **Ce que subit le joueur** : Sur desktop-gyms.png les 8 arènes affichent « À DÉFIER » simultanément. Le nouveau joueur, curieux, ouvre l'Arène 1 et clique « Combattre » pour voir à quoi ça ressemble — il vient de brûler sa seule tentative de la semaine avec une équipe non optimisée. Rien ne l'avait prévenu.

- **Recommandation** : Ajouter un ConfirmDialog avant `fight()` reprenant l'estimation (« Chances estimées : 12 % — une seule tentative par semaine, elle sera consommée même en cas de défaite »), et afficher la mention « 1 tentative / semaine » dans l'en-tête de la modale, avant le bouton. Le taux est déjà chargé (`gym.estimates`).


### La première décision du jeu — choisir un booster — se prend sans aucune information sur ses conséquences

`/play (desktop-play.png, mobile-play.png)` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : app/components/game/BoosterPack.vue:43-53 affiche un ratio nu `{{owned}}/{{total}}` (« 6/27 », « 8/28 » sur desktop-play.png) sans libellé ; app/pages/play.vue:362-364 : l'accroche se limite à « Choisis ta région, ouvre le paquet ». Aucun écran ne dit que filtrer par biome supprime les événements spéciaux (règle confirmée : app/pages/rules.vue:28 « sur les tirages sans filtre » + docs/audit/api-inventory.md §8).

- **Ce que subit le joueur** : Le joueur arrive avec 200 pièces et voit 10 paquets à 10, 50, 60, 70… 300 🪙. Il ne sait pas ce que « 6/27 » compte, ni pourquoi un paquet coûte 30× le prix du paquet de base, ni qu'en payant plus cher il renonce aux événements (pièces, Charme Chroma, choix de carte). Il peut griller 300 des 200 pièces offertes sur un mauvais arbitrage dès la 1re minute.

- **Recommandation** : Sur la face du paquet, légender le ratio (« 6/27 obtenues ») ; sous le carrousel, afficher une ligne de compromis qui change avec la sélection : « Tous les biomes — 10 🪙 · pool complet · événements spéciaux possibles » vs « Ville — 50 🪙 · 27 cartes ciblées · pas d'événement spécial ». Toutes les données nécessaires sont déjà dans `rollStore.biomes` (cost, ownedCount, cardCount).


### La page Échanges ne montre jamais son écran de verrouillage : elle affiche une erreur réseau à la place

`/trades (desktop-trades.png, mobile-trades.png)` · périmètre **frontend** · effort M · ✅ confirmé

- **Preuve** : desktop-trades.png : toute la page est réduite à « Connexion impossible. Vérifie ton réseau puis réessaie. » — message produit par app/utils/errors.ts:9-11. Le panneau explicatif « Échanges verrouillés » + jauge de progression vers 120 cartes existe pourtant : app/pages/trades.vue:134-165 et le motif est déjà rédigé (trades.vue:20-26). Il est monté sous `v-else` du bloc d'erreur (trades.vue:125-132) et disparaît dès que `usePageData` rejette (app/composables/usePageData.ts:16-20 : aucun retry exposé).

- **Ce que subit le joueur** : Un nouveau joueur (46 cartes uniques sur les 120 requises, cf. desktop-collection.png « 46 / 151 ») ouvre Échanges et reçoit un message qui l'accuse de son réseau. Il ne découvre jamais qu'il s'agit d'un palier de progression, ni combien de cartes il lui manque. Pas de bouton pour réessayer : impasse totale.

- **Recommandation** : Dans `usePageData`, exposer une action `retry()` et l'afficher dans l'UAlert de chaque page. Sur /trades, rendre le panneau d'éligibilité indépendant du bloc d'erreur (il n'a besoin que de `trades.eligibility`) et n'afficher l'alerte réseau qu'au-dessus, non à la place.


### Ligue des 4, Tournoi et Échanges n'existent dans aucune navigation desktop

`AppNavbar (toutes les pages, ≥1024 px)` · périmètre **frontend** · effort M · ✅ confirmé

- **Preuve** : web/app/components/base/AppNavbar.vue:7-17 — 9 liens : play, collection, team, gyms, spin, slot-machine, leaderboard, stats, rules. Un grep de tous les `to=`/`:to=` de app/ (hors showcase) ne trouve aucun lien entrant vers /league, /tournament ou /trades : seul league.vue:406,440 pointe vers /gyms et /tournament. Sur mobile ces 3 pages existent (MobileMenu.vue:30-35) — pas sur desktop.

- **Ce que subit le joueur** : Sur desktop, trois des quatre fonctionnalités sociales/compétitives du jeu ne sont atteignables que par les tuiles du hub de /play (et /league même pas, cf. constat suivant) ou en tapant l'URL. Un joueur desktop peut passer des semaines sans savoir que les échanges et le tournoi existent — alors que la landing les met en avant (public-landing.png : « Ligue des 4 & Tournois », « Échanges entre dresseurs »).

- **Recommandation** : Créer une source unique de navigation (constants/nav.ts appuyé sur ROUTES de constants/routes.ts, aujourd'hui jamais utilisé par les 3 composants de nav) et l'exposer partout. Sur desktop, regrouper Arènes / Ligue / Tournoi / Classement sous une entrée « Compétition » (UDropdownMenu) et ajouter Échanges près de la cloche avec sa pastille. Cela supprime aussi la divergence d'ordre actuelle (Arènes avant Aventure sur desktop, l'inverse sur mobile).


### Les notifications sont chargées, comptées, puis effacées d'un clic sans jamais avoir été affichées

`Navbar (toutes les pages)` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : app/components/base/AppNavbar.vue:61-71 : le bouton cloche a pour seule action `@click="hub.markNotificationsRead()"` — aucun panneau, aucun popover. `grep -rni notification app/ --include=*.vue` ne retourne que ces 4 lignes. Pourtant app/stores/hub.ts:134 récupère bien `{ notifications: [{ message, link, created_at }] }` et les stocke (hub.ts:36), et hub.ts:162-168 POST `/notifications/read-all`.

- **Ce que subit le joueur** : Le seul canal qui dit « il s'est passé quelque chose pendant ton absence » (échange reçu, résultat de tournoi, tour de trade à jouer) est détruit au premier clic curieux sur la pastille rouge. Le joueur voit un badge « 3 », clique, le badge disparaît, et il n'apprendra jamais quoi. La boucle de rappel est cassée à sa racine.

- **Recommandation** : Transformer la cloche en `UPopover` listant `hub.notifications.notifications` (message + `created_at` relatif + `NuxtLink` sur `link`), et ne déclencher `markNotificationsRead()` qu'à la fermeture du panneau. Épingler en haut les entrées non lues. Le payload est déjà en mémoire, aucun appel supplémentaire.


### Le doublon — plus de 8 tirages sur 10 — ne rapporte rien à l'écran de révélation

`Play (révélation)` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : app/components/game/BoosterReveal.vue:38-44 affiche « Doublon ×N · chance shiny estimée ~0,4 % » et app/components/game/BoosterReveal.vue:145-156 n'offre qu'un bouton « Ranger dans l'album ». Aucune vente, aucune progression de fusion. Prix de vente d'un commun : 1 🪙 (app/utils/poke.ts:40) pour un tirage à 10 🪙. Capture desktop-stats.png : Commun = 83,70 % du pool, et le joueur possède 46/151 cartes — la quasi-totalité de ses tirages sont désormais des doublons.

- **Ce que subit le joueur** : Le joueur dépense 10 🪙, attend 3 s de tourbillon, et reçoit un objet dont la seule information est « tu l'as déjà » plus un pourcentage humiliant à un chiffre après la virgule. Vendre ce doublon demande 4 clics sur une autre page pour 1 🪙. C'est le moment le plus fréquent du jeu et c'est un moment de perte sèche : c'est là que les joueurs décrochent.

- **Recommandation** : Sur la tuile de doublon : (1) bouton inline « Vendre +{SELL_PRICE} 🪙 » appelant `POST /collection/sell` sans quitter l'écran ; (2) barre « {quantity}/10 vers l'évolution » (MERGE_COST, app/constants/game.ts:9) qui donne un but au doublon ; (3) bouton « Ouvrir encore » à côté de « Ranger dans l'album » pour supprimer l'aller-retour idle→ouvrir. Ajouter aussi « Vendre tous mes doublons » sur /collection (N appels séquentiels à `/collection/sell`, endpoint existant).


### Le bonus quotidien, seule vraie raison de revenir demain, n'annonce ni son montant ni sa progression

`Play (toast global)` · périmètre **partiel** · effort M · ⬜ à instruire

- **Preuve** : app/plugins/auth-bootstrap.client.ts:21-26 : toast « Bonus quotidien ! / Ta récompense de connexion a été créditée. » — aucun chiffre. Visible tel quel sur desktop-play.png et mobile-play.png. Le montant réel est 100 🪙 + 10 par badge (docs/audit/api-inventory.md:96), et app/pages/gyms.vue:132-133 promet « Ton bonus de connexion est au maximum » sans jamais avoir dit combien il vaut.

- **Ce que subit le joueur** : Le joueur ne sait pas qu'il vient de recevoir 100 🪙 (= 10 boosters), ni que chaque badge d'arène ajoute +10 🪙 par jour à vie. La récompense ne se sent pas, et le levier de progression le plus rentable du jeu (les badges) n'a aucune traction. Le toast disparaît en 5 s sans laisser de trace.

- **Recommandation** : Remplacer par une carte de retour non-éphémère sur /play : « +{100 + 10×badges} 🪙 crédités » avec le détail « 100 de base · +{10×badges} pour tes {n} badges » et, si badges < 8, « prochain badge = +10 🪙/jour ». Le nombre de badges est déjà en store (hub.ts:151 charge `/gym`). Classé partiel : l'API ne renvoie pas le montant crédité, mais la formule est connue et reconstructible à l'unité près.


### Le tournoi hebdomadaire — le plus gros rendez-vous social du jeu — se résout hors écran et n'est jamais rejouable

`Tournoi` · périmètre **frontend** · effort L · ⬜ à instruire

- **Preuve** : app/pages/tournament.vue:37 ne rend que `results` (classement plat + gains) ; aucune occurrence de `matches` ni `battleLog` dans tout le fichier, alors que `Tournament.matches[].battle_log` est déjà dans la réponse (docs/audit/api-inventory.md:189-195). Le moteur de combat plein écran existe et est câblé ailleurs : app/pages/league.vue:24-37 et app/pages/gyms.vue:65-73 appellent `battle.present()`. Capture desktop-tournament.png : cagnotte 760 🪙, 19 participants, médailles 455/230/75 — puis plus rien.

- **Ce que subit le joueur** : Le joueur paie 20 🪙 lundi, fige son équipe, et jeudi à 12:00 tout se joue sans lui. Il revient sur une liste de noms : il ne voit jamais ses matchs, ne sait pas comment il a perdu, n'a aucun moment à raconter. Le pic émotionnel de la semaine est vide, donc jeudi ne devient jamais un rendez-vous.

- **Recommandation** : Rendre le bracket depuis `tournament.matches` (round, joueurs, vainqueur, bye) et ajouter « Revoir mes combats » qui rejoue `battle_log` via `battle.present({ stages })`, exactement comme app/pages/league.vue:152-160 le fait déjà avec « Revoir le combat ». Mettre en avant MES matchs (filtrer sur `auth.userId`) avant le bracket complet. Zéro appel API nouveau : la donnée est déjà dans `/tournament/:id`.


### Une erreur de chargement remplace toute la page, sans réessai ni chemin de repli

`trades.vue, league.vue, tournament.vue, stats.vue (composable usePageData)` · périmètre **frontend** · effort M · ✅ confirmé

- **Preuve** : desktop-trades.png et mobile-trades.png : la page Échanges n'affiche qu'un bandeau rouge « Connexion impossible. Vérifie ton réseau puis réessaie. » et rien d'autre. trades.vue:126 utilise `v-else-if="errorMsg"`, donc le panneau d'éligibilité pourtant écrit (trades.vue:134-164, jauge 120 cartes + raison exacte) n'est jamais atteint. Même motif league.vue:148, tournament.vue:95, stats.vue:95. composables/usePageData.ts n'expose aucun retry.

- **Ce que subit le joueur** : Le joueur arrive sur Échanges, lit « vérifie ton réseau » alors que le reste de l'app fonctionne, et n'a aucun bouton pour réessayer ni aucune explication de ce qui est requis. Seule sortie : la navigation globale. La fonctionnalité est perçue comme cassée.

- **Recommandation** : Faire renvoyer un `retry()` par usePageData et rendre un composant d'erreur standard (message + « Réessayer » + « Retour au jeu »). Sur les 4 pages, passer de `v-else-if` à un bandeau non bloquant laissant s'afficher ce qui est déjà en cache : trades.vue peut rendre le panneau d'éligibilité dès que /trades/eligibility répond, même si /trades échoue (les deux appels sont déjà séparés dans stores/trades.ts, ensureFresh).


### Une page en erreur est un cul-de-sac : aucun bouton « Réessayer » n'existe nulle part dans l'application

`Échanges (et 8 autres pages)` · périmètre **frontend** · effort M · ✅ confirmé

- **Preuve** : Capture desktop-trades.png : un bandeau rouge « Connexion impossible. Vérifie ton réseau puis réessaie. » puis 700 px de vide, aucune action. Le message vient de app/utils/errors.ts:10. Le rendu est un `<UAlert>` sans slot d'action : pages/trades.vue:125, et le même motif sur collection.vue:220, team.vue:170, gyms.vue:172, league.vue:147, tournament.vue:94, stats.vue:94, leaderboard.vue:91. `grep -rn "Réessay|retry" app/` ne trouve aucune occurrence hors de la config $fetch (plugins/api.ts:8).

- **Ce que subit le joueur** : Sur un réseau instable, la page reste morte : le joueur doit recharger l'onglet à la main pour espérer voir ses échanges, sa collection ou son équipe. Le texte lui dit « réessaie » mais rien ne le lui permet.

- **Recommandation** : Créer un composant `PErrorState` (icône + message + bouton « Réessayer » qui rappelle le loader de la page + lien secondaire vers Jouer) et remplacer les 9 `<UAlert>` d'erreur bloquante par ce composant. Le loader existe déjà dans chaque page, il suffit de l'exposer.


## Majeurs (38)

_Ils dégradent nettement l'expérience sans l'interrompre._


### La landing promet un « Pity garanti vers les raretés supérieures » — le pity ne concerne que les shiny

`/ (public-landing.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/pages/index.vue:33 chip « Pity garanti » et index.vue:168 « **Pity garanti** vers les raretés supérieures. ». La règle réelle : +1/500 de chance SHINY par exemplaire déjà possédé (app/pages/rules.vue:38, app/constants/game.ts:4-6 `SHINY_PITY_DENOMINATOR = 500`). Rien dans le jeu ne garantit une rareté. index.vue:155 emploie en plus le mot « pity » sans le définir, sur le tout premier écran vu par un visiteur.

- **Ce que subit le joueur** : Le visiteur s'inscrit en croyant qu'un filet de sécurité l'amènera à une Épique ou une Légendaire après N tirages. Ses 20 premiers boosters donnent des Communs (83,7 % du pool, cf. desktop-stats.png). Il conclut que le jeu est cassé ou malhonnête — c'est la promesse qui l'était.

- **Recommandation** : Remplacer par « Chance shiny croissante » et la bullet par « Chaque doublon augmente ta chance de tomber sur la version shiny de ce Pokémon. » Supprimer le mot « pity » de la landing, ou le gloser en une demi-phrase la première fois qu'il apparaît.


### La fusion à 10 exemplaires n'est signalée nulle part dans la collection

`/collection (desktop-collection.png, mobile-collection.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : Le getter `mergeables` existe (app/stores/collection.ts:24-32, seuil FUSION_THRESHOLD = 10 ligne 9) mais n'est consommé que dans la modale de détail (app/pages/collection.vue:94-96 puis 316-322). La vignette n'affiche que la quantité brute : app/components/card/HoloCard.vue:233-235 `×{{ quantity }}`. Aucun compteur ni CTA dans l'en-tête de page (collection.vue:133-147).

- **Ce que subit le joueur** : Sur mobile-collection.png la grille fait 15 500 px de haut. Pour découvrir qu'une carte est fusionnable, il faut ouvrir chacune des 151 vignettes une par une. La mécanique de progression centrale du jeu (passer du niveau 1 au niveau 3) reste invisible tant que le joueur n'a pas lu la page Guide.

- **Recommandation** : Poser un liseré + pastille « Fusion ✦ » sur les vignettes de `collection.mergeables` (le getter est déjà calculé), et afficher dans l'en-tête un chip « 3 fusions disponibles » qui applique un filtre. Zéro appel API supplémentaire.


### Le seul conseil « comment gagner des pièces » du jeu est du code inatteignable

`/play (desktop-play.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/pages/play.vue:132-135 construit le message « Il te manque N pièces. Gagne-en via l'entraînement, le jackpot ou le bonus quotidien. » à l'intérieur de `open()`. Or le bouton est `:disabled="!affordable"` (play.vue:433-435) : le clic ne part jamais quand le solde est insuffisant, donc ce message ne s'affiche jamais. Même impasse pour l'ouverture ×5 (play.vue:208-211 vs play.vue:443-447). Il ne reste que « · il te manque N » (play.vue:462-464).

- **Ce que subit le joueur** : Le joueur qui a dépensé ses 200 pièces de départ se retrouve devant un bouton grisé et un « il te manque 40 ». Aucune indication sur les trois sources de revenu gratuites (entraînement quotidien, Jackpot quotidien, bonus de connexion) — qui sont pourtant toutes accessibles et rapportent le jour même. Risque d'abandon en fin de première session.

- **Recommandation** : Laisser le bouton actif et faire porter le message d'erreur, ou afficher en permanence sous le solde un encart « À sec ? Entraînement +5 🪙 · Jackpot gratuit · Bonus quotidien » avec liens directs vers /gyms et /slot-machine (les disponibilités sont déjà dans `hub.dailyTiles`).


### Le hub annonce l'Échange comme débloqué « dans 5 j 23 h » alors que le vrai verrou est un seuil de collection

`/play — HubPanel (desktop-play.png, mobile-play.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/stores/hub.ts:105-111 : la tuile « Échange » reçoit toujours `nextResetAt: monday`, quelle que soit la raison de l'indisponibilité. app/components/game/HubPanel.vue:71 affiche alors un cadenas + CountdownChip. Or le blocage réel est `uniqueStandardCount >= 120` (app/stores/trades.ts:9, app/pages/trades.vue:23) — le compte de test en a 46. mobile-play.png : « 🔒 Échange · dans 5 j 23 h ».

- **Ce que subit le joueur** : L'interface promet que l'échange s'ouvrira lundi. Le joueur attend une semaine, revient, et rien n'a changé — parce qu'il lui manque 74 cartes, information jamais affichée. C'est une fausse promesse produite par l'UI elle-même, pas par l'API.

- **Recommandation** : Enrichir `QuotaTile` d'un champ `lockedReason?: string`. Quand `tradeEligibility.uniqueStandardCount < minRequired`, remplacer le compte à rebours par « 46/120 cartes » et pointer la tuile vers /collection plutôt que /trades. Même traitement pour toute tuile dont l'indisponibilité n'est pas temporelle.


### Trois taux de shiny contradictoires cohabitent sans un mot d'explication

`/rules et /stats (desktop-rules.png, desktop-stats.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : desktop-rules.png : « Chance shiny de base : 1/500 (0,2 %) » (app/pages/rules.vue:38). desktop-stats.png, tuile « TAUX DE SHINY OBSERVÉ » : 3,26 % (app/pages/stats.vue:122-123). Même page, bloc « Probabilités de tirage » : Shiny 1,71 %. Aucun texte ne relie ces trois nombres.

- **Ce que subit le joueur** : Le joueur qui cherche à comprendre ses chances lit 0,2 %, puis 1,71 %, puis 3,26 % en deux clics. Il ne peut plus se fier à aucun chiffre du jeu, et le pity — qui est précisément ce qui explique l'écart — reste incompris.

- **Recommandation** : Ajouter une note d'une ligne sous chaque nombre : « 0,2 % au premier exemplaire ; +0,2 % par doublon possédé » (Guide), « toutes sources et tous joueurs confondus, pity inclus » (Stats · observé), « pool de base, hors pity » (Stats · probabilités). Pur contenu éditorial.


### Le Guide décrit un réglage de tirage qui n'existe plus dans l'application

`/rules vs /settings (desktop-rules.png, desktop-settings.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/pages/rules.vue:26 : « 3 modes d'affichage : Visibles (tout révélé), Si possédée (masque les nouvelles), Masquées (révélation après le lancer). » Les options réelles sont app/pages/settings.vue:64-67 : Complète (~3 s) / Rapide / Directe — un simple réglage de vitesse d'animation (app/pages/play.vue:82 `REVEAL_MS`). Aucun mode ne masque quoi que ce soit.

- **Ce que subit le joueur** : Le joueur qui lit le Guide part chercher un réglage « Si possédée » qui n'existe pas, et se demande ce qu'il a raté. Le Guide étant la seule source d'explication du jeu, une erreur y contamine la confiance dans tout le reste.

- **Recommandation** : Réécrire l'item : « Révélation des tirages : Complète, Rapide ou Directe — règle la durée de l'animation d'ouverture (Réglages). » Idéalement, dériver ce texte de la constante `REVEAL_OPTS` pour qu'il ne puisse plus diverger.


### La cloche de notifications efface l'information au lieu de l'afficher

`AppNavbar (desktop et mobile)` · périmètre **partiel** · effort M · ⬜ à instruire

- **Preuve** : web/app/components/base/AppNavbar.vue:61-70 : le bouton cloche a pour seule action `@click="hub.markNotificationsRead()"`, qui POST /notifications/read-all et remet unreadCount à 0 (stores/hub.ts:162-168). Or la réponse complète est déjà en store : types/api.ts:392-403 `WireNotification { id, message, link, read, created_at }`, chargée par hub.ensureShort. Grep « notifications » sur tous les .vue : aucun composant d'affichage.

- **Ce que subit le joueur** : La pastille annonce « 3 » événements ; le seul geste possible la fait disparaître sans jamais montrer de quoi il s'agit (offre d'échange reçue, résultat de tournoi, badge). Les `link` fournis par l'API — autant de raccourcis vers Échanges/Tournoi, précisément les pages sans entrée de menu — sont jetés.

- **Recommandation** : Remplacer le bouton par un UPopover listant hub.notifications.notifications (message + date relative + NuxtLink sur `link`), non lues en tête, et ne déclencher markNotificationsRead qu'à la fermeture. Aucune donnée supplémentaire à demander. Limite assumée : l'API n'offre que read-all, pas de lecture unitaire ni de push (docs/audit/api-inventory.md, « Notifications temps réel : backend requis »).


### Un échange qui attend ma réponse n'est signalé nulle part sur desktop

`AppNavbar / BottomTabBar / HubPanel` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : Le compteur existe et est juste : stores/hub.ts, getter `tradeActionsRequired` (échanges pending_target/pending_initiator qui m'incombent). Il n'est consommé que par BottomTabBar.vue:54-64 (pastille sur l'onglet Menu) et MobileMenu.vue:34. AppNavbar.vue:55-59 n'affiche de UChip que pour `hub.unreadNotifications`.

- **Ce que subit le joueur** : Un joueur desktop qui reçoit une proposition d'échange n'a aucun signal : ni pastille, ni lien dans le menu, et la tuile « Échange » du hub s'allume sur l'éligibilité hebdomadaire (hub.ts, weeklyTiles : `available: tradeEligibility.eligible`) et non sur l'action attendue. Les échanges expirent sans réponse : la seule mécanique multijoueur asynchrone du jeu s'éteint d'elle-même.

- **Recommandation** : Ajouter l'entrée Échanges à la navbar desktop avec un UChip sur `hub.tradeActionsRequired`, et corriger la tuile hub : `available: tradeActionsRequired > 0 || eligibility.eligible`, avec un libellé distinct (« Échange — 1 réponse attendue ») pour que l'urgence prime sur la simple disponibilité.


### Le combat d'arène, irréversible et limité à une tentative par semaine, part au premier clic sans confirmation

`Arènes` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/pages/gyms.vue:359-370 : `<PButton @click="fight">Combattre</PButton>` appelle directement `fight()`. Aucun `ConfirmDialog`, alors que l'en-tête du fichier annonce l'inverse (app/pages/gyms.vue:8-9 : « Confirmations là où l'action est limitée (combat 1/semaine) ») et que la page Collection en utilise deux (collection.vue:336-357). Le bonus d'entraînement accumulé est de surcroît remis à zéro par le combat (commentaire app/stores/gyms.ts:65).

- **Ce que subit le joueur** : Un débutant curieux ouvre les 8 arènes, clique « Combattre » à chaque fois, perd 8 fois avec son équipe aléatoire et n'a plus rien à faire pendant 7 jours — en ayant brûlé au passage son bonus d'entraînement. C'est le scénario de churn le plus rapide du jeu et il ne demande que 2 minutes.

- **Recommandation** : Ajouter un `ConfirmDialog` reprenant l'estimation déjà calculée : « Estimation {p} % · tentative unique jusqu'à lundi · ton bonus d'entraînement de {bonus} % sera consommé ». Griser/avertir sous 35 % avec un renvoi « Entraîne-toi d'abord (+2 %/jour) ». La donnée vient de `gym.estimates` (gyms.vue:28), déjà chargée à l'ouverture du détail.


### « À DÉFIER » est une étiquette d'état peinte exactement comme le bouton primaire de l'app, et les pastilles s'alignent en escalier

`Arènes` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : components/gym/GymTile.vue:150 `.tile__status--open { color:#fff; background: var(--color-poke-500); box-shadow: 0 2px 0 var(--color-poke-700) }` — c'est la grammaire littérale de PButton primary (components/ui/PButton.vue:21 `edge:'#a41f14'`, l.79 `box-shadow: 0 var(--pb-depth) 0 var(--pb-edge)`). C'est un `<span>` (l.47-51), le vrai bouton est la tuile entière (pages/gyms.vue:196). Capture desktop-gyms.png : la pastille d'« Arène de Carmin sur Mer » est ~32 px plus bas que ses voisines car le nom passe sur deux lignes et `.tile` (l.55-66, `height: 100%`) n'a pas de `margin-top: auto` sur le statut.

- **Ce que subit le joueur** : Le joueur voit six « boutons » rouges alignés de travers et croit devoir viser la pastille. Le rouge-avec-arête, qui signifie « action principale » partout ailleurs, ne veut plus rien dire ici — et les trois états du même emplacement (rouge CTA / vert doux / gris) n'ont pas le même poids visuel.

- **Recommandation** : Repeindre `--open` en pastille douce (rouge sur fond `--color-poke-50`, sans arête) comme ses jumelles « Badge obtenu » et « Tenté », ou remplacer le span par un vrai `<PButton size="sm">` dans la tuile. Ajouter `margin-top: auto` sur `.tile__status` et `min-height: 2lh` sur `.tile__name` pour un pied de tuile aligné.


### Le Sac (charmes et tickets) n'est ouvrable que depuis la page Jouer

`BagModal / play.vue, slot-machine.vue, team.vue` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : Grep « BagModal » : une seule occurrence, play.vue:519, déclenchée par le bouton play.vue:326-341. Or les tickets se gagnent au Jackpot (desktop-slot-machine.png : lots « Ticket Biome », « Ticket Type », « Charme Chroma »), s'obtiennent aussi en vendant un shiny (collection.vue:328) et le Ticket Type filtre le tirage d'ÉQUIPE — team.vue affiche « Ticket Type actif … ton prochain tirage d'équipe sera filtré » sans permettre de l'activer.

- **Ce que subit le joueur** : Après un gain au Jackpot, rien n'indique où récupérer le lot : il faut deviner qu'il faut retourner sur Jouer et cliquer une petite pilule « Sac ». Pour utiliser un Ticket Type sur l'équipe, le parcours est Jackpot → Jouer → Sac → activer → Équipe : trois pages pour une action.

- **Recommandation** : Monter BagModal dans layouts/default.vue, piloter son ouverture par le store inventory, et exposer le bouton Sac dans la navbar (à côté du solde) + dans le tiroir mobile. À minima : bouton Sac sur /team et /slot-machine, et lien « Voir mon sac » dans le récapitulatif de gain du Jackpot. Ajouter aussi un lien « Tenter le Jackpot » dans l'état vide du sac (BagModal, « Ton sac est vide… », aujourd'hui sans lien).


### « Équipe » est absente de la barre d'onglets mobile alors qu'elle conditionne trois modes de jeu

`BottomTabBar (mobile)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : web/app/components/base/BottomTabBar.vue:10-15 — les 4 onglets sont Jouer, Collection, Aventure, Arènes ; Équipe est reléguée au tiroir (MobileMenu.vue:22). Or l'équipe est le prérequis des arènes (gyms.vue:283 « Compose une équipe pour estimer et défier cette arène »), de la Ligue et du tournoi (tournament.vue:146 « Équipes figées jeudi 11:55 »), tandis qu'Aventure utilise un starter dédié et pas l'équipe (spin.vue:196 « Choisis ton starter (Kanto) »).

- **Ce que subit le joueur** : Sur mobile, l'aller-retour le plus fréquent du jeu (Arènes → ajuster l'équipe → Arènes) coûte 2 taps et un scan de tiroir à chaque passage, tandis qu'un mode hebdomadaire à lancement unique occupe un onglet permanent.

- **Recommandation** : Onglets : Jouer · Collection · Équipe · Arènes + Menu ; déplacer Aventure dans le groupe « Jouer » du tiroir (où elle figure déjà, MobileMenu.vue:23). Aligner au passage l'ordre desktop/mobile, aujourd'hui divergent.


### Le bouton flottant du chat recouvre des actions sur mobile

`ChatWidget (toutes les pages, < 1024 px)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : mobile-gyms.png : le FAB rouge du chat masque le coin bas-droit de la carte « Arène de Céladopole » et empiète sur son bouton « À DÉFIER ». components/chat/ChatWidget.vue:210-226 : `position: fixed; right: 20px; z-index: 45` avec `@media (max-width: 1023px) { bottom: calc(90px + safe-area) }` — il flotte donc en permanence au-dessus du contenu, juste au-dessus du dock (z-index 40).

- **Ce que subit le joueur** : Dans toutes les grilles à deux colonnes (arènes, participants du tournoi, partenaires d'échange), la cellule située au niveau du FAB voit son bouton d'action partiellement couvert : le joueur tape et ouvre le chat au lieu de défier l'arène.

- **Recommandation** : Réduire le FAB sur mobile et l'ancrer au dock (l'intégrer comme 5e élément du BottomTabBar), ou le masquer au scroll descendant et le réafficher au scroll montant. À minima, réserver une gouttière (`padding-right` sur les dernières lignes de grille) ou coller le FAB au bord (`right: 8px`) pour qu'il ne chevauche plus de cible tactile.


### Classement mobile : le pseudo est écrasé à zéro pixel et la bande de badges déborde sous le score

`Classement (mobile)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : Capture mobile-leaderboard.png : les rangs 8 et 9 n'affichent AUCUN pseudo (les badges commencent juste après l'avatar), le rang 10 affiche « F… » pour « Faranheit », et le score rouge « 636 pts » chevauche le dernier badge. Cause : components/leaderboard/LeaderRow.vue:118 `.row__badges { flex: none }` (8 badges × 18 px + gaps ≈ 165 px incompressibles) face à `.row__name { overflow: hidden; text-overflow: ellipsis }` (l.100-108), seul élément flexible de la ligne.

- **Ce que subit le joueur** : Sur téléphone, un classement sans noms : le joueur ne peut plus identifier qui est devant lui. Ce sont précisément les joueurs les plus avancés (8 badges) qui deviennent anonymes.

- **Recommandation** : Donner la priorité de rétrécissement aux badges : `.row__badges { flex: 0 1 auto; overflow: hidden }` et `.row__name { flex: 0 1 auto; min-width: 6ch }`. Sous 640 px, descendre les badges sur la ligne `.row__counts` plutôt que de les laisser sur la ligne du pseudo.


### La fusion, seule boucle qui recycle les doublons, n'est signalée qu'une fois déjà atteinte

`Collection` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : app/pages/collection.vue:94-96 et 316-322 : le bouton « Fusionner » n'apparaît dans la modale que si `collection.mergeables` contient la carte, et app/stores/collection.ts:24-30 exige `quantity >= 10`. Aucun compteur intermédiaire nulle part : la grille (collection.vue:264-284) n'affiche qu'un badge quantité, les filtres (collection.vue:171-218) ne proposent pas « fusionnables », et le seul tri alternatif est « Chance shiny » (collection.vue:156-167). Capture desktop-collection.png : rien ne distingue une carte à 9 exemplaires d'une carte à 1.

- **Ce que subit le joueur** : Le joueur accumule des doublons sans jamais voir de compte à rebours. Il faut ouvrir chaque carte une par une pour découvrir qu'on est à 7/10 — donc personne ne le fait, et le seul objectif à moyen terme du jeu (monter ses lignées en niveau) reste invisible. Quand la fusion devient possible, rien ne le lui dit non plus.

- **Recommandation** : Afficher un anneau/compteur « n/10 » sur chaque cellule dès 3 exemplaires, un badge pulsant « Fusion prête » à 10, un compteur global « {mergeables.length} fusions disponibles » à côté de la jauge de progression, et une valeur de plus au segment possession : « Fusionnables ». Tout est déjà calculé par le getter `mergeables`.


### Aucun palier intermédiaire entre 46 et 151 cartes : un seul objectif, à 100 tirages de distance

`Collection` · périmètre **partiel** · effort M · ⬜ à instruire

- **Preuve** : app/pages/collection.vue:139-143 : la seule progression affichée est « {owned} / {total} obtenues » + un pourcentage global (capture desktop-collection.png : « 46 / 151 obtenues · 30 % »). La complétion par biome existe pourtant déjà dans la donnée et s'affiche sur les paquets de la page Play (app/pages/play.vue:89 passe `owned: b.ownedCount, total: b.cardCount` ; capture desktop-play.png : « 6/27 », « 8/28 », « 8/24 ») — mais nulle part dans la Collection, qui propose seulement un filtre biome (collection.vue:188-195) sans compteur.

- **Ce que subit le joueur** : Entre la 46e et la 151e carte il n'y a strictement aucun jalon à franchir, aucune célébration, aucun sous-objectif atteignable dans la semaine. Le joueur regarde une jauge qui bouge de 0,7 % par carte. Rien ne lui dit « il te manque 2 cartes pour terminer la Cave » — l'objectif le plus motivant du genre.

- **Recommandation** : Afficher dans la Collection un bandeau de paliers : complétion par biome (donnée déjà en store via `roll/biomes`), par type et par rareté, trié par « le plus proche d'être complété », avec un lien direct vers le booster du biome concerné. Célébrer chaque biome complété (le moteur de célébration existe, app/composables/useCelebration.ts). Classé partiel : sans backend on ne peut pas offrir de récompense de complétion, seulement le jalon et sa mise en scène.


### Le segmented control existe en composant partagé mais coexiste avec trois traitements d'état actif et une réimplémentation complète

`Collection / Réglages / Jackpot / Classement` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : components/ui/PSegmented.vue:84-93 propose deux tons : `neutral` (actif = pastille blanche surélevée, utilisé par collection.vue:151 et leaderboard.vue:83) et `accent` (actif = dégradé rouge plein, utilisé par settings.vue:181/237/254). Jackpot n'utilise ni l'un ni l'autre : pages/slot-machine.vue:104-118 réécrit un `role="radiogroup"` maison, CSS l.281-300 — bordure 2 px, fond `--color-poke-50`, `box-shadow: 0 3px 0`. Motif : PSegmented déclare un champ `hint` (l.17) mais ne le rend qu'en attribut `title` (l.41), donc invisible, alors que les paliers de mise ont besoin d'un sous-libellé visible (« Gratuit », « 5 🪙 »).

- **Ce que subit le joueur** : Sur trois écrans consécutifs, le même geste « choisis-en un » se signale par trois couleurs d'état actif différentes. Le joueur ne peut pas se fier à la couleur pour savoir ce qui est sélectionné.

- **Recommandation** : Ajouter un slot/prop `hint` réellement rendu dans PSegmented (2e ligne, taille .72rem) et migrer les paliers de mise du Jackpot dessus. Réserver le ton `accent` aux réglages de préférence et le ton `neutral` aux onglets de contenu — et documenter cette règle en tête du composant, qui porte déjà l'intention de source unique (l.2-5).


### Le toast « Bonus quotidien » s'affiche en top-center et recouvre la moitié de la barre de navigation

`Global (toaster) — visible sur Jouer` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : /home/user/roulettepoke/web/app/app.vue:5 `<UApp :toaster="{ position: 'top-center' }">` ; navbar en `position: sticky; height: 60px; z-index: 40` (components/base/AppNavbar.vue:92-105) ; déclencheur : plugins/auth-bootstrap.client.ts:21 (toast au 1er /auth/me du jour). Capture desktop-play.png : le carton blanc masque Équipe, Arènes, Aventure, Jackpot et une partie de Classement (5 entrées sur 9).

- **Ce que subit le joueur** : Le tout premier écran de la journée, pour 100 % des joueurs, s'ouvre avec la navigation à moitié cachée pendant toute la durée du toast. Le joueur qui veut aller ailleurs doit attendre ou viser la croix.

- **Recommandation** : Passer le toaster en `bottom-right` sur desktop (et `top-center` sous le seuil mobile où la navbar n'a pas de liens), ou décaler la pile de toasts de 60 px vers le bas via l'option `ui` du toaster. Vérifier aussi la collision avec le FAB de chat en bas à droite.


### Le mode sombre est proposé en tête des Réglages alors qu'aucun composant ne l'implémente : 179 couleurs figées, zéro règle .dark

`Global — Réglages > Apparence` · périmètre **frontend** · effort L · ❌ réfuté

- **Preuve** : `grep -rl "\.dark" app/pages app/components` renvoie 0 fichier ; la seule règle du dépôt est assets/css/main.css:119, qui ne redéfinit que les tokens bg/border/text. En face : 546 occurrences de couleurs hexadécimales en dur pour 179 valeurs distinctes dans pages+components, dont des textes bruns posés sur des fonds clairs figés — gyms.vue:415 `.champ__title { color:#7a4c07 }` sur `background: linear-gradient(150deg,#fff4d6,#ffe6ac)` (l.412) ; slot-machine.vue:332 `.result__title { color:#b06a00 }` ; league.vue:702 `color:#b7791f` ; team.vue et leaderboard.vue idem. Capture desktop-settings.png : « Apparence — Thème clair ou sombre de l'interface » est le tout premier réglage.

- **Ce que subit le joueur** : Le joueur qui active le thème sombre obtient une interface mi-sombre mi-jaune vif : panneaux dorés éclatants, titres bruns illisibles sur fond gris foncé. Un réglage mis en avant produit un résultat visiblement inachevé.

- **Recommandation** : Convertir les surfaces teintées en `color-mix(in oklab, <accent> N%, var(--ui-bg-elevated))` et les textes correspondants en un token `--ui-text-on-accent` défini deux fois dans main.css (clair / .dark). Prioriser les 5 panneaux dorés (gyms `.champ`, slot `.result--win`, league `.rcoins`/`.rdone`, team `.roll-result`) qui portent l'essentiel des couleurs figées. Cadrer avec une capture des 13 pages en thème sombre avant/après.


### Le carrousel de boosters coupe net le 5e paquet et cache 5 des 10 régions sans aucun repère de défilement

`Jouer` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : Capture desktop-play.png : le paquet « Plaines » est tranché à la verticale au bord du conteneur (x=1272), son prix affiche « 7… » au lieu de « 70 ». pages/play.vue:633-644 : `.carousel { overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: thin }` — pas de masque en dégradé, pas de flèches, pas d'indicateur de position. Il y a 10 paquets (Tous + 9 biomes : Ville, Montagnes, Forêt, Plaines, Mer, Lac, Cave, Désert, Tundra — cf. desktop-rules.png, tableau « Coût des tirages par biome »), dont 4,5 visibles.

- **Ce que subit le joueur** : Sur un écran 1440, le joueur voit quatre régions et demie et ignore que Mer, Lac, Cave, Désert et Tundra existent. Les biomes les plus rares et les plus chers — le contenu à forte valeur — sont invisibles au premier regard.

- **Recommandation** : Ajouter un masque `mask-image: linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 40px), transparent 100%)` sur `.carousel` pour signaler la coupe, plus deux boutons de défilement ‹ › visibles au survol et une rangée de points de position. Alternative plus lisible : une grille de 5×2 sans défilement, les 10 paquets tenant dans 1120 px à taille réduite.


### La page d'accueil promet un « pity garanti » que le jeu n'implémente pas

`Landing publique / Play (révélation)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/pages/index.vue:33 (« Pity garanti »), :155 (« le compteur de pity t'évite les séries noires ») et :168 (« Pity garanti vers les raretés supérieures ») — visibles sur public-landing.png. La mécanique réelle : +1/500 de chance shiny par exemplaire possédé (app/constants/game.ts:6, `SHINY_PITY_DENOMINATOR = 500`, confirmé par le Guide sur desktop-rules.png). Aucune garantie, aucun plafond, et aucun rapport avec les « raretés supérieures ». Concrètement, app/components/game/BoosterReveal.vue:42 affiche « ~0,4 % » sur un premier doublon.

- **Ce que subit le joueur** : Le joueur s'inscrit sur la promesse d'un filet de sécurité contre la malchance, puis enchaîne 20 communs sans que rien ne se déclenche. Le décalage se paie exactement au moment le plus fragile — la première session — et transforme la déception en soupçon (« le jeu triche »).

- **Recommandation** : Aligner le discours sur la réalité : « Chaque doublon augmente ta chance shiny — définitivement » plutôt que « pity garanti vers les raretés supérieures ». Et rendre le compteur lisible côté révélation : afficher la progression cumulée (« 12 exemplaires accumulés sur ce Pokémon ») plutôt qu'un pourcentage à un chiffre après la virgule, qui se lit comme une insulte.


### Navigation desktop amputée : Ligue des 4, Tournoi et Échanges sont absents de la navbar alors que le menu mobile les expose

`Navbar desktop vs MobileMenu (desktop-league.png, desktop-tournament.png, desktop-trades.png)` · périmètre **frontend** · effort S · ✅ confirmé

- **Preuve** : app/components/base/AppNavbar.vue:7-17 : 9 liens (Jouer, Collection, Équipe, Arènes, Aventure, Jackpot, Classement, Stats, Guide). app/components/base/MobileMenu.vue:28-36 : groupe « Compétition » avec /league, /tournament, /trades en plus. Sur desktop, /league n'est accessible que par la tuile hub, elle-même conditionnée à `leagueUnlocked` (app/stores/hub.ts:96).

- **Ce que subit le joueur** : Sur desktop, un nouveau joueur ne peut pas atteindre la Ligue des 4 : la tuile hub n'existe pas tant qu'il n'a pas 8 badges, et la navbar ne la propose pas. Or desktop-league.png montre justement une page pédagogique réussie (« Réservée aux Champions », jauge 0/8, CTA « Continuer les arènes ») — le meilleur écran d'objectif du jeu est invisible pour ceux à qui il s'adresse.

- **Recommandation** : Ajouter les trois entrées à la navbar desktop, avec le même regroupement que le mobile (menu déroulant « Compétition » si la place manque — la navbar bascule déjà en icônes seules entre 1024 et 1279 px, AppNavbar.vue:142-149). Afficher la tuile Ligue en état verrouillé plutôt que de la masquer.


### La cloche de notifications efface le badge sans jamais montrer les notifications

`Navbar, toutes les pages (desktop-play.png : cloche en haut à droite)` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : app/components/base/AppNavbar.vue:61-70 : le seul effet du clic est `hub.markNotificationsRead()`. Aucun popover, aucune liste. Les messages sont pourtant chargés et disponibles : `hub.notifications.notifications` (app/stores/hub.ts:36, 134) et l'API les renvoie avec `message` + `link` (docs/audit/api-inventory.md, `GET /notifications`).

- **Ce que subit le joueur** : Le joueur voit un badge rouge apparaître (échange reçu, résultat de tournoi, arène débloquée). Il clique. Le badge disparaît. Il n'a rien lu, et il n'a plus aucun moyen de savoir ce qu'on essayait de lui dire — les notifications sont son seul canal d'information sur ce qui a bougé pendant son absence.

- **Recommandation** : Transformer le bouton en UPopover listant `hub.notifications.notifications` (message, date relative, lien cliquable), et ne déclencher `markNotificationsRead()` qu'à l'ouverture du popover. Les données sont déjà en store, aucun appel supplémentaire.


### La tuile « Échange » promet un déblocage dans 5 jours alors qu'il manque 74 cartes

`Play (hub)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/stores/hub.ts:105-111 : la tuile trade est poussée inconditionnellement avec `nextResetAt: monday`, et HubPanel.vue:71 lui met un cadenas dès qu'elle n'est pas disponible. Captures desktop-play.png et mobile-play.png : « 🔒 Échange · dans 5 j 23 h ». Or il faut 120 standards uniques (app/stores/trades.ts:9) et le compte de test en a 46 (capture desktop-collection.png : « 46 / 151 obtenues »). Incohérence interne : la Ligue, elle, est masquée quand elle est verrouillée (hub.ts:96).

- **Ce que subit le joueur** : Le joueur attend lundi, revient lundi, et rien ne s'est débloqué. Un compte à rebours qui ne tient pas sa promesse détruit la confiance dans tous les autres compteurs de la page — y compris ceux qui, eux, sont vrais.

- **Recommandation** : Quand `tradeEligibility.uniqueStandardCount < minRequired`, remplacer le compte à rebours par la vraie condition : « Échanges · {n}/120 cartes uniques » avec une mini-jauge, sans cadenas ni date. Le compte à rebours lundi ne doit apparaître que pour un joueur éligible ayant déjà échangé cette semaine. `tradeEligibility` est déjà dans le store (hub.ts:158).


### Le tableau des rendez-vous ne dit jamais ce qu'on gagne

`Play (hub)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/components/game/HubPanel.vue:37-45 et 75-83 : chaque tuile n'affiche qu'un libellé, puis « Disponible » / « À jouer » ou un compte à rebours. Aucune valeur. Les montants existent pourtant partout ailleurs : +5 🪙 pour l'entraînement (app/pages/gyms.vue:148), 250 🪙 pour l'Aventure (`SPIN_REWARD_COINS`, capture desktop-spin.png), cagnotte 760 🪙 pour le tournoi (capture desktop-tournament.png), carte légendaire à 0,5 % pour le Jackpot gratuit (capture desktop-slot-machine.png).

- **Ce que subit le joueur** : « Jackpot · Disponible » ne donne aucune raison de cliquer, alors que derrière il y a une chance gratuite quotidienne de carte légendaire. Le hub ressemble à une checklist administrative plutôt qu'à une liste de cadeaux à récupérer : le joueur ferme la page sans faire le tour de ses gains du jour.

- **Recommandation** : Ajouter une ligne de valeur sous chaque libellé : « Jackpot — gratuit · légendaire possible », « Entraînement — +5 🪙 · +2 % arène », « Aventure — 250 🪙 + un légendaire », « Tournoi — cagnotte {prizePool} 🪙 ». Toutes ces valeurs sont déjà dans les stores (hub.tournament.prizePool, constantes de jeu). Ajouter un total « {n} récompenses à récupérer aujourd'hui » en tête.


### Huit combats d'arène sont ouverts cette semaine, le hub n'en annonce qu'un seul

`Play (hub) / Arènes / Guide` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/stores/hub.ts:79 `const gym = state.gyms.find(g => !g.hasBadge)` : la tuile hebdo n'expose que la première arène sans badge (capture desktop-play.png : « Arène d'Argenta · À jouer »). Or les captures desktop-gyms.png et mobile-gyms.png montrent les 8 arènes simultanément en « À DÉFIER » (`can_attempt` est par arène, docs/audit/api-inventory.md:145). Le Guide renforce le malentendu : capture desktop-rules.png « 8 arènes à battre (1 tentative/semaine) ».

- **Ce que subit le joueur** : Le contenu hebdomadaire le plus dense du jeu est sous-vendu d'un facteur 8. Le joueur croit avoir un seul combat par semaine, en fait un, et repart. Il n'a aucune idée qu'il pourrait décrocher 8 badges — donc débloquer la Ligue des 4 — dès sa première semaine.

- **Recommandation** : Remplacer la tuile unique par « Arènes · {n}/8 tentatives restantes cette semaine » (compter `gyms.filter(g => g.canAttempt)`), et corriger le Guide en « 1 tentative par arène et par semaine — soit jusqu'à 8 combats ». Sur /gyms, afficher le compteur de tentatives restantes en tête de grille.


### Le sélecteur de style de sprites n'affiche aucun aperçu : 10 vignettes cassées ou vides

`Réglages` · périmètre **partiel** · effort S · ❌ réfuté

- **Preuve** : Capture desktop-settings.png : glyphe d'image cassée + texte alt brut (« Aperçu du style Gen 5 animé ») qui déborde hors de la vignette et chevauche le libellé. Capture mobile-settings.png : 10 rectangles gris entièrement vides. Le repli est censé être `/images/pikachu.webp` (components/settings/SpriteStylePicker.vue:19-20) mais il ne résout pas non plus ; aucun `@error` sur l'`<img>` (l.53-57). Le commentaire du composant (l.12-13) énonce pourtant sa raison d'être : « Comparer vaut mieux que lire une liste de noms de générations ».

- **Ce que subit le joueur** : Le réglage le plus visuel de la page devient une liste de 10 cases grises identiques nommées Gen 1 à Artwork. Le joueur choisit à l'aveugle et doit valider, quitter puis revenir pour voir le résultat.

- **Recommandation** : Embarquer 10 miniatures locales (une par style, ~5 ko en WebP) dans `public/` comme repli garanti, afficher un `USkeleton` tant que la sonde n'a pas répondu, et poser `alt=""` + un `aria-label` sur le bouton pour qu'un échec ne fasse jamais déborder de texte. Vérifier au passage pourquoi `/images/pikachu.webp` ne résout pas.


### Trois gabarits de page cohabitent : 1120 px à gauche, 736 px collé à gauche, 672 px et 544 px centrés

`Réglages / Guide / Aventure vs les 8 autres` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : Largeurs de colonne de contenu mesurées sur les captures desktop (y = 200-640) : collection 1120, team 1114, gyms 1133, league 1121, tournament 1125, trades 1116, stats 1121, leaderboard 1120 — mais settings 736 px calé à gauche (x 153→888), rules 672 px centré (x 377→1048), spin 544 px centré (x 441→984). Code : settings.vue:340 `max-width: 46rem` SANS `margin: 0 auto` ; rules.vue:170-171 `max-width: 42rem; margin: 0 auto` ; spin.vue:207 `max-width: 34rem; margin: 0 auto`.

- **Ce que subit le joueur** : En naviguant, le contenu saute de largeur et d'axe à chaque page. Réglages est le pire cas : une colonne étroite plaquée à gauche avec 550 px de vide à droite, ce qui donne l'impression d'un chargement inachevé.

- **Recommandation** : Définir deux gabarits nommés et deux seulement : `page--wide` (1120 px, tableaux/grilles) et `page--reading` (42 rem, centré, pages de lecture et de réglages). Passer Réglages en `page--reading` centré, Aventure en 42 rem comme le Guide. Les porter dans le layout par défaut plutôt que dans le CSS de chaque page.


### Le solde en pièces apparaît en haut à droite sur 6 pages et disparaît sur 7, où le même emplacement sert à autre chose

`Toutes` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : `grep -rn "<CoinBalance"` : présent sur play.vue:342, collection.vue:146, team.vue:151, gyms.vue:118, tournament.vue:83, slot-machine.vue:92 ; absent de league.vue, trades.vue, spin.vue, stats.vue, leaderboard.vue, settings.vue, rules.vue. Or Ligue et Aventure manipulent des pièces (récompense 250/500 🪙 — cf. docs/audit/api-inventory.md, `POST /league/:runId/reward/coins`). Sur Classement, ce même emplacement héberge une légende de score non cliquable (leaderboard.vue:72 `<ul class="scale">`, CSS l.292 : pastilles bordées identiques aux filtres de Collection).

- **Ce que subit le joueur** : Le joueur apprend à chercher son solde en haut à droite, puis le perd sur plus de la moitié des pages — y compris là où il va dépenser. Sur Classement il tente de cliquer sur ce qui n'est qu'une légende.

- **Recommandation** : Décider une règle unique : le solde vit dans la navbar (il y est déjà) et le chip de page disparaît partout ; OU il est présent sur toutes les pages de jeu sans exception. Dans les deux cas, libérer la zone haut-droite et déplacer la légende de score du Classement sous le sous-titre, en typographie de texte (pas en pastilles).


### La fusion n'est découvrable qu'en ouvrant les cartes une par une

`collection.vue` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : stores/collection.ts:24-30, getter `mergeables`, calcule exactement les cartes fusionnables ; grep « mergeables » : une seule utilisation, collection.vue:95 dans `canMerge()`, qui ne sert qu'à afficher le bouton à l'intérieur de la modale de détail (collection.vue:316-322). Aucune pastille sur la vignette (HoloCard n'affiche que `×quantity`, ligne 233), aucun filtre « fusionnables » dans la barre de filtres (collection.vue:171-218), et l'écran de révélation d'un doublon n'annonce rien (BoosterReveal.vue:38-44 n'affiche que la chance shiny).

- **Ce que subit le joueur** : Sur une grille de 151 cartes, le joueur qui vient d'atteindre 10 exemplaires ne l'apprend qu'en ouvrant par hasard la bonne carte. La mécanique de progression la plus valorisante de la collection reste dormante.

- **Recommandation** : Pastille « ⇧ Fusionnable » sur les vignettes concernées, option de filtre « Fusionnables (N) » à côté de la bascule « Chance shiny », compteur dans l'en-tête de page, et bouton « Fusionner » sur l'écran de révélation quand le doublon atteint le seuil. Zéro appel API supplémentaire.


### Collection mobile : 15 552 px de défilement, filtres non collants et aucun retour en haut

`collection.vue (mobile)` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : mobile-collection.png fait 390×15 552 px en pleine hauteur (≈18 écrans). Les contrôles (onglets Standard/Shiny, bascule chance shiny, 3 sélecteurs, filtre possession) sont tous en tête de page (collection.vue:150-218) et aucune règle `position: sticky` n'existe dans la page — grep : sticky n'apparaît que dans AppNavbar.vue:92 et index.vue:384. Aucun bouton de retour en haut dans l'app (grep scrollTo : uniquement ChatWidget).

- **Ce que subit le joueur** : Pour changer d'onglet ou de filtre après avoir cherché une carte en bas de la grille, il faut remonter 18 écrans au pouce. Les filtres livrés récemment sont de fait inutilisables au-delà du premier écran.

- **Recommandation** : Rendre la barre de contrôles collante sous la navbar (`position: sticky; top: 56px`) en version compacte sur mobile (bouton « Filtres » ouvrant un USlideover, avec le nombre de résultats), et ajouter un bouton flottant « ↑ » au-delà de 2 écrans de scroll. À terme, virtualiser la grille : le `content-visibility: auto` de collection.vue:487 limite la peinture, pas la longueur du document.


### La Ligue des 4 est invisible tant qu'elle n'est pas débloquée, et rien ne fait le relais depuis les Arènes

`gyms.vue / stores/hub.ts / league.vue` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : stores/hub.ts (getter weeklyTiles) n'ajoute la tuile « Ligue des 4 » que `if (this.leagueUnlocked)` (= cycleStart ou eligible) ; desktop-play.png le confirme : « Cette semaine » = Arène d'Argenta / Tournoi / Échange / Spin, sans Ligue. Et la bannière de fin de parcours gyms.vue:122-135 (« Champion de Kanto ! Les 8 badges sont à toi ») ne contient aucun lien — le seul lien Arènes/Ligue du produit existe dans le sens inverse (league.vue:406 « Continuer les arènes »).

- **Ce que subit le joueur** : Le joueur collectionne 8 badges pendant des semaines sans jamais voir à quoi ils servent : la page qui porte l'enjeu (desktop-league.png : « Réservée aux Champions » + les 5 légendaires à gagner) lui est cachée précisément pendant la phase où elle le motiverait. Et à l'instant du déblocage — l'apogée du jeu — l'écran des Arènes ne propose aucune suite.

- **Recommandation** : 1) Afficher la tuile Ligue en permanence dans le hub, verrouillée avec la jauge badgeCount/8 et un lien vers /league (la page gère déjà son état « locked »). 2) Ajouter dans la bannière Champion de gyms.vue un bouton primaire « Défier la Ligue des 4 », ou une carte « Ligue des 4 — 0/8 badges » en fin de grille d'arènes. 3) Après la victoire de la 8e arène, faire pointer le bouton « Continuer » du BattleStage vers /league (le store battle peut porter un `nextTo`).


### La boucle de tirage impose un aller-retour à chaque paquet, et la promesse « Ranger dans l'album » n'est pas tenue

`play.vue / BoosterReveal / BoosterRevealBatch` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : components/game/BoosterReveal.vue:145-156 : la seule sortie est le bouton « Ranger dans l'album » qui émet `finish` ; play.vue:283-291 `finish()` remet simplement la phase à 'idle' — aucune navigation vers la collection, aucun bouton pour relancer. Idem pour l'ouverture ×5 (BoosterRevealBatch.vue:165-176).

- **Ce que subit le joueur** : L'action la plus répétée du jeu (38 705 lancers cumulés d'après desktop-stats.png) coûte deux clics et une transition de scène complète par paquet. Et le libellé promet un rangement dans l'album qui n'a pas lieu : pour vérifier sa carte, le joueur doit trouver Collection puis la retrouver parmi 151 vignettes.

- **Recommandation** : Deux sorties sur l'écran de révélation : action principale « Ouvrir encore — 🪙 X » (rappelle `open()`, désactivée si le solde est insuffisant) et action secondaire « Voir dans ma collection » qui navigue réellement vers /collection avec la carte pré-sélectionnée (query `?card=<id>` lue par collection.vue pour ouvrir la modale de détail).


### Le Guide ne documente aucune des fonctionnalités difficiles à trouver

`rules.vue` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : web/app/pages/rules.vue:19-55 : 4 sections seulement — Tirages, Raretés & Shiny, Collection/fusion/vente, Équipe & arènes (confirmé par desktop-rules.png, qui s'achève sur la table des coûts par biome). Rien sur la Ligue des 4, le Tournoi, les Échanges, l'Aventure ni le Jackpot — soit exactement les règles les plus opaques : 120 standards uniques et 1 échange/semaine (trades.vue:23-24), inscription lundi→mardi 12:00 et équipes figées jeudi 11:55 (tournament.vue:146), 8 badges et 1 tentative/semaine pour la Ligue.

- **Ce que subit le joueur** : Le joueur qui tombe sur « Échanges verrouillés » ou sur une fenêtre d'inscription fermée n'a aucun endroit où comprendre la règle : le Guide, seule page d'aide du produit, ne la mentionne pas.

- **Recommandation** : Ajouter 4 sections (Compétition : arènes → Ligue → Tournoi ; Échanges ; Aventure ; Jackpot), chacune avec un lien vers la page concernée — le Guide devient alors la porte d'entrée manquante vers les 3 pages absentes de la navbar desktop. Les seuils sont déjà des constantes du front (TRADE_MIN_CARDS, TOTAL_GYMS, MERGE_COST).


### Équipe complète : l'objectif atteint ne mène nulle part

`team.vue` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : desktop-team.png : équipe 6/6, les trois seules actions sont « Équipe complète » (désactivé), « Réorganiser » et « Vider ». Code : team.vue, bloc `team__actions` — le bouton principal devient `:disabled="team.isFull"` avec le libellé « Équipe complète », et la page ne contient aucun `to=`.

- **Ce que subit le joueur** : Le joueur vient de sacrifier définitivement des cartes de sa collection pour composer son équipe ; à l'instant où il termine, l'écran ne lui dit pas à quoi elle sert. Il doit deviner seul qu'il faut aller aux Arènes, à la Ligue ou au Tournoi.

- **Recommandation** : Quand `team.isFull`, remplacer le bouton désactivé par un bloc « Et maintenant ? » : « Défier <nom de la prochaine arène> » (hub.currentGym l'expose déjà), « Ligue des 4 » si `hub.leagueUnlocked`, « Tournoi » si `tournament.status === 'registration_open'`. Toutes ces données sont déjà en store.


### La page Échanges affiche une erreur réseau brute qui masque la seule jauge de progression vers le déblocage

`Échanges` · périmètre **frontend** · effort M · ✅ confirmé

- **Preuve** : Capture desktop-trades.png : toute la page se résume à « Connexion impossible. Vérifie ton réseau puis réessaie. » (message de app/utils/errors.ts:10). app/pages/trades.vue:125-130 : dès que `errorMsg` est vrai, le `v-else-if` remplace l'intégralité du contenu, y compris le panneau d'éligibilité et sa jauge « n/120 standards uniques » (trades.vue:155-163). Aucun bouton Réessayer nulle part sur la page.

- **Ce que subit le joueur** : La seule page qui donne un objectif chiffré à long terme (« encore 74 cartes uniques et tu pourras échanger ») est un cul-de-sac rouge. Le joueur en conclut que la fonctionnalité est cassée, pas qu'elle est à mériter — et il n'y revient pas.

- **Recommandation** : Découpler : charger `/trades/eligibility` indépendamment de `/trades` (les deux sont déjà en `Promise.all` dans trades.ts:42-48, il suffit de les rendre tolérants séparément) pour que la jauge s'affiche toujours. Ajouter un bouton « Réessayer » relançant le loader dans `usePageData`, et ne jamais laisser une page en état d'erreur sans action de sortie.


### L'équipe : « choisis-les avec soin » sur une roulette aléatoire, et aucun retour sur la qualité de l'équipe obtenue

`Équipe` · périmètre **partiel** · effort M · ⬜ à instruire

- **Preuve** : app/pages/team.vue:155 : « Chaque Pokémon tiré quitte définitivement ta collection — choisis-les avec soin. » Or app/pages/team.vue:90-96 appelle `team.roll()`, un tirage aléatoire (`POST /team/roll`, docs/audit/api-inventory.md:135) : le joueur ne choisit rien. Capture desktop-team.png : l'équipe issue de la roulette est Chenipan / Kangourex / Taupiqueur / Poissirène / Aéromite / Scarabrute, et la page n'affiche ensuite que « Équipe complète · Réorganiser · Vider » — aucune estimation, aucun lien vers les arènes.

- **Ce que subit le joueur** : Le joueur détruit 6 cartes de sa collection (celle-là même qui est scorée au classement, capture desktop-leaderboard.png) pour obtenir une équipe qu'il n'a pas choisie et dont il ne peut pas juger la valeur. Il découvre qu'elle est faible seulement en perdant son combat d'arène hebdomadaire. Les deux boucles du jeu — collectionner et combattre — se sabotent mutuellement sans que le joueur comprenne le troc.

- **Recommandation** : Corriger la promesse (« la roulette choisit pour toi, parmi tes {eligibleCount} cartes éligibles »), et fermer la boucle : afficher sur /team la meilleure estimation d'arène disponible (`GET /gym/:id/estimate` déjà utilisé par gyms.vue:49) sous la forme « Ton équipe : {p} % contre l'Arène d'Argenta », avec le lien direct. Utiliser `GET /team/preview-batch` pour montrer le pool réel avant de confirmer le tirage. Classé partiel : le caractère aléatoire et destructif est une règle serveur, seul le cadrage est corrigeable.


### Les sprites manquants de l'équipe affichent le glyphe cassé du navigateur et le texte alt brut dans la carte

`Équipe` · périmètre **partiel** · effort S · ⬜ à instruire

- **Preuve** : Capture desktop-team.png : Kangourex (slot 2) et Scarabrute (slot 6) affichent une icône d'image cassée + le mot « Kangourex » / « Scarabrute » en texte système, au milieu d'une carte par ailleurs soignée. components/team/TeamCard.vue:61-66 : `<img :src="member.imageUrl" :alt="member.name">` sans `@error`, alors que components/spin/VersusIntro.vue:81 et components/spin/AdventureScene.vue:518 gèrent le cas.

- **Ce que subit le joueur** : L'équipe est l'écran vitrine du joueur ; deux cartes sur six y ressemblent à une page web cassée des années 2000, ce qui contamine la crédibilité de tout le reste.

- **Recommandation** : Ajouter `@error="broken = true"` dans TeamCard et basculer sur une silhouette Pokéball (le composant `PokeBall` existe déjà et sert aux emplacements vides, pages/team.vue:252) + `alt=""`. Généraliser via un composant `PokeSprite` unique utilisé par TeamCard, HoloCard, RankAvatar et TourneyAvatar.


## Mineurs (8)

_Finition et cohérence._


### Classement : les trois compteurs de chaque ligne ne sont identifiables qu'au survol souris

`/leaderboard (desktop-leaderboard.png, mobile-leaderboard.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : app/components/leaderboard/LeaderRow.vue:38-56 : les libellés « Cartes standard », « Légendaires », « Shiny » ne sont portés que par des attributs `title` (aucun texte visible, aucun aria-label). desktop-leaderboard.png : les lignes affichent « ● 145  ◆ 4  ● 53 ». Le barème est ailleurs, en haut à droite (« Standard 1 · Légendaire 5 · Shiny 10 · Lég. Shiny 15 ») sans correspondance de couleur avec les pastilles.

- **Ce que subit le joueur** : Sur mobile, où le survol n'existe pas, les trois nombres qui expliquent tout le classement sont indéchiffrables. Le nouveau joueur voit sa ligne « 46 / 0 / 3 · 76 pts » sans comprendre ce qui fait monter le score, donc sans savoir quoi viser.

- **Recommandation** : Remplacer les pastilles nues par une icône + une abréviation lisible (« 145 std · 4 lég · 53 ✦ »), et reprendre les couleurs du barème d'en-tête sur les pastilles. Ajouter les `aria-label` correspondants.


### Quatre traitements différents pour l'état vide, et une page où l'état vide n'existe pas du tout

`Collection / Tournoi / Classement / Jackpot / Échanges` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : Collection : PPanel + icône 32 px + titre + sous-titre + bouton de sortie (collection.vue:240-257). Tournoi : bloc centré sans panneau, padding 34 px, pas de CTA (tournament.vue:104-115, CSS l.375-377). Classement et Jackpot : une seule ligne de texte gris .82rem sans icône ni panneau (leaderboard.vue:249-251 / `.feed__empty` l.443 ; slot-machine.vue:235-237 / l.377). Échanges : aucun état vide — les quatre sections sont en `v-if` sur la longueur (trades.vue:168, 192, 212, 267), donc un joueur sans échange ni partenaire ne voit que le panneau d'éligibilité au-dessus d'une page vide. Les squelettes suivent la même dispersion : 0 `USkeleton` sur play/slot-machine/spin/settings/rules, 1 sur collection/team/gyms, 2 sur league/tournament/trades/stats/leaderboard.

- **Ce que subit le joueur** : Un joueur qui découvre le jeu (0 carte, 0 échange, aucun tournoi) traverse une série d'écrans qui vont d'un bel encart avec une action à un vide total sans explication. Sur Échanges il ne sait ni pourquoi la page est vide ni quoi faire ensuite.

- **Recommandation** : Créer `PEmptyState` (icône + titre + une phrase + un CTA optionnel, dans un PPanel) et l'appliquer aux 5 emplacements, y compris un `v-else` global sur Échanges (« Aucun échange en cours — propose une carte à un dresseur »). Poser en parallèle une règle simple : toute page qui charge des données affiche un squelette calqué sur sa mise en page finale, jamais rien.


### La Ligue et le Classement se présentent comme des murs plutôt que comme des échelles

`Ligue des 4 / Classement` · périmètre **partiel** · effort M · ⬜ à instruire

- **Preuve** : Capture desktop-league.png : état verrouillé « Réservée aux Champions · 0/8 badges » — la récompense n'est jamais chiffrée, alors que `LEAGUE_COINS_REWARD = 500` (app/stores/league.ts:10) et que le bloc récompense n'existe que dans la phase `result` (app/pages/league.vue:171-205). Capture desktop-leaderboard.png : le joueur est 29e avec 76 pts face à 741 pts en tête, les 10 premiers ayant tous 144-146 cartes standards sur 151 — un écart que rien ne resitue dans le temps.

- **Ce que subit le joueur** : Un nouveau joueur voit deux écrans qui lui disent, chacun à sa façon, qu'il n'a rien à y faire : une porte fermée sans indication de ce qu'il y a derrière, et un podium hors d'atteinte occupé par des comptes quasi complets. Aucun des deux ne lui donne une marche à monter cette semaine.

- **Recommandation** : Sur la Ligue verrouillée, chiffrer le butin dès l'état fermé (« 500 🪙 ou une tentative de capture légendaire, chaque semaine ») et afficher la prochaine étape concrète : « Arène d'Argenta — estimation {p} % » avec le lien. Sur le Classement, mettre en avant le contexte local déjà renvoyé par l'API (`playerContext.above/below`, docs/audit/api-inventory.md:233) sous forme d'objectif — « +{delta} pts pour dépasser {above.username} » — plutôt que de laisser le top 10 dominer l'écran. Classé partiel : un classement saisonnier ou une progression hebdomadaire demanderait le backend.


### Quatre mots pour deux concepts : Aventure, Spin, run, transfert

`Navbar, /play, /spin, /stats (desktop-spin.png, desktop-stats.png, mobile-play.png)` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : Navbar : « Aventure » (app/components/base/AppNavbar.vue:12). Tuile hub : « Spin » (app/stores/hub.ts:116, visible sur mobile-play.png). Stats : titre « Spin — l'aventure » (app/pages/stats.vue:143), tuiles « RUNS LANCÉS » et « TRANSFERTS DE LÉGENDAIRES / Vers PokéRoulette » (stats.vue:155), anecdotes « Spineur chanceux / malchanceux / déterminé » (stats.vue:59-61). Page /spin : « Un légendaire à capturer · transfert 10 % » (desktop-spin.png), sans définition de « transfert ».

- **Ce que subit le joueur** : Le joueur ne fait pas le lien entre la tuile « Spin » de son tableau de bord et l'onglet « Aventure » de la navbar : il croit à deux fonctionnalités différentes. Et « transfert 10 % » — le taux de réussite pour faire passer un légendaire de l'aventure vers la collection, c'est-à-dire la récompense la plus convoitée du jeu — reste un chiffre sans unité ni objet.

- **Recommandation** : Un seul nom public : « Aventure » (renommer la tuile hub.ts:116 et le titre stats.vue:143), « run » → « périple », « transfert » → « transfert vers ta collection », avec une glose au premier emploi sur /spin : « 10 % de chances de pouvoir le transférer dans ta collection ». Purement éditorial.


### Stats se contredit sur la densité : bloc à demi-largeur en desktop, et une colonne en haut contre deux colonnes plus bas en mobile

`Statistiques` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : Capture desktop-stats.png : « Vue d'ensemble » aligne 4 tuiles sur 1120 px, puis « Spin — l'aventure » place 2 tuiles qui s'arrêtent à ~610 px, laissant un bord droit en marche d'escalier — cause : stats.vue:356 `.tiles--2 { grid-template-columns: repeat(2,1fr); max-width: 34rem }`. Capture mobile-stats.png : les 4 tuiles de « Vue d'ensemble » passent à 1 par ligne (stats.vue:358, `@media (max-width:460px)`) tandis que les 8 tuiles de « Statistiques par joueur » restent à 2 par ligne (stats.vue:392, `@media (max-width:720px)`), pour des contenus de nature identique.

- **Ce que subit le joueur** : En desktop, la page semble s'interrompre au milieu. En mobile, il faut faire défiler quatre grands panneaux pour lire quatre nombres, alors que huit nombres de même nature tiennent en quatre lignes juste en dessous.

- **Recommandation** : Supprimer `max-width: 34rem` sur `.tiles--2` et laisser les 2 tuiles Spin s'étendre (ou compléter la rangée à 4 avec deux indicateurs existants). Aligner le point de rupture mobile de `.tiles` sur celui de `.pl__grid` : 2 colonnes jusqu'à 460 px, 1 seule en dessous de 360 px.


### Aucune primitive partagée pour les barres de progression et les surfaces de carte : 8 barres réécrites, 8 rayons de coin différents

`Toutes` · périmètre **frontend** · effort M · ⬜ à instruire

- **Preuve** : Barres de progression, toutes réécrites à la main avec 5 hauteurs et 4 dégradés : stats.vue:378 (7 px), tournament.vue:463 (7 px), league.vue:655 (8 px), collection.vue:384-397 (9 px, dégradé ambre→rouge), gyms.vue:390 (9 px), trades.vue:320 (9 px, dégradé vert), league.vue:587 (10 px, dégradé violet), BattleScene.vue:300 (11 px). Rayons de carte sur la seule page Stats : PPanel 20 px / padding 20-22 (PPanel.vue:16-17), StatTile 18 px / 16-18 (StatTile.vue:46-47), AnecdoteCard 16 px / 15-16 (AnecdoteCard.vue:44-45), `.mini` 13 px / 12-14 (stats.vue:397-398). Sur l'app entière : 10, 11, 12, 13, 14, 16, 18 et 20 px.

- **Ce que subit le joueur** : Rien ne casse, mais l'œil enregistre en continu que les blocs ne sont pas de la même famille. Sur Stats, quatre arrondis différents se superposent dans un même écran — c'est le signal le plus net d'un assemblage plutôt que d'un système.

- **Recommandation** : Créer `PMeter` (props `value`, `max`, `tone`, hauteur unique 9 px, dégradé pris dans un jeu de 4 tons nommés) et remplacer les 8 implémentations. Poser trois tokens de rayon dans main.css — `--r-card: 20px`, `--r-tile: 14px`, `--r-chip: 10px` — puis remplacer les 8 valeurs littérales. Aucun impact fonctionnel, gain de cohérence immédiat sur 13 pages.


### Le toast de bonus quotidien ne dit pas combien a été crédité

`Toutes les pages, au chargement (desktop-play.png, mobile-play.png)` · périmètre **partiel** · effort S · ⬜ à instruire

- **Preuve** : app/plugins/auth-bootstrap.client.ts:21-26 : « Bonus quotidien ! / Ta récompense de connexion a été créditée. » Aucun montant. La règle (100 🪙 + 10 par badge) n'est écrite nulle part dans le front — la page Guide n'évoque le sujet qu'indirectement (rules.vue:58 « booster ton bonus de connexion quotidien »).

- **Ce que subit le joueur** : Le joueur voit son solde à 200 sans savoir ce qui vient d'y entrer, ni que gagner des badges d'arène augmentera ce revenu chaque jour. La boucle de rétention quotidienne (« reviens demain, tu gagnes plus ») n'est jamais énoncée.

- **Recommandation** : L'API ne renvoie pas le delta ; contournement front : afficher la règle plutôt que le montant — « +100 🪙 · +10 par badge d'arène (tu en as 0) » en lisant `hub.gyms` déjà chargé, avec un lien vers /gyms. Ajouter la règle explicite dans le Guide.


### Le Tournoi ne mène pas à l'équipe qu'il va figer

`tournament.vue` · périmètre **frontend** · effort S · ⬜ à instruire

- **Preuve** : tournament.vue:146 affiche « Inscriptions lundi → mardi 12:00 · Équipes figées jeudi 11:55 · Combats jeudi 12:00 » et la page rend `a.myTeam` avec son état verrouillé (tournament.vue:216-233), mais ne contient aucun lien : grep `to=` sur pages/tournament.vue → aucun résultat. desktop-tournament.png : le seul bouton est « S'inscrire — 20 🪙 », sans mention ni contrôle de l'état de l'équipe.

- **Ce que subit le joueur** : Le joueur paie 20 pièces sans être averti que son équipe sera gelée jeudi 11:55 dans l'état où elle se trouve — incomplète comprise. Rien ne le ramène à /team avant l'échéance.

- **Recommandation** : Sous le bouton d'inscription, afficher l'état réel de l'équipe (`team.count/6`, déjà dans le store) avec un lien « Préparer mon équipe » ; après inscription et jusqu'à `teamsAreLocked`, afficher un rappel daté « Ton équipe sera figée jeudi 11:55 » avec le même lien. Interdire l'inscription équipe vide relèverait du serveur, mais l'avertissement est faisable côté front.


## Plan d'action proposé

**Vague 1 — arrêter de perdre des joueurs** (quelques jours)

Toutes les impasses. L'écran de verrouillage des Échanges à la place de l'erreur
réseau ; un bouton « Réessayer » partout où une page peut échouer ; les trois
entrées manquantes de la navbar desktop ; la confirmation avant le combat d'arène
hebdomadaire irréversible. Ce sont des corrections courtes, à fort effet, et
toutes vérifiées ou triviales à vérifier.


**Vague 2 — rendre le jeu lisible** (1 à 2 semaines)

Ce que le joueur doit deviner aujourd'hui : la valeur du doublon à la révélation,
le seuil de fusion signalé dans la collection, le montant du bonus quotidien, ce
que rapporte chaque rendez-vous du hub, et les contradictions entre le Guide, la
landing et les Stats (taux de shiny, pity). Corriger d'abord les **fausses
promesses** : elles coûtent plus cher que les manques.


**Vague 3 — compléter l'audit, puis la finition**

Faire tourner les 4 axes manquants (accessibilité, mobile, perf, contenu) et la
passe adverse sur l'ensemble, **avant** d'engager les chantiers de cohérence UI
(gabarits de page, primitives partagées, états vides). Sans ça, on risque de
refondre en s'appuyant sur des constats non validés.


## Méthode

- 8 experts prévus en parallèle sur le code **et** 28 captures de l'app réelle
  (13 pages × desktop 1440×900 + mobile 390×844, plus landing et login), compte
  de test, données réelles. Captures dans `artifacts/audit-2026/`.

- Chaque constat devait citer une preuve vérifiable (chemin:ligne ou capture).

- Une passe adverse devait tenter de **réfuter** chaque constat avant synthèse.
  C'est cette passe qui a échoué ; elle reste à faire.
