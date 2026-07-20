# 05 — Expert Motion Designer : système d'animation de la refonte

> Base : `docs/audit/ui-inventory.md` (« Système d'animation », 25 keyframes ;
> « Système sonore » chiptune), `existing-features.md` (roulette 4 s, jauge
> tachymètre, slot, capture, multi-roll), `states-inventory.md` (hiérarchie de
> succès PLATE), `frontend-issues.md` (C1 résultat sous le fold, M5 aucun
> `prefers-reduced-motion`). Langage UI : `03-ui-designer.md` (§2.7 tokens motion
> `--motion-*`, composants `RollResultReveal`/`DuelGauge`/`SlotMachine`/
> `CaptureSequence`). Moteurs : `06-frontend-nuxt.md` (`useRouletteEngine`,
> `useSound`, `useCelebration`, store `preferences`). Perf mobile :
> `08-responsive-mobile.md` (mode éco auto, ≥55 fps pendant le spin, overlays
> plein écran). Captures : `artifacts/screenshots/home|slot-machine|tournament`.
>
> **Note d'alignement** : `04-creative-designer.md` n'existe pas dans les
> artefacts — le territoire visuel est donc repris de `03-ui-designer.md`
> (palette `night`/violet, rareté `rarity-*`, or discipliné réservé à l'économie
> et au légendaire, « un seul élément qui brille au repos »). Ce document
> **ne réinvente pas** le théâtre existant : il le tokenise, le budgète, le rend
> désactivable et lui donne une escalade lisible. Rien de ce qui marche (courbe
> de roulette, ticks calés, arrêts décalés, battement de cœur, capture) n'est
> jeté ; tout est rangé.

---

## 0. Synthèse

Le jeu possède déjà un **théâtre** rare pour un jeu web : 25 keyframes, une
courbe de roulette réglée au feeling (`cubic-bezier(0.15,0.85,0.35,1)`), des
ticks sonores résolus par inversion de Bézier, une jauge qui ralentit ×5 au
seuil sur un battement de cœur, des rouleaux décalés de 700 ms, une capture
scriptée en 8 temps. Le problème n'est pas l'absence de mouvement, c'est
**l'absence de système** : rien n'est nommé, rien n'est budgété, rien n'est
désactivable (M5 : 0 occurrence de `prefers-reduced-motion`), et le sommet
émotionnel — le résultat d'un tirage — tombe **sous la ligne de flottaison**
(C1) avec le même gabarit pour un Rattata et un shiny 1/500 (M1, hiérarchie
PLATE).

Ce système répond par quatre décisions :

1. **Une personnalité tenue** — « casino chiptune » : la machine est
   *mécanique* (poids, inertie, décélération), le retour d'action est *arcade*
   (pops, snaps, ticks calés au son 8-bit), la magie est *rare* (halos,
   particules réservés aux vraies récompenses). Tokens d'easing et de durée
   nommés, une seule échelle.
2. **L'anticipation appartient au serveur** — le résultat est déjà connu à la
   milliseconde 0. Tout le suspense est de la **mise en scène** : on le budgète,
   il ne bloque jamais, il est toujours skippable, et le temps mort sert à
   précharger.
3. **Une escalade précise** — 5 paliers de révélation de tirage
   (commun→shiny), et au-dessus une **hiérarchie de célébration à 7 niveaux**
   qui couvre tout le jeu (vente → victoire de tournoi) et tue le « tout se
   ressemble ».
4. **Un budget technique** — CSS pour l'état, WAAPI pour les séquences
   annulables, rAF pour la physique et la synchro son ; `will-change` discipliné,
   confetti plafonné, mode éco auto, et un contrat où **l'animation pilote le
   son**, jamais l'inverse.

---

## 1. Principes

### 1.1 Personnalité du mouvement — « casino chiptune », trois registres

Le mouvement n'est ni purement mécanique, ni purement magique, ni purement
arcade : c'est un **assemblage discipliné des trois**, chacun avec un territoire
strict. C'est ce qui empêche le jeu de virer soit au sérieux froid, soit à la
fête foraine où tout clignote (le défaut de la collection actuelle, cf.
`collection-desktop.png`, R10 du UI designer).

