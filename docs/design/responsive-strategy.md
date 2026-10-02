# Stratégie responsive & mobile

> Distillation du rapport `docs/experts/08-responsive-mobile.md`. Principe
> directeur : **le mobile est l'expérience principale**, pas une réduction du
> desktop. La communauté joue en grande partie au téléphone.

## Système de breakpoints unique (remplace les 7 seuils actuels)

L'ancien front utilise **7 seuils incohérents** (420, 480, 540, 600, 680, 700,
768). La refonte n'utilise que la grille Tailwind v4 par défaut, **mobile-first**
(le style par défaut EST le 375 px) :

| Seuil | Rôle |
| --- | --- |
| base (<640) | mobile — style par défaut |
| sm (≥640) | grand mobile / petit paysage |
| md (≥768) | tablette portrait (usage pouce → bottom bar conservée) |
| lg (≥1024) | desktop — navbar top, tab bar retirée |
| xl (≥1280) | large desktop — colonnes latérales |

Deux compléments qui **suppriment le besoin de micro-seuils** :

- **Grilles en `auto-fill`** : `grid-cols-[repeat(auto-fill,minmax(104px,1fr))]`
  — le nombre de colonnes découle de la largeur, jamais d'un breakpoint.
- **Container queries** (natif Tailwind v4) sur `GameCard` : la carte adapte
  sprite/nom/actions à **sa** largeur (`@container`), pas à celle de l'écran —
  fin des « classes ad hoc par contexte » de l'ancien front.

## Le budget vertical contractuel (résout C1 sur mobile)

**Exigence** : la roulette **et** son résultat tiennent ensemble sur un écran de
375×**667** (le plus petit courant). Budget cible :

| Zone | Hauteur (px) |
| --- | --- |
| Header slim (logo + 🪙 + 🔔) | 48 (+ safe-area en PWA) |
| Rangée contrôles unique (mode/biome/×5 en chips, détails en bottom sheet) | 44 |
| Bande roulette (cartes 96×140, ~3,5 visibles) | 148 |
| Bouton Lancer (sticky si scroll) | 56 |
| **Zone résultat réservée** (`min-height` fixe : carte 168 + titre + CTA) | **240** |
| Tab bar (+ safe-area) | 56 + 20–34 |
| **Total** | **≈ 624–638** ✅ tient sur 667 |

Ce qui **disparaît de l'écran de jeu** : le bloc avatar (→ header + onglet Plus),
le bouton Inventaire (→ chip), la bannière tournoi (→ hub + toast), le hint
permanent (→ dans le sheet). La zone résultat a un `min-height` dès le
chargement ⇒ **zéro layout shift, zéro scroll**.

Unités : **`dvh`/`svh`** pour le plein écran (jamais `100vh` qui crée le « saut »
de barre d'URL mobile).

## Navigation : 19 routes → bottom tab bar de 5 onglets

Sur mobile/tablette, un hamburger de 19 liens est remplacé par une **bottom tab
bar** atteignable au pouce :

```text
[ 🎰 Jouer ] [ 📚 Collection ] [ ⚔️ Défis ] [ 👥 Social ] [ ⋯ Plus ]
```

- **Jouer** : roulette (`/play`) + hub.
- **Collection** : collection + équipe + inventaire.
- **Défis** : arènes + ligue + jackpot + Spin.
- **Social** : classement + tournoi + chat + échanges.
- **Plus** : stats + guide + suggestions + patch notes + profil/réglages +
  déconnexion.

Les badges d'action (trades, tournoi, notifs) remontent sur les onglets
concernés, **avec un nombre**. Sur `lg+`, la tab bar disparaît au profit de la
navbar top à dropdowns.

## Comportement par zone (synthèse)

| Zone | mobile (base) | desktop (lg+) |
| --- | --- | --- |
| Navigation | bottom tab bar 5 onglets | navbar top + dropdowns |
| Roulette | cartes 96 px, ~3,5 visibles | cartes 110 px, 7 visibles |
| Collection | 3 colonnes, sheet d'actions | 6–8 colonnes (auto-fill) |
| Tableaux (leaderboard) | cartes empilées | `UTable` 6 colonnes |
| Bracket tournoi | scroll horizontal, 1 tour/écran + snap | bracket complet |
| Modales | bottom sheet (`UDrawer`) | `UModal` centrée |
| Chat | page plein écran (onglet Social) | widget flottant + page |
| Bannières | carte dans le hub + toast | toast top-right |
| Multi-roll | 1 bande + file de 5 résultats | option 5 bandes empilées |

## Règles tactiles & claviers

- **Cibles ≥ 44×44 px** partout (les pips de badges, votes 👍/👎, croix de
  modale et boutons de lignes du slot étaient sous ce seuil).
- **États actifs** (`:active`) visibles ; **haptics** Android optionnels
  (`navigator.vibrate`) sur les moments clés (résultat, victoire).
- **Claviers mobiles** : `inputmode`/`autocomplete` corrects (email, mot de
  passe) ; le composer du chat suit le `visualViewport` pour rester visible
  clavier ouvert ; la tab bar se masque quand le clavier est ouvert.

## Safe areas & orientations

- `env(safe-area-inset-*)` respectés (notch, home indicator) sur header et tab
  bar.
- **Portrait prioritaire** ; en paysage, la roulette s'élargit (plus de cartes
  visibles) sans blocage.

## Performance sur appareils moyens (cible : Android ~4 Go RAM)

- Collection **virtualisée** (DOM ≤ ~60 cartes).
- Multi-roll : rendu **compact par défaut sur mobile** (1 bande + file de
  résultats) au lieu de 5 bandes empilées (m12) — permis par le découplage
  moteur/vue.
- **Mode éco** : sous `navigator.connection.saveData` ou `deviceMemory ≤ 4`,
  désactiver les effets non essentiels (particules, glows lourds) tout en
  conservant l'information.
- `prefers-reduced-motion` : parcours complet jouable sans animation.

## PWA — recommandation : OUI, en 2 phases

Pour une communauté d'habitués qui reviennent chaque jour, l'installabilité a de
la valeur (icône sur l'écran d'accueil, plein écran sans barre d'URL) :

1. **Phase 1** : `manifest.webmanifest` + icônes + `display: standalone` +
   `theme_color` — installable, faible coût, aucun risque.
2. **Phase 2** (optionnelle, après la refonte) : service worker pour le cache des
   assets statiques et des sprites (offline partiel du shell). À ne pas faire
   avant que la refonte soit stable (le cache SW complique les déploiements).

## Checklist de recette mobile (par écran)

Chaque écran migré est validé sur 375×667 **et** 375×812 :

- [ ] roulette + résultat visibles ensemble sans scroll ;
- [ ] aucun élément flottant au-dessus du jeu ;
- [ ] zéro scroll horizontal du body ;
- [ ] cibles ≥ 44 px, safe areas respectées ;
- [ ] tableaux denses → cartes ; bracket → scroll par tour ;
- [ ] 55+ fps au scroll et pendant les animations.
