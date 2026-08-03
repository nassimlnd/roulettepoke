# Comparatif — PokéRoulette original v4 vs notre front

> Établi le 3 août 2026 par sondage direct de l'API de production et lecture du
> code source du front original (`pokeroulette.poulineau.ovh/src/`). Chaque
> chiffre ci-dessous a été **mesuré**, pas déduit.

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

- **Les valeurs de `scope`** autres que `global` : `kanto` et `johto` sont
  refusées par l'API (« Portée d'équipe invalide »), et les pages du front
  original que j'ai lues n'utilisent que `global`. Il faut lire
  `components/teamRoulette.js` ou demander la liste au backend.
- **`/auth/active-generation`** répond 404 en GET : méthode ou usage à
  déterminer.
