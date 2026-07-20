# Analyse du gameplay

> Analyse de la boucle de jeu et de son ressenti, dérivée de l'audit produit
> (`docs/experts/01`) et de l'inventaire fonctionnel (`docs/audit/existing-features.md`).
> Objectif : comprendre ce que la refonte doit servir, sans toucher aux règles.

## 1. La boucle de jeu, à trois échelles de temps

PokeRoulette superpose trois boucles imbriquées. La refonte doit les rendre
toutes **lisibles simultanément** (c'est le rôle du futur hub).

### Boucle immédiate (secondes) — le tirage

`solde → Lancer 10 🪙 → suspense 4 s → carte → collection`. C'est le geste que
le joueur répète le plus. Sa qualité d'animation est déjà excellente ; son
**paiement émotionnel est cassé** (résultat hors écran, célébration plate,
doublon muet). C'est le levier n°1 de la refonte.

### Boucle quotidienne (minutes) — le rituel

`bonus de connexion (100–180 🪙) → entraînement (+5 🪙, +2 % arène) → jackpot
gratuit`. Trois sources de coins gratuites qui alimentent la boucle immédiate.
Problème : elles vivent sur trois pages sans lien, le bonus est crédité en
silence, et rien ne rappelle qu'elles existent. Un joueur qui les oublie
s'appauvrit sans le savoir.

### Boucle hebdomadaire (jours) — la compétition

`équipe → arène (1/sem) → 8 badges → ligue (1/sem) → tournoi (lun→jeu) →
échanges (1/sem) → Spin (1/sem)`. C'est la colonne vertébrale de la rétention
mois 1 à 3, et la partie la mieux conçue du jeu. Le jeudi (tournoi + ligue) est
le sommet dramatique de la semaine. Faiblesse : aucune ossature temporelle ne
relie ces échéances, et le creux vendredi→dimanche est vide.

## 2. Les cinq usages du doublon (la ressource centrale méconnue)

Le doublon est le concept le plus important et le moins raconté du jeu. Un même
exemplaire supplémentaire sert simultanément à :

| Usage | Règle | Aujourd'hui |
| --- | --- | --- |
| **Pity shiny** | +1/500 de chance shiny par exemplaire possédé de la carte | Invisible (pity non affiché) |
| **Fusion** | 10 exemplaires → 1 évolution | Bouton sans confirmation |
| **Échange** | 2 exemplaires min pour céder une carte | Règle noyée dans un préambule |
| **Pool d'équipe** | la roulette d'équipe pioche dans la collection | Pool jamais montré |
| **Vente** | 1–25 🪙, ou Charme Chroma pour un shiny | Correct |

**Conséquence de design** : pour un joueur qui a 146/146 cartes, 100 % des
tirages sont des doublons — donc son gameplay quotidien entier repose sur une
ressource dont l'interface ne dit rien. Rendre le doublon lisible (compteur +
pity estimé) est la clé du contenu end-game **sans toucher au backend**.

## 3. Progression et gating (le squelette de rétention)

Le jeu enchaîne des déblocages bien pensés, mais **invisibles hors de leur page** :

```text
1 Pokémon de base ─────────► Spin débloqué
6 Pokémon (équipe) ────────► Arènes jouables
battre arène N ────────────► arène N+1
8 badges ──────────────────► Ligue des 4
120 cartes standards uniques ► Échanges
```

Chaque jalon est un objectif naturel que le jeu n'énonce jamais en amont. La
refonte peut les transformer en **prochains pas affichés** sur le hub (« plus
que 2 Pokémon pour ta première équipe », « 87/120 cartes avant les échanges »),
sans nouvelle mécanique — juste en calculant côté front à partir de l'état du
compte.

## 4. Économie : générosité réelle, générosité invisible

- **Revenus** : ~115–185 🪙/jour passifs (bonus + entraînement + espérance
  jackpot) = 11–18 tirages/jour. C'est généreux — mais **jamais présenté comme
  tel** (le bonus quotidien est muet).
- **Le choc des biomes** : 10 🪙 le tirage standard vs 50–300 🪙 le tirage ciblé
  (×5 à ×30). Défendable en fin de complétion (cibler les dernières cartes doit
  coûter), mais **perçu comme punitif** tant que le Guide annonce 0 et qu'aucune
  aide ne dit *quand* un tirage biome vaut son prix.
- **La double peine de l'équipe** : la carte sacrifiée est perdue **et** son
  retrait coûte 10 🪙. Sunk cost classique. Bien exposé (pool visible, rappel
  permanent), ce pari devient une **mécanique stratégique assumée** (curer sa
  collection avant de lancer la roulette d'équipe) plutôt qu'une frustration.
- **Le tournoi est le seul « achat » toujours rentable** (mise 20 🪙, cagnotte
  doublée par la maison) — jamais présenté ainsi.

## 5. Tension et suspense : le théâtre existant

Le jeu a un vrai sens de la mise en scène, à préserver et généraliser :

- **Roulette** : décélération `cubic-bezier`, jitter, ticks sonores calés carte
  par carte sur la courbe d'animation.
- **Jauge de duel** : l'aiguille ralentit ×5 à l'approche du seuil, battement de
  cœur sonore, silence brutal au franchissement (défaite). C'est le meilleur
  moment de tension du jeu.
- **Jackpot** : arrêts de rouleaux décalés de 700 ms — le suspense classique du
  « presque ».
- **Capture légendaire (ligue)** : fausse jauge « buguée » qui se rétracte avant
  la Pokéball — le sommet actuel de mise en scène.

**Problème** : ce savoir-faire est cantonné aux combats. La boucle quotidienne
(tirage, jackpot) n'en bénéficie pas assez, et rien n'escalade selon l'enjeu.

## 6. Le rythme émotionnel d'une semaine type

```text
Lun 00:00  ▲ pic  — triple reset (arène/échange/Spin) + ouverture inscriptions
Mar 12:00  │       clôture inscriptions, gel des rosters
Mer        ▼ creux — affinage d'équipe possible mais rien d'imposé
Jeu 12:00  ▲▲ PIC — tournoi + ligue : la meilleure session du jeu (10-20 min)
Jeu 15:00  ▲       bannière du vainqueur
Ven→Dim    ▼▼ VIDE — plus aucune échéance : le week-end, quand les joueurs ont
                    du temps, est la zone la plus creuse
```

La refonte ne peut pas créer de nouvelle mécanique serveur, mais elle peut
**combler le creux** en faisant du week-end la « préparation du lundi » (revoir
les replays du jeudi, bilan de la semaine, plan des resets du lundi) — du
contenu de rétention à partir de données déjà exposées.

## 7. Ce que la refonte doit préserver du gameplay

1. Le pari destructif de l'équipe (identité « tout est roulette ») — mais
   **outillé** (pool visible, rappels).
2. La transparence des probabilités (estimations partout).
3. Le rythme des quotas quotidiens/hebdomadaires.
4. Le théâtre de suspense — **généralisé** à la boucle quotidienne.
5. Le tournoi comme sommet social hebdomadaire et son anti-spoiler.

## 8. Ce que la refonte débloque sans backend

- Un **end-game visible** : chasse aux shiny chiffrée, course au score en delta,
  fil social des trouvailles de la communauté.
- Un **onboarding** de la boucle cœur (le seul funnel d'activation actuel est la
  curiosité).
- Une **horloge** du jeu (hub + cooldowns unifiés).
- Une **économie lisible** (bonus célébré, coût des biomes honnête, sources de
  coins reliées aux impasses « pas assez de coins »).
