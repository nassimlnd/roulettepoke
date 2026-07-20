# 04 — Direction artistique : territoires créatifs de la refonte

> Base : `docs/audit/ui-inventory.md`, `application-map.md`,
> `frontend-issues.md` (§ forces à préserver) + captures
> (`home`, `roll`, `gyms`, `slot-machine`, `collection`, `tournament`,
> `empty-states`). Lu en cohérence avec `03-ui-designer.md` (système de tokens,
> dark-first, Inter/Bricolage, Lucide, un-glow-par-écran) et `01/02` (produit/UX).
>
> **Partage des rôles** : le rapport 03 a posé le *squelette* (tokens, grille,
> 12 composants, accessibilité). Ce document pose l'*univers* : la matière, la
> voix, le monde qui habillent ce squelette. Chaque territoire ci-dessous est
> exprimable **à travers les 3 couches de tokens de 03** (sémantique / rareté /
> types-biomes) + une couche de texture + un jeu d'icônes + une direction des
> révélations + une voix éditoriale. C'est une **peau**, pas une seconde refonte.
>
> **Deux interdits, tenus par tous les territoires** : (1) le cliché casino
> (doré + néons + effets gratuits) ; (2) singer la charte Nintendo/TPC — les
> sprites `.webp`, badges Kanto et icônes de types sont des **assets donnés** qui
> ne changent pas ; notre identité est tout ce qui les entoure, et doit être assez
> distincte pour qu'ils se lisent comme *du contenu qu'on catalogue/qu'on joue*,
> jamais comme un produit officiel.

---

## 1. Diagnostic — qu'est-ce qui fait « PokeRoulette » aujourd'hui (≤ 15 lignes)

PokeRoulette a **deux identités fortes et une absente**.
1. **Sonore** (remarquable) : chiptune Web Audio, zéro asset, ticks calés sur la
   Bézier, battement de cœur 110→180 BPM, silence brutal au seuil — un vrai parti pris.
2. **Narrative** (attachante) : français, tutoiement complice (par endroits),
   classement des tricheurs, anecdotes, 😅 sur les doublons, patch notes perso.
3. **Spatiale/visuelle : absente.** Tout flotte, centré, dans un vide quasi noir ;
   le violet `#bb86fc` est du Material 2 de 2018 (plat, daté) ; les 9 biomes sont
   une **donnée** (pastilles), jamais une **ambiance** ; Segoe UI = « back-office
   Windows » ; emojis = unique iconographie (rendu inter-OS instable, look SMS) ;
   jaune plein pour tout (27 boutons noient la collection). Surtout : **le théâtre
   de suspense est purement auditif — l'écran, lui, ne se tend jamais.**

**Synthèse** : le jeu *sonne* comme une petite machine à merveilles et *s'écrit*
comme une bande de copains, mais *se regarde* comme un template. La refonte doit
donner à **voir** ce qu'on entend déjà, et un **lieu** à ce qu'on collectionne.

---

## 2. Trois territoires créatifs

Chaque territoire est un registre émotionnel distinct : **A = l'objet** (nostalgie
tactile d'initiés), **B = le collectionneur** (intimité curatoriale), **C = le
bonimenteur** (spectacle festif). Ils divergent sur la matière, le rapport au
suspense et le coût — pas sur les fondations de 03, qu'ils partagent tous.

---

### 2.1 — Territoire A · « PHOSPHORE »
**La console de poche émancipée.** *(le chiptune enfin rendu visible)*

**Intention émotionnelle.** La nostalgie chaude et complice d'un appareil qui est
*le tien* : le clic des boutons, la lueur de l'écran sous la couette, la fierté
de « je connais cette machine ». On parle à des gens qui ont grandi avec un
écran à points dans les mains. Registre : initié, tactile, malin — jamais froid
si la voix reste chaleureuse (cf. risque).

**Le pari central.** C'est **le seul territoire qui réconcilie les deux assets
que le jeu possède déjà** : les sprites *sont* du pixel, le son *est* une puce
chiptune. Aujourd'hui les deux flottent sur un fond Material qui ne parle pas
leur langue. Ici, image et son disent enfin la même chose.

