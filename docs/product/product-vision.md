# Vision produit — refonte PokeRoulette

> Synthèse issue des audits produit (`docs/experts/01`) et UX (`docs/experts/02`),
> ancrée dans les faits de `docs/audit/*`. L'API et les règles métier ne changent
> pas : la refonte est un **écrin narratif** pour un jeu déjà solide, pas un
> remake.

## Ce qu'est PokeRoulette (positionnement réel)

Un **jeu gacha de collection Pokémon entre amis** (~30 joueurs, Kanto/gén 1),
dont la valeur n'est pas la nouveauté mécanique mais la **combinaison rare** :
une boucle hebdomadaire compétitive saine (tournoi à 16 inscrits, cagnotte
doublée par la maison, anti-spoiler du jeudi), une transparence totale des
probabilités (estimations de combat partout, table du jackpot, taux shiny
affichés), et une personnalité française complice (classement des tricheurs,
anecdotes, 😅 sur les doublons). C'est un **jeu social à échelle humaine** où la
rétention est contagieuse : la masse critique du tournoi est l'actif n°1.

## Le problème central : un bon jeu qui ne se raconte pas

Le diagnostic convergent des deux audits tient en une phrase :

> **Le gameplay est riche côté serveur, mais l'interface ne le raconte pas.**

- Le moment de récompense — cœur d'un gacha — est **hors écran** (la carte
  gagnée s'affiche sous la ligne de flottaison).
- Toutes les raretés partagent **la même célébration** : un shiny 1/500
  ressemble à un commun.
- Le **doublon**, ressource centrale (pity shiny, fusion, échanges, pool
  d'équipe) et 100 % des tirages d'un joueur avancé, n'a **aucun feedback**.
- L'**end-game réel** (course au score à 1 shiny d'écart au sommet, chasse aux
  ~100 shiny restants) existe dans les données mais n'est adressé nulle part :
  un joueur 8/8 badges voit cinq écrans qui disent « revenez plus tard ».
- L'**état du jeu est invisible** : 3 quotas quotidiens + 5 échéances
  hebdomadaires vivent chacun sur leur page, sans agenda ni compte à rebours
  homogène.
- Le **contrat de confiance** est entamé (le Guide annonce des tirages biome
  « sans surcoût » alors qu'ils coûtent 50–300 🪙).

## Vision cible : rendre visible ce qui est déjà là

La refonte poursuit **un seul objectif produit** : que chaque geste du joueur
produise une réponse lisible, satisfaisante et orientée vers le pas suivant.
Décliné en quatre promesses :

1. **Chaque tirage paie.** Le résultat est dans le viewport, célébré à la hauteur
   de sa rareté, et même un doublon dit quelque chose (« ta chance shiny sur
   cette carte vient de monter »).
2. **Le jeu a une horloge lisible.** Un hub « Aujourd'hui / Cette semaine »
   remplace la chasse aux quotas sur cinq pages ; tous les cooldowns parlent la
   même langue.
3. **Il y a toujours un prochain pas.** De l'onboarding J1 (aujourd'hui
   inexistant) à l'end-game (aujourd'hui muet), le jeu propose un objectif adapté
   à l'état du compte — sans jamais inventer de récompense que l'API ne donne pas.
4. **Le produit inspire confiance.** Le Guide dit la vérité, les chiffres sont
   cohérents, aucune erreur technique brute n'atteint le joueur, et aucune
   destruction d'inventaire n'arrive par accident.

## Émotion cible

Le jeu doit transmettre **l'excitation contenue d'une ouverture de booster entre
amis** : l'attente délicieuse avant la révélation, la fierté d'une trouvaille
qu'on a envie de montrer, la petite rivalité amicale du classement. Pas
l'agitation anxiogène d'un casino — le suspense est au service de la
collection et du lien social, jamais de la dépense.

## Ce qui ne change pas (non négociable)

Les forces identifiées dans `frontend-issues.md` sont préservées et sublimées,
pas réinventées :

- le **théâtre de suspense** (jauges ralenties, battement de cœur, arrêts
  décalés du jackpot, flip de révélation) ;
- la **résolution serveur + rejeu client** (anti-triche sain) ;
- l'**anti-spoiler du tournoi** (« Mon parcours ») ;
- les **estimations de probabilité** affichées partout ;
- le **son chiptune synthétisé** (zéro asset) ;
- la **personnalité française drôle** et la pédagogie par modales d'intro.

## Indicateurs de succès (proxys, communauté de 30 joueurs)

Sans analytics lourde, la réussite se mesure à des signaux observables :

- **Activation J1** : un compte neuf fait ≥ 5 tirages et visite collection +
  équipe lors de sa première session (aujourd'hui : rien ne l'y amène).
- **Rétention quotidienne** : les 3 quotas gratuits (entraînement, jackpot,
  bonus) sont consommés par les joueurs actifs (aujourd'hui souvent oubliés).
- **Vitalité end-game** : les joueurs 8/8 badges continuent de tirer (chasse
  shiny rendue visible) plutôt que de faire 3 clics et partir.
- **Confiance** : zéro divergence Guide/app ; aucun message d'erreur technique
  remonté par les joueurs.
- **Le « feel »** : validation qualitative par une beta fermée de la communauté
  avant bascule (cf. `docs/technical/migration-plan.md`).
