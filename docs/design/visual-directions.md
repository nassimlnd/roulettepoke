# Trois directions visuelles

> Synthèse des rapports UI (`docs/experts/03`) et création (`docs/experts/04`).
> Les trois directions partagent **le même squelette** (système de tokens Nuxt UI,
> grille, composants, accessibilité, dark-first — cf. `design-system.md`) et ne
> divergent que par la **peau** : matière, couleur, iconographie, traitement des
> révélations et voix éditoriale. Chacune est réalisable avec Nuxt UI ; aucune ne
> touche aux sprites `.webp`, badges Kanto ou icônes de types (assets donnés), ni
> au moteur son chiptune, ni aux règles du jeu.
>
> Deux interdits tenus par les trois : **le cliché casino** (doré + néons + effets
> gratuits) et **singer la charte Nintendo/TPC**.

## Le socle commun (identique aux 3 directions)

- **Dark-first**, rampe neutre `night` (gris teintés violet, parenté avec
  l'actuel `#0f0f1a`) pour que les joueurs reconnaissent leur jeu.
- **Rôles sémantiques Nuxt UI** : `primary` violet, `secondary` ambre (réservé à
  l'économie — coins, prix, cagnottes), `success` émeraude, `warning` orange
  (distinct de l'ambre), `error` rouge, `info` ciel.
- **Typographie** : Inter (UI/corps, chiffres tabulaires) + Bricolage Grotesque
  (titres, compteurs, « spectacle »). Segoe UI abandonné.
- **Iconographie** : fin des emojis-icônes (rendu inter-OS instable) ; les emojis
  éditoriaux (😅 du doublon) survivent **dans le texte**.
- **Composants** : Nuxt UI (UButton, UCard, UModal/UDrawer, UBadge, UProgress…) +
  customs de jeu (GameCard, RouletteStrip, DuelGauge, SlotReel…).
- **Discipline** : 3 niveaux de surface, un seul élément qui brille au repos par
  écran, bordures de rareté 2 px + halo unique.

Ce qui suit décrit **ce que chaque direction pose par-dessus ce socle.**

---

## Direction A — « PHOSPHORE » (la console de poche émancipée)

### Concept & intention
Réconcilier les deux identités que le jeu possède déjà : les sprites **sont** du
pixel, le son **est** une puce chiptune. On regarde *dans* une machine à
merveilles. Émotion : nostalgie tactile, complicité d'initiés.

### Palette
Le violet `primary` assumé comme **phosphore** (saturé à la révélation) ; ambre =
« le jeton ». Les 9 biomes deviennent **9 modes d'affichage duotone** d'un écran à
points (Forêt vert-phosphore, Mer cyan, Cave violet-noir, Désert ambre…). Fond =
trame de points très discrète (substrat `--tex-dots`), jamais un vide noir.
**Interdit** : le vert DMG Game Boy (risque licence).

### Typographie
Socle Inter/Bricolage. Le pixel vit dans les **icônes, cadres et révélations**,
**jamais** dans le corps de texte (illisible à 300 cartes en français).

### Style de composants & cartes
Surfaces = biseaux/chrome d'appareil (verre devant l'écran, léger vignettage).
GameCard = vignette sur trame de points ; carte non possédée = trame éteinte,
« ??? » à 30 %. Bordure de rareté = 2 px + halo ; shiny = liseré argent-irisé qui
*cycle* lentement.

### Fonds
Écran à points en substrat de toute l'UI ; bloom de phosphore sur les seuls
éléments allumés ; scanlines subtiles.

### Style d'animation
La bande de roulette est un **écran LCD** : à chaque carte sous l'aiguille, la
rangée de points **s'inverse** (le tick sonore et le flip pixel tombent
ensemble). Jauge de duel → **barre à segments** 80s ; à l'approche du seuil, les
segments clignotent et l'image gagne du **bruit** (scanlines qui tremblent) ;
franchissement = l'écran **« s'éteint »** (pendant visuel du silence sonore).

### Success states
- Commun/rare : flip de dots + fanfare existante.
- **Shiny/légendaire** : l'écran **« sature »** (glitch de scanlines, brownout
  inversé), puis le sprite se résout en palette argent-irisée qui *cycle*, badge
  ✦ pixel, `NOUVEAU ✦` en Bricolage. Diégèse : « l'appareil rend ça pour la
  première fois ».