**Références culturelles précises** (jeux, matières, appareils) :
- **Consoles fantômes / fictives, PAS Nintendo** : la **Playdate** de Panic
  (appareil inventé de toutes pièces, 1-bit, écran à mémoire — le précédent
  parfait de « on a fait *notre* machine »), **PICO-8** et **TIC-80** (fantasy
  consoles, palette contrainte à 16 couleurs — la discipline qui empêche le
  kitsch), **Vectrex** (glow vectoriel, 1982), **Downwell** (Ojiro Fumoto,
  palettes 3 couleurs à la révélation).
- **Matières d'écran** : phosphore **ambre/violet** des moniteurs monochromes
  (IBM 5151, terminaux DEC — *surtout pas* le vert DMG de la Game Boy), grille de
  points d'un afficheur à segments, bande RVB d'un tube cathodique, biseau d'une
  petite télé portable, listing d'imprimante matricielle sur papier à bande.
- **Effet signature** : le **color-cycling** de la demoscene (façon Mark Ferrari,
  *Living Worlds*) pour les palettes qui pulsent à la victoire.

**Fonds & les 9 biomes.** Le fond n'est plus un vide : c'est **un écran à points**
(trame de dots très discrète comme substrat de toute l'UI — « on regarde *dans*
une machine »). Chaque biome est un **mode d'affichage duotone** de cet écran :
Forêt = duo vert-phosphore, Mer = cyan, Lac = teal, Cave = violet-noir profond,
Tundra = cyan pâle, Désert = ambre, Ville = gris-bleu à grille dense, Plaines =
vert-blé, Montagnes = ardoise. **C'est le traitement le moins cher possible** (un
token de duotone + une densité de trame par biome, zéro illustration) et le plus
juste : le *palette-swap* EST la langue native de la console rétro. 9 biomes = 9
« cartouches ».

**Texture & profondeur.** Trame de points en substrat ; **bloom de phosphore**
sur les seuls éléments allumés ; scanlines très subtiles ; biseaux/chrome
d'appareil comme surfaces de niveau 2. La profondeur vient du « verre devant
l'écran » (ombre interne, léger vignettage) — pas d'ombres portées (invisibles
sur fond noir, cf. 03 §2.5).

**Iconographie.** **Le seul territoire où un jeu d'icônes pixel est *natif* et
correct.** On **retire les emojis** de toute fonction et on assume un set pixel
1-bit/2-bit maison (~40 icônes : jeton, épée, filtre, son…), calibré lisible à
16 px avec `aria-label`. Les nombres et le texte restent en Bricolage/Inter (03) :
le pixel vit dans les **icônes, les cadres et les révélations**, jamais dans le
corps de texte (illisible en français à 300 cartes). Les emojis éditoriaux (le 😅
du doublon) survivent **dans le texte**, pas comme icônes.

**Le son chiptune.** C'est la **thèse** du territoire : le son n'est plus
orphelin. Chaque tick a son clignotement de dot ; chaque fanfare, son cycle de
palette. On ne touche pas au moteur Web Audio (cf. 06) — on lui donne son corps
visuel. Coherence maximale des trois territoires.

