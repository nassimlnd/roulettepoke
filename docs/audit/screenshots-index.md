# Index des captures d'écran

> 178 captures dans `artifacts/screenshots/`. Générées par `exploration/explore.mjs`
> (compte principal, profil end-game 8/8 badges) et `exploration/onboarding.mjs`
> (compte de test vierge « nouveau joueur »). Résolutions : mobile-compact 375×812,
> mobile-large 430×932, tablet 768×1024, desktop 1440×900, desktop-xl 1920×1080.


> Correspondance avec la structure de rangement initialement demandée : il n'existe
> ni « lobby » ni « settings » dans l'application (pas de parties synchrones, pas de page
> réglages) ; les catégories suivent l'architecture réelle. `game` ≈ home + gyms +
> slot-machine + tournament + league ; `results` ≈ captures `*-result*` ; `profile` ≈
> avatar (home) + team. Les problèmes observés par écran sont consolidés dans
> `frontend-issues.md` (références C1-C6, M1-M8, m1-m12).


## Authentification (`authentication/`, 13 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `after-logout.png` | `#login` | 1440x900 | retour à la connexion après déconnexion — clic sur Déconnexion |
| `forgot-password-desktop.png` | `#forgot-password` | 1440x900 | formulaire mot de passe oublié |
| `forgot-password-mobile-compact.png` | `#forgot-password` | 375x812 | formulaire mot de passe oublié |
| `login-desktop-xl.png` | `#login` | 1920x1080 | formulaire de connexion vide |
| `login-desktop.png` | `#login` | 1440x900 | formulaire de connexion vide |
| `login-mobile-compact.png` | `#login` | 375x812 | formulaire de connexion vide |
| `login-mobile-large.png` | `#login` | 430x932 | formulaire de connexion vide |
| `login-success-redirect-home.png` | `#login` | 1440x900 | connexion réussie → #home |
| `login-tablet.png` | `#login` | 768x1024 | formulaire de connexion vide |
| `register-desktop.png` | `#register` | 1440x900 | formulaire d'inscription |
| `register-mobile-compact.png` | `#register` | 375x812 | formulaire d'inscription |
| `rules-public-desktop.png` | `#rules` | 1440x900 | guide accessible sans connexion |
| `rules-public-mobile-compact.png` | `#rules` | 375x812 | guide accessible sans connexion |

## Onboarding (compte de test) (`onboarding/`, 3 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `first-visit-home.png` | `#home` | 1440x900 | home juste après inscription (solde initial, roulette) |
| `gyms-intro-modal.png` | `#gyms` | 1440x900 | modale d’introduction des arènes (première visite, 0 badge) |
| `team-intro-modal.png` | `#team` | 1440x900 | modale d’introduction « Mon équipe » (roulette destructive expliquée) |

## Accueil / Roulette (`home/`, 18 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `home-desktop-fullpage.png` | `#home` | 1440x900 (pleine page) | état par défaut après chargement |
| `home-desktop-xl.png` | `#home` | 1920x1080 | état par défaut après chargement |
| `home-desktop.png` | `#home` | 1440x900 | état par défaut après chargement |
| `home-mobile-compact.png` | `#home` | 375x812 | état par défaut après chargement |
| `home-mobile-large.png` | `#home` | 430x932 | état par défaut après chargement |
| `home-tablet.png` | `#home` | 768x1024 | état par défaut après chargement |
| `multi-roll-all-results.png` | `#home` | 1440x900 | rangée finale des 5 cartes obtenues |
| `multi-roll-before.png` | `#home` | 1440x900 | 5 roulettes empilées, bouton série |
| `multi-roll-cascade.png` | `#home` | 1440x900 | lancements en cascade (décalage 550 ms) |
| `multi-roll-finishing.png` | `#home` | 1440x900 | dernières roulettes en cours, premiers résultats affichés |
| `roll-before-fresh.png` | `#home` | 1440x900 | avant premier tirage (solde 200 🪙) |
| `roll-during-early.png` | `#home` | 1440x900 | défilement rapide (0,6 s après le clic) — clic sur 🎰 Lancer |
| `roll-during-landing.png` | `#home` | 1440x900 | approche de la carte finale (3,8 s) |
| `roll-during-mid.png` | `#home` | 1440x900 | défilement en décélération (2,2 s) |
| `roll-hidden-flip-reveal.png` | `#home` | 1440x900 | flip de révélation des cartes après l’arrêt |
| `roll-hidden-result.png` | `#home` | 1440x900 | résultat en mode masqué |
| `roll-hidden-strip.png` | `#home` | 1440x900 | bande entièrement masquée (mode « Masquées ») |
| `roll-result-new-card.png` | `#home` | 1440x900 | résultat — première carte (badge « nouvelle découverte » attendu) |

