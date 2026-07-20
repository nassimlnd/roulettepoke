# Système d'animation

> Distillation du rapport `docs/experts/05-motion-designer.md`. Principe : le jeu
> a déjà un **théâtre** (roulette réglée, jauge à ralenti, capture, ticks calés) ;
> il lui manque un **système**. On ne jette rien — on nomme, on budgète, on rend
> désactivable, et on donne une escalade lisible. Animations `transform`/`opacity`
> prioritaires, cible ≥ 55 fps sur mobile milieu de gamme.

## 1. Personnalité — « casino chiptune », 3 registres disciplinés

| Registre | Exprime | Où | Interdits |
| --- | --- | --- | --- |
| **Mécanique** (socle crédible) | poids, inertie, freinage | roulette, rouleaux, aiguille, count-up | rebonds cartoon |
| **Arcade** (retour d'action) | punch tactile 8-bit | clic Lancer, ticks, pops, toggles, toasts | lenteur, easing mou |
| **Magique** (récompense) | rareté, dopamine | révélation épique+, plein écran, shiny, capture | être présent au repos, s'empiler |

**Règle d'or** : la machine est crédible, le retour est punchy, la magie est
rare. **Un seul élément qui brille en animation au repos par écran** (le shimmer
du shiny est la seule exception permanente).

## 2. Tokens

### Courbes (`--ease-*`, 6 max, aucune `cubic-bezier` codée ailleurs)

| Token | Valeur | Rôle |
| --- | --- | --- |
| `--ease-snap` | `cubic-bezier(0.2,0,0,1)` | **défaut** 90 % des micro-animations |
| `--ease-spin` | `cubic-bezier(0.15,0.85,0.35,1)` | **la courbe roulette existante, préservée** |
| `--ease-brake` | `cubic-bezier(0.6,0,0.1,1)` | freinage sec (rouleaux slot) |
| `--ease-bounce` | `cubic-bezier(0.34,1.56,0.64,1)` | overshoot de récompense (carte, badge) |
| `--ease-drift` | `cubic-bezier(0.37,0,0.63,1)` | boucles lentes (shimmer, halo) |
| `--ease-recoil` | `cubic-bezier(0.5,-0.4,0.2,1)` | sursaut de l'aiguille au seuil |

### Durées (`--dur-*`, échelle courte + constantes scriptées)

`--dur-instant` 75 ms · `--dur-fast` 150 ms · `--dur-base` 300 ms · `--dur-slow`
600 ms.

Moments longs (constantes d'auteur, budgétées) : `--spin-duration` 4000 ms
(préservé) · `--reel-fast/decel` 2200/1400 · `--reel-stagger` 700 · `--cascade-stagger`
550 · `--capture-sequence` ~6000 · `--gauge-suspense` 2500–6000 · `--celebrate-legendary`
~2500 · `--celebrate-shiny` ~3000.

**Budget par événement** (avant relance possible, skip compris) : commun ≤ 4,8 s ·
rare ≤ 5,0 s · épique ≤ 5,5 s · légendaire ≤ 6,7 s · shiny ≤ 7,2 s. Skip dès 2 s
⇒ plafond ressenti ≤ 1 s après skip, à toute rareté.

## 3. Le principe fondateur : « l'anticipation appartient au serveur »

Le résultat est connu à la milliseconde 0 (résolution serveur). Donc :

1. **Rien ne bloque** — `POST /roll` et `GET /roll/preview-batch` en parallèle,
   puis mise en scène ; si le réseau traîne, c'est le skeleton du bouton qui
   patiente, pas l'animation.
2. **Le suspense est budgété** — on décide combien de secondes de tension
   l'événement mérite (dilatation volontaire : jauge ×5, arrêts décalés).
3. **Le temps mort est du préchargement masqué** — les 4 s du spin préchargent
   les 20 sprites de la bande (fin des pop-in, résout une partie de M3).
4. **Tout est skippable sans tricher** — sauter = afficher un résultat déjà
   déterminé ; aucun avantage.

## 4. Comportement `prefers-reduced-motion` (règle unique)

*Le jeu reste jouable ET lisible sans mouvement.* Toute translation/scale/rotation
> 200 ms devient un **crossfade d'opacité** ou un **état statique**, et
l'information portée par le mouvement est **doublée par du texte/de la couleur**
(le résultat, le %, le ✅/❌, le « NOUVELLE » restent présents). Le **mode éco**
(`prefers-reduced-motion` OU `saveData` OU `deviceMemory ≤ 4`) applique la même
règle. Exemples : roulette → crossfade 600 ms vers le résultat ; jauge → affichage
direct du % + résultat + log ; jackpot → grille finale + surbrillance statique.

## 5. Inventaire réglé (extrait — table complète dans le rapport 05 §2)

Convention : Déclencheur · Durée · Easing · Intention · Reduced-motion.

| Moment | Durée / easing | Reduced-motion |
| --- | --- | --- |
| Transition de route | 150/200 ms `--ease-snap`, fade + translateY 4px | crossfade 100 ms |
| Ouverture overlay | 200 ms, panneau `--ease-bounce` léger | opacity seul |
| Apparition carte (grille/résultat) | 300 ms `--ease-snap`, stagger | fade statique |
| Clic Lancer | 75 ms `--ease-snap`, press | changement d'état instantané |
| Roulette (3 actes) | 4000 ms `--ease-spin`, ticks calés carte par carte | crossfade 600 ms vers résultat |
| Jauge de duel | 2500–6000 ms, ralenti ×5 au seuil + **micro-tremblements** + **couperet au franchissement** (`--ease-recoil`) | résultat direct + log, % annoncé |
| Rouleaux slot | 2200+1400 ms, arrêts décalés 700 ms `--ease-brake` | grille finale + glow statique |
| Multi-roll ×5 | cascade 550 ms | résultats listés directement |
| Capture légendaire | ~6000 ms, 8 temps | séquence réduite, résultat + log |

## 6. Hiérarchie de célébration — 7 niveaux (tue le « tout se ressemble »)

Un axe unique ; les 5 paliers de révélation de tirage s'y branchent, tous les
autres événements s'y rangent. **Ce qui distingue les niveaux n'est PAS le nombre
de particules** (plafonné dès N5 pour la perf) mais la combinaison **durée × son ×
ancrage (inline→overlay→plein écran) × droit d'interruption**. Un joueur doit
distinguer un N2 d'un N6 **les yeux fermés**, à l'oreille (2 notes vs fanfare
longue — la synthèse existante fournit déjà l'échelle).

| Niveau | Événements | Son | Durée | Plein écran | Action suivante |
| --- | --- | --- | --- | --- | --- |
| **N1 — Micro-feedback** | toggle, vente unitaire, débit, marquer lu | tick ou rien | ≤ 200 ms | non | aucune (UI réactive) |
| **N2 — Gain routine** | tirage commun, **doublon**, +coins, entraînement | arpège 2 notes | ~700 ms | non | Lancer réactif < 1 s |
| **N3 — Progression** | rare neuf, **nouvelle carte**, palier collection | arpège 4 notes | ~900 ms | non | relance ; « NOUVELLE » en coin |
| **N4 — Réussite notable** | épique neuf, **badge**, fusion, victoire de combat | arpège 6 notes | ~1,4 s | non (12 particules localisées) | overlay fermable / auto 2,5 s |
| **N5 — Événement majeur** | **légendaire**, jackpot notable, victoire de **ligue** | fanfare 7 notes | ~2,5 s | oui (confetti plafonné or) | Continuer + Partager / auto 4 s |
| **N6 — Événement rare** | **shiny**, jackpot légendaire, capture réussie, **8ᵉ badge** | fanfare longue | ~3 s | oui (2 couches, même plafond) | Continuer + Partager, pas d'auto-dismiss |
| **N7 — Exceptionnel** | **shiny légendaire**, **victoire de tournoi**, **complétion** 146/146 | fanfare la plus longue | ~3,5–4 s | oui (or + argent, podium/couronne) | Continuer + Partager + 1 action de suite (seul niveau qui redirige) |

## 7. Technique

- **Répartition** : CSS pur pour l'**état** (hover, focus, toggles), **WAAPI**
  pour les séquences annulables (célébrations, capture), **JS rAF** pour la
  physique et la synchro son (roulette, count-up, particules).
- **60 fps mobile** : `transform`/`opacity` uniquement (jamais layout/paint),
  `will-change` **discipliné** (posé juste avant, retiré après), pas de layout
  thrash, confetti **plafonné** (120 desktop / 60 mobile).
- **Son piloté par l'animation** (jamais l'inverse) : l'animation émet les
  événements (`tick`, `reel-stop`, `celebrate`), `useSound` réagit ; volume/mute
  réglables (m10) et coupés sous préférence.
- **Skip** : tout segment > 2 s est skippable (clic/tap/Escape) → affichage
  instantané du résultat déjà déterminé.

## Recommandations motion (rappel — détail dans le rapport 05)

- **RM1** [P0] : tokeniser les 25 keyframes (6 easings, échelle de durées) +
  interrupteur `reduced-motion` unique.
- **RM2** [P0] : escalade de révélation à 5 paliers, **ramenée dans le viewport**
  (résout C1 + M1), verbalisant nouveauté vs doublon.
- **RM3** [P1] : hiérarchie de célébration à 7 niveaux.
- **RM4** [P1] : jauge de duel enrichie (micro-tremblements, couperet au seuil).
- **RM5** [P1] : budget technique 60 fps + contrat son/motion + réglages.