**Tension visuelle du suspense** (aujourd'hui uniquement sonore → enfin visible) :
- **Roulette** : la bande est un écran LCD qui défile ; à chaque carte sous
  l'aiguille, la **rangée de points s'inverse** (flip noir/phosphore) — le tick
  sonore et l'inversion pixel tombent ensemble.
- **Jauge de duel** : tachymètre → **barre à segments** de tableau de bord 80s ;
  à l'approche du seuil, les segments clignotent et **l'image entière gagne du
  bruit** (scanlines qui tremblent, interférence). Franchissement du seuil =
  l'écran **« s'éteint »** (effondrement du phosphore vers le noir) — le pendant
  visuel exact du silence brutal existant.
- **Jackpot** : afficheur à segments ; le gain déclenche un **color-cycling
  plein écran** à travers la teinte de rareté.
- **Shiny (1/500)** : l'écran **« sature »** — la machine n'a jamais affiché ça —
  éclat de scanlines inversées, puis le sprite se résout dans une palette
  argent-irisée qui *cycle* sur la trame. Diégèse : *« l'appareil rend ça pour la
  première fois »*.

**Les 3 moments imposés :**
1. **Shiny 1/500** → « surcharge écran » (voir ci-dessus) : glitch de scanlines,
   brownout inversé, puis résolution en palette argent-irisée qui cycle, badge
   ✦ pixel, mention `NOUVEAU ✦` en Bricolage. Fanfare 7 notes existante. Sans
   `prefers-reduced-motion` : un flash unique + la palette irisée statique.
2. **Attente du seuil (jauge)** → segments qui clignotent + **jitter de scanlines
   croissant** synchronisé sur le battement de cœur : l'écran *tremble* à mesure
   qu'on approche. La lisibilité du % reste garantie (centre stable, `tabular-nums`).
3. **Collection vide** → l'écran d'une console **jamais démarrée** : 151 cases en
   trame de points éteinte, silhouettes « ??? » à 30 %, un curseur clignotant et
   un message d'amorçage : « `BANQUE DE DONNÉES : 0/151. Insère ta première pièce.` »
   Au lieu du « 0/151 » froid et blanc actuel.

**Voix rédactionnelle.** Le tutoiement est la voix **de l'appareil + du pote
rétro-gamer** : bref, arcade, taquin. « `GAME OVER — ressaie` », « `NOUVEAU ✦` »,
« `T'as claqué tes 10 jetons, l'artiste` ». Patch notes = « `firmware v3.4 —
corrige le bug où Ronflex bloquait l'écran` ». Tricheurs = « `TABLE DES SCORES —
section triche détectée` ».

**Mapping sur 03.** Couche 1 : `primary` reste le violet (mais assumé comme
*phosphore*, saturé à la révélation). Couche 2 `amber` = le « jeton » (économie).
Couche 3 : les 9 duotones biome + 5 teintes rareté deviennent des **modes
d'écran**. Ajout : un utilitaire `--tex-dots` + un composant `PhosphorScreen`
(substrat), un set d'icônes pixel. **Aucune** entorse au système.

**Risques.**
- **Licence (risque n°1)** : pixel + Pokémon glisse vers Nintendo. *Parade* :
  vert DMG **interdit**, coque/D-pad Game Boy **interdits**, appareil réinventé
  en palette violet-nuit ; le pixel est un **traitement** (trame, duotone,
  phosphore), pas le clone d'un écran Nintendo.
- **Lisibilité** : les fontes pixel ne passent ni les 300 cartes ni le français.
  *Parade déjà actée* : pixel en icônes/cadres/révélations uniquement.
- **Kitsch/daté** : scanlines/CRT à outrance = « filtre rétro cheap ». *Parade* :
  retenue — trame subtile, glow réservé aux éléments allumés (aligne 03 « un seul
  élément lumineux au repos »).
- **Coût** : set d'icônes pixel = travail réel mais borné (~40 icônes) ; duotones
  biome = quasi gratuits. **Coût global le plus bas des trois.**
- **Cohérence sprites** : **la meilleure des trois** — sprites pixel sur trame de
  points, natif, jamais « collé ».

---

### 2.2 — Territoire B · « CARNET DE TERRAIN »
**Le carnet d'expédition du naturaliste de nuit.** *(la collection comme œuvre d'une vie)*

**Intention émotionnelle.** La fierté intime et curatoriale du collectionneur ;
le silence patient de la veille, puis le frisson d'apercevoir une rareté. « Ta
collection est l'œuvre d'une vie, cataloguée à la lampe. » Registre : chaleureux,
soigné, un peu grave — puis un pic d'émerveillement. C'est le territoire le plus
**cosy + prestige**, taillé pour l'intimité des 30 amis et pour rendre un
146/146 réellement **mérité**. Il absorbe la piste « nuit d'observation /
documentaire animalier » comme **moteur de tension**.

**Références culturelles précises :**
- **Objets/matières** : planches d'**Audubon** (*Birds of America*), vitrines
  d'entomologie victorienne (spécimens épinglés sous verre, étiquettes
  manuscrites), **planches d'herbier** (spécimen scotché sur papier crème +
  étiquette imprimée), carnet **Rite in the Rain** (toile fauve), mallette
  cuir-laiton d'expédition, **tampons encreurs** (« VU LE 20/07 », « SPÉCIMEN
  N°025 »), tiroir de **fiches cartonnées** de bibliothèque, tirage riso/typo.