| Registre | Ce qu'il exprime | Où | Vocabulaire de mouvement | Interdits |
| --- | --- | --- | --- | --- |
| **Mécanique** (le socle crédible) | Poids, inertie, une vraie machine qui tourne et freine | Roulette, rouleaux du slot, aiguille de la jauge, count-up des compteurs | Décélération longue, freinage, overshoot d'arrêt, jamais de départ instantané | Rebonds cartoon, élastique |
| **Arcade** (le retour d'action) | Réactivité, punch, plaisir tactile 8-bit | Clic Lancer, ticks, pops de carte, snaps de toggle, badges, toasts | Snap 75–200 ms, overshoot léger, calé sur le son square-wave | Lenteur, easing mou, délai perceptible |
| **Magique** (la récompense) | Rareté, exceptionnalité, dopamine | Révélation épique+, célébrations plein écran, shiny, capture | Halos, rayons, particules, shimmer, star-burst, léger slow-mo | Être présent au repos, être fréquent, s'empiler |

**Règle d'or** : *la machine est crédible, le retour est punchy, la magie est
rare.* Corollaire (repris de 03 §2.5) : **un seul élément qui brille en
animation au repos par écran** — le shimmer permanent du shiny est la seule
exception permanente autorisée. Tout le reste de la magie est **transitoire**
(déclenché, joué, retiré du DOM).

### 1.2 Courbes standard nommées (`--ease-*`)

Six courbes, pas plus. Elles couvrent 100 % des besoins et se lisent dans le
code. Déclarées dans `@theme`, consommées partout — **aucune `cubic-bezier`
codée en dur ailleurs** (règle de lint, cf. RM1).

| Token | Valeur | Registre | Rôle | Exemples |
| --- | --- | --- | --- | --- |
| `--ease-snap` | `cubic-bezier(0.2, 0, 0, 1)` | Arcade | **Défaut** de 90 % des micro-animations : entrées UI, pops, fades, hovers | apparition de carte, toast, badge navbar, tooltip |
| `--ease-spin` | `cubic-bezier(0.15, 0.85, 0.35, 1)` | Mécanique | Inertie de machine, décélération longue — **la courbe roulette existante, PRÉSERVÉE au pixel** | bande de roulette, offset final |
| `--ease-brake` | `cubic-bezier(0.6, 0, 0.1, 1)` | Mécanique | Freinage plus sec qu'un spin : arrêt de rouleau, claquement | rouleaux du slot, snap d'arrêt |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Arcade/Magique | Overshoot de récompense : « ça atterrit » | carte gagnante au centre, badge obtenu, jauge qui se pose (victoire), toast de gain |
| `--ease-drift` | `cubic-bezier(0.37, 0, 0.63, 1)` | Magique | Sinusoïdal doux, boucles lentes permanentes | shimmer shiny, respiration d'un halo, rayons de fond, skeleton |
| `--ease-recoil` | `cubic-bezier(0.5, -0.4, 0.2, 1)` | Mécanique/tension | Anticipation + recul sec : la « cogne » | sursaut de l'aiguille au franchissement du seuil, échec de capture |

`linear` reste utilisé **uniquement** là où la physique est calculée en JS (rAF)
et non déléguée à une courbe : count-up de compteurs, particules de confetti,
défilement continu d'un rouleau avant décélération.

### 1.3 Échelle de durées (`--dur-*`) + moments longs scriptés

Quatre pas courts (la demande : 75/150/300/600) pour toute l'UI, plus une table
de **constantes scriptées** pour les moments longs — ceux-ci ne sont pas sur
l'échelle, ce sont des durées d'auteur, budgétées une par une (§1.4).

| Token | Valeur | Usage |
| --- | --- | --- |
| `--dur-instant` | **75 ms** | Retour tactile : `active`/press, flash de tick visuel, changement d'état de bouton |
| `--dur-fast` | **150 ms** | Défaut UI : pops, hover, toggle, fade court, focus ring |
| `--dur-base` | **300 ms** | Entrées d'éléments, transition de vue, détachement de la carte gagnante, count-up court |
| `--dur-slow` | **600 ms** | Révélation inline, halo transitoire, count-up d'un gros gain, crossfade reduced-motion de la roulette |

**Moments longs scriptés** (constantes, jamais interpolées à la légère) :

| Constante | Durée | Notes |
| --- | --- | --- |
| `--spin-duration` | **4000 ms** | Roulette (préservé). En reduced-motion → `--dur-slow` crossfade (600 ms) |
| `--reel-fast` / `--reel-decel` | **2200 / 1400 ms** | Slot : phase rapide + décélération par rouleau |
| `--reel-stagger` | **700 ms** | Décalage d'arrêt entre rouleaux → dernier rouleau arrêté à ~5000 ms |
| `--cascade-stagger` | **550 ms** | Décalage de départ entre les 5 bandes du multi-roll |
| `--capture-sequence` | **~6000 ms** | Capture légendaire, 8 temps scriptés |
| `--gauge-suspense` | **2500–6000 ms** | Jauge de duel : variable, dilaté ×5 dans la zone d'approche du seuil |
| `--celebrate-legendary` | **~2500 ms** | Plein écran légendaire (3 actes) |
| `--celebrate-shiny` | **~3000 ms** | Plein écran shiny (3 actes + slow-mo) |

**Budget total par événement** (temps avant que le joueur puisse relancer, skip
compris) : commun ≤ 4,8 s · rare ≤ 5,0 s · épique ≤ 5,5 s · légendaire ≤ 6,7 s ·
shiny ≤ 7,2 s. Skip disponible dès que le segment dépasse 2 s (§4.4) → le
plafond *ressenti* pour un joueur pressé est **≤ 1 s après le skip**, à toute
rareté.

### 1.4 « L'anticipation appartient au serveur »

Le jeu résout tout côté serveur puis rejoue côté client (force n°2 de l'audit,
anti-triche sain). **Conséquence motion capitale : à la milliseconde 0 d'une
animation, le résultat est déjà connu.** Le suspense n'est donc jamais un
calcul en cours — c'est une **mise en scène d'un fait acquis**, un mensonge
honnête. Quatre règles en découlent :

1. **Rien ne bloque.** Aucune animation n'attend une réponse réseau *pendant*
   qu'elle joue. On lance `POST /roll` **et** `GET /roll/preview-batch` en
   parallèle (cf. 06 §`useRouletteEngine`), puis on met en scène. Si le réseau
   traîne, c'est le *skeleton* du bouton qui patiente (§2.16), pas l'animation.
2. **Le suspense est budgété, pas improvisé.** Puisqu'on connaît la fin, on
   décide combien de secondes de tension elle mérite (table §1.3). On dilate le
   temps *volontairement* (jauge ×5, arrêts décalés) — c'est du théâtre, pas de
   la latence subie.
3. **Le temps mort est du préchargement masqué.** Les 4 s du spin, les 550 ms
   de cascade, les rayons d'anticipation d'un légendaire : autant de fenêtres
   pour `new Image()` les 20 sprites de la bande et décoder les assets de la
   célébration à venir. Le joueur ne voit jamais un pop-in (résout une partie de
   M3 sur la home).
4. **Tout est skippable sans tricher.** Sauter l'animation = afficher
   instantanément un résultat *déjà déterminé* (§4.4). Aucun avantage, aucune
   dérive : le skip est un droit, pas un exploit.

---

## 2. Inventaire réglé

Convention des colonnes : **Déclencheur · Durée · Easing · Intention · Éléments ·
Reduced-motion**. Le comportement reduced-motion suit un principe unique — *le
jeu reste jouable ET lisible sans mouvement* : toute translation/scale/rotation
> 200 ms devient un **crossfade d'opacité** ou un **état statique**, et
l'information portée par le mouvement est **doublée par du texte/de la couleur**
(le résultat, le %, le ✅/❌, le « NOUVELLE » restent tous présents). Le mode
éco (08 : `prefers-reduced-motion` OU `saveData` OU `deviceMemory ≤ 4`) applique
la même colonne.

### 2.1 Transitions de pages / vues Nuxt

| Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Changement de route (`<NuxtPage>`) | 150 ms sortie / 200 ms entrée | `--ease-snap` | Continuité sans distraction — le jeu est un **hub**, pas un livre : pas de slide directionnel | `fade` + `translateY(4px→0)` sur le `<main>` uniquement (header/nav fixes) | Crossfade opacité seul, 100 ms |
| Ouverture d'overlay (UModal/USlideover/UDrawer) | 200 ms | `--ease-snap` (fond) / `--ease-bounce` léger (panneau) | Le panneau « arrive » ; le fond recule | backdrop `opacity 0→0.6` ; panneau `scale 0.96→1` + `opacity` (drawer : `translateY`) | `opacity` seul, pas de scale/translate |
| Fermeture d'overlay | 150 ms | `--ease-snap` | Sortie nette | inverse | `opacity` seul |
| Bottom-tab-bar : changement d'onglet actif | 150 ms | `--ease-snap` | Feedback d'onglet | indicateur actif glisse (`translateX`) + icône `scale 1→1.1→1` | pas de glisse ; changement de couleur instantané |

Remplace les keyframes `fadeIn` / `fadeInUp` / `modalScale` existantes (rangées
sous ces tokens).

### 2.2 Apparition des cartes (bande, grille, résultat)

| Contexte | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| **Grille collection** (302 cartes) | 300 ms, **stagger 20 ms plafonné au 1ᵉʳ viewport (~20 cartes)** | `--ease-snap` | Vie sans coût : les cartes hors écran n'attendent pas 302×20 ms | `opacity 0→1` + `translateY(8px→0)` ; au-delà du 1ᵉʳ viewport, apparition via `IntersectionObserver` au scroll (fade 150 ms), aligné virtualisation 03/06 | Tout instantané, 0 stagger |
| Carte dans la bande de roulette | — | — | Les cartes n'apparaissent pas une à une : elles **défilent** (§2.4) | strip pré-construite, `translate3d` | idem (crossfade §2.4) |
| Carte-résultat (inline commun/rare) | 300 ms | `--ease-bounce` | La récompense « se pose » au centre du regard | voir §2.5 | scale→fade, apparition directe |
| Détail de carte (drawer mobile / hover desktop) | 150 ms | `--ease-snap` | Consultation | `scale 0.98→1` + `opacity` | `opacity` |

Le halo « nouvelle découverte » (`rainbow-border` actuel) est retravaillé en
§2.6 (il n'est aujourd'hui « pas lisible, pas de texte » — states-inventory).

### 2.3 Validation d'une action (clic « Lancer »)

| Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| `pointerdown` sur Lancer | 75 ms | `--ease-snap` | Retour tactile immédiat, **avant** toute réponse réseau | bouton `scale 1→0.97` | conservé (75 ms, sous le seuil 200 ms) |
| `pointerup` / commit | 150 ms | `--ease-bounce` | Confirme l'engagement | bouton `scale→1` + flash de bordure violette ; `useSound.resume()` armé ici (1ᵉʳ geste, autoplay) | scale conservé (court) |
| Débit optimiste des coins | 400 ms | `linear` (rAF) | Le coût « part » du solde | `CoinCounter` count-down `200→190`, tabular-nums (03 §2.3) ; `aria-live` | count-down remplacé par set direct + `aria-live` |
| Passage en état « spinning » | — | — | Verrouille l'UI (anti double-clic, force n°8) | bouton `:loading`, filtres `disabled` `opacity-50` | identique |

Le bouton **ne se transforme jamais en spinner texte** (« ⚔️ Combat en
cours… ») : `UButton :loading` conserve la largeur (fin du layout shift, M3).

### 2.4 Tirage complet — les 3 actes (avec ticks sonores préservés)

Moteur : `useRouletteEngine` (06), pur rAF, `offsetPx` bindé sur
`transform: translate3d(-offset,0,0)`. Les ticks sont **dérivés du changement
d'index sous l'aiguille** (jamais d'un timer) → synchro parfaite conservée.

| Acte | Fenêtre | Courbe / dynamique | Intention | Son (`useSound`) | Éléments |
| --- | --- | --- | --- | --- | --- |
| **1. Lancement** | 0 → ~400 ms | Départ ferme mais non instantané (les premières frames de `--ease-spin` ont déjà de la vitesse) | La machine « prend » — poids | `tick()` rapides et rapprochés (vélocité haute → pitch aigu) | bande + aiguille ; léger *motion-blur* CSS optionnel (`filter: blur(0.4px)` sur la bande à haute vélocité, retiré à basse) |
| **2. Défilement** | ~400 → ~3200 ms | Vitesse décroît selon `--ease-spin` | Suspense qui se dilate | `tick()` qui **s'espacent** avec la vélocité (le moteur passe `velocity01` → pitch qui descend) — l'oreille *entend* le ralentissement | bande |
| **3. Atterrissage** | ~3200 → 4000 ms | Derniers pas très lents, **jitter ±40 px** (l'arrêt ne tombe jamais pile au centre) | Le « presque » — la carte hésite sous l'aiguille | derniers `tick()` isolés, très graves ; puis silence de ~120 ms avant la révélation | carte gagnante s'immobilise décalée puis se recale de quelques px (`--ease-bounce`, 200 ms) |

**Proposition d'amélioration (au-delà de l'existant)** : à l'acte 3, un
**« near-miss » scénarisé** — l'index sous l'aiguille dépasse la gagnante d'un
cran puis *recule* d'une carte pour se poser (offset final = winner + 1
puis retour). C'est gratuit (le résultat est connu, §1.4), ça ajoute 200 ms de
tension pure, et ça se coupe en reduced-motion. À réserver aux tirages **rare+**
(sur-jouer un commun fatigue).

**Reduced-motion** : `--spin-duration` → 600 ms de **crossfade** (la bande
apparaît floutée puis la carte gagnante se substitue par opacité), **pas de
jitter**, ticks réduits à un seul « clac » d'arrêt (08 : ticks coupés, garder
le clac final). Résultat identique, information intacte.