### Résultat final (combat/ligue)
Écran de tableau de bord : segments, color-cycling à la victoire, effondrement du
phosphore à la défaite.

### Mobile / desktop
La trame de points et les duotones sont **résolution-indépendants** (zéro coût
responsive) ; identiques sur les 5 tailles. Le bloom est plafonné sur mobile
(mode éco).

### Avantages
- **Cohérence maximale** avec sprites pixel + son chiptune (natif, jamais collé).
- **Coût d'assets le plus bas** (duotones quasi gratuits, ~40 icônes pixel).
- Dark-first sans effort ; se pose intégralement sur les 3 couches de tokens.

### Risques
- **Proximité Nintendo** (maîtrisable par discipline : pas de vert DMG, pas de
  coque Game Boy, appareil réinventé en violet-nuit).
- Kitsch CRT si les scanlines sont trop appuyées (retenue exigée).
- Peut sembler « froid/pour initiés » (corrigé par la voix — cf. recommandation).

### Complexité technique
**Faible.** Duotones = un token + une densité de trame par biome. Icônes pixel =
travail borné. Le plus compatible avec le budget JS/asset de l'architecture.

---

## Direction B — « CARNET DE TERRAIN » (le naturaliste de nuit)

### Concept & intention
La collection comme **œuvre d'une vie**, cataloguée à la lampe. Un bureau de
terrain la nuit : plateau sombre, flaque de lumière chaude, fiches crème.
Émotion : fierté intime, curatoriale, puis frisson de la rareté. Le plus
**cosy + prestige** — taillé pour l'end-game des 30 amis.

### Palette
`neutral` glisse vers **crème/noyer** (surfaces = papier/bureau), `primary` violet
en accents, ambre = **le doré du sceau** (rareté/économie). On **garde le
`night-950`** de fond, réchauffé et texturé. Les 9 biomes = **9 papiers teintés**
(Forêt herbier vert, Mer carte de marée, Montagnes kraft à courbes de niveau,
Ville papier millimétré…).

### Typographie
Socle Inter/Bricolage + touches manuscrites (annotations de marge, étiquettes).

