# 07 — Expert Accessibilité : audit a11y et prescriptions pour la refonte

> Base : `docs/audit/frontend-issues.md` (M5), `ui-inventory.md`,
> `states-inventory.md`, `docs/experts/03-ui-designer.md` (palette proposée) +
> captures (`artifacts/screenshots/` : home, roll-result, gyms, slot-machine,
> collection, leaderboard, home-mobile, tournament replay, nav dropdown).
> Cible : `web/` (Nuxt 4.5, @nuxt/ui 4.10 — sur Reka UI, Tailwind v4, Lucide).
> Référentiel : **WCAG 2.2 niveau AA** (+ quelques AAA quand le projet le vise,
> ex. cibles 44 px). Ratios calculés avec la formule de luminance relative WCAG
> (sRGB), script vérifiable en annexe.
> Portée : audit **prescriptif pour la refonte**, pas de correctif sur l'ancien code.

---

## 1. Synthèse

L'existant échoue sur **6 des 7 piliers** WCAG opérables/perceptibles : zéro
`prefers-reduced-motion` (25 keyframes non désactivables), overlays sans focus
trap ni Escape ni `role="dialog"`, information portée par la couleur seule
(raretés, jauges, points rouges), emojis porteurs de sens sans alternative
(`🪙`=monnaie, `✦`=shiny, `✅`/`❌`=résultat), cibles tactiles < 40 px et aucune
région `aria-live` pour un jeu qui est **fait d'événements dynamiques** (tirage
de 4 s, jauge de duel, jackpot, solde de coins). Un joueur au lecteur d'écran ne
peut aujourd'hui **ni lancer une roulette au clavier, ni savoir ce qu'il a
gagné** ; un joueur sensible au mouvement subit 4 s de défilement inévitable.

Bonne nouvelle : la refonte règle **structurellement** la moitié du problème.
Nuxt UI v4 (Reka UI) fournit gratuitement le focus trap, Escape, le retour du
focus, `role="dialog"`/`aria-modal`, les toasts en région live, la gestion du
focus des menus/onglets. Le travail restant est ciblé : (1) **discipliner la
palette** — la refonte proposée est presque bonne mais laisse passer **5 couples
défaillants** (voir §2), dont le **bouton d'action principal** ; (2) **doubler
chaque couleur d'une info non-couleur** ; (3) **instrumenter les moments de jeu
custom** (roulette, jauge, slot, capture) en `aria-live` **et** en variante
`reduced-motion` — sans tuer le théâtre, qui est l'âme du jeu.

Principe directeur : **`reduced-motion` et le lecteur d'écran ne retirent jamais
d'information ni de récompense**. On remplace le mouvement par *(état final direct
+ texte/log + son réglable)* et on annonce le gain en clair. Le suspense se
conserve par le son et un micro-délai, pas par 4 s de translation obligatoire.

---

## 2. Contrastes — ratios calculés

### 2.1 Existant : les couples réellement observés

| Couple (texte / fond) | Ratio | Verdict WCAG | Constat |
| --- | --- | --- | --- |
| `#e0e0e0` / `#0f0f1a` (corps sur fond) | **14.4:1** | AAA | Baseline saine ✓ |
| `#e0e0e0` / `#1a1a2e` · `#1e1e2e` (surfaces) | 12.9 · 12.4:1 | AAA | ✓ |
| **hint `#888` / `#1a1a2e`** | **4.81:1** | AA (zéro marge) | ⚠️ passe de justesse ; `#777`=3.81 et `#808080`=4.32 **échouent**. Les hints faibles (« Toutes les cartes sont révélées. ») sont sur le fil. |
| hint `#aaa` / `#1a1a2e` | 7.34:1 | AAA | ✓ |
| accent `#bb86fc` / `#0f0f1a` · `#1a1a2e` | 7.18 · 6.44:1 | AAA·AA | ✓ **comme texte/lien** |
| **blanc `#fff` / bouton `#bb86fc`** | **2.65:1** | **ÉCHEC** | 🔴 **Le bouton « Lancer » — l'action centrale du jeu — a un texte illisible.** |
| or `#ffd700` / `#0f0f1a` · `#1a1a2e` · `#1e1e2e` | 13.6 · 12.2 · 11.7:1 | AAA | ✓ Les **compteurs dorés sur sombre ne sont PAS un problème de contraste** (le souci de l'or est hiérarchique/esthétique — cf. designer — et le fait qu'un *fond* or plein reçoive du texte, voir badges biome). |
| argent shiny `#dcdddf` / `#0f0f1a` | 14.0:1 | AAA | ✓ |
| succès `#4caf50` / `#0f0f1a` | 6.85:1 | AA | ✓ (jauge/texte) |
| warning `#ff9800` / `#0f0f1a` | 8.83:1 | AAA | ✓ |
| erreur `#f44336` · `#ef5350` / `#0f0f1a` | 5.17 · 5.46:1 | AA | ✓ **comme texte** (le souci des jauges est la couleur *seule*, §5, pas le contraste) |

**Badges biome colorés** (fond saturé + texte blanc, mesuré sur captures — valeurs
estimées mais directionnellement certaines) :

| Badge | Ratio (blanc/fond) | Verdict |
| --- | --- | --- |
| Blanc / vert `#4caf50` (Plaines/Forêt clair) | **2.78:1** | **ÉCHEC** |
| Blanc / orange `~#e07b1a` (Désert) | **2.99:1** | **ÉCHEC** |
| Blanc / bleu `~#2196f3` (Lac) | 3.12:1 | Échec (texte normal) |
| Blanc / vert foncé `~#3d8b40` | 4.23:1 | Échec (texte normal) |
| Blanc / gris `~#5a5a6e` (Montagnes) | 6.73:1 | AA ✓ |