### 2.5 Révélation par niveau — escalade PRÉCISE (commun → shiny)

Composant `RollResultReveal` (03/06). **Grammaire commune à 3 temps** —
*Anticipation → Révélation → Couronnement* — chaque palier **ajoute un temps et
de la durée**, jamais un gabarit différent. C'est l'escalade qui rend un shiny
mémorable et un commun rapide. Ancrage : **toujours dans le viewport** (résout
C1) — inline au centre de la bande pour commun/rare, overlay pour épique+.

| Palier | Forme | Anticipation | Révélation | Couronnement | Durée | Son |
| --- | --- | --- | --- | --- | --- | --- |
| **Commun** | Inline (centre bande) | — | Carte se détache de la bande : `scale 1→1.08` + recentre, `--ease-bounce` 300 ms ; reste de la bande `opacity→0.15` (200 ms) | Texte « Vous avez obtenu » fade-up 150 ms ; **bordure neutre** (commun = aucune couleur, 03 §2.5) | **~700 ms** | arpège **2 notes** |
| **Rare** | Inline | Flash cyan bref derrière la carte (`halo scale 0.8→1.3, opacity 0.6→0`, 250 ms) | idem + bordure `rarity-rare` 2 px qui se **trace** (300 ms) | arpège 4 notes ; halo cyan doux le temps de l'affichage | **~900 ms** | arpège **4 notes** |
| **Épique** | Overlay carte (UModal non-fullscreen) | Backdrop `0→0.6` (200 ms) ; carte monte du bas `scale 0.6→1` `--ease-bounce` 400 ms | Bordure `rarity-epic` (fuchsia) tracée + halo 20 px | **1 burst localisé** : 12 particules fuchsia autour de la carte, 600 ms (**pas** plein écran) ; libellé « ÉPIQUE » en `display` | **~1400 ms** | arpège **6 notes** |
| **Légendaire** | Plein écran (UModal fullscreen) | **Acte 1 (0–800 ms)** : écran s'assombrit `0→0.85`, **rayons dorés** radiaux tournent lentement (`--ease-drift`), point de lumière central grandit, montée sonore | **Acte 2 (800–1400 ms)** : flash blanc-or `0→0.9→0` (400 ms), carte `scale 1.2→1` `--ease-bounce`, bordure `rarity-legendary` | **Acte 3 (1400–2500 ms)** : fanfare, **confetti doré plein écran plafonné** (§4.2), « LÉGENDAIRE ! » display 36 px, boutons Continuer/Partager | **~2500 ms** | fanfare **7 notes** |
| **Shiny** | Plein écran premium (le sommet) | **Acte 1 (0–1000 ms)** : idem légendaire, palette **argent-irisé** ; léger **slow-mo** (l'écran se fige un instant) | **Acte 2 (1000–1700 ms)** : **star-burst** argenté (réf. capture) + **shimmer conique** qui balaye la carte une fois | **Acte 3 (1700–3000 ms)** : fanfare variante shiny, **2 couches** de particules (confetti + étincelles), badge ✦, « ✦ SHINY ✦» ; la carte **conserve son shimmer permanent 6 s** (03 §2.5) | **~3000 ms** | fanfare **7 notes** (variante shiny) |

Un **shiny légendaire** (le cas 1/500 × 5 pts au classement, cf. game design)
cumule les deux territoires : palette **or + argent**, durée du shiny, c'est le
**niveau 7** de la §3 (le seul événement qui a le droit de proposer une action
de suite). `useCelebration.tierFor()` (06) mappe carte→palier.

**Reduced-motion (tous paliers)** : pas de scale/rayons/particules/slow-mo. La
carte apparaît **directement** (crossfade 200 ms) à sa place finale, avec sa
bordure de rareté, son libellé de rareté **en toutes lettres**, le texte
NOUVELLE/Doublon (§2.6) et le `aria-live`. Épique+ reste un overlay (pour ancrer
le regard, C1) mais **statique**. La fanfare, elle, peut rester (le son n'est pas
du mouvement) sauf si le joueur a coupé le son.

### 2.6 Nouvelle carte vs doublon

Le doublon est la **ressource centrale** du jeu (pity shiny, fusion, échanges,
score — game design §01) et il est aujourd'hui **silencieux** (states-inventory
⚠️). Il doit être *verbalisé*, pas seulement coloré.

| Cas | Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- | --- |
| **Nouvelle carte** | `result.isNew` | 500 ms | `--ease-bounce` | Fierté de progression | Tampon « ✦ NOUVELLE ! » qui **s'estampille** (`scale 1.4→1` + `rotate -6°→0`) en coin de carte ; halo arc-en-ciel (ex-`rainbow-border`) réduit à **un balayage unique** de 800 ms puis disparaît | Tampon apparaît sans scale/rotate ; halo remplacé par un liseré statique |
| **Doublon** | `qty > 1` | 300 ms | `--ease-snap` | Info utile, non punitive | Badge « ×N » pop (`cellPop`-like) + sous-texte contextualisé « Doublon (+1) · revendable 25 🪙 » ou « +1 vers la fusion (7/10) » | pop → apparition directe |

Règle : **jamais** de nouvelle carte et de doublon traités pareil ; le tampon
NOUVELLE est réservé à la vraie première obtention (une par carte, à vie).

### 2.7 Compte à rebours / cooldowns

Composant unique `CooldownBadge` (aligné 02 §m4/reco et 06 `useCountdown`) —
résout l'incohérence « ⏳ Déjà combattu » (sans heure) / « Revenez demain » /
« lundi dans Xj Xh ».

| Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Tick de seconde | — | `linear` | Vivant sans agiter | Le chiffre des secondes fait un `translateY(2px)` + fade de 120 ms (roll numérique léger), tabular-nums | Pas de roll : le texte se met à jour, point |
| Passage sous 10 s | 300 ms | `--ease-snap` | Signal d'imminence | Le badge passe en `warning`, pulse **une fois** (`scale 1→1.04→1`) | Changement de couleur seul |
| Expiration (`onExpire`) | 400 ms | `--ease-bounce` | « C'est dispo ! » | Le CTA verrouillé se **déverrouille** : `opacity 0.5→1`, cadenas → icône d'action, léger overshoot | Set direct de l'état actif |

Un seul `setInterval` global 1 s (06 `useCountdown`), en pause si onglet caché.

### 2.8 Jauge de duel — théâtre AUGMENTÉ

`DuelGauge` (SVG demi-cercle 200×110, arc vert = victoire sous le seuil, aiguille
rotative, `aria-live` sur le %). Le moteur d'aiguille + heartbeat vit en **rAF**
(synchro son/mouvement, §4.3). On **garde** le ralenti ×5 et le battement de
cœur ; on **ajoute** la tension mécanique demandée.

| Moment | Durée | Dynamique | Intention | Son | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- | --- |
| Balayage initial | 0 → ~1000 ms | Aiguille part vite, `--ease-spin` | La roue de la fortune | montée de tension + LFO (existant) | aiguille + arc | aiguille va directement à la valeur finale (300 ms) |
| **Zone d'approche** du seuil | dilatée ×5 (`--gauge-suspense`) | Aiguille **ralentit** en approchant | Suspense max | battement **LUB-dub 110→180 BPM** (existant) | aiguille | pas de ralenti (l'info = le résultat) |
| **Micro-tremblements** *(nouveau)* | continu dans la zone | Jitter d'aiguille **±0.4°**, amplitude ∝ proximité du seuil, **pic calé sur le “LUB”** du cœur (rAF partage l'horloge du heartbeat) | Tension mécanique palpable, l'aiguille « lutte » | (aucun son propre — c'est le cœur qui le porte) | aiguille + graduation | **coupé** |
| **Victoire** (s'arrête sous le seuil) | 400 ms | Aiguille **se pose** `--ease-bounce` (petit overshoot rassurant) | Soulagement | cœur s'arrête sur un accord résolu + win duel | seuil flashe **vert**, arc vert pulse 1× | aiguille set direct + arc vert + « ✅ » |
| **Sursaut au franchissement** *(nouveau, défaite)* | 250 ms | Au passage exact du seuil : `--ease-recoil` — l'aiguille **cogne** le seuil (recul 2° en 80 ms) puis franchit | Le couperet | **silence brutal** (existant) + petit « crack » | seuil flashe **rouge**, **shake du cadre** (`translate ±3px`, 150 ms), vignette rouge brève | **pas de shake/recoil** ; seuil rouge + « ❌ » + % |

**Capture légendaire — la « fausse jauge buguée »** (league/legendaryCapture) :
le trucage (le seuil se **rétracte** sous l'aiguille) est **conservé et
sur-joué** — avant de fuir, le seuil **« glitche »** (micro-sauts erratiques de
2–3 px pendant 400 ms, `--ease-recoil`) puis translate hors de portée. C'est le
seul endroit où l'on ment sur la mécanique *volontairement* ; le glitch prévient
inconsciemment que « quelque chose cloche », ce qui rend la trahison lisible.
Puis enchaînement sur la séquence pokéball (§2.14). Reduced-motion : le seuil
saute directement à sa position finale, texte « Le légendaire résiste… ».

### 2.9 K.O.

| Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Pokémon vaincu | 500 ms | `--ease-recoil` (chute) puis `--ease-snap` | Encaisser le coup | `pokemon-ko` (existant) : `translateY` + `rotate` de chute + désaturation `grayscale(1)` progressive ; `ko-label-appear` : « K.O. » tampon | Pas de chute/rotate : désaturation directe + tampon « K.O. » statique |
| Log de combat | 200 ms, stagger 80 ms | `--ease-snap` | Lisibilité du déroulé | `mini-log-appear` (existant) : lignes qui entrent une à une | Toutes les lignes d'un coup |

Ces keyframes existantes (`pokemon-ko`, `ko-label-appear`, `mini-log-appear`)
sont **conservées**, juste rangées sous les tokens et coupables.

### 2.10 Victoire / défaite de combat

| Cas | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Entrée des combattants | 400 ms | `--ease-bounce` | Présentation arcade | `fighter-enter` (existant) : les deux sprites glissent de leurs bords | Apparition directe |
| Victoire (badge, §2.11) | voir §3 N4/N5 | — | Récompense | escalade §3 | statique |
| Défaite | 600 ms | `--ease-snap` | Sobre, non punitif | Écran se désature 20 %, « 💀 Défaite » fade-in ; **conseil actionnable** (03/02 : « Renforce ta ligne 3 » + lien équipe) apparaît 200 ms après (ne pas noyer le verdict) | Désaturation → texte direct |

### 2.11 Badge obtenu

| Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Badge d'arène gagné | ~1200 ms | `--ease-bounce` | Jalon majeur (N4/N5, §3) | Badge `scale 0→1` avec overshoot + `rotate` d'atterrissage ; anneau doré qui se trace autour ; `BadgePips` : le pip vide correspondant s'**allume** (fill + flash) | Badge apparaît fini ; pip passe à l'état plein, sans trace |
| 8ᵉ badge (Champion de Kanto) | Célébration N6 (§3) | — | Fin d'arc | plein écran, voir §3 | statique |

### 2.12 Série multi-roll (×5)

| Moment | Durée | Dynamique | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Lancement de la série | départ décalé **550 ms** (`--cascade-stagger`) | Les bandes partent l'une après l'autre | Vague, montée collective | Desktop : 1 bande + **5 cartes-résultat en cascade** ; **Mobile : 1 seule bande, séquentiel** (03 m12, 06) | Toutes révélées d'un coup |
| Boucle rAF | — | **1 seule boucle partagée** pour les 5 (06) | Perf mobile | scheduler module-scope | idem |
| Révélation en cascade | 550 ms entre chaque | Chaque résultat se pose | Rythme | pop `--ease-bounce` par carte | apparition directe |
| **Célébration de série** | après les 5 | **UNE seule** célébration, du **palier le plus haut atteint** (§3) | **Ne PAS jouer 5 plein-écran d'affilée** — on batch : les 5 résultats en rangée, puis 1 apogée pour le meilleur | overlay du meilleur tier | résultats + libellés statiques |

« Où s'arrêter » : les 5 événements `card_choice` restent mis en file et résolus
**à la fin** (comportement existant préservé), la relance de la série suivante
n'est jamais bloquée par une animation en cours.

### 2.13 Jackpot (machine à sous)

`SlotMachine`/`SlotReel` — rouleaux en **rAF** (défilement vertical + arrêt),
glow gagnant = **le seul glow de l'écran** (03).

| Acte | Durée | Easing / dynamique | Intention | Son | Éléments |
| --- | --- | --- | --- | --- | --- |
| Rouleaux tournent | 2200 ms (`--reel-fast`) | `linear` (rAF), défilement rapide bouclé | La machine s'emballe | ticks aléatoires ~11/s ×3 (existant) | 3 bandes verticales |
| Décélération | 1400 ms (`--reel-decel`) | `--ease-brake` | Freinage | ticks qui s'espacent | par rouleau |
| **Arrêts décalés** | **+0 / +700 / +1400 ms** (`--reel-stagger`) | `--ease-brake` + **overshoot d'1 cellule** (le « claquement ») | Suspense ligne par ligne | **claquement d'arrêt** par rouleau (existant) | `reel-spin` → snap |
| Pause de tension | ~600 ms | — | « Alors ? » | silence | tout immobile |
| **Lignes gagnantes** | 500 ms | `--ease-snap` | Révéler le gain | `glow-multi` (alternance couleur) sur cellules + **tracé SVG** des lignes (`winner-pulse`) ; légendaire → **flip** de la cellule (réf. `roll-hidden-flip-reveal`) | overlay lignes + cellules |
| Fanfare | par lot | — | Récompense selon meilleur prix | fanfare par lot (existant) | — |

« Où s'arrêter » : le glow + tracé de ligne + flip **suffisent** pour un gain
courant ; **seul un légendaire jackpot** (≈0,5 %) déclenche le plein écran N6
(§3). Reduced-motion : rouleaux vont directement au résultat (crossfade), lignes
gagnantes = surbrillance statique + libellé du gain, pas de flip animé.

### 2.14 Capture légendaire

`CaptureSequence` — les **8 keyframes** existantes (`throw, shake, open,
sparkle, fail, star-burst, vanish, escape`) sont **conservées telles quelles**,
rangées sous tokens et rendues skippables après le lancer.

| Temps | ~Durée | Keyframe | Intention |
| --- | --- | --- | --- |
| Lancer | 500 ms | `throw` | Engagement (`--ease-recoil` sur l'arc de lancer) |
| Secousses ×3 | 3×600 ms | `shake` | **Le** suspense (chaque secousse = un « peut-être ») |
| Résolution | — | succès → `open` + `sparkle` + `star-burst` **(N6/N7)** · échec → `fail` + `vanish`/`escape` | Verdict |

Reduced-motion : pas de secousses ; affichage direct du verdict (étoiles
statiques ou « le légendaire s'est échappé »), fanfare/son conservés si son
activé. **Consolation à l'échec** (02) : même en reduced-motion, un lot de
consolation textuel apparaît (le pari perdu ne doit pas être un mur noir).

### 2.15 Célébrations plein écran — confetti / particules, et où s'arrêter

Réservé aux **niveaux 5–7** (§3). Règles strictes pour ne **jamais** ralentir la
relance :

- **Un seul `<canvas>`** confetti, plein écran, `position: fixed`,
  `pointer-events: none`, animé en **rAF** (physique de chute), **détruit et
  retiré du DOM** à la fin (aucun `will-change` résiduel, §4.2).
- **Plafond de particules** : 120 desktop / **60 mobile** (08 : mode éco).
  Monter en niveau **n'ajoute pas de volume** mais de la **variété** (N6/N7 :
  2ᵉ couche d'étincelles scintillantes, palette élargie) — jamais plus de
  particules simultanées.
- **La relance ne dépend jamais du confetti** : dès l'Acte 3, le bouton
  Continuer / Lancer est **actif** pendant que le confetti retombe. Fermer
  l'overlay tue le canvas immédiatement.
- **Slow-mo** (shiny/N7 uniquement) : ≤ 400 ms, purement visuel (aucune logique
  ralentie).
- Reduced-motion / éco : **aucun confetti ni particule** ; l'overlay reste (pour
  l'ancrage C1) mais statique — dégradé de rareté + carte + texte + fanfare.

### 2.16 Skeletons / chargements

Remplace tous les « Chargement... » nus (M3).

| Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Fetch de page | boucle 1500 ms | `--ease-drift` | Structure perçue, zéro layout shift | `USkeleton` reproduisant la grille finale (collection : rectangles-carte ; gyms : 3 panneaux ; leaderboard : lignes) ; **balayage** de gradient `translateX` | **Pas de balayage** : pulse d'opacité 0.6↔1 (2 s) ou bloc mat statique |
| Arrivée du contenu | 150 ms | `--ease-snap` | Substitution douce | Crossfade skeleton→contenu (`aspect-ratio` fixe sur `PokeCard` → pas de saut) | crossfade conservé (court) |
| Image de carte | — | — | Pas de pop-in | `loading="lazy"` + `width/height` réservés ; fade-in 150 ms au `load` | fade conservé (court) ou instant |

### 2.17 Toasts

`useToast()` global (03/06), survit à la navigation (M8).

| Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Apparition | 300 ms | `--ease-bounce` | Notification non bloquante | `translateY(-12px→0)` + `opacity` (desktop top-right / mobile top) ; empilement | `opacity` seul |
| Auto-dismiss | à 4 s, sortie 200 ms | `--ease-snap` | Éphémère | `opacity→0` + léger `translateY` | `opacity` |
| Toast de **gain** (vente, +coins, bonus quotidien) | 300 ms | `--ease-bounce` | Micro-récompense (N1/N2, §3) | icône `scale 1→1.15→1` + `CoinCounter` count-up synchronisé | pas de scale ; count-up → set direct |

### 2.18 Changement de manche / joueur (replays)

Replay de combat (`tournament-battle-replay.png` : « ROUND 1 / 11 », vitesse
×1/×2/×4, « Passer »). **Préservé** ; on tokenise et on lisse les transitions.

| Déclencheur | Durée | Easing | Intention | Éléments | Reduced-motion |
| --- | --- | --- | --- | --- | --- |
| Passage de manche | 300 ms | `--ease-snap` | Continuité du récit | Combattants sortants `fade + translate` vers leurs bords ; « ROUND n / N » se met à jour ; entrants via `fighter-enter` | Substitution directe (crossfade 100 ms) |
| Changement de joueur (bracket) | 200 ms | `--ease-snap` | Repère | En-tête « X vs Y » crossfade | idem |
| Multiplicateur de vitesse | — | — | Contrôle du joueur | ×1/×1.5/×2/×3 **scalent toutes les durées** du replay proportionnellement (persisté `replay_speed`) | s'applique aussi (les durées résiduelles sont déjà courtes) |

---

## 3. Hiérarchie des célébrations — 7 niveaux

Répond directement au **« tout se ressemble »** (M1, states-inventory PLATE). Un
axe unique, 7 crans, du micro-feedback à la performance exceptionnelle. Les 5
paliers de révélation de tirage (§2.5) s'y **branchent** ; les autres événements
du jeu (vente, badge, jackpot, ligue, tournoi, K.O.) s'y **rangent**. Règle de
budget : **l'intensité, la durée, le son et le confetti croissent ensemble**, et
« l'action suivante » garantit que **plus c'est haut, plus ça a le droit
d'interrompre le flow** — mais jamais de le bloquer.

| Niveau | Événements typiques | Animation | Texte | Son | Durée | Intensité (particules / plein écran) | Action suivante proposée |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **N1 — Micro-feedback** | Toggle, sélection, vente unitaire, débit de coins, marquer lu | Pop 150 ms / count-up ; `--ease-snap` | — (ou micro-libellé) | tick discret ou rien | ≤ 200 ms | 0 / non | **Aucune** — l'UI reste réactive, zéro attente |
| **N2 — Gain routine** | Tirage **commun**, doublon, +coins mineur, entraînement gagné (+2 %/+5 🪙) | Reveal inline §2.5 commun ; toast de gain §2.17 | « Vous avez obtenu » · « +5 🪙 » · « Doublon (+1) » | arpège **2 notes** | ~700 ms | 0 / non | Bouton **Lancer réactif** (<1 s) |
| **N3 — Progression** | Tirage **rare** neuf, **nouvelle carte** commune, palier de collection | Reveal inline §2.5 rare + tampon NOUVELLE §2.6 | « NOUVELLE ! » + rareté en toutes lettres | arpège **4 notes** | ~900 ms | 0 (halo bref) / non | Relance immédiate ; NOUVELLE reste en coin |
| **N4 — Réussite notable** | Tirage **épique** neuf, **badge** d'arène, **fusion** réussie, victoire de combat/duel | Overlay carte §2.5 épique / séquence badge §2.11 ; burst **localisé** 12 particules | « ÉPIQUE » · « Badge obtenu ! » | arpège **6 notes** | ~1,4 s | 12 particules localisées / **non** | Overlay fermable au tap ou auto **2,5 s** → retour au jeu |
| **N5 — Événement majeur** | Tirage **légendaire**, **jackpot** ligne gagnante notable, victoire de **ligue** | Plein écran §2.5 légendaire (3 actes, rayons dorés) | « LÉGENDAIRE ! » display | fanfare **7 notes** | ~2,5 s | confetti **plafonné** (or) / **oui** | « Continuer » + « Partager » (ou auto-dismiss 4 s) ; relance en 1 tap |
| **N6 — Événement rare** | **Shiny**, **jackpot légendaire**, **capture légendaire réussie**, **8ᵉ badge** (Champion) | Plein écran premium §2.5 shiny (star-burst, shimmer, slow-mo ≤400 ms) | « ✦ SHINY ✦ » · « CHAMPION DE KANTO ! » | fanfare longue (variante) | ~3 s | confetti **+ étincelles** (2 couches, même plafond) / **oui** | « Continuer » + « Partager » ; **pas** d'auto-dismiss (moment à savourer), fermable en 1 tap |
| **N7 — Performance exceptionnelle** | **Shiny légendaire**, **victoire de tournoi**, **complétion** (146/146 ou 5 lég.) | Plein écran cinématique : or **+** argent, séquence la plus longue, podium/couronne animés | « LÉGENDE ✦ DORÉE » · « CHAMPION DU TOURNOI » | fanfare la plus longue | ~3,5–4 s | 2 couches + palette élargie (même plafond de particules) / **oui** | « Continuer » + « Partager » + **1 action de suite contextuelle** (voir la collection / le classement) — le seul niveau qui a le droit de rediriger |

**Lecture transversale** : ce qui distingue les niveaux n'est **pas** le nombre
de particules (plafonné dès N5 pour la perf) mais la **combinaison** durée × son
× ancrage (inline→overlay→plein écran) × droit d'interruption. Un joueur doit
pouvoir dire, **les yeux fermés**, s'il vient de faire un N2 ou un N6 rien qu'à
l'oreille (2 notes vs fanfare longue) — la synthèse sonore existante (2→7 notes
par rareté) fournit déjà cette échelle, on la **calque** sur les 7 niveaux.

---

## 4. Technique

### 4.1 Répartition CSS pur / WAAPI / JS rAF

| Animation | Technique | Pourquoi |
| --- | --- | --- |
| Hover / active / focus-visible, transitions d'état | **CSS** (`transition`) | Déclaratif, GPU, zéro JS, le moins cher |
| Transitions de page/vue, pops d'entrée (`fadeInUp`, `modalScale`) | **CSS** (`@keyframes` + classes de transition Nuxt/Nuxt UI) | Simples, one-shot, pas d'orchestration |
| Shimmer shiny permanent, respiration de halo, skeleton, `glow-multi` | **CSS** (`@keyframes` infinis, `--ease-drift`) | Boucles pures, aucune logique par frame |
| Toast, badge pop, tampon NOUVELLE, count-down de cooldown | **CSS** | Courtes, indépendantes |
| **Révélation par palier** (`RollResultReveal`) | **WAAPI** | Séquences multi-temps **coordonnées avec le son** ; besoin de `.finished` pour chaîner et de `.cancel()`/`.finish()` pour le **skip** (§4.4) |
| **Capture** (`CaptureSequence`, 8 temps), **célébrations plein écran** N5–N7, **K.O.**, badge, transition de manche du replay | **WAAPI** | Orchestrées, annulables, scalables par un `playbackRate` (le multiplicateur de vitesse du replay = `anim.playbackRate = speed`) |
| **Roulette** (`useRouletteEngine`, `offsetPx`) | **JS rAF** | Physique + **ticks dérivés de l'index** (synchro son parfaite) ; **PRÉSERVÉ** |
| **Rouleaux du slot**, **jauge tachymètre** (aiguille + heartbeat + micro-tremblements), **count-up** des compteurs | **JS rAF** | Valeurs continues par frame, synchro son, jitter calculé |
| **Confetti / particules** | **JS rAF sur `<canvas>`** | Des dizaines d'entités physiques : un canvas unique >> des dizaines de nœuds DOM |
| **Multi-roll ×5** | **JS rAF, 1 boucle partagée** | Perf mobile (06) : un seul scheduler pour 5 bandes |

Principe de choix : **CSS** pour l'état et les boucles simples · **WAAPI** dès
qu'il faut *orchestrer, annuler ou re-cadencer* une séquence · **rAF** dès qu'il
faut une *valeur par frame* (physique) ou une *synchro son* fine.

### 4.2 Stratégie 60 fps mobile (cible ≥ 55 fps pendant le spin, 08)

- **Compositing only** : on n'anime **que** `transform` et `opacity` (+ `filter`
  ponctuel court). Jamais `width/height/top/left/margin` (layout thrash), jamais
  `box-shadow` **animé** (repaint coûteux) → un halo qui « pulse » est un
  **pseudo-élément pré-rendu dont on anime l'`opacity`/`scale`**, pas une
  `box-shadow` interpolée.
- **`translate3d` / `translateZ(0)`** sur les éléments animés en mouvement
  (bande, rouleaux, panneaux) pour forcer une couche GPU ; `backface-visibility:
  hidden` sur les flips.
- **`will-change` discipliné** : posé **au démarrage** de l'animation (dans le
  `onfinish`/`animationstart` handler ou juste avant `.play()`), **retiré à la
  fin** (`.finished.then()` / `animationend`). **Jamais en CSS statique**,
  jamais sur plus de quelques éléments à la fois. Un `will-change` oublié =
  mémoire GPU qui fuit et scroll qui saccade.
- **`contain: layout paint`** sur les cartes de grille et les cellules de slot
  (isole les recalculs).
- **Pas de layout thrash** : lecture des dimensions (`cardWidth`) **mesurée une
  fois** par `RouletteViewport` (06) et passée au moteur ; aucun
  `getBoundingClientRect` dans une boucle rAF.
- **DOM vivant borné** : `engine.purge()` vide la bande (20 nœuds) après
  révélation ; le canvas confetti est **détruit** à la fin ; la grille
  collection est **virtualisée** au-delà de ~150 cartes visibles (03/06).
- **Multi-roll** : **1 boucle rAF partagée** ; sur mobile, **1 seule bande** au
  lieu de 5 empilées (résout m12).
- **Mode éco automatique** (08) : `prefers-reduced-motion` **OU** `saveData`
  **OU** `deviceMemory ≤ 4` → applique partout la colonne « reduced-motion » de
  §2, **coupe le confetti**, plafonne les particules à 0, désactive le
  motion-blur et le slow-mo. Exposé aussi en **réglage utilisateur** persisté
  (`preferences.reducedMotion`, override manuel) — panneau Réglages (m10),
  accessible en ≤ 2 taps depuis le header (03 R9).

### 4.3 Coordination son / motion — l'animation pilote, le son suit

Le son est **synthétisé** (Web Audio chiptune, zéro asset, force n°7) via
`useSound` (06) : `tick(velocity)`, `fanfare(tier)`, `heartbeat.start/stop`,
`reelSpin/reelStop`, `coin`, `ko`. Contrat de coordination :

1. **Une seule horloge fait autorité, et c'est l'animation.** Pour tout ce qui
   est en rAF (roulette, slot, jauge), **le moteur émet les événements de son**
   depuis sa propre boucle — jamais un timer sonore parallèle qui dériverait :
   - `engine.onTick((index, velocity01) ⇒ useSound.tick(velocity01))` — le tick
     part du **changement d'index sous l'aiguille**, pas d'un `setInterval` ;
   - `gauge.onThresholdCross(⇒ useSound.stop + « crack »)`,
     `gauge.onHeartbeat(phase ⇒ …)` (le pic de micro-tremblement §2.8 partage
     **la même** horloge de heartbeat) ;
   - `slot.onReelStop(i ⇒ useSound.reelStop())`.
2. **Les célébrations démarrent son + image au même point d'entrée.**
   `useCelebration.celebrate({tier})` lance `useSound.fanfare(tier)` **et**
   l'animation WAAPI **dans le même tick** → la fanfare et le premier flash sont
   frame-alignés. Aucune fanfare ne se joue « en avance » sur un overlay pas
   encore monté.
3. **Zéro fichier à décoder = synchro exploitable.** La synthèse a une latence
   quasi nulle (pas de `decodeAudioData`) : on peut caler un `tick` sur une
   frame précise. À exploiter — mais `useSound.resume()` **doit** être appelé au
   **1ᵉʳ geste** (clic Lancer, §2.3) pour satisfaire l'autoplay policy et
   « réchauffer » l'`AudioContext`.
4. **Un `GainNode` maître** branché sur `preferences.volume`/`muted` (06) : le
   mute est **persistant** (m10) et n'affecte pas le timing (on baisse le gain,
   on ne coupe pas l'horloge). **Reduced-motion + son off** = silence complet
   (08). Reduced-motion **seul** peut conserver les **fanfares de résultat** (le
   son n'est pas du mouvement) tout en coupant les *juice sounds* d'ambiance
   (ticks, LFO) — au choix de l'utilisateur.
5. **API à prévoir** : un mince contrat d'événements `motion → son` (les
   callbacks `onTick/onReelStop/onThresholdCross/onSettle` des moteurs + le point
   d'entrée `celebrate`). **Interdit** : que le son pilote le timing visuel
   (l'inverse dériverait et casserait la synchro sur mobile chargé).

### 4.4 Interruption / skip — tout segment > 2 s est skippable

Fondé sur §1.4 : le résultat est déjà connu, donc **sauter = afficher
instantanément un état déjà déterminé**, sans triche ni avantage.

**Mécanisme technique** par famille :

| Famille | `skip()` fait… |
| --- | --- |
| **rAF** (spin, slot, jauge, cascade) | Pose `offsetPx`/angle = **valeur finale**, résout la promesse `spin()`, émet l'événement de fin (dernier tick/`reelStop`). Le résultat était calculé dès `buildStrip`. |
| **WAAPI** (reveal, capture, célébration, badge, K.O.) | `anim.finish()` saute à l'état final ; pour une séquence, un contrôleur `finish()` **toutes** les anims restantes puis résout. |
| **Navigation / démontage** | `engine.cancel()` / `anim.cancel()` (06) : stoppe proprement le rAF/WAAPI, retire `will-change`, détruit le canvas — **pas** de fuite. |

**UX du skip** :

- **Spin roulette** : un bouton « Passer » (ou tap sur la bande) apparaît
  **après 1 s** → saute directement à la révélation (§2.5).
- **Multi-roll** : « Passer » saute **toute la cascade** → affiche les 5
  résultats + la célébration de série (§2.12).
- **Jauge / replay** : bouton **« Passer » déjà existant** (préservé,
  `tournament-battle-replay.png`) **+** multiplicateur de vitesse
  (`anim.playbackRate`).
- **Capture** : skippable **après le lancer** de pokéball (on garde le geste
  d'engagement, on peut sauter les secousses).
- **Célébrations plein écran (N5–N7)** : **tap n'importe où = fermer**, avec un
  **délai anti-mis-tap de ~400 ms** (pour ne pas rater l'apogée d'un shiny d'un
  tap réflexe) ; N5 a en plus un auto-dismiss 4 s ; N6/N7 non (moment à
  savourer) mais toujours fermables.
- **Escalade de skip optionnelle** : 1ᵉʳ tap **accélère** (×2), 2ᵉ **saute** —
  calqué sur la logique ×2/×4 du replay. Le plus simple (skip direct) est
  acceptable ; l'escalade est un raffinement.

**Invariant** : après n'importe quel skip, l'état final (carte, %, badge, gains,
solde, `aria-live`) est **identique** à la version jouée en entier. Le skip est
un chemin plus court vers **le même fait**.

---

## 5. Recommandations prioritaires

## [P0] RM1 — Fonder tout le mouvement sur des tokens (6 easings + échelle de durées) et UN interrupteur reduced-motion

**Problème** : 25 keyframes existent mais rien n'est nommé, budgété ni
désactivable ; les courbes et durées sont codées en dur au cas par cas, et il
n'y a **aucun** `prefers-reduced-motion` (0 occurrence — M5).
**Preuve** : `ui-inventory.md` (« Système d'animation », ⚠️ aucune prise en
charge de reduced-motion) ; `frontend-issues.md` M5 ; `03-ui-designer.md` §2.7
(tokens `--motion-*` esquissés mais non systématisés).
**Impact** : incohérence de sensation d'un écran à l'autre, impossible à
maintenir ou à re-cadencer, et **exclusion** des utilisateurs sensibles au
mouvement (jeu non jouable/illisible sans motion).
**Recommandation** : déclarer dans `@theme` les 6 `--ease-*` (§1.2) et l'échelle
`--dur-*` + constantes scriptées (§1.3) ; brancher un **unique** commutateur
`effectiveReducedMotion` (`preferences`, 06 : auto `prefers-reduced-motion`/
`saveData`/`deviceMemory ≤ 4` **OU** override manuel) qui bascule chaque
animation sur sa colonne « reduced-motion » de §2 ; **lint** interdisant toute
`cubic-bezier`/durée en dur hors `@theme`.
**Complexité** : **S–M** (socle, 1–2 j) — à faire en premier, tout en dépend.
**Dépendances** : aucune ; s'appuie sur `03-ui-designer.md` R1 (tokens couleur)
et le store `preferences` (06).
**Critères d'acceptation** : 0 `cubic-bezier`/durée en dur hors `@theme` (grep) ;
`prefers-reduced-motion: reduce` → aucune translation/scale/rotation > 200 ms
sur les 19 routes, résultats et infos identiques ; commutateur manuel
persistant, testé actif/inactif ; les 25 keyframes existantes rangées sous
tokens (aucune régression de sensation sur roulette/slot/capture).

## [P0] RM2 — Escalade de révélation du tirage à 5 paliers, budgétée et ramenée dans le viewport

**Problème** : le résultat se rend **sous la ligne de flottaison** (C1) et
commun comme shiny partagent le **même gabarit** « ✨ Vous avez obtenu ! » (M1) —
le sommet émotionnel du gacha est hors écran et plat.
**Preuve** : `home/roll-result-new-card.png` (la carte « Pyroli » est coupée en
bas d'écran, sous le bouton Lancer) ; C1, M1 ; `states-inventory.md` (hiérarchie
de succès PLATE, doublon silencieux).
**Impact** : la dopamine du tirage — la raison de jouer — est invisible, et un
légendaire 1/500 ne produit aucun pic mémorable.
**Recommandation** : implémenter `RollResultReveal` selon §2.5 — grammaire
*Anticipation → Révélation → Couronnement* à **5 paliers** (commun/rare inline
au centre du viewport de la bande ; épique en overlay carte ; légendaire/shiny
en plein écran), **toujours dans le viewport** (résout C1), avec durées, actes
et sons **précisément budgétés** (§1.3), verbalisation **NOUVELLE vs Doublon**
(§2.6), et variante reduced-motion statique.
**Complexité** : **M** (3–4 j : 5 paliers × comportement normal/réduit).
**Dépendances** : RM1 (tokens) ; `03-ui-designer.md` R2/R3 (composant, overlays
`UModal`) ; `useCelebration`/`useSound` (06).
**Critères d'acceptation** : en **375×667** comme en **1440×900**, le résultat
est **visible sans scroll** à toute rareté ; les 5 paliers sont **distinguables
en capture** (durée, ancrage, particules) ; « NOUVELLE » vs « Doublon (+1) »
toujours affiché ; `aria-live` annonce le gain ; budget respecté (commun ≤ 4,8 s,
shiny ≤ 7,2 s, skip ≤ 1 s).

## [P1] RM3 — Hiérarchie de célébration à 7 niveaux (tuer le « tout se ressemble »)

**Problème** : succès mineurs et exceptionnels partagent le même traitement ;
la hiérarchie de succès est **PLATE** (commun ≈ légendaire), sans montée
d'intensité ni célébration plein écran.
**Preuve** : `states-inventory.md` (tableau « États de succès », différenciation
« ~aucune »/« faible » ; « Aucun confetti/particule, aucune célébration plein
écran ») ; M1.
**Impact** : la récompense est **dévaluée** — le jeu ne sait pas fêter, la
rétention (chasse au shiny, course au score) perd son moteur émotionnel.
**Recommandation** : adopter l'axe unique à **7 niveaux** (§3), du micro-feedback
(N1) à la performance exceptionnelle (N7), avec pour chacun animation/texte/son/
durée/intensité/**action suivante** fixés ; **brancher** les 5 paliers de tirage
(§2.5) et **ranger** les autres événements (badge N4, jackpot légendaire N6,
victoire de tournoi N7…) ; **calquer** l'échelle sur la synthèse sonore existante
(2→7 notes) pour que le niveau soit **reconnaissable à l'oreille**.
**Complexité** : **M** (les niveaux réutilisent les briques de RM2 + §2.11/2.13/
2.15).
**Dépendances** : RM1, RM2 ; `useCelebration.tierFor()` (06).
**Critères d'acceptation** : chaque niveau produit une célébration **distincte
en durée × son × ancrage** (revue en capture/enregistrement) ; « où s'arrêter »
respecté (N1–N4 jamais plein écran, N5–N7 confetti plafonné, relance **jamais**
bloquée) ; test à l'aveugle : N2 vs N6 discernables **au son seul**.

## [P1] RM4 — Augmenter le théâtre de la jauge de duel (micro-tremblements + sursaut au seuil) et généraliser le skip

**Problème** : la jauge est déjà le « sommet du suspense » mais reste lisse — le
franchissement du seuil (défaite) manque d'un couperet **physique**, et tous les
moments > 2 s ne sont pas uniformément skippables.
**Preuve** : `existing-features.md` §5 (ralenti ×5 + battement de cœur — bon
socle) ; `tournament-battle-replay.png` (jauge + « Passer » **déjà** présent sur
le replay, à généraliser) ; force n°1 de l'audit (théâtre à **sublimer**, pas
réinventer).
**Impact** : le moment le plus tendu du jeu gagne en viscéralité sans risque
(on préserve l'existant), et le joueur pressé n'est jamais captif d'une animation.
**Recommandation** : §2.8 — ajouter les **micro-tremblements d'aiguille** (±0,4°,
amplitude ∝ proximité, pic calé sur le « LUB » du heartbeat via l'horloge rAF
partagée) et le **sursaut au franchissement** (`--ease-recoil` : l'aiguille cogne
le seuil, flash rouge, shake du cadre, silence brutal existant) ; la victoire
« se pose » en `--ease-bounce` ; sur-jouer la **fausse jauge buguée** de la
capture (glitch avant rétractation) ; généraliser le **skip > 2 s** (§4.4) à la
roulette, la cascade et la capture, en réutilisant le « Passer » du replay.
**Complexité** : **S–M** (surcouche sur `DuelGauge` + moteur rAF existant).
**Dépendances** : RM1 ; coordination son/motion (§4.3, `useSound.heartbeat`) ;
`DuelGauge` (03/06).
**Critères d'acceptation** : au franchissement, l'aiguille recule visiblement +
shake + silence, **synchronisés à la frame** ; micro-tremblements présents en
zone d'approche, **absents** en reduced-motion (aiguille directe + ✅/❌ + %) ;
tout segment > 2 s (spin, cascade, capture, replay) expose un skip menant à
**l'état final identique** ; heartbeat et pic de tremblement partagent **une
seule** horloge (pas de dérive).

## [P1] RM5 — Discipline 60 fps mobile (compositing, `will-change`, confetti plafonné, mode éco) + son piloté par la timeline

**Problème** : le multi-roll monte 5 bandes DOM et 5 animations simultanées
(lourd sur mobile bas de gamme) ; aucune discipline de compositing/`will-change`
n'est formalisée ; le son synthétisé n'a pas de contrat de synchro avec le motion
et aucun réglage de volume/mute.
**Preuve** : `frontend-issues.md` m11 (300+ cartes sans virtualisation), m12
(5 roulettes empilées), m10 (aucun réglage son) ; `08-responsive-mobile.md`
(cible ≥ 55 fps pendant le spin, mode éco auto) ; `ui-inventory.md` (son
synthétisé, aucun mute exposé).
**Impact** : sans budget, la refonte reproduit les saccades sur mobile (≈ 50 %
des sessions) et le son reste imposé (jeu injouable en open-space).
**Recommandation** : §4.2 + §4.3 — **n'animer que** `transform`/`opacity`
(halos = pseudo-éléments dont on anime l'opacité, jamais `box-shadow` interpolée) ;
`will-change` **posé au start / retiré à la fin**, jamais statique ; `contain`
sur cartes/cellules ; **1 boucle rAF partagée** + **1 bande sur mobile** pour le
multi-roll ; **canvas confetti unique détruit** à la fin, particules plafonnées
(120 desktop / 60 mobile, on ajoute de la variété pas du volume) ; **mode éco
auto** (`prefers-reduced-motion`/`saveData`/`deviceMemory ≤ 4`) ; contrat
**motion → son** (les moteurs émettent `onTick`/`onReelStop`/`onThresholdCross`,
le son ne pilote **jamais** le timing) + `GainNode` maître sur
`preferences.volume/muted`, `resume()` au 1ᵉʳ geste.
**Complexité** : **M** (transversal mais patterns réutilisables).
**Dépendances** : RM1 ; `useRouletteEngine`/`useSound`/`preferences` (06) ;
virtualisation de la grille (03 R6/06).
**Critères d'acceptation** : ≥ 55 fps mesurés (DevTools throttle 4× CPU) pendant
spin, multi-roll et confetti sur un profil mobile milieu de gamme ; **0**
`will-change` résiduel après animation (audit) ; **0** propriété de layout
animée (grep : pas de `width/height/top/left` en transition) ; mute/volume
**persistants** et testés ; en mode éco, **aucun** confetti et aucune anim > 200 ms,
jeu entièrement jouable ; ticks/fanfares **frame-alignés** à leur animation
source (pas de dérive audible sur mobile chargé).

---

## 6. Ce qu'on ne touche PAS (garde-fous)

La courbe de roulette `cubic-bezier(0.15,0.85,0.35,1)` et ses **ticks dérivés de
l'index** ; le **jitter ±40 px** ; les **arrêts décalés 700 ms** du slot ; le
**battement de cœur** LUB-dub et le **ralenti ×5** de la jauge ; les **8
keyframes** de capture ; la **cascade 550 ms** ; le **« Passer »** et les
vitesses du replay ; la **synthèse chiptune** (portée telle quelle). On tokenise,
on budgète, on rend skippable et désactivable — **on n'invente pas un nouveau
feeling.** La refonte motion est une **mise en scène** de ce qui existe, pas un
remake.

---

## Conclusions

1. Le jeu a déjà le théâtre (roulette réglée, jauge à ralenti, capture, ticks
   calés) ; il lui manque un **système** — 6 easings nommés, une échelle de
   durées, un interrupteur `reduced-motion` unique (RM1) transforment 25
   keyframes anarchiques en langage tenu, sans rien jeter.
2. Le sommet du gacha doit **remonter dans l'écran** et **s'escalader** : 5
   paliers de révélation budgétés (commun→shiny), ancrés dans le viewport,
   verbalisant nouveauté vs doublon (RM2) — la réponse directe à C1 + M1.
3. Une **hiérarchie de célébration à 7 niveaux** (RM3) tue le « tout se
   ressemble » : l'intensité monte par durée × son × ancrage, jamais par volume
   de particules, et reste **reconnaissable à l'oreille**.
4. Le principe fondateur — **l'anticipation appartient au serveur** — rend tout
   suspense budgétable, tout moment skippable sans triche, et tout temps mort
   utile au préchargement ; la jauge gagne un couperet physique (RM4).
5. Le budget technique tient le tout à **60 fps mobile** (compositing,
   `will-change` discipliné, confetti plafonné, mode éco) avec un contrat où
   **l'animation pilote le son** et où volume/mute deviennent enfin réglables
   (RM5).
