# Cartographie de l'application PokeRoulette

> Sources : code frontend de production (servi non bundlé sur `/src/`, lu intégralement),
> exploration Playwright (178 captures), journaux réseau (275 appels API).
> Version observée : navbar `v3.4.0` (variable `__APP_VERSION__` du code : `1.2.0` — incohérence).

## Vue d'ensemble

PokeRoulette est un **jeu web gacha de collection Pokémon** (génération 1 / Kanto,
151 cartes standard : 146 standards + 5 légendaires, chacune déclinée en version
Shiny). SPA **vanilla JS sans framework** avec routing par hash, thème sombre
(`#0f0f1a`, accent violet `#bb86fc`), API REST + un WebSocket (chat).

- **Boucle cœur** : gagner des coins → lancer la roulette (10 🪙) → compléter la
  collection → fusionner/構construire une équipe → battre les 8 arènes → ligue,
  tournois hebdomadaires, échanges.
- **Économie** : bonus de connexion quotidien 100 🪙 (+10/badge), entraînement
  quotidien +5 🪙, arènes/tournois/ligue/jackpot/aventure Spin comme sources
  secondaires. Compte neuf : 200 🪙 de départ observés.
- **Temps réel** : uniquement le chat (WebSocket `/api/ws/chat`). Tout le reste
  est du REST par page.

## Routes (hash routing, `src/main.js`)

| Hash | Page | Accès | Description |
| --- | --- | --- | --- |
| `#home` | Roulette (accueil) | privé | Tirage gacha principal, filtres biome, multi-roll, inventaire, avatar |
| `#login` | Connexion | public | Email + mot de passe |
| `#register` | Inscription | public | Username, email, mot de passe (min 8) |
| `#forgot-password` | Mot de passe oublié | public | Envoi d'email de reset |
| `#reset-password` | Réinitialisation | public | Via token de l'email (`?token=`) |
| `#rules` | Guide du jeu | public | Accordéons de règles par thème |
| `#collection` | Ma collection | privé | Grille de cartes, filtres, vente, fusion |
| `#team` | Mon équipe | privé | 6 slots, roulette d'équipe destructive, badges |
| `#gyms` | Arènes | privé | Arène courante, combat hebdo, entraînement quotidien, historique |
| `#league` | Ligue des 4 | privé (8 badges) | Défi hebdo contre le top 4 du tournoi |
| `#tournament` | Tournoi | privé | Inscription, préparation, bracket, replays, historique |
| `#slot-machine` | Jackpot | privé | Machine à sous quotidienne (1/jour) |
| `#spin` | Spin (aventure) | privé | **Jeu séparé embarqué en iframe** `/spin/?iframe=true` |
| `#leaderboard` | Classement | privé | Top 10 + position du joueur, tricheurs, feed shiny |
| `#stats` | Statistiques | privé | Stats globales, par joueur, probabilités, anecdotes |
| `#chat` | Tchat | privé | Chat temps réel (page dédiée) |
| `#trades` | Échanges | privé (120 cartes) | Échange de cartes entre joueurs (3 étapes) |
| `#suggestions` | Idées & Roadmap | privé | Board kanban de suggestions votables |
| `#patchnotes` | Notes de version | privé | Historique des versions (données en dur côté front) |

Routes publiques : `#register`, `#login`, `#rules`, `#forgot-password`, `#reset-password`.
Tout autre hash sans token → redirection `#login`. Hash inconnu → rendu `login` (pas de 404).

## Structure de navigation

```text
Navbar (sticky, re-rendue à CHAQUE changement de route)
├── Marque « 🎰 PokeRoulette » → #home
├── Lien version « v3.4.0 » (+badge rouge si patch notes non lues) → #patchnotes
├── Jeux ▾            → Roulette (#home) · Jackpot (#slot-machine) · Spin (#spin)
├── Ma progression ▾  → Ma collection · Mon équipe
├── Défis ▾           → Arènes · Ligue des 4 (visible seulement avec 8 badges)
├── Social ▾ (+badge) → Classement · Tournoi (+badge) · Tchat · Échanges (+badge)
├── Statistiques      (lien direct)
├── Infos ▾           → Guide du jeu · Idées & Roadmap
├── 🔔 Notifications  (dropdown, badge non-lus, « tout lu » à l'ouverture)
└── Déconnexion
Mobile : menu hamburger plein écran avec les mêmes sections.
Éléments flottants : bannière tournoi (invitation lundi→mardi / félicitations jeudi→vendredi),
widget chat 💬 (toutes pages sauf #chat), bandeau « nouvelle version » (cache).
```

## Architecture technique actuelle (à remplacer)

```text
index.html            div#app > nav#navbar + div#tournament-banner + main#page
src/main.js           routeur hash → renderX(page) ; garde d'auth par token localStorage
src/api/client.js     fetch wrapper (Authorization: Bearer <gacha_token>) + api.* (20 modules)
src/pages/*.js        18 pages — innerHTML de gabarits template-string + addEventListener
src/components/*.js   roulette, card, modal, navbar, sounds (Web Audio synthèse),
                      battleReplay, teamRoulette, inventoryModal, legendaryCapture,
                      gaugeArc, chatWidget, patchNotes (données en dur), tournamentBanner,
                      cacheBanner
src/lib/chatConnection.js  WebSocket partagé page/widget, reconnexion, resync
src/style.css         6 462 lignes monolithiques, 25 @keyframes, 7 breakpoints différents
```

Caractéristiques notables :

- **Pas de state management** : chaque page re-fetch tout ; état local par module
  (variables de closure, parfois globales — `state` de gyms.js est un singleton).
- **Rendu par `innerHTML`** avec interpolation directe — l'échappement HTML est
  manuel et inégal selon les pages (voir frontend-issues.md).
- **La navbar re-fetch à chaque navigation** : `/api/tournament/current`,
  `/api/league/status`, `/api/trades`, `/api/notifications` (cache 20 s pour ce
  dernier uniquement). Observé : 64 appels à `tournament/current` sur une session
  d'exploration.
- **Sons synthétisés** en Web Audio (square waves chiptune) : ticks de roulette
  calés sur la courbe de Bézier de l'animation, battement de cœur pendant les
  duels, fanfares par rareté. Aucun fichier audio.
- **Le résultat des combats/tirages est résolu côté serveur** puis « rejoué »
  en animation côté client (théâtre de suspense) — architecture saine.
- **Spin** est une application distincte (iframe `/spin/?iframe=true`) avec sa
  propre surface API (`POST /api/spin/start` observé) et communication
  `postMessage` (`spin:close`).

## Comptes observés pendant l'audit

| Compte | Profil | Usage |
| --- | --- | --- |
| Compte principal (propriétaire) | **End-game** : 8/8 badges, « Champion de Kanto », 6 🪙, quotas quotidiens (jackpot, entraînement) déjà consommés | Tour complet des 19 routes × 5 résolutions, replays de tournoi, états end-game |
| `AuditNassim` (compte de test, alias `+audit`) | **Nouveau joueur** : 200 🪙 de départ, collection vide | Onboarding, modales d'intro, états vides/verrouillés, animations de tirage et jackpot |