- **Jeux (pour rester un jeu, pas un musée)** : les carnets/affiches chaudes de
  **Firewatch** (Olly Moss), le cadre « guide de terrain » d'**Alba : a Wildlife
  Adventure** (ustwo), le **carnet du voyageur d'Outer Wilds**, le calme
  typographique de **Kentucky Route Zero**.

**Réconciliation dark-first + nuit.** Le papier est clair ; on ne fait donc pas
un monde de jour. C'est un **bureau de terrain la nuit** : plateau noyer/cuir
sombre, une **flaque de lumière de lampe** chaude, les fiches crème captent la
lumière. Fonds = bleus-nuit et bruns désaturés (on **garde** le `night-950` de
03, on le **réchauffe** et on lui donne de la **matière**). L'idée
« observation nocturne » de la piste 4 devient le suspense : on guette dans le
noir ce qui approche.

**Fonds & les 9 biomes.** Chaque biome devient une **région relevée**, traitée en
planche : un **papier teinté + un motif de coin** (Forêt = herbier vert, filigrane
de feuille ; Mer = carte de marée bleu-gris, courbe de vague ; Montagnes = kraft à
courbes de niveau ; Désert = sable strié ; Cave = feuille charbon ; Tundra = graphe
bleu pâle ; Ville = papier millimétré/bleu de plan ; Lac = teal ; Plaines = blé).
Les biomes deviennent enfin **des lieux où tu es allé**. Coût *modéré* (papier +
filigrane + courbe), pas de scène peinte.

**Texture & profondeur.** Grain de papier réel, bord de carton, scotch et
agrafe discrets, encre qui bave, gaufrage typo (deboss). Profondeur **physique** :
fiches qui se chevauchent comme un vrai album, **retombée radiale de la lampe**,
léger vignettage de bureau.

**Iconographie.** Pictos **dessinés à l'encre / gravés au tampon** : le jeton =
un jeton frappé, « vendu » = un tampon encreur, le son = une clochette dessinée.
On **retire les emojis** de la fonction (set encre/gravure) mais le 😅 du doublon
**survit en gribouillis de marge** (« encore un Rattata… noté quand même 😅 ») —
il est *plus* juste ici qu'aujourd'hui.

**Le son chiptune.** C'est la **friction** du territoire : un carnet « voudrait »
du foley. Or 06 impose de garder la synthèse. *Résolution élégante* : on
**recontextualise** le chiptune en **instrument de terrain** — les ticks = une
cadence sonar/compteur Geiger (détection de proximité), le battement de cœur =
littéralement un cœur qu'on ausculte, la fanfare = un « verrouillage du
détecteur ». Même son, sens nouveau : *appareil scientifique* plutôt qu'arcade.

**Tension visuelle du suspense** (l'environnement se tend, pas l'écran) :
- **Roulette** = le **piège/l'appât** posé au crépuscule : pellicule de vignettes
  de piège-photo qui défile, l'aiguille est un réticule de viseur, ticks = pouls
  du détecteur. Révélation = *ce qui est venu à l'appât*.
- **Jauge de duel** = **sismographe** à aiguille sur papier millimétré ; à
  l'approche du seuil, l'aiguille **tressaute** et **la lampe faiblit/vacille**
  (la tension est dans la lumière). Seuil franchi = la lampe **s'éteint** (pendant
  du silence brutal), la carte **se fane** en spécimen pressé.
- **Jackpot** = la **relève du piège de nuit** : trois vignettes de piège-photo ;
  gain = le spécimen **se développe** comme un Polaroïd.

**Les 3 moments imposés :**
1. **Shiny 1/500 → le joyau du territoire.** Un shiny est un **spécimen
   aberrant** (morphe de couleur) — le rêve d'une vie de naturaliste. Le sprite
   est monté en **nouvelle planche** ; un **sceau de cire / gaufrage doré** presse
   sur la fiche (« SPÉCIMEN ABERRANT — N°xxx ») ; la lampe **flambe** chaud ; une
   exclamation manuscrite apparaît en marge. **Prestige, pas flash de machine à
   sous.** Potentiellement la révélation la plus émouvante des trois.
