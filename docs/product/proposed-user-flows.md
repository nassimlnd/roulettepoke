# Parcours utilisateur proposés

> Reprise des parcours existants (`docs/audit/existing-user-flows.md`, F1–F11)
> retravaillés selon les principes UX (`user-experience-principles.md`). Aucune
> fonctionnalité supprimée ; les changements sont des ajouts de lisibilité et de
> guidage. `⊕` = ajout, `⟳` = modification, `=` = conservé tel quel.

## NF1. Onboarding (inscription → activation)

```text
Inscription (username/email/mot de passe) =
⊕ Écran de bienvenue : « Tire des cartes Pokémon, complète ta collection,
   défie tes amis » (1 phrase + le but) — skippable
→ #home avec intro contextuelle de la roulette (pattern modale d'intro existant) :
   ⊕ étape 1 : « Voici ton solde : 200 🪙. Un tirage coûte 10 🪙. »
   ⊕ étape 2 : bouton Lancer mis en avant, options avancées masquées
   ⊕ étape 3 (après le 1er tirage) : « Ta carte est dans ta Collection. Il y a
      4 raretés + les Shiny ultra-rares. »
   ⊕ étape 4 : « Gagne des coins gratuitement chaque jour (entraînement, jackpot,
      bonus de connexion). »
⊕ Checklist J1 sur le hub : tirer 5 fois · voir sa collection · créer son équipe
   · tenter l'arène 1 (disparaît une fois complétée)
⟳ Les options avancées (modes de révélation, biomes, multi ×5) apparaissent
   progressivement après ~5 tirages
```

**Résout** : C2 (aucun onboarding), le funnel d'activation en roue libre.

## NF2. Le tirage (la boucle immédiate)

```text
#home → (options éventuelles) → Lancer 10 🪙 [contrôles verrouillés] =
→ animation 4 s (ticks, décélération) = [skippable ⊕]
⟳ résultat DANS le viewport (zone réservée ou overlay ancré sur la roulette)
⟳ célébration proportionnelle : commun/rare inline · légendaire/shiny plein écran
⊕ verbalisation : « NOUVELLE CARTE ! » ou « Doublon ×N — chance shiny ~N/500 ✨ »
⊕ prochaine action : Relancer (solde à jour) · Voir dans la collection
Cas coins insuffisants : ⟳ « Il te manque X 🪙 » + liens vers entraînement/jackpot/bonus
Multi-roll : ⟳ récap final groupé, meilleur tirage mis en avant, résultats visibles
Événement spécial (1 %) : = (coins/charme/choix), choix annoncé comme définitif ⊕
```

**Résout** : C1 (résultat sous le fold), M1 (célébration plate), doublon muet.

## NF3. Le hub de session (nouveau — sur #home, sous la roulette)

```text
⊕ « Aujourd'hui » : bonus crédité (+X 🪙, célébré au 1er chargement du jour) ·
   entraînement ✓/à faire · jackpot dispo/CooldownBadge
⊕ « Cette semaine » : arène (can_attempt/compte à rebours) · tournoi (phase
   courante) · ligue · échange (restant) · Spin — chaque tuile clique vers sa page
⊕ « Objectifs » (calculés selon l'état) : prochaine arène · n/120 cartes avant
   échanges · complétion par biome · (end-game) cibles shiny + delta de score
⊕ « Il se passe quoi » : 5 derniers shiny/légendaires + gains jackpot marquants
```