→ **Les badges biome à fond de couleur moyenne + texte blanc échouent.** À corriger
par la recette « texte clair sur fond *teinté sombre* » (§2.3), pas fond saturé.

### 2.2 Palette proposée (03-ui-designer) : vérification

| Couple | Ratio | Verdict |
| --- | --- | --- |
| primary `violet-400 #a78bfa` / `night-950` | **7.03:1** | AAA — la cible designer « ≥ 4.5 » est **tenue, et dépassée** ✓ |
| primary `violet-400` / `night-800` (sur carte) | 5.64:1 | AA ✓ |
| secondary `amber-400 #fbbf24` / night-950 · 800 | 11.5 · 9.2:1 | AAA ✓ (coins/prix) |
| success `emerald-400` · info `sky-400` · warning `orange-400` / 950 | 9.9 · 8.9 · 8.5:1 | AAA ✓ |
| error `red-400 #f87171` / night-950 | 6.92:1 | AA ✓ |
| texte `night-100 #ececf4` / 950 · 800 | 16.3 · 13.1:1 | AAA ✓ |
| **muted `night-400 #9494b0`** / 950 · 900 · 800 | 6.49 · 5.97 · **5.20:1** | AA ✓ **partout** — remplace avantageusement le `#888` actuel (qui plafonne à 4.81). **À adopter comme couleur de hint.** |
| rarity rare/épique/légendaire/shiny (texte) / 950 | 8.9 · 7.8 · 11.5 · 15.5:1 | AAA ✓ |
| **rarity-common `night-500 #757591` en TEXTE** / 950 · 800 | 4.29 · **3.44:1** | ⚠️ **Échec comme texte de corps.** OK comme *bordure* neutre (≥3:1). Si utilisé comme texte → éclaircir à ≥ `#8a8aa6` (4.58 sur carte). |
| **blanc `#fff` / bouton solid `violet-500 #8b5cf6`** | **4.23:1** | ⚠️ **AA-large uniquement → échoue pour un libellé de bouton 14-16 px.** |

**Deux corrections à imposer à la palette proposée :**

1. **Boutons `solid primary`** : `white/violet-500` = 4.23 (insuffisant). Options
   validées : bg `violet-600 #7c3aed` → **5.70:1** ✓, ou bg `violet-700` → 7.10 ✓,
   ou **texte sombre `night-950` sur `violet-400`** → **7.03:1** ✓. Vérifier le
   shade que Nuxt UI applique réellement au variant `solid` et le forcer si besoin.
   (Mode clair : liens `violet-500` sur blanc = 4.23 → utiliser `violet-600`.)
2. **rarity-common** : ne l'utiliser que comme *bordure/fond*, jamais comme texte
   sans l'éclaircir.

### 2.3 Type-badges proposés : la recette actuelle échoue pour 5 types sur 15

Recette designer §2.4 = *texte 85 % type + 15 % blanc* sur *fond type@18 %*. Calcul
sur `night-800` (carte) :

| Type OK (≥4.5) | Types **en échec** (ratio sur carte) |
| --- | --- |
| normal, feu, eau, plante, electrik, glace, sol, vol, insecte, roche | **dragon 2.98** · **spectre 3.10** · **combat 3.06** · **poison 3.14** · **psy 4.46** |

→ Les types **sombres** (dragon, spectre, combat, poison, psy) ne passent pas :
teinter le texte avec le type sature vers une couleur trop sombre.

**Correction recommandée — texte clair fixe sur fond teinté** (au lieu de texte
couleur-type). `text = night-100 #ececf4`, `bg = type@22 % sur night-800`,
`border = type@45 %`, **+ icône du type** pour l'identité :

| Résultat de la recette corrigée | Ratio |
| --- | --- |
| **Les 15 types** (dragon → glace) | **7.6 – 11.4:1 — tous AAA** ✓ |

L'identité du type reste portée par (a) la **teinte de fond**, (b) la **bordure**,
(c) l'**icône Lucide du type**, (d) le **nom en toutes lettres** — jamais par la
couleur du texte seule. Un `TypeBadge` encapsule la recette : plus aucun risque de
régression par type. (Même logique pour les 9 biomes.)

> Note 1.4.11 (contraste non-texte) : l'arc de jauge, l'aiguille et le seuil, les
> bordures de rareté, l'anneau doré des pips de badges doivent atteindre **≥ 3:1**
> contre leur fond. Les bordures type@60 % descendent à 1.7-2.7:1 pour 6 types :
> une bordure de couleur-type **ne suffit pas** comme seul indicateur non-texte —
> d'où l'icône + le texte.

---

## 3. Navigation clavier — parcours complet à implémenter

