# Inventaire UI — composants, patterns et éléments récurrents

> Base : lecture intégrale de `src/components/*` + `style.css` (6 462 lignes)
> + captures. Sert de checklist de parité pour le design system de la refonte.

## Identité visuelle actuelle

| Token de fait | Valeur | Usage |
| --- | --- | --- |
| Fond app | `#0f0f1a` | body |
| Surface 1 | `#1a1a2e` | navbar, cartes de page |
| Surface 2 | `#1e1e2e` | menus, modales |
| Accent primaire | `#bb86fc` (violet Material dark) | liens, boutons, bordures actives |
| Succès | `#4caf50` / `#66bb6a` | jauges, victoires |
| Avertissement | `#ff9800` / `#FFA726` | jauges 40-60 % |
| Erreur | `#f44336` / `#ef5350` | défaites, erreurs |
| Or (légendaire) | `#ffd700` | bordures, compteurs complétés |
| Argent (shiny) | `#dcdddf` + glow | bordures shiny |
| Police | `'Segoe UI', system-ui` | tout (aucune police dédiée) |
| Radius | 8–12 px (variable, non systématisé) | cartes, boutons |
| Emojis comme icônes | 🎰🪙🎒⚔️🏅… | partout (aucune bibliothèque d'icônes) |

Breakpoints observés : 420, 480, 540, 600, 680, 700, 768 px — **7 seuils
différents**, signe d'un responsive au cas par cas.

## Composants récurrents

### Carte Pokémon (`card.js`) — LE composant central
- Variantes : possédée / non-possédée (dos « ??? » + badge biome) / shiny
  (`card-alt`, badge ✦, bordure argent) / légendaire (bordure or) / épique /
  rare / « nouvelle découverte » (halo).
- Contenus : image webp, nom, badge biome coloré (10 classes de couleur) ou
  icône de type, quantité `xN`, actions 💰 vendre + 🆙 fusionner.
- Usages : collection, bande de roulette, résultat, choix de carte, avatar
  picker, équipes adverses… (avec classes ad hoc par contexte ⚠️ incohérences).

### Roulette (`roulette.js`)
- Viewport + bande `translateX`, pointeur central rouge, 20 cartes.
- Cartes spéciales : masquée « ✦ ??? », événement (Pokéball), événement révélé.
- Bouton principal `btn-spin` (dégradé violet, coût affiché).
- Zone résultat sous la roulette (titre + carte, ou erreur ❌).

### Jauge de duel (`gaugeArc.js` + gyms/battleReplay/legendaryCapture)
- Demi-cercle SVG 200×110, arc vert (victoire) / rouge (défaite), seuil blanc,
  aiguille rotative, % au centre, légende sous la jauge.
- Utilisée par : arènes, entraînement, replays tournoi, ligue, capture légendaire.

### Machine à sous (slot-machine.js)
- 3 viewports de rouleau + bandes verticales, overlay lignes (barres, numéros
  latéraux, diagonales SVG), cellules avec glow gagnant multi-couleurs.

### Modales
| Type | Fichier | Particularités |
| --- | --- | --- |
| Modale générique | `modal.js` `showModal` | titre + HTML + boutons configurables (primary/cancel), promesse résolue à l'action, clic overlay = fermer ⚠️ pas d'Escape, pas de focus trap |
| Confirmation de vente | `confirmSellModal` | prix ou charme (shiny) |
| Choix de carte (événement) | roulette.js | 2 cartes cliquables, PAS de fermeture possible (choix forcé) |
| Avatar picker | home.js | onglets Standards/Shiny, grille scrollable |
| Inventaire | `inventoryModal.js` | groupes repliables charme/tickets biome/type, activer/désactiver |
| Replay de combat | `battleReplay.js` | plein écran, vitesse ×1/×2/×4 persistée, skip au clic, fermeture ✕ |
| Résumé de match | tournament.js | équipes + K.O. + log |
| Historique tournois | tournament.js | liste + navigation vers détail |
| Intro (gyms/team/tournoi) | par page | pédagogie une seule fois (flag localStorage) |
| Capture légendaire | `legendaryCapture.js` | séquence scriptée jauge + pokéball |
| Patch notes | `patchNotes.js` | à la connexion si version non vue |

⚠️ Trois systèmes d'overlay coexistent (`modal-overlay`, `replay-overlay`,
`card-choice-overlay`/`avatar-modal-overlay`) avec des comportements de
fermeture différents.

