# Expert 08 — Responsive & mobile gaming

> **Posture** : le mobile est l'expérience **principale** de PokeRoulette, pas une
> réduction du desktop. Un jeu à boucles quotidiennes (bonus, entraînement,
> jackpot) et hebdomadaires (arène, tournoi, ligue, échange) se joue dans la file
> d'attente, au lit, dans le canapé — à une main, en portrait, sur un téléphone
> moyen de gamme. La refonte Nuxt 4.5 + Nuxt UI (`web/`) doit être conçue depuis
> le 375×812 vers le desktop, jamais l'inverse.
>
> **Matériau** : `docs/audit/frontend-issues.md` (C1, M2, M5, m9, m11, m12),
> `docs/audit/ui-inventory.md` (7 breakpoints), `docs/audit/existing-user-flows.md`,
> `docs/audit/application-map.md` (19 routes), captures `artifacts/screenshots/`
> (mobile-compact = 375×812, mobile-large = 430×932, tablet = 768×1024,
> desktop = 1440×900).
> *Note d'honnêteté* : les captures `home/roll-result-mobile.png` et
> `responsive/nav-hamburger-*.png` citées par C1/M2 sont absentes du corpus
> livré ; les constats correspondants s'appuient sur `home/roll-result-new-card.png`
> (desktop), `home/home-mobile-compact.png`, `home/home-mobile-large.png`,
> `home/home-tablet.png` et le texte de l'audit.

---

## 1. Synthèse

1. **Le jeu est déjà « mobile-shaped »… mais l'écran mobile est saboté par ses
   couches flottantes.** La colonne unique fonctionne presque partout ; ce qui
   casse l'expérience, ce sont les éléments *fixed* posés par-dessus : la
   bannière tournoi **chevauche le bloc utilisateur** (375, 430 **et** 768 px —
   trois captures), la bulle de chat **masque** les actions de la collection, le
   score n°9 du leaderboard, la ligne « Mon Équipe » du Guide et la section
   « Derniers gains » du Jackpot. Règle de refonte : **sur mobile, rien ne
   flotte au-dessus de la zone de jeu** (M2).
2. **Le moment de récompense est hors écran** (C1) : en 375×812, la pile
   navbar (40) + bannière (64) + bloc user (~80) + inventaire (~46) + sélecteur
   de mode (~70) + filtres (~52) + roulette (~165) + bouton (~48) consomme
   ~660 px **avant** la zone de résultat : la carte gagnée naît coupée sous le
   fold. La section 4 fixe un **budget vertical contractuel** qui fait tenir
   roulette + bouton + résultat sur 375×**667** (iPhone SE), donc a fortiori
   sur 812.