## Collection (`collection/`, 14 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `collection-after-first-rolls.png` | `#collection` | 1440x900 | collection après les premiers tirages (quelques cartes révélées) |
| `collection-card-hover.png` | `#collection` | 1440x900 | survol de carte |
| `collection-desktop-fullpage.png` | `#collection` | 1440x900 (pleine page) | état par défaut après chargement |
| `collection-desktop-xl.png` | `#collection` | 1920x1080 | état par défaut après chargement |
| `collection-desktop.png` | `#collection` | 1440x900 | état par défaut après chargement |
| `collection-filter-biome-foret.png` | `#collection` | 1440x900 | filtre biome Forêt |
| `collection-filter-biome-type-combo.png` | `#collection` | 1440x900 | combo Forêt+Feu (peut être vide) |
| `collection-filters-open.png` | `#collection` | 1440x900 | filtres dépliés |
| `collection-mobile-compact.png` | `#collection` | 375x812 | état par défaut après chargement |
| `collection-mobile-large.png` | `#collection` | 430x932 | état par défaut après chargement |
| `collection-sell-modal.png` | `#collection` | 1440x900 | modale de vente (annulée) |
| `collection-shiny-tab.png` | `#collection` | 1440x900 | onglet Shiny |
| `collection-sort-by-qty.png` | `#collection` | 1440x900 | tri par quantité |
| `collection-tablet.png` | `#collection` | 768x1024 | état par défaut après chargement |

## Équipe (`team/`, 8 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `team-desktop-fullpage.png` | `#team` | 1440x900 (pleine page) | état par défaut après chargement |
| `team-desktop-xl.png` | `#team` | 1920x1080 | état par défaut après chargement |
| `team-desktop.png` | `#team` | 1440x900 | état par défaut après chargement |
| `team-mobile-compact.png` | `#team` | 375x812 | état par défaut après chargement |
| `team-mobile-large.png` | `#team` | 430x932 | état par défaut après chargement |
| `team-reorder-first-selected.png` | `#team` | 1440x900 | premier Pokémon sélectionné |
| `team-reorder-mode.png` | `#team` | 1440x900 | mode réorganisation |
| `team-tablet.png` | `#team` | 768x1024 | état par défaut après chargement |

## Arènes & Entraînement (`gyms/`, 8 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `gyms-desktop-fullpage.png` | `#gyms` | 1440x900 (pleine page) | état par défaut après chargement |
| `gyms-desktop-xl.png` | `#gyms` | 1920x1080 | état par défaut après chargement |
| `gyms-desktop.png` | `#gyms` | 1440x900 | état par défaut après chargement |
| `gyms-first-gym-no-team.png` | `#gyms` | 1440x900 | première arène, joueur sans équipe (estimation 0 % ?) |
| `gyms-mobile-compact.png` | `#gyms` | 375x812 | état par défaut après chargement |
| `gyms-mobile-large.png` | `#gyms` | 430x932 | état par défaut après chargement |
| `gyms-tablet.png` | `#gyms` | 768x1024 | état par défaut après chargement |
| `training-already-done.png` | `#gyms` | 1440x900 | entraînement déjà effectué |