Servi par un **store Pinia unique à TTL** (réutilise les requêtes que la navbar
paie déjà — résout C4 au lieu de l'aggraver).

**Résout** : m8 (home sans statut), quotas éparpillés, end-game invisible.

## NF4. Construire son équipe (pari destructif outillé)

```text
#team → modale d'intro (1ère fois) =
⊕ avant chaque roulette d'équipe : pool éligible visible (nombre de candidats,
   répartition par rareté, liste consultable) + rappel permanent « la carte tirée
   quitte ta collection »
⟳ lancer la roulette d'équipe → CONFIRMATION (pattern du pari légendaire)
→ animation = → carte ajoutée, retirée de la collection =
Retrait d'un membre : ⟳ confirmation rappelant coût (−10 🪙) ET non-restitution
Réorganisation : = (2 clics, bandeau d'instructions)
```

**Résout** : sunk cost mal compris, absence de rappel, pool jamais montré.

## NF5. Défi d'arène et entraînement

```text
#gyms → fiche champion + estimation (barre + matchups) =
→ Lancer le combat (1/sem) → théâtre de duel (jauge, battement de cœur) =
Victoire : ⟳ célébration niveau 5 (badge) + progression mise à jour + prochaine arène
Défaite : ⟳ « Défaite » + PLAN précis (matchups perdants nommés, conseil type,
   rappel « l'entraînement quotidien monte ton bonus +2 %/jour ») au lieu de
   « Renforcez votre équipe »
Entraînement : = 1 clic → animation accélérée → +5 🪙 / +2 %
⟳ end-game (8/8) : mes stats de règne (badges datés, historique, série d'entraînement)
   au lieu d'un panneau statique
```

**Résout** : défaite sans plan, end-game muet sur #gyms.

## NF6. Cycle tournoi (timeline de 4 jours)

```text
⊕ stepper permanent : Inscriptions → Préparation → Combats → Résultats
   avec phase courante + compte à rebours de la prochaine transition
Lun→Mar : ⟳ inscription (20 🪙, cagnotte ×2 explicitée) + bannière ré-affichable
   par jour tant que non inscrit (pas dismiss définitif)
Inscrit : ⟳ état « Inscrit — affine ton équipe jusqu'à jeudi 11h55 » +
   ⊕ rappel notification à J-1 du gel
Mar→Jeu : préparation (matchups, forces/faiblesses) = résumé sur le hub ⊕
Jeu 12:00+ : « Mon parcours » anti-spoiler = + résultats sous spoiler =
```

**Résout** : cycle décrit en 3 phrases datées, phase courante invisible,
inscriptions/gels oubliés.

## NF7. Jackpot quotidien

```text
#slot-machine → choix des lignes ⟳ gain espéré affiché avant de lancer
   (table des probas de la ligne clé dépliée par défaut)
→ LANCER → rouleaux + arrêts décalés = 
⟳ défaite scénarisée : near-miss détecté (« ⭐ Presque ! 2 légendaires ligne 2 »),
   « Rien » remplacé par « Nouvelle chance demain à [reset] » + dernier gros gain
   de la communauté
Gagné : glow + fanfare = (célébration proportionnelle à la récompense)
⟳ état « déjà joué » : CooldownBadge daté (au lieu de « Revenez demain » nu)
```

**Résout** : m3 (table cachée), m4 (cooldown sans heure), défaite plate.

## NF8. Ligue des 4 (end-game)

```text
#league → estimation globale + par combat + types conseillés =
→ Lancer le défi → 4 replays enchaînés =
Victoire : couronne + CHOIX 500 🪙 (sûr) VS capture légendaire (risquée) =
   → confirmation + % (le bon modèle existant) → animation de capture =
⟳ hors cycle (pas d'attente vide) : mon dernier run + replays, les 4 adversaires
   probables du prochain cycle, compte à rebours d'ouverture, rappel de l'enjeu
```

**Résout** : #league réduite à une phrase sur écran vide.

## NF9. Échange (3 étapes rendues visibles)

```text
#trades → ⟳ gating = jalon (« 87/120 cartes uniques » + barre + CTA roulette),
   pas une erreur rouge
⊕ stepper par échange : 1-Demande → 2-Réponse → 3-Confirmation, « à toi / en
   attente de X » explicite
Initiateur : choisir un joueur → sa carte → demande (statut clair) =
⊕ avant « Accepter » : annonce des 2 étapes restantes (contre-choix + confirmation)
Cible : ⊕ badge navbar NUMÉROTÉ + notification à chaque changement d'état →
   accepter (choisir la contrepartie) ou refuser =
Initiateur : confirmer (récap) ou refuser =
⟳ règles injectées au moment où elles s'appliquent (pas de préambule de 5 règles)
```

**Résout** : flux asynchrone reposant sur la mémoire, badge muet, préambule dense.

## NF10. Chat & social

```text
Widget flottant ⟳ ne recouvre jamais le jeu sur mobile (position repensée) =
#chat : historique + envoi = ⟳ indicateur de connexion (déconnexion durable,
   bannissement signalés) au lieu du silence
#leaderboard ⟳ delta nominal avec voisins (« +9 sur Vince ») + équivalence prises
   + signal de changement de rang depuis la dernière session
```

**Résout** : reconnexion/bannissement muets, course au score enfouie.

## NF11. Session, erreurs, résilience

```text
F5 : session conservée = ; back : = 
⟳ 401 en cours de session → modale « Session expirée » + Se reconnecter + retour
   à la page d'origine (au lieu d'éjection vers login sous navbar connectée)
⟳ erreur réseau → message humanisé + Réessayer + bannière hors-ligne globale
   (au lieu de « Failed to fetch » brut, bandeaux empilés)
⟳ hash inconnu → page 404 dédiée (au lieu de rendre le login en étant connecté)
⟳ nouvelle version → mécanisme de mise à jour propre (au lieu de « Ctrl+F5 »)
```

**Résout** : C3 (erreurs brutes), M8 (pas de toasts), m2 (404 = login).

## Chaîne de « prochain pas » (le fil rouge de tous les parcours)

Le principe UX n°9 (« encourager la suite ») se matérialise par une chaîne
continue, calculée côté front :

```text
1er tirage → « ta carte est dans la collection »
5 tirages → « crée ta première équipe »
6 Pokémon de base → « lance-toi dans Spin »
6 Pokémon → « défie l'arène 1 »
badge → « prochaine arène débloquée »
8 badges → « la Ligue des 4 t'attend »
120 cartes → « les échanges sont ouverts »
end-game → « à 1 shiny de dépasser [voisin] » / « 3 shiny Ville manquants »
```

Aucun de ces pas n'invente de récompense : ce sont des **repères de navigation**
vers des contenus et des récompenses qui existent déjà côté backend.