3. **19 routes dans un hamburger plein écran = navigation à l'aveugle et
   hors pouce** (le hamburger est en haut à droite, la pire zone d'atteinte).
   Proposition : **bottom tab bar 5 onglets** — Jouer · Collection · Défis ·
   Social · Plus — qui absorbe les 19 routes, porte les badges, et vit dans la
   zone naturelle du pouce avec les safe areas iOS/Android.
4. **7 breakpoints ad hoc (420→768) → 4 seuils Tailwind** (sm 640 / md 768 /
   lg 1024 / xl 1280) + **grilles auto-fill** pour les cartes (indépendantes
   des breakpoints) + container queries pour le composant carte. Le breakpoint
   ne décide plus que du *shell* (navigation, colonnes de page), jamais de la
   taille d'une carte.
5. **Performance moyen de gamme** : multi-roll = 1 bande animée + file de
   résultats (au lieu de 5 roulettes empilées, m12), collection virtualisée via
   `content-visibility` (m11), effets brillance/glow coupés sous
   `prefers-reduced-motion` / `saveData` / `deviceMemory ≤ 4`. **PWA : oui au
   manifest + installation** (communauté d'habitués à rythme quotidien), service
   worker en phase 2 seulement — il remplacera au passage le bandeau jaune
   « Ctrl+F5 ».

---

## 2. Prise en main à une main (375×812)

Cartographie du pouce (droitier, téléphone tenu une main — symétrique pour
gaucher) :

| Bande verticale | Atteinte | Ce qui doit y vivre |
| --- | --- | --- |
| **y ≈ 560–812** (tiers bas) | ✅ Naturelle | Bottom tab bar, bouton **Lancer**, composer du chat, actions de bottom sheet |
| **y ≈ 280–560** (milieu) | 🟡 Étirement OK | Zone de jeu (roulette, machine à sous), résultat, contenu scrollable |
| **y ≈ 0–280** (tiers haut) | 🔴 Re-grip nécessaire | Uniquement de l'information passive : header, solde, titres |

État actuel vs cible :

- **Hamburger en haut à droite** (`home-mobile-compact.png`, ~24 px de cible à
  y≈20) : pire case de la grille — remplacé par la tab bar (§3).
- **Bouton Lancer** à y≈595–643 : déjà bien placé — **à conserver** en zone
  basse ; sur les pages qui scrollent (multi-roll, collection), l'action
  primaire devient **sticky bottom** au-dessus de la tab bar.
- **Sélecteurs fréquents** (mode de révélation, biome, ×5) actuellement à
  y≈258–380 (zone d'étirement) : la rangée compacte reste au-dessus de la
  roulette, mais le **détail** (liste des biomes avec coûts, explication des
  modes) s'ouvre en **bottom sheet** (`UDrawer`) — le choix se fait donc en zone
  basse.
- **Actions destructives** (vendre/fusionner) : jamais en inline sous le pouce
  qui scrolle — passage par bottom sheet avec confirmation (cf. §6 Collection,
  et C5 fusion sans confirmation).

---

## 3. Navigation : 19 routes → bottom tab bar 4+1

Constat (`application-map.md`, `home-tablet.png`) : navbar desktop = 5 dropdowns
+ 2 liens + cloche + déconnexion ; mobile = hamburger plein écran (même à
768 px). Capture du menu ouvert absente du corpus, mais la structure est
documentée : une liste plein écran de ~15 entrées, sans hiérarchie de fréquence.

**Structure cible (5 onglets, 56 px + safe area)** :

| Onglet | Icône | Routes absorbées | Badge |
| --- | --- | --- | --- |
| **Jouer** (défaut) | 🎰 | `#home` (roulette) + segmented control interne **Roulette / Jackpot / Spin** (`#slot-machine`, `#spin`) | pastille « quota dispo » (jackpot du jour non joué) |
| **Collection** | 🎒 | `#collection` + sous-onglet `#team` + inventaire (bottom sheet) | — |
| **Défis** | ⚔️ | `#gyms`, `#tournament`, `#league` (sous-onglets ; Ligue visible à 8 badges) | badge tournoi (inscriptions / résultats) |
| **Social** | 💬 | `#chat`, `#leaderboard`, `#trades`, `#suggestions` | agrégat non-lus chat + trades |
| **Plus** | ≡ | bottom sheet : `#stats`, `#rules`, `#patchnotes`, réglages (son/animations, cf. m10), déconnexion, version | pastille patch notes |

- Auth (`#login`, `#register`, `#forgot/reset-password`) : hors tab bar (layout
  dédié).
- **Header mobile** (≤48 px) : logo compact + **solde 🪙 persistant** (aujourd'hui
  visible uniquement sur home) + cloche notifications (dropdown → sheet).
- Règles : la tab bar est **toujours visible** sauf clavier ouvert (§7),
  overlays plein écran (replay, capture légendaire) et iframe Spin.
- ≥ `lg` (1024) : la tab bar disparaît au profit de la navbar horizontale
  actuelle repensée (les 5 mêmes familles — cohérence desktop/mobile).
- Nuxt UI : tab bar custom (grid de 5 `NuxtLink` + `UChip` pour les badges) ;
  « Plus » et les pickers en `UDrawer` (bottom sheet, geste de fermeture natif).

Bénéfice mesurable : n'importe laquelle des 8 activités du rythme hebdo
(`existing-user-flows.md` §Rythme) atteignable en **≤ 2 taps pouce** au lieu de
hamburger → scan d'une liste de 15 liens.

---

## 4. Budget vertical — la roulette et son résultat sur UN écran (C1)

### 4.1 Constat chiffré (`home-mobile-compact.png`, 375×812)

| Zone actuelle | Hauteur ≈ | Cumul |
| --- | --- | --- |
| Navbar | 40 | 40 |
| Bannière tournoi (flottante, chevauche) | 64 | ~104 |
| Bloc avatar/pseudo/coins (caché dessous) | 80 | ~184 |
| Bouton Inventaire | 46 | ~230 |
| Sélecteur de mode + hint | 70 | ~300 |
| Filtres biome + ×5 | 52 | ~352 |
| Marges + roulette (165) | ~225 | ~577 |
| Bouton Lancer | 48+20 | ~645 |
| **Reste pour le résultat** | **~165** | — carte ~200 px ⇒ **coupée** (C1) |

Sur desktop même symptôme (`roll-result-new-card.png` : titre à y≈718/900,
carte tronquée) — le mobile est simplement pire.

### 4.2 Budget cible (contractuel, testé sur 375×**667**)

| Zone refondue | Hauteur | Notes |
| --- | --- | --- |
| Header slim (logo + 🪙 + 🔔) | 48 | + `env(safe-area-inset-top)` en PWA |
| Rangée contrôles unique | 44 | mode / biome / ×5 en chips ; détails en bottom sheet |
| Bande roulette | 148 | cartes 96×140, ~3,5 visibles |
| Bouton Lancer | 56 (+12 marges) | sticky si la page scrolle |
| **Zone résultat réservée** | **240** | `min-height` fixe dès le chargement : carte 168 + titre + CTA — **zéro layout shift** (M3) et **zéro scroll** |
| Tab bar | 56 + safe 20–34 | `max(0.5rem, env(safe-area-inset-bottom))` |
| **Total** | **≈ 624–638** | ✅ tient sur 667 ; sur 812 il reste ~175 px d'air |

Ce qui disparaît de l'écran de jeu : le bloc avatar 80 px (→ header + onglet
Plus), le bouton Inventaire 46 px (→ chip dans la rangée contrôles), la bannière
tournoi 64 px (→ §9), le hint permanent (→ dans le sheet).

Budgets des autres écrans clés (unités = px sur 375×812) :

- **Jackpot** : header 48 + titre inline 32 (le h1 « Jackpot » de ~100 px de la
  capture est un luxe desktop) + machine 3×3 ~300 + chips lignes 44 + CTA 56 +
  tab bar ⇒ la table des récompenses (m3) devient un **bottom sheet ouvert par
  défaut la 1ʳᵉ fois**, les « Derniers gains » passent au-dessus du fold bas
  sans bulle de chat qui les masque.
- **Chat page** : header 48 + messages `flex-1` + composer 56 + tab bar 56 ⇒
  ~600 px d'historique ; clavier ouvert (~300 px) : tab bar masquée, composer
  collé au `visualViewport` ⇒ ~310 px d'historique restent visibles (§7).
- **Arènes** : carte entraînement compacte 96 + carte arène (jauge 200×110
  centrée) + CTA sticky — l'essentiel (estimation + bouton combat) tient sans
  scroll ; historique en dessous.

Unités : **`dvh`/`svh`** pour les hauteurs plein écran (jamais `100vh`, qui
crée le « saut » de barre d'URL iOS/Android) ; `min-height: 100dvh` sur le
shell, `100svh` pour les overlays qui ne doivent jamais dépasser.

---

## 5. Système de breakpoints unique

### 5.1 Remplacement des 7 seuils

`ui-inventory.md` observe **420, 480, 540, 600, 680, 700, 768 px**. La refonte
n'utilise que la grille Tailwind v4 par défaut — aucun seuil custom :

| Ancien seuil | Devient |
| --- | --- |
| 420 / 480 / 540 / 600 | **base** (mobile-first : le style par défaut EST le 375) |
| 680 / 700 | **sm** (640) |
| 768 | **md** (768) |
| — | **lg** (1024), **xl** (1280) |

Deux compléments qui suppriment le besoin de micro-seuils :

- **Grilles de cartes en `auto-fill`** :
  `grid-cols-[repeat(auto-fill,minmax(104px,1fr))]` — le nombre de colonnes
  découle de la largeur, plus jamais d'un breakpoint.
- **Container queries** (natif Tailwind v4) sur `PokeCard` : la carte adapte
  sprite/nom/actions à SA largeur (`@container`), pas à celle de l'écran —
  fin des « classes ad hoc par contexte » relevées par l'inventaire UI.

### 5.2 Comportement de chaque zone à chaque seuil

| Zone | base (<640) | sm (≥640) | md (≥768) | lg (≥1024) | xl (≥1280) |
| --- | --- | --- | --- | --- | --- |
| **Navigation** | Bottom tab bar 5 onglets | idem | idem (tablette portrait = usage pouce) | Navbar top + dropdowns, tab bar retirée | idem |
| **Header** | Slim 48 (logo, 🪙, 🔔) | idem | idem | Navbar complète | idem |
| **Largeur contenu** | 100 % − 16 px de gouttières | 100 % − 24 | `max-w-2xl` centré | `max-w-5xl` | `max-w-6xl` + colonnes latérales |
| **Roulette** | cartes 96 px, ~3,5 visibles | ~5 visibles | ~6, cartes 104 px | 7, cartes 110 px | idem |
| **Grille collection** | 3 col. (~107 px) | 4 col. | 5 col. | 6–7 col. | 8 col. (auto-fill fait tout) |
| **Tableaux (leaderboard…)** | Cartes empilées | idem | `UTable` complète 6 col. | idem | idem + feed shiny en colonne latérale |
| **Bracket tournoi** | Scroll horizontal 1 tour/écran + snap | idem | 2 tours visibles | Bracket complet | idem |
| **Modales** | Bottom sheet (`UDrawer`) plein largeur | idem | `UModal` centrée | idem | idem |
| **Chat** | Page plein écran (onglet Social), pas de widget | idem | idem | Widget flottant réactivé + page | idem |
| **Bannières événement** | Carte inline dans le hub + toast 4 s | idem | idem | Toast top-right (plus de fixed permanent) | idem |
| **Multi-roll** | 1 bande + file de 5 résultats | idem | idem | option 5 bandes empilées | idem |

---

## 6. Analyse par écran — constat (capture) → prescription

### 6.1 Home / Roulette — `home-mobile-compact.png`, `home-mobile-large.png`, `roll-result-new-card.png`
**Constat** : bannière tournoi fixe qui **recouvre avatar + pseudo** (« Nassim »
illisible) aux trois largeurs 375/430/768 ; ~350 px consommés avant la roulette ;
résultat sous le fold (C1) ; bulle chat en bas droite au-dessus de la zone où le
résultat apparaîtrait.
**Prescription** : layout budgété §4.2 ; bannière → §9 ; résultat dans une zone
réservée `min-height: 240px` **toujours dans le viewport** ; pour épique/légendaire/
shiny, célébration plein écran (overlay) — le scroll n'est jamais requis pour
voir son gain ; chip « ??? » du mode masqué conservée (flip déjà GPU-friendly).

### 6.2 Multi-roll — `multi-roll-cascade.png`, `multi-roll-all-results.png` (m12)
**Constat** : 5 roulettes complètes empilées (~200 px chacune sur desktop, soit
~825 px de bandes sur mobile), 5×20 cartes + 5 animations `translateX`
simultanées + effets shine — injouable au-dessus du fold, à risque sur mobile
moyen de gamme.
**Prescription** : sur base/sm/md, **une seule bande** anime les 5 tirages en
séquence rapide (5×~1 s, skippable au tap) ; les résultats s'empilent dans une
**file horizontale de 5 mini-cartes** sous le bouton (tap = agrandir). Le serveur
résout déjà tout en amont (architecture saine à préserver) — c'est un pur
changement de présentation. Option ≥lg : conserver l'empilement spectaculaire.

### 6.3 Collection — `collection-mobile-compact.png` (m9, m11)
**Constat** : 4 colonnes à 375 px ⇒ cartes ~85 px, **tous les noms tronqués**
(« Bulbiz… », « Herbi… », « Carap… »), boutons vendre ~28 px de haut (< 44),
bulle de chat qui masque les actions de la dernière carte visible ; 300+ cartes
rendues d'un bloc (m11).
**Prescription** : **3 colonnes** à 375 (cartes ≥104 px, sprite ≥64 px, nom
12 px non tronqué sur 1 ligne) via auto-fill ; **plus d'actions inline** —
tap carte → bottom sheet (grand visuel, quantité, vendre avec confirmation,
fusionner avec confirmation — corrige C5 au passage, cible 44 px garanties) ;
virtualisation : `content-visibility: auto` + `contain-intrinsic-size: 104px 156px`
par carte (suffisant et sans dépendance), re-render ciblé après vente/fusion au
lieu du re-fetch complet ; images `loading="lazy"` + `width/height` (fin du
pop-in M3) ; barre de filtres sticky top compacte, panneau de filtres en bottom
sheet.

### 6.4 Leaderboard — `leaderboard-mobile-compact.png` (m9)
**Constat** : table 6 colonnes compressée — mobile n'affiche que rang/dresseur/
score, les colonnes Standards/Légendaires/Shiny passent en scroll horizontal
implicite (invisible) ; 8 mini-badges par ligne en bruit visuel ; bulle chat sur
le score du n°9.
**Prescription** : < md, **cartes empilées** : ligne 1 = rang (médaille) +
avatar + pseudo + ⭐ score ; ligne 2 = `146 std · 5 lég · 48 ✦` en texte ;
badges résumés en chip « 🏅 8/8 » (tap = détail). Podium visuel pour le top 3.
« Votre position » **sticky** au-dessus de la tab bar (le joueur se cherche —
c'est LA ligne qui compte). ≥ md : `UTable` 6 colonnes comme aujourd'hui.

### 6.5 Tournoi — `tournament-mobile-compact.png`, `tournament-desktop-fullpage.png` (m9)
**Constat** : titre sur 3 lignes (~120 px perdus), 16 participants × (avatar +
6 sprites ~36 px) = liste très longue ; le bracket (état jeudi) s'empile en
colonnes interminables d'après l'audit.
**Prescription** : titre inline 32 px + statut/cagnotte en carte compacte ;
participants en **liste condensée** (avatar + pseudo + 6 sprites 28 px sur une
ligne, tap = équipe détaillée en sheet) ; **bracket en scroll horizontal, un
tour par écran** avec `scroll-snap-type: x mandatory`, en-têtes de tour sticky,
points de pagination ; « **Mon parcours** » (anti-spoiler, force n°3 de
l'existant) devient la **vue par défaut mobile** — elle est déjà
mobile-parfaite : un match à la fois.

### 6.6 Arènes — `gyms-mobile-compact.png`
**Constat** : empilement correct mais très long (entraînement → badges →
champion) ; boutons OK ; jauge 200×110 adaptée.
**Prescription** : ordre par fréquence d'usage — **entraînement quotidien
d'abord** (action quotidienne), carte arène ensuite avec CTA combat sticky bas ;
compte à rebours de reset visible (m4) ; replay de combat en overlay plein écran
`100svh` avec safe areas, vitesse ×1/×2/×4 en bas (zone pouce).

### 6.7 Jackpot — `slot-machine-mobile-compact.png` (m3)
**Constat** : machine 3×3 lisible, mais h1 énorme, sélecteurs de lignes
latéraux ~24 px (< 44), table des récompenses repliée sous le fold, bulle chat
sur « Derniers gains ».
**Prescription** : header compact ; cellules ≥88 px ; les numéros de lignes
latéraux deviennent purement décoratifs (la sélection se fait par les 3 chips
44 px sous la machine — déjà le bon pattern) ; table des récompenses en bottom
sheet accessible depuis un lien à côté des chips ; état « déjà joué » = CTA
remplacé par compte à rebours jusqu'au reset (m4).

### 6.8 Équipe — `team-mobile-compact.png`
**Constat** : mini-roulette + warning destructif corrects ; « Réorganiser »
petit en haut à droite de section ; bulle chat sur la grille.
**Prescription** : grille 6 slots en 3×2 (slots ≥96 px) ; le mode réorganisation
2 taps actuel est **déjà tactile-friendly** — le conserver (pas de drag&drop,
peu fiable à un pouce) avec bandeau d'instruction sticky ; warning destructif
maintenu visible au-dessus du CTA (jamais dans un tooltip).

### 6.9 Stats — `stats-mobile-compact.png` (m9)
**Constat** : tuiles 2 colonnes efficaces (bon pattern à garder) ; la liste
« Progression des arènes » tronque à droite (« dress… ») sous la bulle chat.
**Prescription** : conserver les tuiles 2 col. ; listes pleine largeur sans
troncature (le libellé passe au-dessus de la barre) ; graphiques/tableaux larges
dans des conteneurs `overflow-x-auto` internes (jamais de scroll horizontal de
page) ; sélecteur de joueur en bottom sheet.

### 6.10 Chat — `chat-page-mobile.png`, `chat-widget-open.png` (M2)
**Constat** : la bannière tournoi **recouvre les premiers messages** ; composer
en bas non protégé du clavier ; le widget flottant 300 px masque du contenu sur
toutes les autres pages mobiles (collection, leaderboard, stats, rules, team…).
**Prescription** : sur < lg, **le widget flottant disparaît** — le chat vit dans
l'onglet Social (badge non-lus sur l'onglet) en page plein écran ; composer
fixé au bas du `visualViewport` (§7), `enterkeyhint="send"`, maxlength 300 avec
compteur ; historique en `flex-col-reverse` (scroll ancré en bas nativement).
≥ lg : widget flottant réactivé (il ne gêne que le mobile).

### 6.11 Guide — `rules-mobile-compact.png`
**Constat** : accordéons 48–56 px = bonnes cibles ; page très longue ; chevron
de « Mon Équipe » sous la bulle chat.
**Prescription** : rangée de chips ancres sticky (Jeux / Progression / Défis /
Social) à scroll horizontal ; accordéons conservés ; contenu synchronisé avec
l'API pour les coûts biome (C6 — hors périmètre responsive mais bloquant
confiance).

### 6.12 Spin (iframe) — `spin-overlay-iframe.png`, `spin-mobile-compact.png`
**Constat** : le jeu embarqué a un layout paysage (panneaux latéraux Objets/PC) ;
la page hôte mobile est un long texte ; aucune capture mobile de l'iframe —
risque élevé d'injouabilité en 375 portrait.
**Prescription** (l'iframe reste une boîte noire, cf. migration-plan) : la page
hôte ouvre l'iframe en **plein écran réel** (Fullscreen API sur geste
utilisateur), `100dvh/100svh`, safe areas latérales en paysage ; tentative
`screen.orientation.lock('landscape')` en plein écran (Android) et **overlay
« tournez votre téléphone »** si portrait détecté (iOS ne permet pas le lock) ;
bouton Quitter persistant dans la safe area, protocole `postMessage spin:close`
conservé.

### 6.13 Auth — `login-mobile-compact.png` (+§7)
**Constat** : formulaire empilé correct ; placeholder comme seul label ;
aucun attribut mobile (`inputmode`, `autocomplete`).
**Prescription** : labels visibles au-dessus des champs, attributs §7, bouton
pleine largeur 48–56 px, lien « mot de passe oublié » ≥44 px.

---

## 7. Claviers mobiles

- **Meta viewport** :
  `width=device-width, initial-scale=1, viewport-fit=cover,
  interactive-widget=resizes-content` — jamais `user-scalable=no`
  (accessibilité). `interactive-widget` règle le clavier sur Chrome Android ;
  iOS l'ignore → fallback ci-dessous.
- **Composer du chat** : écouter `visualViewport` (`resize`/`scroll`) et
  translater la barre de saisie pour la coller au clavier iOS ; masquer la tab
  bar tant que le clavier est ouvert ; re-scroller le dernier message visible.
  Avec le widget supprimé sur mobile (§6.10), le cas « champ du widget caché
  par le clavier » disparaît structurellement : il ne reste qu'UN composer à
  fiabiliser, celui de la page.
- **Attributs par champ** :

| Champ | Attributs |
| --- | --- |
| Email (login/register/forgot) | `type=email inputmode=email autocomplete=email autocapitalize=none spellcheck=false enterkeyhint=next` |
| Username | `autocomplete=username autocapitalize=none enterkeyhint=next` |
| Mot de passe login | `autocomplete=current-password enterkeyhint=go` |
| Mot de passe register/reset | `autocomplete=new-password` (+ jauge de force) |
| Message chat | `enterkeyhint=send autocomplete=off maxlength=300` |
| Idée (suggestions) | `enterkeyhint=enter` (textarea, envoi par bouton) |

- Champ focusé jamais sous le clavier : `scroll-margin-bottom: 16px` sur les
  inputs + comportement natif `resizes-content`.

---

## 8. Safe areas iOS/Android & orientations

- **Tab bar** : `padding-bottom: max(0.5rem, env(safe-area-inset-bottom))` —
  l'home indicator iOS (34 px) et la gesture bar Android ne recouvrent jamais
  les onglets. Header : `padding-top: env(safe-area-inset-top)` (utile en PWA
  standalone et sur Android edge-to-edge).
- **Overlays plein écran** (replay, capture légendaire, célébration, Spin) :
  `100svh` + les 4 insets ; le bouton fermer/skip s'inscrit DANS la safe area.
- **Paysage téléphone** (`(orientation: landscape) and (max-height: 480px)`) :
  ne **pas bloquer** (impossible en onglet navigateur, hostile en PWA) —
  adapter : header auto-masqué, tab bar conservée (56 px se justifient encore ;
  insets latéraux `env(safe-area-inset-left/right)` pour l'encoche), roulette
  élargie (6–7 cartes visibles — le paysage est un *bonus* pour ce composant),
  résultat à droite du bouton en 2 colonnes. Manifest PWA : `orientation`
  **omise ou `any`** — un lock `portrait` casserait Spin et le confort tablette.

---

## 9. Bannières & widget chat — où ils vivent sur mobile

Constat transversal (M2) : deux éléments `fixed` (bannière tournoi, bulle chat)
entrent en collision avec le contenu sur **toutes** les captures mobiles.

- **Bannière tournoi** : sur < lg elle devient (1) une **carte événement
  inline** en tête de l'onglet Jouer (statut inscriptions / félicitations,
  dismissible) + (2) un **toast** 4 s à l'apparition de l'événement
  (`useToast`), au-dessus de la tab bar, jamais persistant. ≥ lg : toast
  top-right. Plus aucun overlay permanent.
- **Bulle chat** : supprimée sur < lg (§6.10). L'onglet Social porte le badge
  non-lus. ≥ lg : widget flottant conservé.
- **Bandeau « nouvelle version »** : remplacé par le flux de mise à jour du
  service worker (toast « Nouvelle version — Recharger », cf. PWA §11).

---

## 10. Boutons, feedback tactile, lisibilité des cartes

- **Cibles** : minimum **44×44 px** (48 dp Android), espacement ≥8 px ;
  action primaire de jeu (Lancer, LANCER !, Lancer le combat) : **56 px** de
  haut, pleine largeur moins gouttières en < sm. Corrige les cibles < 40 px
  relevées par M5 (pips de badges, votes, sélecteurs de lignes du slot).
- **Feedback visuel** : état `:active` (scale 0.97 + assombrissement, 80 ms)
  sur tout élément interactif ; `touch-action: manipulation` (supprime le
  délai double-tap) ; pas de `:hover` porteur d'information (les actions cachées
  au hover de la collection desktop deviennent des sheets au tap).
- **Haptics** : wrapper `haptic(pattern)` sur `navigator.vibrate` — **Android
  uniquement** (iOS Safari ne l'expose pas : no-op silencieux, le son chiptune
  existant reste le canal principal). Déclencheurs : lancement (10 ms), tick
  final d'arrêt (20 ms), révélation rare+ (motif court), K.O. de duel,
  franchissement de seuil de jauge. Coupé si `prefers-reduced-motion` ou
  réglage utilisateur (nouvel écran Réglages, m10).
- **Cartes Pokémon** : sprite **≥64 px** affiché (asset 128 px pour DPR 2–3),
  nom ≥12 px non tronqué, badge biome ≥10 px. Bande de roulette : cartes
  96×140 (base) → 110×160 (lg). Collection : 3 col. à 375 (§6.3). La carte
  expose des variantes de densité via container queries (`compact` < 96 px
  interdit partout sauf mini-files de résultats multi-roll, qui ouvrent en
  grand au tap).

---

## 11. Performance appareils moyens & PWA

### Performance (cible : Android milieu de gamme ~4 Go RAM)

1. **Multi-roll** : 1 bande animée au lieu de 5 (§6.2) — divise par 5 le DOM
   animé et les couches composited simultanées.
2. **Collection** : `content-visibility: auto` + `contain-intrinsic-size` sur
   ~300 cartes (m11), `contain: content` sur `PokeCard`, mise à jour ciblée
   après vente/fusion (pas de re-fetch + reconstruction).
3. **Animations** : transform/opacity uniquement (la roulette l'est déjà —
   force à préserver) ; les effets **paint-heavy** (`card-shine`,
   `rainbow-border`, `glow-multi`, box-shadow animés) limités aux éléments
   visibles et **désactivés** quand `prefers-reduced-motion: reduce` (M5),
   `navigator.connection?.saveData === true` ou `navigator.deviceMemory <= 4`
   → « mode éco » automatique + interrupteur dans Réglages.
4. **Images** : webp existants + `srcset/sizes`, `loading=lazy`,
   `decoding=async`, dimensions réservées (fin du layout shift M3).
5. **Réseau** : état navbar centralisé (corrige C4 — 64 fetchs de
   `tournament/current`) : un store partagé + revalidation périodique, pas de
   re-fetch par navigation.

### PWA — recommandation argumentée : **OUI, en 2 phases**

**Pour** : la communauté est une base d'habitués à **boucle quotidienne**
(bonus de connexion, entraînement, jackpot) et rendez-vous hebdo fixes
(lundi arène/échange, jeudi tournoi/ligue — cf. rythme temporel de l'audit).
C'est exactement le profil où l'icône d'accueil + le mode standalone paient :
chemin de retour en 1 tap, ~60–100 px de chrome navigateur rendus au jeu (aide
directe au budget C1), splash + theme-color.
**Contre / risques** : le SW ajoute une complexité de cache — or l'app a déjà
un historique douloureux (bandeau jaune « Ctrl+F5 »). D'où le phasage :

- **Phase 1 (quasi gratuite, avec la refonte)** : manifest complet (name,
  icônes maskable 192/512, `display: standalone`, `theme_color #0f0f1a`,
  `background_color`, `orientation` omise, screenshots), meta iOS
  (`apple-mobile-web-app-capable`), invite d'installation discrète dans
  l'onglet Plus (pas d'interstitiel).
- **Phase 2** : service worker via `@vite-pwa/nuxt` — precache du shell,
  cache-first pour les ~302 sprites webp (assets immuables parfaits),
  **network-first strict pour toute l'API** (jeu d'économie : jamais de solde
  périmé), flux `autoUpdate` + toast de rechargement qui **remplace** le
  bandeau cache manuel.
- **Phase 3 (optionnelle, fort levier de rétention)** : Web Push résultats de
  tournoi (jeudi 15:00) et trades reçus — opt-in explicite ; iOS l'exige
  installé (16.4+), ce qui renforce l'intérêt de la phase 1. Badging API sur
  l'icône installée.

---

## Recommandations

## [P0] R1 — Grille de breakpoints unique et shell mobile-first
**Problème** : 7 seuils ad hoc (420→768) issus de correctifs au cas par cas ;
le mobile est une soustraction du desktop, chaque zone se casse à un seuil
différent.
**Preuve** : `ui-inventory.md` (liste des 7 seuils) ; `home-tablet.png`
(hamburger ET bannière cassée à 768) ; §5.
**Impact** : comportement imprévisible entre 375 et 1024, coût de maintenance,
impossibilité de raisonner l'UI.
**Recommandation** : adopter la grille §5 — base/sm/md/lg/xl Tailwind par
défaut, aucun seuil custom ; grilles de cartes en `auto-fill minmax`,
`PokeCard` en container queries ; table de comportement par zone (§5.2) annexée
au design system comme contrat.
**Complexité** : M (c'est une discipline de conception plus qu'un chantier).
**Dépendances** : socle Nuxt (étape 1 du plan de migration) ; design system
(étape 4).
**Critères d'acceptation** : `grep` du CSS final : zéro media query hors
sm/md/lg/xl et media features (orientation, reduced-motion) ; revue visuelle
aux 5 largeurs d'audit (375/430/768/1440/1920) sans zone cassée ; la grille
collection change de colonnes sans breakpoint déclaré.

## [P0] R2 — Zone de jeu budgétée : roulette + résultat visibles ensemble (C1)
**Problème** : le moment de récompense naît sous la ligne de flottaison ;
~660 px sont consommés avant la zone résultat sur 375×812.
**Preuve** : C1 ; `roll-result-new-card.png` (carte coupée à 900 px desktop) ;
budget mesuré §4.1 sur `home-mobile-compact.png`.
**Impact** : le cœur émotionnel du gacha (la révélation) exige un scroll —
c'est le pire endroit possible pour une friction.
**Recommandation** : appliquer le budget §4.2 (header 48, contrôles 44,
roulette 148, bouton 56, **résultat réservé 240 en `min-height`**, tab bar
56+safe = ~638 px) ; célébration plein écran pour épique+/shiny ; bloc
avatar/inventaire sortis de l'écran de jeu.
**Complexité** : M.
**Dépendances** : R1, R3 (tab bar), R4 (suppression des flottants) ; expert
célébrations (M1) pour l'overlay rare+.
**Critères d'acceptation** : test Playwright 375×**667** : après un tirage, le
titre du résultat ET ≥90 % de la carte gagnée sont dans le viewport sans
scroll ; aucun layout shift à l'arrivée du résultat (CLS = 0 sur la zone).

## [P0] R3 — Bottom tab bar 5 onglets (19 routes → Jouer/Collection/Défis/Social/Plus)
**Problème** : navigation mobile = hamburger plein écran en haut à droite
(zone la plus inaccessible au pouce), 15+ entrées à plat, badges invisibles
menu fermé.
**Preuve** : `application-map.md` (structure navbar) ; `home-mobile-compact.png`
(hamburger y≈20) ; §2–§3. (Capture du menu ouvert absente du corpus — structure
confirmée par l'audit code.)
**Impact** : chaque navigation coûte un re-grip + 2 écrans ; les rendez-vous
quotidiens/hebdo (moteur de rétention) sont enterrés.
**Recommandation** : tab bar §3 (56 px + safe area, badges agrégés par onglet,
« Plus » en bottom sheet) ; header slim avec solde 🪙 persistant et cloche ;
navbar horizontale conservée ≥ lg avec les 5 mêmes familles.
**Complexité** : M.
**Dépendances** : R1 ; store navbar centralisé (corrige C4) pour les badges.
**Critères d'acceptation** : chacune des 19 routes atteignable en ≤2 taps
depuis n'importe quelle page ; onglets ≥44 px de cible ; badges visibles sans
ouvrir de menu ; tab bar jamais recouverte par l'home indicator (test iPhone
notch + Android gesture bar).

## [P0] R4 — Zéro élément flottant au-dessus du jeu sur mobile
**Problème** : la bannière tournoi chevauche le bloc utilisateur ; la bulle de
chat masque boutons de collection, score du leaderboard, chevrons du Guide,
« Derniers gains » du Jackpot.
**Preuve** : M2 ; `home-mobile-compact.png`, `home-mobile-large.png`,
`home-tablet.png` (chevauchement aux 3 largeurs) ; `chat-page-mobile.png`
(bannière SUR les messages) ; `collection-mobile-compact.png`,
`leaderboard-mobile-compact.png` (bulle masquante).
**Impact** : contenu illisible et actions inaccessibles — des zones entières
de l'écran sont perdues sur chaque page.
**Recommandation** : §9 — bannière → carte inline + toast éphémère ; widget
chat supprimé < lg (chat = onglet Social plein écran, badge non-lus) ; les
toasts s'affichent au-dessus de la tab bar et n'interceptent jamais la zone de
jeu.
**Complexité** : S.
**Dépendances** : R3 (l'onglet Social doit exister avant de retirer la bulle).
**Critères d'acceptation** : audit visuel des 14 pages à 375×812 : aucun
élément `position: fixed` ne recouvre contenu ou action (hors tab bar/header) ;
la bannière n'apparaît plus que comme carte inline ou toast ≤5 s.

## [P1] R5 — Densité repensée : tableaux → cartes, bracket → scroll horizontal par tour
**Problème** : leaderboard 6 colonnes compressées/scroll implicite, bracket en
colonnes empilées interminables, stats tronquées — le desktop densifié est
simplement écrasé sur 375 px.
**Preuve** : m9 ; `leaderboard-mobile-compact.png` (3 colonnes sur 6 visibles),
`tournament-mobile-compact.png` (titre 3 lignes, listes longues),
`stats-mobile-compact.png` (« dress… » tronqué).
**Impact** : les écrans sociaux — vitrine de la communauté — sont illisibles
sur l'appareil principal.
**Recommandation** : §6.4 (cartes empilées + « votre position » sticky + table
≥ md), §6.5 (bracket snap horizontal 1 tour/écran, « Mon parcours » par défaut),
§6.9 (tuiles 2 col. conservées, wide-content en `overflow-x-auto` interne).
**Complexité** : M.
**Dépendances** : R1 ; composants `UTable`/cartes du design system.
**Critères d'acceptation** : à 375 px, aucune donnée du leaderboard n'est
inaccessible ni tronquée ; le bracket se parcourt tour par tour au swipe avec
snap ; aucun scroll horizontal de page (body) sur les 14 pages.

## [P1] R6 — Collection mobile : 3 colonnes, sheet d'actions, virtualisation
**Problème** : 4 colonnes à 375 px ⇒ noms 100 % tronqués, actions < 44 px sous
le pouce, 300+ cartes DOM d'un bloc, re-render complet après chaque action.
**Preuve** : `collection-mobile-compact.png` ; m11 ; M5 (cibles < 40 px) ; C5
(fusion sans confirmation, bouton inline).
**Impact** : l'écran de « possession » — motivation n°1 du collectionneur —
est pénible à lire et dangereux à manipuler (fusion accidentelle).
**Recommandation** : §6.3 — grille auto-fill `minmax(104px,1fr)` (3 col. à
375), tap → bottom sheet (visuel large + vendre/fusionner AVEC confirmations,
cibles 44 px), `content-visibility: auto` + `contain-intrinsic-size`, lazy
images dimensionnées, update ciblée post-action.
**Complexité** : M.
**Dépendances** : R1 ; `PokeCard` container queries ; composant `UDrawer`.
**Critères d'acceptation** : à 375 px, 100 % des noms lisibles (1 ligne, sans
« … ») ; aucune action destructive à moins de 2 taps + confirmation ; scroll de
la collection complète ≥55 fps sur un Android milieu de gamme (profil
Performance) ; vendre 1 carte ne re-render pas la grille entière.

## [P1] R7 — Standard tactile : cibles 44 px, états actifs, haptics Android
**Problème** : cibles < 40 px éparses (pips, votes, sélecteurs de lignes,
boutons de cartes), aucun feedback tactile, hover porteur d'information.
**Preuve** : M5 ; `slot-machine-mobile-compact.png` (numéros latéraux ~24 px) ;
`collection-mobile-compact.png` (boutons ~28 px).
**Impact** : erreurs de tap, sensation « site desktop réduit » au lieu de jeu
mobile.
**Recommandation** : §10 — règle design system : interactif ≥44×44 px,
primaire 56 px, `:active` scale 0.97, `touch-action: manipulation` ; wrapper
`haptic()` sur `navigator.vibrate` (no-op iOS, réglage utilisateur, coupé si
reduced-motion), déclencheurs : lancer, arrêt, révélation rare+, K.O., seuil de
jauge.
**Complexité** : S.
**Dépendances** : design system (étape 4 migration) ; écran Réglages (m10).
**Critères d'acceptation** : audit automatisé (ou revue) : zéro cible
interactive < 44 px sur les 14 pages ; vibration observée sur Android Chrome
aux 5 déclencheurs ; aucun comportement dépendant du hover sur < lg.

## [P1] R8 — Claviers & formulaires mobiles fiables (login, chat)
**Problème** : aucun `inputmode/autocomplete/enterkeyhint` ; composer du chat
non protégé de l'ouverture du clavier (risque champ caché, page « sautée ») ;
placeholders comme seuls labels.
**Preuve** : `ui-inventory.md` §Formulaires ; `chat-page-mobile.png` (composer
bas d'écran) ; `login-mobile-compact.png`.
**Impact** : friction à la connexion (pas d'autofill trousseau) et au chat —
les deux points d'entrée sociaux du jeu.
**Recommandation** : §7 — meta viewport avec `interactive-widget=resizes-content`,
table d'attributs par champ, composer collé au `visualViewport` (fallback iOS),
tab bar masquée clavier ouvert, labels visibles.
**Complexité** : S.
**Dépendances** : R3 (masquage tab bar), pages auth (étape 3 migration).
**Critères d'acceptation** : sur iOS Safari et Chrome Android réels : le champ
chat reste visible au-dessus du clavier pendant la saisie et l'historique reste
scrollable ; l'autofill propose email/mot de passe au login ; clavier email
affiché sur le champ email.

## [P2] R9 — Mode éco & multi-roll léger pour appareils moyens
**Problème** : 5 roulettes empilées animées simultanément (multi-roll), effets
shine/glow paint-heavy permanents, aucune adaptation aux appareils/préférences.
**Preuve** : m12 ; `multi-roll-cascade.png`/`multi-roll-all-results.png`
(5×~200 px de bandes) ; `ui-inventory.md` (25 keyframes, zéro
`prefers-reduced-motion`).
**Impact** : jank et chauffe sur Android moyen de gamme précisément pendant le
moment le plus intense du jeu ; exclusion des joueurs sensibles au mouvement.
**Recommandation** : §6.2 (1 bande + file de 5 résultats < lg, skip au tap) ;
§11 (mode éco auto si `prefers-reduced-motion` / `saveData` /
`deviceMemory ≤ 4` : shine/glow coupés, animation raccourcie ; interrupteur
manuel dans Réglages).
**Complexité** : M.
**Dépendances** : R2 (zone résultat), moteur de roulette migré (étape 5.1).
**Critères d'acceptation** : multi-roll ×5 à 375 px : une seule bande animée,
les 5 résultats visibles sans scroll ; trace Performance sur mobile moyen :
≥55 fps pendant le spin ; avec reduced-motion activé, aucune animation
décorative ne joue (le résultat reste annoncé).

## [P2] R10 — PWA installable (manifest d'abord, service worker ensuite)
**Problème** : jeu à rendez-vous quotidiens consommé via onglet navigateur :
chemin de retour long, chrome navigateur qui ampute le budget vertical, mises à
jour gérées par un bandeau « Ctrl+F5 ».
**Preuve** : rythme temporel (`existing-user-flows.md`) ; F11 (bandeau cache) ;
§11.
**Impact** : rétention sous-exploitée pour une communauté d'habitués ; ~60–100 px
d'écran perdus ; UX de mise à jour indigne.
**Recommandation** : Phase 1 = manifest complet (icônes maskable, standalone,
theme-color `#0f0f1a`, orientation `any`) + invite discrète dans « Plus ».
Phase 2 = `@vite-pwa/nuxt` : precache shell, cache-first sprites webp,
network-first API, toast de mise à jour remplaçant le bandeau jaune. Phase 3
(optionnelle) = Web Push tournoi/trades (opt-in, iOS installé requis) + Badging.
**Complexité** : S (phase 1) / M (phase 2).
**Dépendances** : R1–R4 livrés (installer l'app actuelle serait
contre-productif) ; safe areas §8 opérationnelles (standalone les expose).
**Critères d'acceptation** : Lighthouse PWA installable ; en standalone iOS et
Android : safe areas correctes, aucune régression clavier/scroll ; une mise à
jour déployée se propage via toast sans intervention manuelle ; taux
d'installation mesuré (objectif indicatif : 30 % des joueurs actifs
hebdomadaires à M+2).

---

## Annexe — checklist de recette mobile (par écran)

Pour chaque page migrée, valider à 375×667, 375×812, 430×932, paysage
`≤480 px` de haut, iOS Safari + Chrome Android réels :

1. Action primaire dans le tiers bas, ≥44 px, jamais recouverte.
2. Aucun scroll horizontal du body ; wide-content en conteneur interne.
3. Aucun `fixed` au-dessus du contenu (hors header/tab bar/toasts).
4. Résultat/feedback de l'action visible sans scroll (C1 généralisé).
5. Clavier ouvert : champ visible, layout stable, tab bar masquée.
6. Safe areas top/bottom/latérales respectées (notch + home indicator).
7. `prefers-reduced-motion` : parcours complet jouable sans animation.
8. 55+ fps au scroll et pendant les animations sur Android milieu de gamme.
