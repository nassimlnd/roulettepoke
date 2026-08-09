# Comparatif — PokéRoulette original v4 vs notre front

> Établi le 3 août 2026 par sondage direct de l'API de production et lecture du
> code source du front original (`pokeroulette.poulineau.ovh/src/`). Chaque
> chiffre ci-dessous a été **mesuré**, pas déduit.
>
> **Mise à jour du 6 août 2026 — vagues A et B livrées.** Le sondage de reprise
> a révélé trois ruptures de contrat que le comparatif initial n'avait pas
> vues, dont une bloquante : `POST /auth/login` attend `identifier` et non
> `email`, si bien que **plus personne ne pouvait se connecter**. Le détail est
> en fin de document.

## Ce qui a changé côté serveur

L'original est passé en **v4.0.0** (27/07/2026), une version majeure. Comme nous
consommons la **même API**, ces changements nous concernent directement.

| | Avant | Maintenant |
|---|---|---|
| Cartes | 302 | **502** |
| Pokédex | 1 → 151 (Kanto) | **1 → 251 (Kanto + Johto)** |
| Types | 16 | **18** (+ Acier, + Ténèbres) |
| Arènes | 8 | **16** (2 parcours de 8, champs `generation` 1 et 2) |
| Biomes | 10 | 10 (inchangé) |

Nouveautés de gameplay annoncées dans les notes de version v4 :

- **Filtre Génération** (Tous / Kanto / Johto) dans la collection.
- **3 équipes indépendantes** de 6 Pokémon : Tournoi (partagée avec la Ligue des
  4), Kanto et Johto (arènes). L'API expose `/team?scope=…`.
- **Deux parcours de 8 badges indépendants**, chacun avec son propre
  entraînement quotidien et sa progression.
- **Échanges séparés par génération** (`?generation=`), onglets Kanto/Johto.

## Ce qui est cassé ou dégradé chez nous

Rien ne plante — mais plusieurs choses sont désormais fausses.

| Gravité | Constat | Preuve |
|---|---|---|
| 🔴 | **`TOTAL_GYMS = 8`** alors que l'API renvoie 16 arènes. La progression affiche « x/8 » et la grille mélange les deux parcours sans distinction. | `stores/gyms.ts:9` vs `/gym` → 16 éléments |
| 🔴 | **Les 2 nouveaux types ne sont déclarés nulle part** : union `PokeType`, `TYPE_SLUG_TO_NAME`, couleurs CSS `--color-type-*` et `TYPE_GRADIENT` s'arrêtent tous à 16. Les cartes Acier/Ténèbres s'affichent en beige neutre. | 4 fichiers vérifiés |
| 🟠 | **`normalizeTeamMember` lit `m.id`** ; l'API envoie maintenant `card_id`. `cardId` vaut donc `undefined`. Bug **latent** : ce champ n'est utilisé nulle part aujourd'hui. | `normalize/team.ts:11` vs charge utile réelle |
| 🟠 | **Une seule équipe** côté front, contre trois côté v4. Nous appelons `/team` sans `scope`, ce qui renvoie l'équipe globale — donc cohérent, mais les équipes Kanto/Johto sont inaccessibles. | `/team?scope=global` → 6 membres |
| 🟢 | **L'Aventure (`/spin/*`) fonctionne toujours.** Le client v4 ne l'appelle plus, mais tous les endpoints répondent (200, ou 429 métier). Notre implémentation n'est pas orpheline. | 6 endpoints testés |

## Fonctionnalités présentes en v4, absentes chez nous

Diff des endpoints : **83 côté v4, 68 chez nous**. Les manques, par ordre
d'importance produit :

1. **Motus** (`/motus/today`, `/motus/guess`) — un mot du jour à la Wordle.
   Testé : mot de 6 lettres, 6 essais, première lettre donnée, et une
   `rewardForm` en récompense — donc **relié au Zarbi**.
2. **Zarbi / Unown** (`/collection/zarbi`, `/collection/zarbi/sell`,
   `/trades/players/:id/zarbi-forms`) — collection des 28 formes, vendables et
   échangeables. Sous-système complet que nous n'avons pas.
3. **Suggestions & Roadmap** (`/suggestions`, `/suggestions/:id/vote`,
   `/suggestions/roadmap`) — les joueurs proposent et votent ; roadmap publique.
4. **Notes de version** — page dédiée + modale au premier lancement après mise à
   jour. L'original s'en sert pour annoncer les nouveautés.
5. **Classements par génération** (`/leaderboard/kanto`, `/leaderboard/johto`).
6. **Historique des tournois** (`/tournament/list`, `/tournament/:id`).
7. **Historique personnel du Jackpot** (`/slot-machine/my-history`).
8. Divers : `/roll/preview`, `/roll/simulate-charme`, `/chat/banned`,
   `/auth/active-generation`, `/team/preview-batch`.

## Ce que nous avons et qu'ils n'ont pas

À ne pas perdre de vue dans la comparaison : notre front n'est pas en retard sur
tout. Il conserve l'Aventure en combats plein écran, une scène de révélation
shiny dédiée, le choix du style de sprites par génération, le mode sombre, les
filtres de collection cumulables (type/rareté/biome/possession), et une base
technique testée (44 tests, lint/typecheck/build verts).

## Ordre de travail proposé