### Style de composants & cartes
Fiches cartonnées qui se chevauchent comme un album ; scotch, agrafe, gaufrage
typo (deboss), encre qui bave. GameCard = spécimen épinglé sur fiche crème (le
sprite pixel « a l'air voulu »). Non possédée = fiche vierge « N°001 ___ vu le
__/__ ».

### Fonds
Grain de papier réel, retombée radiale de la lampe, vignettage de bureau. La
lampe éclaire **les cartes**, pas la page (tenir l'identité sombre).

### Style d'animation
Roulette = **pellicule de piège-photo** qui défile, aiguille = réticule de
viseur. Jauge de duel = **sismographe** sur papier millimétré ; à l'approche du
seuil, l'aiguille tressaute et **la lampe vacille** (la tension est dans la
lumière) ; seuil franchi = la lampe **s'éteint**, la carte se fane en spécimen
pressé.

### Success states
- Commun/rare : la fiche se remplit, tampon « VU LE 20/07 ».
- **Shiny** (le joyau) : **spécimen aberrant** monté en nouvelle planche, **sceau
  de cire / gaufrage doré** pressé sur la fiche, la lampe **flambe** chaud,
  exclamation manuscrite en marge. Prestige, pas flash de machine à sous.

### Résultat final
Planche d'album, tampon de résultat, mot manuscrit du chef d'expédition.

### Mobile / desktop
Textures en webp/SVG **tuilé minuscule** (jamais de grandes images — contrainte
budget). L'album à fiches empilées s'adapte : 3 colonnes mobile → planche large
desktop.

### Avantages
- **Le plus distinctif** (registre inédit dans le genre) et le plus juste pour ce
  qu'est le jeu à long terme (chasse aux spécimens entre amis).
- **La plus belle révélation shiny** et le plus bel état vide.
- Cohérence sprites excellente (spécimen épinglé = appariement classique).

### Risques
- **Adrénaline** : un carnet calme contre la dopamine de la roulette (le jackpot
  extraverti est le plus dur à tenir ici).
- Dark-first délicat (le papier est clair — risque de dériver « jour »).
- **Coût d'assets le plus élevé** (textures, tampons, filigranes, lampe, motifs).

### Complexité technique
**Élevée.** Le plus riche en textures et en couches d'éclairage — attention au
budget JS/asset.

---

## Direction C — « GUINGUETTE » (la fête foraine folk)

### Concept & intention
Assumer que le jeu **est** un jeu de hasard (roulette, slot, tombola) — mais le
reprendre au cliché Vegas via le registre **folk / vernaculaire / vintage** : la
fête foraine itinérante, la guinguette, la tombola de kermesse, la Lotería. La
fête **la nuit**, éclairée aux **ampoules chaudes** (jamais de néon). Émotion :
spectacle festif, chaleur du bonimenteur. Le mieux pour le **social**.

### Palette
`primary` violet = la nuit foraine ; **ambre = les jetons/ampoules** (pile le
rôle économie du socle). Rareté = **rubans de lot** (commun → gros lot). Les 9
biomes = **9 baraques** de l'allée centrale, chacune sa bâche colorée.
**Interdit** : chrome, néon, feuille d'or, luxe.

### Typographie
Socle + lettrage forain peint (Fred Fowle) sur les titres de spectacle.

### Style de composants & cartes
Bois peint veiné, émail écaillé, plaques émaillées de bistrot, tickets de tombola
en rouleau. GameCard = carte-lot propre (les sprites **toujours** sur montures
disciplinées, la fête est le cadre pas le lit du contenu).

### Fonds
Ciel de dusk qui vire à la nuit, guirlandes d'ampoules à filament (festoon),
bâches rayées, bokeh chaud. Profondeur par couches de panneaux peints.

### Style d'animation
Roulette = vraie **roue de la fortune / tambour de tombola**, aiguille = flapper,
ticks = claquements de chevilles, la foule fait « oooh ». Jauge de duel = le
**« tape-ta-force »** forain : le palet monte vers la **cloche** (le seuil),
roulement de tambour croissant, cloche = victoire, palet qui retombe = défaite
(la plus belle métaphore de seuil des trois).

### Success states
- Commun/rare : ampoule qui s'allume, ticket imprimé.
- **Shiny** (LE GROS LOT) : le bonimenteur se tait, **projecteur chaud**, le
  fronton épelle « LE GROS LOT », les guirlandes **chassent** en cascade, un
  **ticket géant se déroule** avec le sprite. Spectacle communautaire,
  **screenshotable** (parfait pour le chat des amis).

### Résultat final
Fronton qui s'allume en séquence, ticket de lot, foule.

### Mobile / desktop
Un **gabarit de panneau peint** + couleur/bâche/motif par biome (systématisable).
Sur mobile, réduire le nombre de guirlandes (mode éco) ; le panneau reste.

### Avantages
- Le plus **immédiatement fun** et le meilleur pour les moments sociaux (tournoi,
  classement, jackpot).
- **Le meilleur réservoir de voix comique** (le bonimenteur) et de métaphores de
  suspense (le tape-ta-force).
- Son chiptime excellent (orgue de barbarie, roue qui claque).

### Risques
- **Le plus proche de l'interdit** (une fête de hasard est à un pas du Vegas) —
  discipline « folk/émail/tungstène » absolue exigée, risque de rebascule élevé.
- **Bruit visuel** qui peut combattre les sprites (montures disciplinées
  obligatoires).
- **Coût d'illustration le plus élevé** (panneaux peints par biome), « cheap »
  si la peinture n'est pas au niveau.

### Complexité technique
**Élevée** (illustration), et le plus **risqué** au niveau direction (un mauvais
réglage le fait basculer dans le cliché).

---

## Tableau comparatif

| Critère | A · PHOSPHORE | B · CARNET | C · GUINGUETTE |
| --- | --- | --- | --- |
| Émotion | Nostalgie tactile, initiés | Fierté curatoriale, émerveillement | Spectacle festif, bonimenteur |
| Le mieux pour | Roulette, jackpot, cohérence globale | Collection, end-game, shiny, états vides | Tournoi, social, moments « partage » |
| Fit sprites pixel | ★★★ natif | ★★★ voulu | ★★ montures propres exigées |
| Fit son chiptune | ★★★ (sa thèse) | ★★ recontextualisé | ★★★ orgue forain |
| Risque principal | Proximité Nintendo (disciplinable) | Adrénaline calme + dark-first | **Rebascule Vegas** + bruit |
| Risque kitsch | Moyen | Faible | **Élevé** |
| Coût d'assets | **Faible** | Élevé | Élevé |
| Dark-first | Natif | À tenir | Natif |
| Voix | Machine + pote rétro | Compagnon d'expédition | Bonimenteur (le + drôle) |

## Propositions par écran (pour comparer structure & ambiance)

### Écran `play` (roulette)
- **A** : bande = écran LCD, dots qui s'inversent sous l'aiguille ; hub en
  « banque de données » ; résultat qui sature l'écran pour un shiny.
- **B** : bande = pellicule de piège-photo, aiguille-réticule ; hub = double page
  de carnet ; résultat = fiche qui se remplit / se scelle.
- **C** : bande = roue de la fortune, flapper qui claque ; hub = allée de la
  fête ; résultat = ticket qui se déroule.

### Écran `collection`
- **A** : grille de vignettes sur trame de points, non possédées = dots éteints,
  « banque de données 134/151 » ; le shiny cycle sa palette.
- **B** : album à fiches crème, spécimens épinglés, tiroir de fiches, sceaux dorés
  sur les légendaires ; l'écrin qui rend le 146/146 mérité.
- **C** : mur à lots, cartes-lots pendues aux crochets, bannière « GAGNE-LES
  TOUS ! ».

### Écran `gyms` (jauge de duel)
- **A** : barre à segments 80s, scanlines qui tremblent au seuil, écran qui
  s'éteint à la défaite.
- **B** : sismographe sur papier millimétré, lampe qui vacille puis s'éteint.
- **C** : tape-ta-force, palet qui grimpe vers la cloche, roulement de tambour.

### Moment de résultat (shiny 1/500)
- **A** : surcharge écran → palette argent-irisée qui cycle → `NOUVEAU ✦`.
- **B** : spécimen aberrant → sceau de cire doré → lampe qui flambe → note
  manuscrite.
- **C** : « LE GROS LOT » → projecteur + guirlandes en cascade → ticket géant.

## Recommandation (détaillée dans la synthèse finale)

Le rapport création recommande **A · PHOSPHORE en pilier** (seul territoire qui
*résout* les identités existantes au lieu de les combattre ; coût le plus bas ;
le plus loin du cliché ; risque licence disciplinable), **augmenté de deux
greffes** : la **voix de C** (le bonimenteur) sur les moments de spectacle
(shiny, jackpot, tournoi), et le **cadrage « catalogue » de B** sur la collection
et l'end-game. Second choix assumé si l'on privilégie l'âme : **B**. La
recommandation finale argumentée et la décision à valider sont dans
`docs/RECOMMANDATION-FINALE.md`.

**Prochain jalon proposé avant tout code** : maquetter les **3 moments imposés**
(shiny, seuil de jauge, collection vide) dans la direction retenue, sur les
écrans réels `play` / `gyms` / `collection` — valider en une planche que « le jeu
se voit enfin comme il s'entend ».