2. **Attente du seuil** → aiguille de sismographe qui **judder** sur le papier +
   **vacillement de la lampe** synchronisé sur le battement de cœur : la lumière
   elle-même devient nerveuse. Le % reste net au centre.
3. **Collection vide → le plus beau des trois.** Un **album de terrain vierge** :
   fiches crème à silhouettes pointillées et lignes d'étiquette vides
   (« N°001 ______  vu le __/__ »), + un **mot manuscrit du chef d'expédition** :
   « Ton carnet est vierge. Pose ton premier piège. » Chaud, invitant, orienté
   action — l'inverse exact du « 0/151 » froid actuel.

**Voix rédactionnelle.** Tutoiement de **compagnon d'expédition** — curieux,
un brin pince-sans-rire : « Spécimen aberrant ! Note l'heure, personne va te
croire. » Patch notes = « Carnet de l'équipe — entrée du 20/07 ». Tricheurs =
« Registre des observations douteuses ».

**Mapping sur 03.** Couche 1 : `neutral` glisse vers un **crème/noyer** (surfaces
= papier/bureau), `primary` violet réservé aux accents. Couche 2 `amber` = le
**doré du sceau** (rareté légendaire/économie). Couche 3 : 9 papiers biome + 5
tampons rareté. Ajout : une couche `--tex-paper` (bruit tuilé minuscule),
un set de tampons, l'éclairage de lampe (dégradé radial). Le plus « riche ».

**Risques.**
- **Décalage d'adrénaline** : un carnet calme contre la dopamine de la roulette.
  *Parade* : charger la tension dans le **son + le vacillement de lumière** ; mais
  c'est la vraie tension de conception — le jackpot extraverti est le plus dur ici.
- **Réconciliation dark-first** : le papier est clair ; risque de dériver
  « lumière chaude » et de perdre l'identité sombre reconnaissable. *Parade* :
  tenir le fond nuit profond, la lampe éclaire *les cartes*, pas la page.
- **Coût d'assets** : **le plus élevé des trois** (textures papier, tampons,
  filigranes, lampe, motifs biome). Attention au budget JS/asset serré de 06 :
  textures en webp/SVG tuilé minuscule, jamais de grandes images.
- **Cohérence sprites** : **excellente** — sprite pixel épinglé sur fiche crème =
  appariement classique, qui a l'air **voulu**.

---

### 2.3 — Territoire C · « GUINGUETTE »
**La fête foraine folk — la tombola, pas Vegas.** *(le jeu de hasard réclamé au cliché)*

**Intention émotionnelle.** Le théâtre festif et extraverti, le boniment chaud du
forain, le frisson communautaire de la roue de la fortune à la fête de l'été.
« Approche — tout le monde est là, tente ta chance. » Le mieux taillé pour le
**social/spectacle** (tournoi, classement, jackpot) et pour la **voix comique**.
Le plus immédiatement *fun*.

**Le pari.** Le jeu **est** fondamentalement un jeu de hasard (roulette, slot,
tombola). Plutôt que de le fuir, on l'**assume** — mais on le **reprend au
cliché Vegas** via le registre **folk / vernaculaire / vintage** : la fête
foraine itinérante, la guinguette, la loterie de kermesse.

**Références culturelles précises (résolument NON-Vegas) :**
- **Objets/matières** : art forain peint (lettrage de **Fred Fowle**, dorure
  foraine mais en **émail peint**, pas en feuille d'or), **plaques émaillées** de
  bistrot (Ricard, Michelin), tambour de **tombola**, **ampoules à filament**
  chaudes en guirlande (festoon — **jamais** de tube néon), **tickets de tombola**
  en rouleau, arcade de **jetée / penny-arcade** en bord de mer, bâches rayées et
  fanions, stand de **diseuse de bonne aventure** (tarot), halftone sérigraphié
  d'affiche de concert, le **« tape-ta-force »** forain (métaphore parfaite de la
  jauge de duel), et surtout la **Lotería** mexicaine (jeu de cartes folk fondé
  sur le hasard, précédent superbe **hors** Vegas).
