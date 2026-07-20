# Lignes directrices d'accessibilité

> Distillation du rapport `docs/experts/07-accessibilite.md`. Référentiel : **WCAG
> 2.2 AA** (+ AAA quand le projet le vise, ex. cibles 44 px). Prescriptif pour la
> refonte (pas de correctif sur l'ancien code). Bonne nouvelle : Nuxt UI v4 (Reka
> UI) règle **structurellement** la moitié du problème (focus trap, Escape, retour
> de focus, `role="dialog"`, régions live des toasts) ; l'effort restant est ciblé.

## Principe directeur

**`prefers-reduced-motion` et le lecteur d'écran ne retirent jamais d'information
ni de récompense.** On remplace le mouvement par *(état final direct + texte/log +
son réglable)* et on annonce le gain en clair. Le suspense se conserve par le son
et un micro-délai, pas par 4 s de translation obligatoire.

## 1. Contrastes — corrections à imposer à la palette

La palette proposée (design system) est presque conforme mais laisse passer
**5 couples défaillants** mesurés (formule WCAG sRGB) :

| Couple | Ratio | Correction |
| --- | --- | --- |
| **blanc / bouton `solid violet-500`** | 4.23:1 ❌ (AA-large seul) | bg **`violet-600 #7c3aed`** (5.70:1) **ou** texte sombre `night-950` sur `violet-400` (7.03:1). Forcer le shade que Nuxt UI applique au variant `solid`. |
| **hint `#888`** (ancien) | 4.81:1 (limite) | adopter **`night-400 #9494b0`** (5.20:1 partout) comme couleur de hint |
| **rarity-common en texte** | 3.44:1 ❌ | ne l'utiliser que comme bordure/fond, jamais comme texte (sinon éclaircir ≥ `#8a8aa6`) |
| **badges biome à fond saturé + blanc** | 2.78–3.12:1 ❌ | recette « texte clair sur fond **teinté sombre** » (color-mix), jamais fond saturé + blanc |
| **type-badges sombres** (dragon, spectre, combat, poison, psy) | 2.98–4.46:1 ❌ | texte clair fixe `night-100` sur fond type teinté sombre → les 15 types passent AAA |

Baseline saine confirmée : corps `night-100` sur `night-950/800` (16.3/13.1:1),
`primary violet-400` (7.03:1), `secondary amber-400` (11.5:1), succès/info/warning
(8.5–9.9:1). Les compteurs dorés sur sombre **ne sont pas** un problème de
contraste (l'or est un enjeu hiérarchique, pas de lisibilité).

## 2. Navigation clavier (parcours à garantir)

- **Roulette** : lancer au clavier (bouton focusable, `Espace`/`Entrée`) ;
  résultat annoncé (§3).
- **Modales** : focus trap + `Escape` + retour du focus à l'élément déclencheur
  (fourni par Nuxt UI — ne pas casser).
- **Menus dropdown / onglets** : navigation fléchée (fourni par Reka UI).
- **Grilles** (avatar picker, collection, choix de carte) : navigation par
  flèches, `Entrée` pour sélectionner.
- **Kanban de suggestions**, **stepper d'échange** : ordre de tabulation logique,
  actions atteignables au clavier.
- **Focus-visible jamais supprimé** (`ring-2 ring-primary/60`), y compris sur
  PokeCard et les pips de badges.

## 3. Lecteurs d'écran — instrumenter les moments de jeu custom

Le jeu est **fait d'événements dynamiques** ; sans régions live, un joueur au
lecteur d'écran ne sait pas ce qu'il a gagné.

- **Tirage** : `aria-live="polite"` sur la zone résultat, avec le **texte complet
  du gain** : « Vous avez obtenu Pyroli, type Feu, rare, nouvelle carte ! » (ou
  « doublon, exemplaire N »).
- **Jauge de duel** : préférer **`role="img"` + `aria-label`** (« Probabilité de
  victoire 62 % ») + **région live du résultat** (« Victoire ! » / « Défaite »)
  plutôt que `role="meter"` (support SR plus fiable ainsi).
- **Jackpot** : annoncer le résultat **par ligne** en région live.
- **CoinCounter** : `aria-live="polite"` sur les variations de solde.
- **Toasts** : région live (fournie par Nuxt UI).

Règle : `assertive` réservé aux erreurs bloquantes ; tout le reste en `polite`.

## 4. Information jamais portée par la couleur seule

| Aujourd'hui couleur seule | Doubler par |
| --- | --- |
| Bordures de rareté (or/argent/bleu/violet) | **icône + texte** de rareté (« Épique ») |
| Jauges vert/rouge | **seuil marqué + label** (« Victoire < 62 % ») + « Victoire/Défaite » en toutes lettres |
| Badges navbar « point rouge » | **`UChip` avec un nombre** |
| Lignes gagnantes du jackpot | contour + label de gain |

## 5. Emojis porteurs de sens → icônes labellisées

Remplacer par des icônes Lucide avec `aria-label` (garder les emojis **éditoriaux
dans le texte**, ex. 😅 du doublon) :

| Emoji-sens | Remplacement |
| --- | --- |
| 🪙 (monnaie) | `i-lucide-coins` + « coins » |
| ✦ (shiny) | icône shiny + « shiny » |
| ✅ / ❌ (résultat) | icône + « victoire »/« défaite » |
| 🥇🥈🥉 (rang) | `aria-label` « 1re/2e/3e place » |

## 6. Zones tactiles & mobile

- **Cibles ≥ 44×44 px** (les pips de badges, votes 👍/👎, boutons de lignes du
  slot, croix de modale étaient sous ce seuil — cf. `responsive-strategy.md`).
- Tableaux denses (leaderboard 6 colonnes) → **cartes empilées** sur mobile.
- Tailles de texte minimales, longueurs de ligne maîtrisées.

## 7. Structure & repères

- **Landmarks** : `header`, `nav`, `main`, `footer` ; un `main` par page.
- **Hiérarchie de titres** cohérente (un seul `h1` par page).
- **Skip-link** vers le contenu principal.

## 8. Réglages accessibilité (panneau dédié, inexistant aujourd'hui — m10)

- Son : **mute + volume** (persisté).
- Animations : override manuel de `prefers-reduced-motion`.
- (P3) thème clair.

## Checklist de recette a11y (par écran)

- [ ] tous les textes porteurs d'info ≥ AA (les 5 couples corrigés) ;
- [ ] toutes les modales : focus trap + Escape + retour focus ;
- [ ] résultat de tirage / duel / jackpot annoncé en région live ;
- [ ] `prefers-reduced-motion` : parcours complet jouable, information préservée ;
- [ ] aucune information portée par la seule couleur ;
- [ ] emojis-sens remplacés par icônes labellisées ;
- [ ] cibles ≥ 44 px, focus-visible partout ;
- [ ] 0 violation bloquante axe-core (CI).

## Priorisation (recommandations A1–A9 du rapport 07)

- **P0** : contrastes (A1), overlays clavier (A2), `aria-live` des moments de jeu
  (A3), reduced-motion (A4).
- **P1** : couleur seule (A5), emojis (A6), cibles 44 px + clavier (A7),
  structure/reflow mobile (A8).
- **P2** : toasts accessibles + panneau réglages a11y (A9).
