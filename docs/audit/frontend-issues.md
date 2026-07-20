# Problèmes du frontend actuel — classés par criticité

> Faits observés (code lu + captures + journaux réseau). Chaque entrée liste sa
> preuve. Les recommandations détaillées suivent le format normalisé dans les
> rapports d'experts et la synthèse produit.

## 🔴 Critique (nuit directement au jeu ou aux joueurs)

### C1. Le résultat du tirage apparaît sous la ligne de flottaison
La zone « ✨ Vous avez obtenu ! » se rend SOUS la roulette : en 1440×900 comme
en mobile, la carte gagnée est coupée ou invisible sans scroll. Le moment de
récompense — cœur du jeu — est littéralement hors écran.
**Preuve** : `home/roll-result-new-card.png` (desktop), `home/roll-result-mobile.png`.

### C2. Aucun onboarding de la boucle cœur
Après inscription, l'utilisateur arrive sur une bande de cartes « ??? » sans
aucune explication (pas de tutoriel, pas de tooltip, pas d'invite). Les modales
d'intro existent pour équipe/arènes/tournoi mais PAS pour la roulette ni pour
l'économie (coins, biomes, raretés, shiny).
**Preuve** : `onboarding/first-visit-home.png` — bande vide de sens + 3 sélecteurs
non expliqués (« Visibles / Si possédée / Masquées » est incompréhensible avant
d'avoir compris le jeu).

### C3. Messages d'erreur techniques bruts
`TypeError: Failed to fetch` est affiché tel quel à l'utilisateur en cas de
coupure réseau. Les 401 affichent « Token invalide ou expiré » sans bouton de
reconnexion. Aucune stratégie d'erreur globale.
**Preuve** : `errors/roll-offline-error.png`, `errors/invalid-token-collection.png`.

### C4. La navbar re-fetch 4 endpoints à chaque navigation
`renderNavbar()` est appelé à chaque hashchange et relance
`tournament/current`, `league/status`, `trades`, `notifications` (seul ce
dernier a un cache de 20 s). Observé : **64 appels** à `tournament/current`
pendant l'exploration. Coût serveur inutile + latence.
**Preuve** : `artifacts/network/api-log.json` (comptage), `navbar.js`.

### C5. Fusion sans confirmation
Le bouton 🆙 consomme immédiatement 10 exemplaires. Un mauvais clic détruit
des cartes (dont de potentiels doublons destinés à la vente ou aux échanges).
La vente, elle, a une confirmation — incohérence de traitement du risque.
**Preuve** : `collection.js` `handleMerge` (aucun `showModal`).

### C6. Le Guide contredit l'application (coûts biome)
Le Guide dit « filtrer par biome (sans surcoût) » ; l'API/l'UI facturent
50 à 300 🪙 selon le biome. Un joueur qui suit le Guide budgette 10 🪙 et
découvre 240 🪙. Confiance érodée.
**Preuve** : `#rules` (accordéon Tirages) vs `GET /roll/biomes` (`api-log.json`).

## 🟠 Majeur (dégrade l'expérience de façon récurrente)

### M1. Aucune hiérarchie de célébration
Commun, rare, épique, légendaire et shiny partagent le même gabarit de
résultat (« ✨ Vous avez obtenu ! » + bordure). Pas de montée en intensité, pas
de plein écran pour un légendaire/shiny (~1 tirage sur 500). Le « doublon vs
nouvelle carte » n'est pas verbalisé (halo discret seulement).
**Preuve** : `showResult()` de `roulette.js` — un seul chemin de rendu ;
captures `home/roll-result-*`.

### M2. Mobile : collisions et zones perdues
La bannière tournoi chevauche le bloc utilisateur (texte illisible) ; la bulle
de chat masque des boutons en bas de page ; le résultat de tirage est encore
plus bas que sur desktop.
**Preuve** : `home/home-mobile-compact.png` (chevauchement),
`slot-machine/slot-machine-mobile-*.png`.

### M3. Chargements « texte nu » omniprésents
Chaque navigation affiche « Chargement... » sans structure — la page saute
quand le contenu arrive (layout shift massif sur collection/gyms/stats).
Aucune image lazy, pop-in visible sur 300+ cartes de la collection.
**Preuve** : `loading/collection-loading-slow-network.png` + navigation live.

### M4. Incohérences de langage et de ton
Tutoiement (« Es-tu sûr ? », page trades) et vouvoiement (« Vous avez
obtenu ! ») mélangés, parfois dans la même page. Formats de date variables.
**Preuve** : `modal.js` vs `roulette.js` ; `trades.js` (tu) vs `gyms.js` (vous).

### M5. Accessibilité très faible
- Aucun `prefers-reduced-motion` (25 keyframes non désactivables).
- Modales sans focus trap, sans fermeture Escape, sans `role="dialog"`.
- Information par couleur seule (jauges, bordures de rareté).
- Emojis porteurs de sens sans alternative textuelle (`🪙`, `✦`).
- Zones cliquables < 40 px sur mobile (pips de badges, boutons de vote).
- Aucun `aria-live` pour les résultats/notifications dynamiques.
**Preuve** : grep CSS/JS (0 occurrence de reduced-motion, aria-live, role=dialog
hors 2 `role="button"`), captures mobiles.

### M6. Sécurité XSS : échappement HTML inégal
Le rendu par `innerHTML` interpole des données serveur. `escapeHtml` existe
dans 4 fichiers mais n'est PAS appliqué partout : `chat.js` widget/page passent
par `renderNotifList`-like escaping, mais `card.name`, `username` (tournoi,
leaderboard, gym history) sont interpolés sans échappement. Les données sont
aujourd'hui « de confiance » (catalogue interne, usernames contrôlés ?) mais un
username contenant du HTML serait exécuté sur le leaderboard/tournoi.
**Preuve** : `tournament.js` `renderParticipants` (`${p.username}` brut),
`leaderboard.js` `buildRowHTML` (`${player.username}` brut), `gyms.js` history.
*(À vérifier côté backend : contraintes sur les usernames à l'inscription.)*

### M7. Solde de coins « optimiste » et éclaté
Le front décrémente le solde localement (`user.coins -= card.rollCost`) sans
re-synchronisation ; le solde vit dans 4+ sources API différentes selon la
page. Risque d'affichage faux après événements combinés (multi-roll + ticket).
**Preuve** : `home.js` `handleRollResult`, sources listées dans api-inventory.

### M8. Pas de file de notifications UI (toasts)
Les feedbacks sont des bandeaux locaux par page (4 s) ou des zones inline. Un
succès survenu pendant une navigation est perdu. Aucune notification pour les
événements sociaux (trade reçu) hors badge navbar au prochain rechargement.

## 🟡 Modéré (friction, dette, opportunités)

### m1. Trois systèmes d'overlay différents, comportements de fermeture différents
`modal-overlay` (clic dehors OK), `replay-overlay` (✕ seulement pour le replay),
`card-choice-overlay` (aucune fermeture). Escape ne ferme jamais rien.

### m2. Le hash inconnu rend la page login même connecté
Déroutant (l'utilisateur semble déconnecté). Pas de page 404.
**Preuve** : `edge-cases/unknown-route.png`.

### m3. Table des récompenses du jackpot repliée par défaut
L'information de valeur (probabilités) est cachée dans un `<details>` sous la
machine ; le choix de mise (gratuit vs 5 vs 10) n'explicite pas le gain espéré.
**Preuve** : `slot-machine/slot-machine-desktop.png` vs `slot-prize-table-open.png`.

### m4. « Revenez demain » sans heure de reset
Jackpot, entraînement : aucun compte à rebours (l'arène en a un, elle).
Incohérence des patterns de cooldown.

### m5. Patch notes dupliquées dans le front
`patchNotes.js` embarque 11 versions en dur (618 lignes) ; la version affichée
navbar (3.4.0) diverge de `__APP_VERSION__` (1.2.0). Deux sources de vérité.

### m6. Le sélecteur « Si possédée » et modes de révélation peu clairs
Libellés ambigus (« Masquées : toutes les cartes sont révélées après le
lancer » — contre-intuitif), hint requis pour comprendre, pas de préview.

### m7. Bouton « voir le classement des tricheurs » à côté du bouton principal
Feature fun mais mise au même niveau visuel que l'action primaire.

### m8. La page d'accueil ne présente aucun statut de progression
Ni badges, ni complétion de collection, ni échéances (tournoi jeudi, arène
lundi…) — le hub du jeu est un écran de machine isolé.

### m9. Densité d'information mobile non repensée
Tableaux (leaderboard 6 colonnes) en scroll horizontal implicite, bracket de
tournoi en colonnes empilées très longues, stats en pavés de texte.
**Preuve** : `social/leaderboard-mobile-compact.png`, `tournament/tournament-mobile-compact.png`.

### m10. Aucun réglage utilisateur
Pas de contrôle du son (synthèse Web Audio non coupable), pas de préférences
d'animation, pas de thème. Le mode de révélation est le seul réglage.

### m11. Performance : 300+ cartes DOM sans virtualisation
La collection rend tout le catalogue ×2 (standard+shiny selon onglet) en une
passe innerHTML ; re-render complet à chaque changement de filtre et après
chaque vente/fusion (re-fetch + reconstruction totale).

### m12. Le multi-roll monte 5 roulettes complètes empilées
5 × 20 cartes + 5 animations simultanées — lourd sur mobile bas de gamme
(observé fluide sur desktop, à risque sur mobile).

## Synthèse des forces à préserver (le « bon » de l'existant)

1. **Le théâtre de suspense** : jauges à ralenti, battement de cœur, arrêts
   décalés du slot, flip de révélation — le drama est déjà pensé, il faut le
   sublimer, pas le réinventer.
2. **Résolution serveur + animation client** : anti-triche sain et rejouable.
3. **L'anti-spoiler du tournoi** (« Mon parcours ») : excellente idée UX.
4. **La pédagogie par modales d'intro** (équipe/arènes/tournoi) et le Guide
   complet.
5. **Les estimations de victoire** partout (transparence des probabilités).
6. **L'économie riche** et les quotas quotidiens/hebdo qui rythment le jeu.
7. **Le son synthétisé** (zéro asset, ticks parfaitement synchronisés).
8. **Boutons désactivés pendant les actions** (anti double-clic généralisé).
9. **Reconnexion et resync du chat** silencieuses et correctes.
10. **La personnalité** : française, drôle (classement des tricheurs, anecdotes,
    marqueur doublon 😅) — à conserver absolument.