- **Jeux** : la chaleur peinte de **Carto** et **Wandersong**, la palette d'affiche
  folk de **Sayonara Wild Hearts** (Simogo), le cadre music-hall des menus de
  **Cuphead** (encre & gouache 1930, *sans* les personnages caoutchouc).

**Réconciliation dark-first.** La fête **la nuit** : ciel crépusculaire
bleu-nuit profond, tout éclairé aux **ampoules chaudes**. On garde le dark-first
de 03 ; l'accent lumineux est l'**ambre** — et c'est cohérent : les **jetons** de
la fête *sont* le token `amber`/économie de 03. World + chaleur sans trahir le noir.

**Fonds & les 9 biomes.** Chaque biome est une **baraque/attraction** de l'allée
centrale, avec son **panneau peint** et sa couleur de bâche : Forêt = le stand de
tir « bosquet vert », Mer = la « tombola aquatique », Ville = l'« arcade de la
grande ville », Désert = la tente de « spectacle de curiosités », Cave = le
« train fantôme », Tundra = le « stand de glace », Lac, Plaines, Montagnes de
même. Les biomes deviennent des **baraques sur la fête** — une allée qu'on
parcourt. Traitement plus **illustré** (un panneau par baraque), donc coût plus
haut, mais **systématisable** (un gabarit de panneau + couleur/bâche/motif par
biome).

**Texture & profondeur.** Bois peint veiné, émail écaillé sur les bords, trame
sérigraphie, encre légèrement décalée (riso), **glow chaud d'ampoule** (pas de
tube néon), toile/bâche. Profondeur par **couches de panneaux peints** et **bokeh
de guirlandes** ; un ciel de dusk qui vire à la nuit en toile de fond.

**Iconographie.** Pictos **peints / émaillés** et *dingbats* forains : jeton =
laiton, la roue, l'étoile, le ticket, la **main pointée** forain. On **retire les
emojis** de la fonction (set peint), mais la voix du bonimenteur garde une
ponctuation-emoji dans le **texte**.

**Le son chiptune.** **Excellent fit** : le chiptune sonne déjà penny-arcade ;
ici il devient l'**orgue de barbarie / le limonaire / la machine d'arcade**. Les
ticks = le **flapper qui claque les chevilles de la roue** (la roulette *est* une
roue de fortune — les ticks *sont* les claquements). Le battement de cœur = le
**roulement de tambour** avant la révélation. Le silence brutal = la **roue qui
s'arrête net**. Aussi cohérent que A pour le son, et **plus** cohérent pour la
roulette/le slot spécifiquement (une fête foraine, ce sont littéralement des jeux
de hasard).

**Tension visuelle du suspense** (ce territoire **possède** le suspense — il est
fait pour) :
- **Roulette** = vraie **roue de la fortune / tambour de tombola** ; l'aiguille
  est le flapper ; ticks = claquements de chevilles ; la foule fait « oooh ».
- **Jauge de duel** = le **« tape-ta-force »** (test de force forain) : le palet
  monte la tour vers la **cloche** (le seuil) ; le roulement de tambour
  s'intensifie ; cloche touchée = victoire, palet qui retombe = défaite. **Métaphore
  parfaite** du seuil et de l'attente — bien plus incarnée qu'un arc abstrait.
- **Jackpot** = machine à sous de penny-arcade / tombola ; le gain **allume les
  ampoules du fronton** en séquence et **imprime un ticket** de lot.

**Les 3 moments imposés :**
1. **Shiny 1/500 → LE GROS LOT.** Le bonimenteur se tait, un **projecteur (chaud)**
   claque, le fronton épelle « LE GROS LOT », les guirlandes **chassent** en
   cascade, un **ticket géant se déroule** avec le sprite monté comme la grande
   peluche qu'on ne gagne jamais. **Spectacle maximal, communautaire,
   screenshotable** (parfait pour le chat des 30 amis). L'énergie « partage ça ! »
   la plus forte des trois.
2. **Attente du seuil** → le **palet qui grimpe** vers la cloche, roulement de
   tambour croissant, foule qui retient son souffle. La tension est *lisible* et
   *communiquée* (on voit la marge qui reste avant la cloche).