Ordre de tabulation par page : **skip-link → header (logo, nav, notifs, HUD,
déconnexion) → contenu `main` → aside → chat**. `focus-visible` (anneau
`ring-2 ring-primary/60 ring-offset-2`) **jamais supprimé** — y compris sur
PokeCard, pips, cellules de grille (le designer l'a prescrit §2.6, à tenir).

**Roulette (le cœur) :**
- Bouton **« Lancer »** focusable, déclenché **Entrée/Espace**.
- Pendant le spin (4 s) : le bouton passe `:loading` (`aria-busy`, `disabled`)
  **mais garde le focus** (ne pas renvoyer le focus dans le vide) ; à la fin, le
  focus reste sur « Lancer » (rejouable) — ou passe au bouton « Continuer » de la
  modale de célébration si épique+ (voir §4).
- Onglets de mode de révélation (`UTabs`) : flèches ←/→, `aria-selected`.
- « Filtrer par biome » = `UPopover`/`UDrawer` déclenché clavier, options
  navigables. Toggle ×5 = bouton `aria-pressed` ou `USwitch` étiqueté.

**Menus dropdown navbar** (`UNavigationMenu`/`UDropdownMenu`) : ouverture
Entrée/Espace/flèche bas, navigation flèches, `Home`/`End`, **Escape ferme et rend
le focus au déclencheur**. Un seul ouvert à la fois (déjà le cas). Le point rouge
« Social • » doit être annoncé (§5).

**Sélecteur d'avatar en grille** : `role="radiogroup"` (un seul choix) ou grille
2D `role="grid"` ; **navigation aux flèches** (↑↓←→), `Enter`/`Espace` sélectionne,
option courante `aria-checked`/`tabindex` roving (une seule tabstop pour tout le
groupe). Onglets Standards/Shiny au-dessus (`UTabs`). Chaque option a un nom
accessible (« Avatar Pyroli shiny »).

**Kanban de suggestions** : colonnes = régions (`aria-label` « À faire », etc.),
cartes focusables. **Si drag-and-drop, fournir une alternative clavier**
obligatoire (2.1.1) : bouton/menu « Déplacer vers → colonne X » sur chaque carte,
ou raccourcis, avec annonce du déplacement en `aria-live`. Votes 👍/👎 = boutons
`aria-pressed` (§5, §6).

**Slot machine** : sélecteur de mise (1 ligne / 3 lignes / 3+diag) =
`role="radiogroup"` ou `UTabs` (flèches) ; bouton « Jouer » focusable ; les
numéros de ligne latéraux sont **décoratifs** (pas des tabstops).

**Modales** : voir §7 (trap + Escape + retour focus fournis par Nuxt UI ; cas du
choix forcé et du replay à border).

---

## 4. Lecteurs d'écran — quoi annoncer, et comment

Règle transversale : **ne jamais mettre `aria-live` sur les éléments qui
s'animent** (les 20 cartes qui défilent, les ~33 ticks/s du slot, le count-up des
coins) — ça noierait l'utilisateur. On met une **région de statut dédiée**,
visuellement masquée (`sr-only`), mise à jour **une fois** avec le texte final.

