# Inventaire des états

> Tous les états observables de l'application, avec leur traitement actuel.
> 📸 = capture correspondante dans `artifacts/screenshots/`.

## États de session

| État | Comportement actuel | 📸 |
| --- | --- | --- |
| Déconnecté sur route privée | Redirection `#login` | authentication/login-* |
| Déconnecté sur route publique | Navbar réduite (Connexion/Inscription/Guide) | authentication/rules-public-* |
| Connexion réussie | Redirection `#home` immédiate, aucune transition | authentication/login-success-* |
| Identifiants invalides | Texte rouge sous le formulaire (message API brut) | errors/login-wrong-password-desktop |
| Token invalide/expiré | `#home` → redirect login ; autres pages → « Token invalide ou expiré » affiché brut, aucune action proposée | errors/invalid-token-* |
| Déconnexion volontaire | Suppression token → `#login`, pas de confirmation | authentication/after-logout |
| Rafraîchissement (F5) | Session conservée, page rechargée à l'identique | edge-cases/gyms-after-refresh |
| Back navigateur | Fonctionne (hashchange) | edge-cases/back-navigation |
| Hash inconnu | Rend la page login (même connecté) — pas de 404 | edge-cases/unknown-route |
| Nouvelle version déployée | Bandeau jaune fixe « Ctrl+F5 » | (non déclenché pendant l'audit) |

## États de chargement

| Contexte | Traitement | 📸 |
| --- | --- | --- |
| Toutes les pages | Texte « Chargement... » nu (parfois `.loading` opacité 0.6) — **aucun skeleton, aucun spinner, aucun placeholder dimensionné** | loading/collection-loading-slow-network |
| Roulette pendant spin | Bouton désactivé, filtres verrouillés | home/roll-during-* |
| Boutons d'action | Texte remplacé (« ⚔️ Combat en cours… », « Inscription… ») | — |
| Estimation ligue/arène | « Calcul de l'estimation... » | — |
| Images | Aucun lazy loading, aucun placeholder — pop-in visible sur la collection | collection/* |

## États vides

| Contexte | Traitement | 📸 |
| --- | --- | --- |
| Collection neuve | Toutes les cartes en dos « ??? » + « 0 / 146 cartes standard obtenues » — impressionnant mais froid, aucune invite à tirer | empty-states/collection-empty* |
| Filtre sans résultat | « Aucune carte trouvée. » | collection/collection-filter-biome-type-combo |
| Équipe vide | 6 slots vides silencieux (l'intro modale a déjà expliqué) | empty-states/team-empty |
| Inventaire vide | Modale quasi vide (groupes absents) | empty-states/inventory-empty |
| Notifications | « Aucune notification pour le moment. » | social/notifications-dropdown |
| Trades | « Aucun échange pour le moment. » | trades/trades-page |
| Historique jackpot | « Aucune tentative pour l'instant. » | slot-machine/* |
| Leaderboard vide | « Aucun joueur classé » (théorique) | — |
| Chat jamais ouvert | Pas de badge (marqueur initialisé silencieusement) | — |

## États verrouillés / gating de progression

| Fonction | Condition | Traitement | 📸 |
| --- | --- | --- | --- |
| Spin | ≥1 Pokémon de base | Carte 🔒 explicative | empty-states/spin-locked-no-starter |
| Échanges | ≥120 cartes uniques | Compteur « X / 120 » + explication | empty-states/trades-locked-progress |
| Ligue des 4 | 8 badges | Lien navbar masqué + page message | empty-states/league-locked-no-badges |
| Ligue (badges OK, avant cycle) | Après le prochain tournoi | Message dédié | league/league-status |
| Arène suivante | Battre la précédente | Une seule arène montrée à la fois | gyms/* |
| Combat d'arène | 1/semaine | « Prochain combat disponible lundi dans Xj Xh » | gyms/* |
| Entraînement | 1/jour | Bouton désactivé « ⏳ Déjà combattu aujourd'hui » | gyms/training-already-done |
| Jackpot | 1/jour | Bouton « Revenez demain » (sans heure précise) | slot-machine/slot-already-played |
| Inscription tournoi | Fenêtre lundi→mardi 12:00 | Bouton présent/absent selon statut | tournament/* |
| Équipe pleine | 6/6 | « ✅ Équipe complète (6/6) » | team/* |
| Multi-roll pendant série | Verrou global filtres+boutons | — | home/multi-roll-* |

## États de succès (hiérarchie actuelle)

| Niveau | Traitement actuel | Différenciation |
| --- | --- | --- |
| Tirage commun | « ✨ Vous avez obtenu ! » + carte, arpège 2 notes | ~aucune |
| Tirage rare/épique | Idem + bordure bleue/violette, arpège 4/6 notes | faible |
| Tirage légendaire | Bordure or, arpège 7 notes | faible (même gabarit) |
| Tirage shiny | Bordure argent + halo, arpège 7 notes | faible |
| Nouvelle carte | Halo « new discovery » (rainbow border) | peu lisible, pas de texte |
| Doublon | Rien ne l'indique (quantité +1 silencieuse) | ⚠️ |
| Événement coins | « ✨ Événement spécial ! +X coins » | correcte |
| Fusion réussie | Bandeau vert 4 s | faible |
| Victoire duel | ✅ + son court | correcte |
| Victoire combat (badge) | « 🏆 Victoire ! » + badge image + fanfare | correcte mais statique |
| Victoire entraînement | Bandeau ✅ +2 % / +5 🪙 | correcte |
| Victoire ligue | Titre + couronne + choix de récompense | riche |
| Capture légendaire | Séquence pokéball scriptée (étoiles) | le sommet actuel |
| Victoire tournoi | Bannière flottante + podium | correcte |
| Jackpot gagnant | Glow cellules + fanfare + liste des gains | correcte |
| **Global** | **Aucun confetti/particule, aucune célébration plein écran, résultat souvent sous le fold** | ⚠️ |

## États d'échec / erreur

| Cas | Traitement actuel | Reste à faire (traité en refonte) |
| --- | --- | --- |
| Réponse incorrecte / défaite duel | ❌ + son descendant | OK mais sec |
| Défaite combat | « 💀 Défaite… Renforcez votre équipe » | pas de conseil actionnable précis |
| Défaite ligue / capture ratée | « Le légendaire a résisté... » | brutal (pari perdu sans lot de consolation) |
| Coins insuffisants | « ❌ Pas assez de coins » zone résultat | aucun lien vers les sources de coins |
| Erreur réseau (fetch fail) | « TypeError: Failed to fetch » AFFICHÉ BRUT dans certaines zones 📸 errors/roll-offline-error | à humaniser |
| Hors ligne global | Messages épars par section, pas de bannière réseau | à centraliser |
| Session expirée en cours d'action | Message brut, saisie perdue | à gérer |
| Partie/tournoi introuvable | « Tournoi introuvable. » | OK |
| Action déjà consommée (double clic rapide) | Boutons désactivés pendant l'action (bonne pratique présente) | conserver |
| Conflit trade (carte vendue entre-temps) | Message d'erreur API dans la modale | OK |
| Chargement trop long | Aucun timeout, « Chargement... » infini | à traiter |
| API down | Cascade de messages d'erreur par section | page d'erreur globale à créer |

## États temps réel

| Cas | Traitement |
| --- | --- |
| Nouveau message chat | Ajout en direct (WS), badge si panneau fermé |
| Reconnexion WS | Silencieuse (3 s), resync historique — aucun indicateur UI |
| Bannissement chat | Fermeture 4003, pas de retry — aucun message explicatif à l'utilisateur ⚠️ |
| Purge d'un utilisateur | Messages retirés en direct |
| Solde après tirage | Mise à jour optimiste locale (recalcul client) ⚠️ risque de dérive vs serveur |
| Données inter-onglets | Aucune synchronisation (deux onglets = états divergents) |

## Persistance locale (localStorage)

| Clé | Rôle |
| --- | --- |
| `gacha_token` | JWT de session |
| `gacha_reveal_mode` | Mode de révélation roulette |
| `gacha_selected_biome` | Filtre biome persistant |
| `gacha_gyms_intro_seen` / `gacha_team_intro_seen` / `tourn_intro_seen` | Modales d'intro vues |
| `tourn_last_seen` / `tourn_banner_dismissed` | Badges/bannières tournoi |
| `pn_last_seen` (`patchNotes.js STORAGE_KEY`) | Version des patch notes vue |
| `gacha_chat_last_seen_at` | Marqueur de lecture du chat |
| `replay_speed` | Vitesse des replays |
| `_appver` | Détection de nouvelle version |