3. **Collection vide** → le **mur à lots** du stand : crochets vides où pendront
   les prix, silhouettes des peluches à gagner, bannière peinte « GAGNE-LES
   TOUS ! », le forain qui t'invite à ton premier tour. Enjoué, joueur.

**Voix rédactionnelle.** LE **bonimenteur** — le meilleur véhicule du tutoiement
drôle. « Approche, approche ! Tente ta chance pour 10 jetons ! », « Perdu…
mais la roue tourne encore, mon ami. », tricheurs = « les resquilleurs de la
tombola », patch notes = « les nouveautés de la foire ».

**Mapping sur 03.** Couche 1 : `primary` violet = la nuit foraine ; `secondary`
amber = **les jetons/ampoules** (pile le rôle « économie » de 03). Couche 2 :
rareté = **rubans de lot** (commun→gros lot). Couche 3 : 9 panneaux/bâches biome.
Ajout : couche `--tex-enamel`/halftone, gabarit de panneau peint, guirlandes.

**Risques.**
- **Le plus proche de l'interdit** : une fête de hasard est à un pas du Vegas
  doré-néon. **Risque central.** *Parade* : religieusement
  « folk/émail/tungstène/peint », **jamais** « chrome/néon/feuille-d'or/luxe ».
  Ampoules ≠ néons, émail ≠ chrome, ticket ≠ dorure. Le brief l'exige explicitement
  (« non cliché ») — c'est le territoire qui danse le plus près de la ligne, et
  celui où un exécutant peut le plus facilement le faire **re**basculer dans le
  cliché.
- **Bruit visuel vs sprites** : signalétique peinte + ampoules peuvent **combattre**
  les sprites pixel et nuire à la lisibilité (ironie : la collection actuelle est
  déjà « une fête foraine où rien ne ressort », cf. 03/R10). *Parade* : sprites
  **toujours** sur cartes-lots propres ; la fête est le **cadre**, pas le lit du
  contenu.
- **Coût** : **le plus élevé en illustration** (panneaux peints par biome), le
  plus dur à tenir sans un bon illustrateur ; risque de « cheap » si la peinture
  n'est pas au niveau.
- **Intimité** : plus spectacle que cosy — un peu moins taillé pour le
  collectionneur solo de l'end-game que B (mais meilleur pour les moments sociaux).
- **Cohérence sprites** : **moyenne** — exige des montures-cartes disciplinées.

---

## 3. Tableau comparatif

| Critère | **A · PHOSPHORE** | **B · CARNET DE TERRAIN** | **C · GUINGUETTE** |
| --- | --- | --- | --- |
| **Émotion** | Nostalgie tactile, complicité d'initiés | Fierté intime, curatoriale, émerveillement | Spectacle festif, chaleur du bonimenteur |
| **Le mieux pour** | Roulette, jackpot, cohérence globale | Collection, end-game, shiny, états vides | Tournoi, social, jackpot, moments « partage » |
| **Différenciation** | Forte : « le jeu qui *se voit* comme il *sonne* » | Très forte : registre inédit, cosy-prestige | Moyenne-forte : assume le hasard, mais proche d'un archétype |
| **Fit sprites pixel** | ★★★ natif (pixel sur pixel) | ★★★ spécimen épinglé, voulu | ★★ exige des montures propres |
| **Fit son chiptune** | ★★★ c'est sa thèse | ★★ recontextualisé (instrument) | ★★★ orgue forain / claquements de roue |
| **Risque principal** | Proximité Nintendo (palette à discipliner) | Adrénaline trop calme + dark-first délicat | **Rebascule Vegas** + bruit vs sprites |
| **Risque kitsch** | Moyen (scanlines à doser) | Faible | **Élevé** (le plus près du cliché) |
| **Coût d'assets** | **Faible** (duotones + ~40 icônes) | **Élevé** (textures, tampons, motifs, lampe) | **Élevé** (panneaux peints par biome) |
| **Dark-first (03)** | Natif | À tenir (lampe sur fond nuit) | Natif (fête de nuit) |
| **Voix éditoriale** | Machine + pote rétro (brève, arcade) | Compagnon d'expédition (chaud, pince-sans-rire) | Bonimenteur (le plus comique) |