## Jackpot (`slot-machine/`, 14 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `slot-already-played.png` | `#slot-machine` | 1440x900 | quota quotidien épuisé |
| `slot-fresh-before.png` | `#slot-machine` | 1440x900 | jackpot disponible (1 ligne gratuite) |
| `slot-fresh-result.png` | `#slot-machine` | 1440x900 | résultat du spin gratuit + état du bouton « Revenez demain » |
| `slot-fresh-spinning.png` | `#slot-machine` | 1440x900 | les 3 rouleaux défilent — clic sur LANCER ! |
| `slot-fresh-stopping.png` | `#slot-machine` | 1440x900 | arrêts décalés (rouleau 1 immobile, 3 en course) |
| `slot-lines-2-selected.png` | `#slot-machine` | 1440x900 | sélection 3 lignes |
| `slot-lines-3-selected.png` | `#slot-machine` | 1440x900 | sélection 3+diagonales |
| `slot-machine-desktop-fullpage.png` | `#slot-machine` | 1440x900 (pleine page) | état par défaut après chargement |
| `slot-machine-desktop-xl.png` | `#slot-machine` | 1920x1080 | état par défaut après chargement |
| `slot-machine-desktop.png` | `#slot-machine` | 1440x900 | état par défaut après chargement |
| `slot-machine-mobile-compact.png` | `#slot-machine` | 375x812 | état par défaut après chargement |
| `slot-machine-mobile-large.png` | `#slot-machine` | 430x932 | état par défaut après chargement |
| `slot-machine-tablet.png` | `#slot-machine` | 768x1024 | état par défaut après chargement |
| `slot-prize-table-open.png` | `#slot-machine` | 1440x900 | table des récompenses dépliée |

## Tournoi (`tournament/`, 12 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `tournament-battle-replay.png` | `#tournament` | 1440x900 | replay animé d’un combat (jauge + mini-log) — clic sur ▶ Rejouer |
| `tournament-desktop-fullpage.png` | `#tournament` | 1440x900 (pleine page) | état par défaut après chargement |
| `tournament-desktop-xl.png` | `#tournament` | 1920x1080 | état par défaut après chargement |
| `tournament-desktop.png` | `#tournament` | 1440x900 | état par défaut après chargement |
| `tournament-history-modal.png` | `#tournament` | 1440x900 | liste des tournois passés — clic sur 📅 Tournois passés |
| `tournament-intro-modal.png` | `#tournament` | 1440x900 | modale d’introduction (calendrier, mise, gains) — première visite (flag localStorage nettoyé) |
| `tournament-match-summary.png` | `#tournament` | 1440x900 | résumé d’un match (équipes, K.O., log) — clic sur 📋 Résumé |
| `tournament-mobile-compact.png` | `#tournament` | 375x812 | état par défaut après chargement |
| `tournament-mobile-large.png` | `#tournament` | 430x932 | état par défaut après chargement |
| `tournament-past-detail-full.png` | `#tournament` | 1440x900 | détail complet (pleine page) |
| `tournament-past-detail.png` | `#tournament` | 1440x900 | détail d’un tournoi passé (podium, bracket, participants) — clic sur Voir → |
| `tournament-tablet.png` | `#tournament` | 768x1024 | état par défaut après chargement |

## Ligue des 4 (`league/`, 7 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `league-desktop-fullpage.png` | `#league` | 1440x900 (pleine page) | état par défaut après chargement |
| `league-desktop-xl.png` | `#league` | 1920x1080 | état par défaut après chargement |
| `league-desktop.png` | `#league` | 1440x900 | état par défaut après chargement |
| `league-mobile-compact.png` | `#league` | 375x812 | état par défaut après chargement |
| `league-mobile-large.png` | `#league` | 430x932 | état par défaut après chargement |
| `league-status.png` | `#league` | 1440x900 | statut ligue (verrouillée sans les 8 badges / estimation sinon) |
| `league-tablet.png` | `#league` | 768x1024 | état par défaut après chargement |

## Échanges (`trades/`, 8 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `trades-card-picker.png` | `#trades` | 1440x900 | sélecteur de carte à demander (fermé sans choisir) — clic sur un joueur |
| `trades-desktop-fullpage.png` | `#trades` | 1440x900 (pleine page) | état par défaut après chargement |
| `trades-desktop-xl.png` | `#trades` | 1920x1080 | état par défaut après chargement |
| `trades-desktop.png` | `#trades` | 1440x900 | état par défaut après chargement |
| `trades-mobile-compact.png` | `#trades` | 375x812 | état par défaut après chargement |
| `trades-mobile-large.png` | `#trades` | 430x932 | état par défaut après chargement |
| `trades-page.png` | `#trades` | 1440x900 | page échanges (éligibilité, joueurs, demandes) |
| `trades-tablet.png` | `#trades` | 768x1024 | état par défaut après chargement |