### Navigation
- Navbar sticky : dropdowns au clic (un seul ouvert), badges rouges (notifs,
  tournoi, trades, patch notes, social agrégé), lien version.
- Hamburger mobile plein écran ; fermeture au clic lien/extérieur.
- Bannière tournoi flottante (fixed top-right, dismiss au clic).
- Widget chat flottant (bulle + panneau 300px).
- Bandeau cache jaune plein écran (top).

### Formulaires
- Auth uniquement (login/register/forgot/reset) : inputs sombres empilés,
  placeholder comme seul label ⚠️, bouton pleine largeur, erreur en rouge sous
  le formulaire. Chat : input + bouton ➤. Suggestions : textarea + select admin.
- Aucune validation en direct (uniquement HTML5 + erreurs API).

### Feedbacks & états
- Chargement : texte « Chargement... » (opacité 0.6) — aucun skeleton, aucun spinner.
- Succès : bandeaux verts temporaires (merge/sell 4 s), zones de résultat.
- Erreur : texte rouge inline, préfixe ❌, messages API bruts.
- Badges compteurs : pastilles rouges sans nombre (juste un point).
- Tooltips : natifs `title` + un tooltip custom (badges d'équipe).
- Toast/notification système : **inexistant** (pas de file de toasts).

### Barres & indicateurs
- Barre de progression badges (8 pips avec images).
- Barre d'estimation de victoire (largeur % + couleur).
- Barre bonus entraînement (0-100 %).
- Barres de matchup tournoi (double barre moi/adversaire).
- Compteur collection « X / Y » texte.

## Système d'animation existant (25 keyframes)

| Groupe | Animations | Notes |
| --- | --- | --- |
| Roulette | transition `transform` 4 s cubic-bezier + flip reveal (scale/brightness) | GPU-friendly |
| Cartes | `card-shine` (reflet), `rainbow-border` (nouvelle découverte), pop | |
| Combat | `fighter-enter`, `pokemon-ko` (chute + gris), `ko-label-appear`, `mini-log-appear` | |
| Slot | `reel-spin`, `cellPop`, `glow-multi` (alternance couleurs), `winner-pulse` | |
| Capture | 8 keyframes (throw, shake, open, sparkle, fail, star-burst, vanish, escape) | séquence scriptée |
| Divers | `fadeIn`, `fadeInUp`, `modalScale`, `event-shadow`, `biomeReveal`, `typeReveal`, `charme-pop` | |

⚠️ **Aucune prise en charge de `prefers-reduced-motion`** (0 occurrence dans le CSS).

## Système sonore (Web Audio, synthèse chiptune)

| Son | Déclencheur |
| --- | --- |
| Tick (square 1100 Hz) | passage de chaque carte sous le pointeur (timing résolu par inversion de Bézier) |
| Fanfares par rareté (arpèges) | révélation du résultat (2 notes commun → 7 notes légendaire/shiny) |
| Montée de tension + LFO | pendant un duel (fréquence/volume croissants) |
| Battement de cœur LUB-dub 110→180 BPM | zone d'approche du seuil de la jauge |
| Silence brutal | franchissement du seuil (défaite) |
| Win/lose duel, victoire/défaite combat, victoire entraînement | fins de séquence |
| Rouleaux slot (ticks aléatoires ~11/s ×3) + claquement d'arrêt + fanfare par lot | jackpot |

⚠️ Aucun réglage de volume / mute exposé à l'utilisateur.

## Patterns de contenu
- Langue : 100 % français, tutoiement/vouvoiement **mélangés** ⚠️ (« Es-tu sûr » /
  « Vous avez obtenu »).
- Dates : `toLocaleDateString('fr-FR')` formats variables selon les pages.
- Nombres : `toLocaleString('fr-FR')` partiel (slot uniquement).
- Emojis omniprésents comme langage iconographique (❌✅⚠️🏆⏳✨…).
