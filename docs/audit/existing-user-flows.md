# Parcours utilisateur existants

> Notation : `→` navigation/étape, `⚠️` friction observée (détail dans
> `frontend-issues.md`), 📸 = capture dans `artifacts/screenshots/`.

## F1. Premier contact & inscription

```text
Arrivée (URL) → redirection #login (aucune landing page ⚠️)
→ « S'inscrire » → formulaire 3 champs (username/email/password ≥8)
→ soumission → token stocké → #home immédiat
→ 100 🪙 offerts + bonus quotidien (100) au premier /auth/me = 200 🪙
→ AUCUN onboarding sur la roulette ⚠️ (bande de cartes « ??? », aucune
  explication du jeu, l'utilisateur doit deviner qu'il faut cliquer Lancer)
```

📸 `authentication/*`, `onboarding/first-visit-home.png`, `empty-states/*`.

Observations :
- Le Guide est accessible sans compte mais rien n'y invite depuis l'inscription.
- Pas de vérification d'email, pas de force du mot de passe affichée.
- Erreur de connexion : message texte rouge sous le bouton (brut de l'API).
- Session persistée en localStorage — F5 conserve la session (📸 `edge-cases/gyms-after-refresh.png`).

## F2. Boucle cœur — le tirage

```text
#home → (optionnel) choisir mode de révélation / filtre biome / multi ×5
→ clic « 🎰 Lancer (10 🪙) » [désactivé pendant le spin, filtres verrouillés]
→ animation 4 s (ticks sonores, décélération, jitter)
→ résultat sous la roulette : « ✨ Vous avez obtenu ! » + carte
  ⚠️ le résultat apparaît SOUS la ligne de flottaison (scroll nécessaire en 900 px)
  ⚠️ aucune célébration différenciée visible pour Rare/Épique (bordure seulement)
  ⚠️ pas de mention « nouvelle carte vs doublon » en clair (juste un halo)
→ solde décrémenté en direct → re-clic possible immédiatement
Cas événement (1 %) : carte Pokéball → flip → coins (+X affiché) / charme /
  choix de carte (modale 2 cartes, cliquer = choisir, PAS d'annulation)
Cas erreur (coins insuffisants) : « ❌ Pas assez de coins » dans la zone résultat
  ⚠️ aucun lien vers les moyens d'en gagner
```

📸 `home/roll-*`, `home/multi-roll-*`, `errors/roll-offline-error.png`.

## F3. Gestion de collection

```text
#collection → grille complète (146+5 ×2 shiny), non-possédées en dos « ??? »
→ filtres : onglet Standard/Shiny, accordéon Filtres (biomes, types, tri quantité)
→ carte possédée : boutons 💰 vendre (confirmation) et 🆙 fusionner (si ≥10)
→ vente : modale « Es-tu sûr ? » → +X 🪙 (bandeau succès 4 s) → recharge complète ⚠️
→ fusion : PAS de confirmation ⚠️ (10 cartes consommées au clic) → bandeau succès
```

📸 `collection/*`, `empty-states/collection-empty*.png`.

## F4. Construction d'équipe (destructive)

```text
#team → modale d'intro (1ʳᵉ visite) explique le sacrifice définitif
→ roulette d'équipe : « 🎲 Ajouter un Pokémon » → animation 2 s → carte tirée
  au hasard dans la collection (hors Légendaires/Shiny) → RETIRÉE de la collection
  ⚠️ le joueur ne choisit PAS son Pokémon (design assumé « roulette »)
  ⚠️ une fois la modale d'intro passée, plus aucun rappel de la destruction
→ retirer un membre : hover sur slot → « ✕ Retirer −10 🪙 » → confirmation
→ réorganiser : mode 2 clics avec bandeau d'instructions
→ équipe pleine (6/6) : bouton devient « ✅ Équipe complète »
```

📸 `team/*`, `onboarding/team-intro-modal.png`, `empty-states/team-empty.png`.

## F5. Défi d'arène hebdomadaire

```text
#gyms → arène courante (la 1ʳᵉ non battue) : champion + équipe + types conseillés
→ estimation de victoire (barre % colorée + matchups repliés)
→ « ⚔️ Lancer le combat » (1/semaine)
→ animation duel par duel : jauge tachymètre, aiguille ralentit avant le seuil
  (battement de cœur), K.O. progressifs sur l'équipe du champion, mini-log
→ victoire : badge + rappel du bonus quotidien | défaite : « revenez lundi »
→ résumé équipes avec K.O. + log détaillé + CTA équipe/collection
→ cooldown : « Prochain combat disponible lundi dans Xj Xh »
Entraînement quotidien (panneau au-dessus) : 1 clic → même animation en
accéléré → +2 % bonus (jauge) et +5 🪙 si victoire
```

📸 `gyms/*` (les captures d'animation de combat proviennent des replays de
tournoi et de l'entraînement — le combat d'arène du compte n'a pas été consommé).

## F6. Cycle tournoi (hebdomadaire, social)

```text
Lundi 00:00 : bannière flottante « Inscriptions ouvertes » (+ badge navbar)
→ #tournament : bandeau statut + « S'inscrire — 20 🪙 »
→ inscrit : ✅ + analyse de préparation (équipe, forces/faiblesses, matchups
  contre chaque participant, types à privilégier/éviter)
→ mardi 12:00 : inscriptions closes, équipes visibles, affinage jusqu'à jeudi 11:55
→ jeudi 12:00 : combats automatiques serveur
→ jeudi 15:00 : bannière « Félicitations <vainqueur> » + badge navbar
→ #tournament : « Mon parcours » anti-spoiler (révéler combat par combat,
  replay animé par match) → résultats complets sous <details> spoiler
→ podium 🥇🥈🥉 + gains ; historique des tournois passés consultable
```

📸 `tournament/*` (intro, historique, détail passé, replay, résumé).

## F7. Jackpot quotidien

```text
#slot-machine → choix des lignes (1 gratuit / 3 → 5 🪙 / 5 → 10 🪙)
→ table des probabilités dynamique (repliée ⚠️)
→ « LANCER ! » → rouleaux 2,2 s + arrêts décalés (700 ms) avec sons
→ lignes gagnantes en surbrillance (flip carte légendaire, icônes révélées)
→ résumé ligne par ligne + coût + nouveau solde
→ bouton « Revenez demain » (l'état ne dit pas QUAND ça reset précisément ⚠️)
```

📸 `slot-machine/*` (avant/pendant/arrêts/résultat + état déjà joué).

## F8. Ligue des 4 (end-game hebdo)

```text
#league (visible navbar seulement avec 8 badges)
→ estimation globale + par combat + types conseillés
→ « Lancer le défi » → 4 replays animés enchaînés (fermeture = combat suivant)
→ victoire : couronne 7 j + CHOIX : 500 🪙 sûr VS capture légendaire risquée
  → sélection du légendaire (menu), % de capture estimé, confirmation modale
  → animation de capture (fausse jauge « buguée » puis pokéball, secousses)
  → succès : carte ajoutée | échec : « Le légendaire a résisté » (rien) ⚠️ pari perdu
→ défaite : « Retentez la semaine prochaine »
```

📸 `league/league-status.png` (la tentative hebdo n'a pas été consommée).

## F9. Échange entre joueurs (3 étapes, asynchrone)

```text
#trades (nécessite 120 cartes uniques — page l'explique avec compteur)
Initiateur : grille joueurs → choisir un joueur → modale de ses cartes
  (filtrées éligibles) → demander une carte → statut « En attente »
Cible : badge navbar → #trades « À traiter » → Accepter (choisir la carte
  souhaitée en retour, même rareté) ou Refuser
Initiateur : « À traiter » → Confirmer (modale récapitulative) ou Refuser
→ échange conclu (1/semaine max, cooldown 1 mois par partenaire)
```

📸 `trades/*`, `empty-states/trades-locked-progress.png`.

## F10. Chat & social passif

```text
Widget 💬 flottant partout (sauf #chat) → panneau 300×~400
#chat : page dédiée, historique 200 messages, envoi ≤300 car.
Badge « non lu » sur la bulle ; reconnexion auto silencieuse ⚠️ (pas
d'indicateur de connexion perdue)
#leaderboard : top 10 + « Votre position », badges/couronne/médailles,
  feed shiny/légendaires, classement des tricheurs (bouton séparé)
#suggestions : kanban d'idées, vote ±1, réponses admin votables
```

📸 `social/*`.

## F11. Session, erreurs, résilience

```text
F5 : session conservée (token localStorage), retour au même hash
Back : fonctionne par hashchange (historique navigateur OK)
Token invalide : #home → redirection #login ; pages internes → messages
  d'erreur bruts (« Token invalide ou expiré ») sans action proposée ⚠️
Hors ligne : messages d'erreur épars par section, pas d'état global réseau ⚠️
Nouvelle version : bandeau jaune « Ctrl+F5 » (gestion de cache manuelle ⚠️)
Hash inconnu : rend la page login même si connecté ⚠️ (pas de 404)
```

📸 `errors/*`, `edge-cases/*`, `loading/*`.

## Rythme temporel du jeu (charge mentale hebdomadaire)

| Fréquence | Actions |
| --- | --- |
| Quotidien | Bonus de connexion (auto), entraînement, jackpot |
| Hebdomadaire | Combat d'arène (lundi reset), tournoi (lundi→jeudi), ligue (jeudi reset), échange (lundi reset), récompenses Spin (lundi reset) |
| Libre | Tirages, collection, fusion, vente, équipe, chat, suggestions |

⚠️ Aucune vue « agenda » ne synthétise ces échéances — le joueur doit visiter
chaque page pour connaître ses quotas restants.