## Social (classement, chat, suggestions) (`social/`, 23 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `chat-desktop-fullpage.png` | `#chat` | 1440x900 (pleine page) | état par défaut après chargement |
| `chat-desktop-xl.png` | `#chat` | 1920x1080 | état par défaut après chargement |
| `chat-desktop.png` | `#chat` | 1440x900 | état par défaut après chargement |
| `chat-mobile-compact.png` | `#chat` | 375x812 | état par défaut après chargement |
| `chat-mobile-large.png` | `#chat` | 430x932 | état par défaut après chargement |
| `chat-page-mobile.png` | `#chat` | 375x812 | page chat dédiée (mobile) |
| `chat-tablet.png` | `#chat` | 768x1024 | état par défaut après chargement |
| `chat-widget-open.png` | `#leaderboard` | 1440x900 | panneau du widget de chat flottant ouvert — clic sur la bulle 💬 |
| `leaderboard-cheaters.png` | `#leaderboard` | 1440x900 | classement des tricheurs — clic sur « Voir le classement des tricheurs » |
| `leaderboard-desktop-fullpage.png` | `#leaderboard` | 1440x900 (pleine page) | état par défaut après chargement |
| `leaderboard-desktop-xl.png` | `#leaderboard` | 1920x1080 | état par défaut après chargement |
| `leaderboard-desktop.png` | `#leaderboard` | 1440x900 | état par défaut après chargement |
| `leaderboard-mobile-compact.png` | `#leaderboard` | 375x812 | état par défaut après chargement |
| `leaderboard-mobile-large.png` | `#leaderboard` | 430x932 | état par défaut après chargement |
| `leaderboard-new-player-context.png` | `#leaderboard` | 1440x900 | classement vu par un nouveau joueur (bloc « Votre position » en bas) |
| `leaderboard-tablet.png` | `#leaderboard` | 768x1024 | état par défaut après chargement |
| `notifications-dropdown.png` | `#leaderboard` | 1440x900 | centre de notifications déplié — clic sur 🔔 |
| `suggestions-desktop-fullpage.png` | `#suggestions` | 1440x900 (pleine page) | état par défaut après chargement |
| `suggestions-desktop-xl.png` | `#suggestions` | 1920x1080 | état par défaut après chargement |
| `suggestions-desktop.png` | `#suggestions` | 1440x900 | état par défaut après chargement |
| `suggestions-mobile-compact.png` | `#suggestions` | 375x812 | état par défaut après chargement |
| `suggestions-mobile-large.png` | `#suggestions` | 430x932 | état par défaut après chargement |
| `suggestions-tablet.png` | `#suggestions` | 768x1024 | état par défaut après chargement |

## Statistiques (`stats/`, 7 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `stats-desktop-fullpage.png` | `#stats` | 1440x900 (pleine page) | état par défaut après chargement |
| `stats-desktop-xl.png` | `#stats` | 1920x1080 | état par défaut après chargement |
| `stats-desktop.png` | `#stats` | 1440x900 | état par défaut après chargement |
| `stats-mobile-compact.png` | `#stats` | 375x812 | état par défaut après chargement |
| `stats-mobile-large.png` | `#stats` | 430x932 | état par défaut après chargement |
| `stats-player-selected.png` | `#stats` | 1440x900 | statistiques d’un joueur sélectionné — choix dans le sélecteur de dresseur |
| `stats-tablet.png` | `#stats` | 768x1024 | état par défaut après chargement |

## Spin (aventure) (`spin/`, 8 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `spin-desktop-fullpage.png` | `#spin` | 1440x900 (pleine page) | état par défaut après chargement |
| `spin-desktop-xl.png` | `#spin` | 1920x1080 | état par défaut après chargement |
| `spin-desktop.png` | `#spin` | 1440x900 | état par défaut après chargement |
| `spin-mobile-compact.png` | `#spin` | 375x812 | état par défaut après chargement |
| `spin-mobile-large.png` | `#spin` | 430x932 | état par défaut après chargement |
| `spin-overlay-iframe-loaded.png` | `#spin` | 1440x900 | contenu de l’iframe après chargement |
| `spin-overlay-iframe.png` | `#spin` | 1440x900 | jeu d’aventure Spin embarqué en iframe plein écran — clic sur 🌀 Lancer l’aventure |
| `spin-tablet.png` | `#spin` | 768x1024 | état par défaut après chargement |