**Tirage de 4 s** — `aria-live="polite"` (jamais `assertive` : il interromprait la
fanfare et le contexte) + `aria-busy` :
1. Au clic : `aria-busy="true"`, statut = « **Tirage en cours…** ».
2. Pendant le spin : **rien** (la bande n'est pas live).
3. À la révélation : un texte **unique et complet** →
   « **Vous avez obtenu Pyroli, type Feu, carte rare, nouvelle carte !** » ou, si
   doublon : « **… carte rare, doublon — vous en possédez maintenant 3.** »
   `aria-busy="false"`.
4. **Épique/légendaire/shiny** : la modale plein écran (designer R2) **prend le
   focus** → un `<h2>` lu (« Légendaire ! Pyroli »), corps décrivant le gain, bouton
   « Continuer » focusé. Là, l'annonce forte est portée par le **déplacement de
   focus + role dialog**, pas besoin d'`assertive`.

**Jauge de duel (`DuelGauge`)** — verdict sur `role="meter"` : sémantiquement
correct, **mais support SR inégal** (NVDA/JAWS/VoiceOver lisent `meter` de façon
inconstante). Pattern robuste recommandé :
- SVG en `role="img"` + `aria-label` décrivant l'**état final** :
  « Jauge : score 29 %, seuil de victoire 55 %. » (l'aiguille animée n'expose rien
  frame par frame).
- **+ région `aria-live="polite"`** qui annonce la **résolution** :
  « **Score 29 %. Victoire !** » (ou « Défaite. »).
- Si l'on tient à `role="meter"` : fournir `aria-valuenow/min/max` **figés à la fin**
  + `aria-valuetext="29 %, seuil 55 %"` — **ne pas** animer `aria-valuenow`.
- La **légende** doit être du **texte** (« Victoire si score < 55 % ») et non les
  seuls `✅`/`❌` colorés (cf. capture replay).

**Jackpot** — résultat **par ligne**, à l'arrêt des rouleaux (pas pendant) :
`aria-live="polite"` →
« **Rouleaux arrêtés. Ligne 1 : Banque, Banque, Carte — perdue. Ligne 2 : … .** »
puis le bilan : « **Gain : 1 ticket de biome !** » ou « **Aucun gain aujourd'hui.** ».

**Compteur de coins (`CoinCounter`)** — le count-up visuel est `aria-hidden="true"` ;
une région `sr-only aria-live="polite"` annonce **une seule fois la valeur finale ou
le delta** : « **+5 pièces, solde 185 pièces.** » (Ne jamais laisser un `aria-live`
sur le nombre qui s'incrémente : il égrènerait 40 valeurs.)

**Toasts / notifications** : succès = `polite` ; **erreurs = `assertive`/`role=alert`**
(UToast le gère via `UApp`). Trade reçu, vente, erreur réseau → un canal unique.

---

## 5. Information par couleur seule (WCAG 1.4.1)

| Cas actuel | Doublage prescrit |
| --- | --- |
| **Bordures de rareté** (or/argent/bleu/violet/rose) — seule marque de rareté | Ajouter un **badge de rareté en coin** (icône distincte **+ texte** « Rare / Épique / Légendaire / Shiny ») ; **commun = aucune décoration** ; la rareté entre dans l'`aria-label` de la carte. Un pictogramme *par* rareté (pas juste une couleur d'angle). |
| **Jauges vert/rouge** (duel, capture, estimation) | (a) **% en texte** (déjà présent, à garder) ; (b) **seuil marqué + libellé texte** « Victoire si < 55 % » ; (c) distinguer zone gagnante/perdante sans couleur → **motif** (hachures sur la zone perdante) ou icônes aux extrémités ; (d) **résultat en toutes lettres** « Victoire »/« Défaite », pas seulement `✅`/`❌`. Barre d'estimation (`UProgress`) : **% écrit**, pas la couleur seule. |
| **Badges navbar « point rouge »** (Social •, Échanges •) sans nombre | `UChip` **avec un nombre** (« 3 ») + `aria-label` (« Social, 3 nouveautés »). Un point coloré seul = info par couleur **et** sans texte. |
| **Votes 👍/👎** | État voté via `aria-pressed` + **icône remplie vs vide** (forme, pas couleur) + libellé. |
| **Leaderboard** : nombres en gras (146) vs normal (145) encodant « record du jeu » | Si le gras porte du sens, ajouter un **libellé/légende** (« record » via `title`/icône) — la graisse seule n'est pas perceptible par tous. |
| Badges **biome** | Déjà doublés par le **nom écrit** → OK côté information ; seul le **contraste** est à corriger (§2.1). |

---

## 6. Emojis — politique et cas critiques

**Politique** (aligne designer R8) :
- Emoji **fonctionnel / porteur de sens** → **icône Lucide + `aria-label`**, ou s'il
  est conservé, `aria-hidden="true"` **ET** un **texte équivalent** à côté.
- Emoji **décoratif** (ton éditorial : patch notes, anecdotes, classement des
  tricheurs — **à préserver**) → simplement `aria-hidden="true"`.
- **Jamais** un contrôle interactif dont le **seul** nom accessible est un emoji.

**Cas critiques (porteurs de sens, à traiter en priorité) :**

| Emoji | Sens actuel | Prescription |
| --- | --- | --- |
| **`🪙`** | **la monnaie** (« 6 🪙 », « Lancer (10 🪙) ») | `i-lucide-coins` + le mot **« pièces »**. Le compteur se lit « **6 pièces** » ; le coût « **Lancer, 10 pièces** ». Aujourd'hui un SR lit « pièce de monnaie » ou rien. |
| **`✦` / `✨`** | **shiny** / événement | `✦` (carte shiny, « ✦ ??? ») → **badge « Shiny »** icône + `aria-label="Shiny"`. `✨` (« ✨ Vous avez obtenu ») décoratif → `aria-hidden` (le texte porte le sens). |
| **`✅` / `❌`** | **résultat** victoire/défaite (jauge, duel, coûts) | Remplacer par **icône + TEXTE** « Victoire »/« Défaite »/« Pas assez de pièces ». Ne jamais laisser `✅`/`❌` **seuls** encoder le résultat (cf. légende de jauge). |
| **`🔒`** | verrouillé | `i-lucide-lock` + texte « Verrouillé — … » (déjà du texte présent : garder + `aria-hidden` sur l'emoji). |
| **`🥇🥈🥉`** | rang 1-3 (remplacent le **numéro**) | Conserver le **rang chiffré** accessible : `aria-label="1re place"` (sinon le rang top-3 disparaît pour les SR). |
| `⏳` `🥊` `⚔️` `🎰` `🎒` `💰` `🆙` | cooldown / actions / nav | Lucide + `aria-label` (« Vendre », « Fusionner », « Combattre »…). Emoji redondant avec un texte présent → `aria-hidden`. |

Navbar (« Tournoi 🏆 », « Tchat 💬 », « Échanges 🔄 ») : texte déjà porteur →
`aria-hidden` sur l'emoji, acceptable.

---

## 7. Modales & notifications avec Nuxt UI

**Ce que Nuxt UI v4 (Reka UI) apporte gratuitement** — règle m1/M5 d'un coup :
`role="dialog"` + `aria-modal`, **focus trap**, **Escape**, **retour du focus au
déclencheur**, `aria-labelledby`/`describedby` (si titre/description fournis),
scroll-lock. `UToast` (via `UApp`/Toaster) : région live, empilement, pause au
survol.

**Ce qu'il faut AJOUTER / surveiller** (Nuxt UI ne le devine pas) :

- **Un nom accessible à CHAQUE overlay** : `UModal :title` ou un `<h2>` relié par
  `aria-labelledby`. Un dialog sans nom = violation `dialog` (axe-core).
- **Choix de carte forcé** (`:dismissible="false"`) : Escape et clic-dehors sont
  retirés à dessein — **mais** garder un **focus trap fonctionnel**, rendre les 2
  options **focusables et sélectionnables au clavier** (Tab/flèches + Entrée), et
  afficher « **Choix obligatoire** ». **Ne jamais** supprimer le seul moyen d'agir
  au clavier (2.1.2 : pas de piège).
- **Replay plein écran** (`:dismissible="false"` + « Passer ») : bouton
  « Passer / Fermer » **focusable** et **Escape autorisé à la fin** — ne pas
  emprisonner l'utilisateur. Contrôles ×1/×2/×4 = `radiogroup`/`UButtonGroup` avec
  `aria-pressed` et libellés (« Vitesse 2× »).
- **Toasts** : entrée respectant `prefers-reduced-motion` ; **durée suffisante**
  (2.2.1) ou **persistants pour les erreurs** ; une action critique (« Réessayer »)
  ne doit **pas** exister *uniquement* dans un toast qui disparaît → la doubler
  (bandeau/`UAlert` réseau, modale de reconnexion pour un 401).
- **`UDrawer` mobile** (snap points) : rester fermable **au clavier** et via un
  **bouton visible** (le handle seul est insuffisant au clavier).
- **`UBanner`** (tournoi/version) : dans le flux (plus de `position:fixed` qui
  chevauche — M2), bouton fermer avec `aria-label` « Fermer la bannière », dismiss
  persisté par `id`.
- **`UModal fullscreen` de célébration** : reçoit le focus, `<h2>` lu, bouton
  « Continuer » — c'est le vecteur d'annonce des gros gains (§4).

---

## 8. Animations réduites — équivalent informationnel par moment de jeu

`@media (prefers-reduced-motion: reduce)` **+ réglage utilisateur persistant** (le
média système ne suffit pas — cf. panneau Réglages, designer R9). **Aucune
information ni récompense perdue** : mouvement → *(état final direct + texte/log +
son réglable)*.

| Moment | Version normale | Version reduced-motion (information **équivalente**) |
| --- | --- | --- |
| **Roulette (spin 4 s + flip)** | translation Bézier + flip | **Crossfade court (~0.4-0.6 s)** vers la carte gagnante au centre + **micro-compte à rebours/fondu** (garde un soupçon de tension) + **fanfare** (son) + **annonce live**. On sait *quoi*, *rareté*, *nouveau/doublon*. |
| **Multi-roll ×5** | 5 bandes/cascade | Les 5 résultats en **fondus courts successifs** (ou d'un bloc) + **récap** — pas 5 roulettes. |
| **Jauge de duel** (aiguille au ralenti + battement de cœur) | montée animée | **Position finale affichée directement** (ou barre statique) + **% + résultat en texte** + entrée dans un **log**. Son de tension conservé (réglable séparément). |
| **Slot machine** (rouleaux + arrêts décalés + glow) | rouleaux qui tournent | **Grille finale en fondu** + **surbrillance statique** des lignes gagnantes (bordure, pas de glow pulsé) + **annonce des gains**. |
| **Capture légendaire** (8 keyframes pokéball) | throw/shake/open/sparkle | **Séquence d'états avec libellés** : « Lancer… » → « 1 secousse » → « 2 secousses » → « **Capturé !** » / « **Échappé.** », fondus ≤ 200 ms, sans shake/scale. Tension par le **texte progressif + son**. |
| **Combat replay** (fighter-enter, ko-fall, ko-label) | entrées/chutes animées | **Transitions d'opacité** ; le **log round par round** (déjà présent) porte l'info. |
| **Célébration plein écran / confetti** (designer R2) | particules | **Pas de particules** : fond dégradé **statique** + carte + fanfare + texte « **Légendaire !** ». |
| **Nouvelle découverte** (`rainbow-border` animée) | bordure arc-en-ciel animée | **Bordure fixe + badge « Nouveau »** (texte). |
| **Micro-anims** (pop, fadeInUp, modalScale, card-shine, glow) | scale/translate | **Apparition instantanée ou fondu ≤ 200 ms**, sans scale/translate ; **1 seul** glow au repos → 0 en reduced. |

Contrôle : aucune translation/scale > 200 ms sous `reduce` ; **résultats
identiques** (mêmes gains, mêmes annonces). Respecter aussi 2.3.1 (pas plus de 3
flashs/s) sur les glows/fanfares visuelles.

---

## 9. Zones tactiles, lisibilité mobile & structure

**Cibles tactiles — min 44 × 44 px** (prescription projet, dépasse le AA 2.5.8 =
24 px ; atteint le AAA 2.5.5). Cas observés à risque :

| Élément | Problème | Prescription |
| --- | --- | --- |
| **Pips de badges** (leaderboard : 8 mini-badges ; barre de progression) | minuscules | Si **interactifs** (tooltip au tap) → cible ≥ 44 (zone élargie autour de l'icône) ; sinon non-interactifs = pas de contrainte de taille mais lisibilité. |
| **Votes 👍/👎** (suggestions) | < 40 px, collés | ≥ 44 × 44, **≥ 8 px** entre les deux. |
| **Boutons de mise / lignes du slot** | étroits | ≥ 44 de haut. |
| **Croix de fermeture** (replay `✕`, modales `×`) | ~24 px | **Zone cliquable 44 × 44** (icône 20-24 centrée dedans). |
| **Boutons vendre/fusionner** sur cartes | étroits sur mobile | ≥ 44 de haut, ou **déplacés en drawer** (designer les sort de la grille — bien). |
| Onglets révélation, « Filtrer par biome », toggle ×5, liens du menu mobile | à vérifier | ≥ 44 sur mobile. |

**Lisibilité mobile :**
- **Tailles** : corps **≥ 16 px** (designer `body`=1rem ✓), `body-sm` 14 px pour la
  densité UI, `caption` 12 px **réservé à la méta** — **jamais** d'info essentielle
  longue sous 12 px.
- **Zoom & reflow** : **autoriser le zoom** (pas de `user-scalable=no`/`maximum-scale=1`
  dans le viewport) ; texte lisible à **200 %** (1.4.4) et **reflow à 320 px** sans
  scroll horizontal (1.4.10) ; respecter l'espacement de texte (1.4.12).
- **Leaderboard 6 colonnes → cartes** (`<md`) : chaque joueur = **une carte**
  (rang + avatar + nom + **score en évidence** ; standards/légendaires/shiny en
  paires **libellé : valeur** ; badges dans un `UPopover` au tap). **Aucun scroll
  horizontal implicite** (m9). `tabular-nums` sur tous les nombres.
- Bracket tournoi → `UAccordion` par tour ; slot/roulette mobile déjà cadrés
  (designer §2.9).

**Structure (1.3.1, 2.4.1, 2.4.6) :**
- **Landmarks** : `<header>` (banner) · `<nav aria-label="Navigation principale">` ·
  `<main id="main">` (unique) · `<aside aria-label="Aujourd'hui">` (rail) ·
  bottom-tab-bar mobile = `<nav aria-label="Navigation mobile">` · chat =
  `role="complementary" aria-label="Tchat"`.
- **Skip-link** « Aller au contenu principal » = **tout premier** élément focusable,
  cible `#main`, **visible au focus**.
- **Un seul `<h1>` par page** = le titre de page (« Ma collection », « Jackpot »,
  « Classement des Dresseurs », « Tournoi du jeudi 16 juillet »). Le **logo
  « PokeRoulette » n'est PAS un h1** (lien simple). Sous-sections en `<h2>`
  (« Entraînement quotidien », « Résultats », « Derniers gains »), cartes/panneaux
  en `<h3>`. **Home/roulette** n'a pas de titre visible → ajouter un
  **`<h1>` visuellement masqué** (« Roulette ») pour la structure.
- `<html lang="fr">` ; `<title>` **unique par route** ; **2.4.11** (WCAG 2.2) : le
  focus ne doit pas être masqué par le header sticky ni la bottom-bar (padding/scroll-margin).

---

## 10. Checklist implémentable (refonte)

**Palette / contraste**
- [ ] Boutons `solid primary` : bg `violet-600` (ou texte `night-950` sur `violet-400`) — **jamais** blanc/`violet-500`.
- [ ] Hint/muted = `night-400 #9494b0` (pas `#888`), vérifié ≥ 4.5 sur 950/900/800.
- [ ] `rarity-common` jamais en texte non éclairci (≥ `#8a8aa6`).
- [ ] `TypeBadge`/`BiomeBadge` : **texte clair fixe** (`night-100`) sur fond teinté@22 % + bordure + **icône** — pas de texte couleur-type (les 15 types ≥ 4.5).
- [ ] Badges biome : abandonner fond saturé + texte blanc (échecs mesurés).
- [ ] Éléments non-texte (arc/aiguille/seuil de jauge, bordures de rareté, anneaux de pips) ≥ 3:1 (1.4.11).
- [ ] Lint : 0 hex hors `main.css`/`@theme` (verrouille la conformité).

**Clavier / focus**
- [ ] `focus-visible` visible partout, jamais `outline:none` sec.
- [ ] Roulette lançable Entrée/Espace ; focus conservé pendant/après le spin.
- [ ] Grille avatar = `radiogroup`/`grid` navigable aux flèches, roving tabindex.
- [ ] Kanban : alternative clavier au drag (menu « Déplacer vers »).
- [ ] Slot : mise en `radiogroup`/`UTabs`.
- [ ] Choix de carte forcé : trap + options clavier + « Choix obligatoire », **pas** de piège.
- [ ] Replay : « Passer » focusable + Escape en fin ; vitesses en `aria-pressed`.

**Lecteurs d'écran / statuts (4.1.3)**
- [ ] Région `sr-only aria-live="polite"` + `aria-busy` pour le tirage : « Tirage en cours… » → « Vous avez obtenu X, type Y, rareté Z, nouvelle carte/doublon ×N ».
- [ ] Jauge : `role="img"`+`aria-label` d'état **+** live du résultat (« Victoire »/« Défaite »), valeurs figées (pas d'anim d'`aria-valuenow`).
- [ ] Jackpot : annonce **par ligne** + bilan, à l'arrêt.
- [ ] CoinCounter : nombre animé `aria-hidden` ; live une fois « +5 pièces, solde 185 ».
- [ ] Bande de roulette / ticks slot **non** live.

**Couleur seule (1.4.1) / emojis**
- [ ] Rareté doublée d'icône + texte (`aria-label` carte inclut la rareté).
- [ ] Jauges : % texte + seuil libellé + motif + « Victoire/Défaite » (pas `✅`/`❌` seuls).
- [ ] Badges navbar = `UChip` avec **nombre** + `aria-label`.
- [ ] `🪙`→ icône + « pièces » ; `✦`→ badge « Shiny » ; `✅`/`❌`→ icône + texte ; médailles 1-3 → rang chiffré accessible.
- [ ] Aucun contrôle dont le seul nom est un emoji ; décoratifs en `aria-hidden`.

**Mouvement / son**
- [ ] `prefers-reduced-motion` **+** réglage persistant ; chaque moment a sa variante (§8).
- [ ] Réglages a11y accessibles depuis le header (≤ 2 taps) : animations, volume/mute, mode de révélation.
- [ ] ≤ 200 ms de mouvement sous `reduce` ; pas > 3 flashs/s.

**Cibles / mobile / structure**
- [ ] Toutes cibles interactives ≥ 44 × 44, espacement ≥ 8 px (votes, croix, boutons de carte, mise).
- [ ] Viewport zoomable ; reflow 320 px sans scroll horizontal ; leaderboard → cartes < md.
- [ ] 1 `<main>`, nav étiquetées, skip-link visible au focus.
- [ ] 1 `<h1>`/page (logo ≠ h1 ; home = h1 masqué) ; h2/h3 hiérarchiques ; `<html lang="fr">`, `<title>` par route.
- [ ] Focus non masqué par header sticky / bottom-bar (2.4.11).

---

## 11. Recommandations priorisées

## [P0] A1 — Discipliner la palette : corriger les 5 couples défaillants (dont le bouton d'action)
**Problème** : plusieurs couples texte/fond n'atteignent pas 4.5:1, dont **l'action
centrale du jeu**, et la recette de type-badge proposée échoue pour 5 types sur 15.
**Preuve** : calculs §2 — blanc/bouton `#bb86fc` = **2.65:1** ; badges biome blanc/couleur
= 2.78-3.12:1 ; blanc/`violet-500` (proposé) = 4.23:1 ; type-badges dragon 2.98 /
spectre 3.10 / combat 3.06 / poison 3.14 / psy 4.46 sur carte ; `rarity-common` texte 3.44.
**Impact** : le CTA « Lancer » et des étiquettes clés sont illisibles pour les
malvoyants et en plein soleil — échec **1.4.3** répété sur des éléments critiques.
**Recommandation** : boutons `solid primary` en `violet-600` (ou texte `night-950`
sur `violet-400`) ; hint = `night-400` ; `TypeBadge`/`BiomeBadge` en **texte clair
fixe `night-100` sur fond teinté@22 % + icône** (recette corrigée §2.3, 15 types
≥ 4.5, tous AAA) ; `rarity-common` non éclairci = bordure uniquement ; lint 0 hex.
**Complexité** : S-M (surcouche des tokens designer, pas une refonte).
**Dépendances** : R1 designer (les 3 couches de tokens).
**Critères d'acceptation** : audit contraste (axe-core / script §Annexe) = 0 échec
1.4.3 sur les 4 écrans clés ; les 15 types et 9 biomes ≥ 4.5:1 ; CTA principal ≥ 4.5:1.

## [P0] A2 — Overlays au clavier : trap + Escape + retour du focus + nom accessible
**Problème** : les 3 systèmes d'overlay actuels n'ont ni focus trap, ni Escape, ni
`role="dialog"` ; le choix de carte forcé et le replay peuvent piéger le clavier.
**Preuve** : M5, m1 ; `ui-inventory.md §Modales` ; captures replay (✕ seul).
**Impact** : navigation clavier impossible dans 11 overlays — échecs **2.1.1 / 2.1.2
/ 2.4.3 / 4.1.2**.
**Recommandation** : mapper sur `UModal`/`USlideover`/`UDrawer` (§7) — le trap,
Escape et le retour de focus sont fournis par Reka UI. **Ajouter** : un nom
accessible à chaque overlay ; choix forcé `dismissible=false` **avec** options
clavier + « Choix obligatoire » ; replay avec « Passer » focusable et Escape en fin ;
drawers fermables au clavier.
**Complexité** : M (mécanique, ~1 j/groupe).
**Dépendances** : R3 designer (système d'overlay unifié).
**Critères d'acceptation** : Escape ferme tout overlay *dismissible* et rend le focus
au déclencheur ; le choix forcé reste opérable au clavier sans être un piège ; 0
violation axe-core « dialog » sur les 11 overlays.

## [P0] A3 — Régions `aria-live` : annoncer chaque moment de jeu dynamique
**Problème** : aucune région live — un joueur SR ne sait pas ce qu'il a tiré, ni le
résultat d'un duel, d'un jackpot, ni l'évolution de son solde.
**Preuve** : M5 (0 `aria-live`) ; §4 ; captures roll-result / replay / slot.
**Impact** : le cœur du jeu (récompense, résolution) est **inexistant** pour les SR —
échec **4.1.3**.
**Recommandation** : implémenter le contrat §4 — tirage (`polite` + `aria-busy`,
texte complet du gain, nouveau/doublon) ; jauge (`role="img"` + live du résultat) ;
jackpot (par ligne + bilan à l'arrêt) ; CoinCounter (nombre animé `aria-hidden` +
live du delta). **Ne jamais** rendre live les éléments animés (bande, ticks, count-up).
**Complexité** : M (à câbler sur les composants moteur : RouletteStrip, DuelGauge, SlotMachine, CoinCounter).
**Dépendances** : R2/R3 designer (reveal, overlays), moteur de sons inchangé.
**Critères d'acceptation** : au lecteur d'écran, un tirage annonce nom+type+rareté+
nouveauté ; un duel annonce le résultat ; un jackpot annonce les gains ; le solde
annonce le delta une seule fois.

## [P0] A4 — `prefers-reduced-motion` + réglage : un équivalent informationnel par moment
**Problème** : 25 keyframes non désactivables, dont 4 s de roulette obligatoire ;
aucun respect du média système, aucun réglage.
**Preuve** : M5, m10 (0 occurrence reduced-motion) ; `ui-inventory.md §Animation`.
**Impact** : exclusion des utilisateurs sensibles au mouvement (vestibulaire) — échec
**2.3.3** (et confort 2.2.2).
**Recommandation** : tableau §8 — chaque moment (roulette→crossfade, jauge→état final
+ log, slot→grille + surbrillance statique, capture→états libellés, célébration→sans
particules) conserve **son et information** ; interrupteur global média **+** réglage
persistant (panneau Réglages designer R9).
**Complexité** : M (une variante par séquence).
**Dépendances** : R9 designer (tokens de durée), A3 (les annonces couvrent la perte
visuelle).
**Critères d'acceptation** : sous `reduce`, aucune translation/scale > 200 ms ;
**mêmes gains/résultats** qu'en animé ; réglage « animations réduites » persistant.

## [P1] A5 — Ne jamais coder une information par la couleur seule
**Problème** : rareté (bordure couleur), jauges (vert/rouge), badges navbar (point
rouge), votes — l'information est portée **uniquement** par la couleur.
**Preuve** : M5 ; captures collection (bordures), replay (jauge + ✅/❌), nav-dropdown
(« Social • »).
**Impact** : rareté, victoire/défaite et notifications invisibles pour daltoniens et
SR — échec **1.4.1**.
**Recommandation** : §5 — rareté doublée d'icône + texte ; jauges avec %+seuil libellé
+ motif + « Victoire/Défaite » ; badges navbar `UChip` **avec nombre** ; votes en
`aria-pressed` + icône pleine/vide.
**Complexité** : S-M.
**Dépendances** : A1 (tokens rareté), A2 (badges/`UChip`).
**Critères d'acceptation** : en simulation N&B, rareté, résultat de duel et
notifications restent identifiables ; test daltonien (deutéranopie) OK sur jauges.

## [P1] A6 — Emojis porteurs de sens → icônes Lucide + libellés
**Problème** : les emojis sont l'unique iconographie, sans alternative textuelle
(`🪙`=monnaie, `✦`=shiny, `✅`/`❌`=résultat, médailles=rang).
**Preuve** : M5, `ui-inventory.md` ; captures (coûts, résultats, leaderboard).
**Impact** : montants, raretés et résultats mal ou non lus (rendu variable par OS) —
échec **1.1.1 / 4.1.2**.
**Recommandation** : politique §6 — fonctionnels → Lucide + `aria-label` (`🪙`→
« pièces », `✦`→ « Shiny », `✅`/`❌`→ « Victoire/Défaite », médailles→ rang chiffré) ;
décoratifs → `aria-hidden` ; **ton éditorial français drôle préservé**.
**Complexité** : S (au fil des pages).
**Dépendances** : R8 designer (Lucide), A5.
**Critères d'acceptation** : aucun contrôle dont le seul nom est un emoji ; audit SR
des 4 écrans clés OK ; le contenu éditorial est inchangé.

## [P1] A7 — Cibles ≥ 44 px et navigation clavier des patterns custom
**Problème** : cibles < 40 px (votes, croix, boutons de carte, pips) ; grille avatar,
kanban, slot et roulette non pensés au clavier.
**Preuve** : M5, m9 ; captures leaderboard (pips), replay (✕), collection (boutons).
**Impact** : inutilisable au doigt (mobilité fine) et au clavier — échecs **2.5.8 /
2.5.5 / 2.1.1**.
**Recommandation** : §3 + §9 — 44 × 44 min + espacement 8 px ; roulette
Entrée/Espace ; grille avatar `radiogroup`/`grid` aux flèches ; kanban avec
alternative clavier au drag ; slot en `radiogroup` ; `focus-visible` partout.
**Complexité** : M.
**Dépendances** : A2 (overlays), composants moteur.
**Critères d'acceptation** : toutes cibles ≥ 44 px (audit) ; parcours clavier complet
sur home/collection/gyms/slot/avatar sans souris ; focus toujours visible.

## [P1] A8 — Structure sémantique, titres et lisibilité mobile (reflow/zoom)
**Problème** : hiérarchie de titres non garantie (logo concurrent, home sans titre),
pas de skip-link ni de landmarks fiables ; tableaux 6 colonnes en scroll horizontal
mobile ; zoom potentiellement bridé.
**Preuve** : m9 (`leaderboard-mobile-compact`), captures desktop ; `states-inventory`
(hash inconnu = pas de structure de page).
**Impact** : navigation SR désorientée, contenu mobile tronqué — échecs **1.3.1 /
2.4.1 / 2.4.6 / 1.4.10 / 1.4.4**.
**Recommandation** : §9 — 1 `<main>`, nav étiquetées, skip-link visible ; 1 `<h1>`/page
(logo ≠ h1, home = h1 masqué), h2/h3 ; `<html lang="fr">`, `<title>` par route ;
leaderboard → cartes < md, tabular-nums, reflow 320 px, zoom autorisé ; focus non
masqué par le sticky (2.4.11).
**Complexité** : M (transversal mais patterns réutilisables).
**Dépendances** : R4 designer (responsive), A2.
**Critères d'acceptation** : 1 seul h1/page et ordre de titres logique (audit) ;
skip-link fonctionnel ; reflow à 320 px et zoom 200 % sans scroll horizontal sur les
19 routes ; leaderboard lisible en 360 px.

## [P2] A9 — Feedback accessible : toasts polite/assertive, erreurs persistantes, panneau Réglages a11y
**Problème** : feedbacks = bandeaux locaux éphémères, erreurs techniques brutes,
aucun canal live, aucun réglage d'accessibilité.
**Preuve** : M8, C3, m10 ; `states-inventory §temps réel / erreur`.
**Impact** : succès perdus, erreurs anxiogènes non annoncées, aucun contrôle
mouvement/son — confort et **4.1.3 / 2.2.1**.
**Recommandation** : `useToast()` (succès `polite`, erreurs `assertive`/`role=alert`),
erreurs réseau **persistantes** avec « Réessayer » doublée hors toast ; panneau
Réglages (UDrawer) : animations réduites, volume/mute, mode de révélation, persistés.
**Complexité** : S-M.
**Dépendances** : R7/R9 designer, A3, A4.
**Critères d'acceptation** : une coupure réseau annonce un toast humain + retry (0
message technique) ; un succès survit à la navigation ; réglages a11y atteints en
≤ 2 taps et persistés.

---

## Annexe — méthode de calcul

Ratios obtenus par la formule WCAG (luminance relative sRGB, seuil 0.03928, gamma
2.4 ; `(L_clair+0.05)/(L_sombre+0.05)`). Les couleurs à opacité (badges type/biome,
`color-mix`) sont d'abord aplaties sur leur surface (`night-950` page / `night-800`
carte) avant calcul. Script reproductible :
`scratchpad/contrast_calc.py` + `contrast_fix.py` (à porter dans les tests visuels
de la refonte pour verrouiller la non-régression).