---

## 4. Recommandation argumentée

**Direction retenue : A · PHOSPHORE en pilier**, augmentée de deux greffes
ciblées (ci-dessous). Raisonnement de directeur artistique, sous les contraintes
réelles du projet (budget JS/asset serré de 06, dark-first et système de tokens
de 03, sprites pixel + chiptune **fixés**, cliché casino et charte Nintendo
**interdits**, communauté de 30 amis, humour à préserver) :

1. **C'est le seul territoire qui *résout* au lieu de *combattre* les deux
   identités que le jeu possède déjà.** Le diagnostic est sans appel : le jeu
   *sonne* comme une console chiptune et *affiche* des sprites pixel, mais le fond
   Material ne parle ni l'une ni l'autre langue. Phosphore fait enfin coïncider
   image, son et sprites. B doit *tordre* le son (recontextualisation) ; C ne
   règle pas la question du fond pixel. A la règle nativement.
2. **C'est le plus *buildable* dans la réalité de la refonte.** Coût d'assets le
   plus bas (9 duotones biome quasi gratuits, ~40 icônes pixel bornées), le mieux
   compatible avec le budget de 06, dark-first sans effort, et il se pose
   **intégralement sur les 3 couches de tokens de 03** (les biomes *sont* des
   modes d'écran, la rareté *est* une palette). B et C ajoutent une lourde couche
   d'illustration (textures riches / panneaux peints par biome) risquée à tenir.
3. **C'est le plus loin du cliché casino tout en honorant que le jeu est une
   petite machine à merveilles.** Il parle de lueur d'écran et de lumière, pas de
   dorure et de néon. C, à l'inverse, est le territoire qui danse le plus près de
   l'interdit — séduisant, mais un exécutant peut le faire rebasculer Vegas d'un
   mauvais réglage.
4. **Son unique risque sérieux — la proximité Nintendo — est *maîtrisable par la
   discipline*** (vert DMG interdit, coque Game Boy interdite, appareil réinventé
   en violet-nuit ; le pixel comme *traitement*, pas comme clone). Les risques de
   B (adrénaline, dark-first, coût) et de C (rebascule, coût, lisibilité) sont
   plus **structurels** que disciplinaires.

**Les deux greffes** (le geste de senior : garder A comme lane, mais lui voler
ce qui corrige sa seule faiblesse — un « objet » peut sembler froid et réservé
aux initiés) :
- **La voix de C** (le bonimenteur) sur les **moments de spectacle** — révélation
  shiny, jackpot, tournoi. Elle réchauffe l'insider-machine et sert directement
  l'humour, force n°10 de l'audit. « LE GROS LOT » sur un écran qui sature : le
  meilleur des deux.
- **Le cadrage « catalogue » de B** sur la **collection et l'end-game** : la
  « banque de données » de la console se raconte comme *l'œuvre d'une vie*
  (fierté du 146/146, du compteur shiny) — sans les textures papier coûteuses,
  juste le *sens*. Cela répond au diagnostic de 01 (« l'end-game est invisible »)
  avec l'écrin de A.

**Si le projet privilégie l'âme sur la rationalité de production**, B · CARNET DE
TERRAIN est le second choix assumé : c'est le territoire le plus *distinctif* et
le plus juste pour ce qu'est *réellement* ce jeu à long terme (une chasse aux
spécimens entre 30 amis), avec la plus belle révélation shiny et le plus bel état
vide. Je ne le retiens pas en pilier **uniquement** pour son coût et sa tension
avec l'adrénaline/le dark-first — pas pour un défaut de vision. C · GUINGUETTE
reste le meilleur réservoir de **voix et de métaphores de suspense** (le
« tape-ta-force » comme jauge de duel est le plus beau mapping des trois) — d'où
la greffe, plutôt que le pilier.

**Prochain jalon** proposé : maquetter les **3 moments imposés** (shiny, seuil de
jauge, collection vide) en Phosphore + greffes, sur les écrans réels `play` /
`gyms` / `collection`, pour valider en une planche que « le jeu se voit enfin
comme il s'entend » — avant de dérouler les 9 duotones biome et le set d'icônes.