## Navigation & pages informatives (`misc/`, 17 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `nav-dropdown-0-jeux.png` | `#leaderboard` | 1440x900 | menu « Jeux » ouvert — clic sur le menu |
| `nav-dropdown-1-ma-progression.png` | `#leaderboard` | 1440x900 | menu « Ma progression » ouvert — clic sur le menu |
| `nav-dropdown-2-défis.png` | `#leaderboard` | 1440x900 | menu « Défis » ouvert — clic sur le menu |
| `nav-dropdown-3-social.png` | `#leaderboard` | 1440x900 | menu « Social » ouvert — clic sur le menu |
| `nav-dropdown-4-infos.png` | `#leaderboard` | 1440x900 | menu « Infos » ouvert — clic sur le menu |
| `patchnotes-desktop-fullpage.png` | `#patchnotes` | 1440x900 (pleine page) | état par défaut après chargement |
| `patchnotes-desktop-xl.png` | `#patchnotes` | 1920x1080 | état par défaut après chargement |
| `patchnotes-desktop.png` | `#patchnotes` | 1440x900 | état par défaut après chargement |
| `patchnotes-mobile-compact.png` | `#patchnotes` | 375x812 | état par défaut après chargement |
| `patchnotes-mobile-large.png` | `#patchnotes` | 430x932 | état par défaut après chargement |
| `patchnotes-tablet.png` | `#patchnotes` | 768x1024 | état par défaut après chargement |
| `rules-desktop-fullpage.png` | `#rules` | 1440x900 (pleine page) | état par défaut après chargement |
| `rules-desktop-xl.png` | `#rules` | 1920x1080 | état par défaut après chargement |
| `rules-desktop.png` | `#rules` | 1440x900 | état par défaut après chargement |
| `rules-mobile-compact.png` | `#rules` | 375x812 | état par défaut après chargement |
| `rules-mobile-large.png` | `#rules` | 430x932 | état par défaut après chargement |
| `rules-tablet.png` | `#rules` | 768x1024 | état par défaut après chargement |

## États vides & verrouillés (`empty-states/`, 8 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `collection-empty-full.png` | `#collection` | 1440x900 | collection vide (pleine page) |
| `collection-empty.png` | `#collection` | 1440x900 | collection vide — toutes les cartes en « ??? », compteur 0/N |
| `inventory-empty.png` | `#collection` | 1440x900 | inventaire sans aucun objet — clic sur 🎒 Inventaire |
| `league-locked-no-badges.png` | `#league` | 1440x900 | Ligue des 4 verrouillée sans les 8 badges |
| `spin-locked-no-starter.png` | `#spin` | 1440x900 | Spin verrouillé — aucun Pokémon de base dans la collection |
| `stats-fresh-account.png` | `#stats` | 1440x900 | statistiques d’un compte sans historique |
| `team-empty.png` | `#team` | 1440x900 | équipe vide — 6 slots, 0 badge |
| `trades-locked-progress.png` | `#trades` | 1440x900 | échanges verrouillés — progression 0/120 cartes standards uniques |

## États de chargement (`loading/`, 1 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `collection-loading-slow-network.png` | `#collection` | 1440x900 | état de chargement (« Chargement... ») sur réseau lent — navigation avec réseau throttlé |

## États d'erreur (`errors/`, 6 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `invalid-token-collection.png` | `#collection` | 1440x900 | comportement avec token invalide (erreur ou redirection) — token corrompu en localStorage |
| `invalid-token-home.png` | `#home` | 1440x900 | home avec token invalide → redirection #login attendue |
| `leaderboard-offline.png` | `#leaderboard` | 1440x900 | navigation hors ligne — messages d’erreur — coupure réseau puis navigation |
| `login-wrong-password-desktop.png` | `#login` | 1440x900 | erreur identifiants invalides |
| `register-password-too-short.png` | `#register` | 1440x900 | validation navigateur : mot de passe < 8 caractères — soumission invalide |
| `roll-offline-error.png` | `#home` | 1440x900 | échec du tirage hors ligne (message d’erreur roulette) — clic sur Lancer hors ligne |

## Cas limites (`edge-cases/`, 3 captures)

| Fichier | Route | Résolution | État / action |
| --- | --- | --- | --- |
| `back-navigation.png` | `#gyms` | 1440x900 | retour arrière navigateur (#collection → #gyms) — bouton Précédent |
| `gyms-after-refresh.png` | `#gyms` | 1440x900 | état après F5 (persistance de session OK ?) — rechargement de la page |
| `unknown-route.png` | `#route-inexistante` | 1440x900 | hash inconnu → fallback (page login rendue) — navigation vers un hash invalide |