**Vague A — remettre le front d'aplomb (aucune nouvelle fonctionnalité).**
Les deux points rouges. Déclarer Acier et Ténèbres sur les quatre couches,
et rendre le nombre d'arènes dynamique au lieu de `TOTAL_GYMS = 8`. Corriger
`card_id` au passage. C'est court et ça supprime des affichages faux.

**Vague B — rattraper le modèle de jeu v4.**
Filtre Génération dans la collection (la donnée `num` suffit : ≤ 151 = Kanto),
puis les deux parcours d'arènes séparés, puis les 3 équipes. C'est le gros du
chantier, et il touche `stores/gyms`, `stores/team` et leurs pages.

**Vague C — les fonctionnalités manquantes**, par rapport valeur/effort :
Motus + Zarbi (liés, et ce sont les vraies nouveautés de contenu), puis
Suggestions/Roadmap, puis les notes de version, puis les historiques.

## Points à préciser avant d'attaquer la vague B

*Résolus — voir la section suivante.*

- ~~Les valeurs de `scope` autres que `global`~~ → `global`, `gen1`, `gen2`.
- ~~`/auth/active-generation` répond 404 en GET~~ → c'est un **PUT**.

---

# Mise à jour du 6 août 2026 — ce qui a été livré

## Trois ruptures de contrat que le comparatif avait manquées

Le premier sondage avait interrogé l'API avec un jeton déjà obtenu ; il n'avait
donc pas retesté la connexion elle-même, ni relu la forme de l'utilisateur.

| Gravité | Constat | Preuve |
|---|---|---|
| 🔴🔴 | **`POST /auth/login` attend `identifier`** (e-mail *ou* pseudo), plus `email`. Le serveur répondait « Identifiant et mot de passe requis » : **la connexion était entièrement cassée**. | 4 formes de charge utile testées ; `src/pages/login.js` de l'original |
| 🔴 | **`coins` a disparu de l'utilisateur**, remplacé par `coins_gen1`, `coins_gen2` et `active_generation`. `reconcile(user.coins)` passait `undefined` : le solde affichait « — ». | `/auth/me` réel |
| 🟠 | **`PUT /auth/active-generation`** existe (GET/POST/PATCH → 404) et bascule la région active. | 4 méthodes testées |

## Le modèle v4 tel que mesuré

- **Deux bourses**, une par région, et une seule active à la fois. Les endpoints
  de jeu (`/roll`, `/training/status`, vente) renvoient toujours un `coins`
  scalaire : celui de la région active.
- **Deux endpoints seulement** répondent différemment selon la région —
  `/training/status` et `/roll/biomes`. `/gym`, `/collection` et `/team` sans
  portée sont identiques des deux côtés (comparaison d'empreintes des réponses).
  Ce sont donc les deux seuls rechargés à la bascule.
- **Portées d'équipe** : `global`, `gen1`, `gen2`. `kanto`, `johto`, `1` et `2`
  sont rejetés (« Portée d'équipe invalide »).
- **Bonus quotidien par région** : `100 + badges_de_la_région_active × 10`, donc
  plafonné à 180 dans chacune — et non 100 + 16 badges.
- **502 cartes** : 302 en gen 1, 200 en gen 2, `num` de 1 à 251, 18 types.
- **16 arènes**, `order_num` continu de 1 à 16 (Kanto 1-8, Johto 9-16) : le rang
  affiché doit être ramené au circuit, sinon Johto s'annonce « Arène 9 ».

## État des vagues

- **Vague A — livrée** (`981f6ab`). Connexion rétablie, porte-monnaie par
  région, Acier et Ténèbres déclarés sur les quatre couches, nombre d'arènes
  dynamique, `card_id` corrigé. Deux garde-fous ajoutés : un test échoue si les
  quatre couches d'un type divergent, un autre couvre les rangs de circuit.
- **Vague B — livrée** (`a3442ba`). Filtre Génération dans la collection,
  parcours d'arènes séparés, trois équipes.
- **Vague C — aux trois quarts.** C1 livrée (`a5e172b`) : classements par
  région (l'onglet « Tricheurs » appelait une route supprimée), seuil d'échange
  régional (120 Kanto / 80 Johto), prime du jour déplaçable. C2 livrée
  (`79dffb0`) : les 28 formes de Zarbi. C4 livrée : Motus — grille, clavier
  virtuel AZERTY, récompense Zarbi, classement du jour, tuile quotidienne du
  hub. C3 livrée : Idées & sondages — sondages avec vote et changement
  d'option, dépôt d'idée, tableau d'avancement par statut, votes 👍/👎
  annulables (toggle vérifié contre l'API), remarques d'équipe votables.
  **La vague C est close.**
  Retirés de la vague après vérification : les notes de version (aucune API,
  page en dur chez eux) et `/suggestions/roadmap` (404 même pour l'original).

## Reste à traiter, découvert en chemin

- `/auth/me` renvoie `canCorrectDailyBonusGeneration` : le bonus quotidien est
  crédité dans une région et peut être « corrigé » vers l'autre. Non implémenté.
- Les échanges séparés par génération (`?generation=`) ne sont pas câblés.
- Le solde répété dans l'en-tête de certaines pages (`CoinBalance`) n'indique
  pas la région, contrairement à celui de la barre de navigation.
