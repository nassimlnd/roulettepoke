# Stratégie de tests

> Outils imposés/retenus : **Vitest** (+ @vue/test-utils, environnement
> happy-dom) pour l'unitaire et les composants, **Playwright** pour le
> fonctionnel/E2E/visuel. Typecheck (`vue-tsc`) et ESLint en CI sur chaque PR
> (workflow `web/.github/workflows/ci.yml` à étendre).

## Pyramide

```text
        E2E Playwright (14 parcours + visuel)     ~ lents, contre staging/prod test
      Tests de composants (Vitest + test-utils)   ~ rapides, DOM simulé
    Tests unitaires (composables, stores, utils)  ~ très rapides, sans DOM
  Typecheck strict + ESLint                       ~ chaque commit
```

## 1. Tests unitaires (Vitest)

| Cible | Cas notables (issus des règles réelles du jeu) |
| --- | --- |
| `services/api/*` | injection du Bearer, normalisation tableau nu vs enveloppe (`/gym` vs `{cards}`), erreurs → messages humanisés, 401 → événement de session, timeout/abort, dédup des GET identiques concurrents |
| `stores/wallet` | source de vérité unique du solde, réconciliation après roll/vente/spin (fini le calcul optimiste divergent) |
| `stores/quotas` | calcul des resets Europe/Paris : lundi 00:00 (arène/échange/Spin), quotidien (entraînement/jackpot/bonus), jeudi 12:00 (tournoi/ligue) — **tester les bords DST** (changement d'heure) |
| `stores/inventory` | exclusivité ticket biome XOR type, consommation au tirage, désactivation |
| `composables/useRouletteEngine` | position cible (index 16), jitter borné, purge des cartes hors champ sans saut visuel (offsets), remplissage de bande quand `preview-batch` renvoie < 19 cartes |
| `composables/useCountdown` | formats « lundi dans 2j 3h », fins de compte à rebours |
| `composables/useCelebration` | mapping rareté/nouveauté → niveau de célébration (7 niveaux) |
| utils | formatage nombres/dates fr-FR, échappement, mapping slugs biome/type (accents : `foret` → « Forêt », `electrik` → « Électrik ») |
| gestion d'erreurs | chaque code d'erreur API connu → action UI attendue (toast, redirect, inline) |

Mocks : fixtures JSON dérivées de `artifacts/network/api-log*.json` (réponses
réelles redactées) — un dossier `tests/fixtures/api/` versionné.

## 2. Tests de composants (Vitest + @vue/test-utils)

| Composant | À tester |
| --- | --- |
| `PokeCard` | variantes (possédée/dos, rareté, shiny, nouvelle), quantité, actions émises (sell/merge), a11y (alt, labels) |
| `CoinCounter` | animation de variation, formats, aria-live |
| `DuelGauge` | rendu du seuil, annonce du résultat, mode reduced-motion (résultat direct) |
| `RouletteStrip` | états idle/spinning/result, verrouillage des contrôles pendant le spin, événement spécial |
| `CelebrationOverlay` | niveaux, skip, auto-dismiss, reduced-motion |
| `ConfirmModal` | focus trap, Escape, retour focus, variantes destructives (retrait équipe, fusion) |
| `EmptyState` / `ErrorState` | messages, CTA |
| Formulaires auth | validation, soumission, erreurs API affichées |
| `TradeCard` | 4 états (à traiter/en attente/historique/conclu) selon mon rôle initiateur/cible |

Chaque composant : test des états + événements + variantes + a11y de base
(rôles, labels) + chargement + erreur.

## 3. E2E Playwright

Config : projects `desktop` (1440×900) et `mobile` (375×812, touch) ; base URL
staging ; identifiants via variables d'environnement (jamais commis) ; compte
de test dédié (pattern validé pendant l'audit).

Parcours obligatoires (reprend la liste imposée, adaptée au jeu réel) :

1. **Connexion** (+ mauvais mot de passe → erreur humanisée).
2. **Déconnexion** (retour login, token purgé).
3. **Accès à l'accueil** (roulette prête, solde affiché).
4. **Inscription** (compte jetable horodaté) + onboarding nouveau joueur.
5. **Tirage complet** : clic Lancer → contrôles verrouillés → animation →
   résultat visible SANS scroll (assertion de viewport — critère C1) → solde
   décrémenté de 10.
6. **Tirage « nouvelle carte » vs « doublon »** (assertion du libellé—via
   compte neuf, les deux cas sont déterministes aux premiers tirages).
7. **Multi-roll ×5** : cascade, 5 résultats, résolution d'un choix de carte
   éventuel en fin de série.
8. **Filtre biome** : sélection, coût mis à jour, tirage filtré (la carte
   obtenue appartient au biome).
9. **Collection** : filtres, vente avec confirmation (solde +N), fusion avec
   confirmation (10 exemplaires → évolution) — sur compte de test uniquement.
10. **Équipe** : ajout via roulette (carte retirée de la collection —
    assertion), réorganisation, retrait avec confirmation (−10 🪙).
11. **Jackpot** : spin gratuit, résultat par ligne, bouton « Revenez demain »
    avec compte à rebours.
12. **Erreur réseau** : offline simulé pendant un tirage → message humanisé,
    solde inchangé après reconnexion (assertion `auth/me`).
13. **Rafraîchissement** : F5 en pleine page → session et page conservées ;
    navigation arrière.
14. **Interruption de session** : token corrompu → redirection login + toast
    « session expirée » (pas de message technique).

Parcours conditionnels (nécessitent l'état de compte adéquat, exécution
manuelle planifiée) : combat d'arène, entraînement, tournoi (inscription en
fenêtre réelle), ligue, échange complet entre deux comptes de test, chat
(2 sessions simultanées → réception temps réel + reconnexion).

## 4. Tests visuels (Playwright screenshots)

Écrans critiques sous `toHaveScreenshot` (masques sur les zones dynamiques —
solde, dates, usernames) :
- roulette idle + résultat (desktop/mobile) ;
- collection (grille) ;
- arène (fiche champion + jauge) ;
- jackpot idle ;
- modales : confirmation destructive, choix de carte, inventaire ;
- états : vide collection, verrouillé Spin, erreur réseau, chargement (skeleton).

Baseline regénérée sur changement de design assumé (`--update-snapshots` en PR
dédiée).

## 5. Non-régression fonctionnelle vs ancien front

La **checklist de parité** par écran (dérivée de `docs/audit/existing-features.md`)
sert de contrat : chaque règle listée = une assertion (E2E ou composant).
Exemples de pièges à couvrir explicitement :
- verrouillage des filtres pendant un spin (et pendant TOUTE une série multi) ;
- ticket consommé au 1ᵉʳ tirage d'une série → bande suivante non thématisée ;
- choix de carte en attente re-proposé après refresh (`pendingChoice` de
  `/auth/me`) ;
- `GET /auth/me` appelé UNE fois par session au bootstrap (effet de bord bonus) ;
- badge « équipes figées » et anti-spoiler tournoi ;
- exclusivité des tickets, blocage combo impossible (`combo-check`) ;
- couronne prioritaire sur médaille au classement ;
- widget chat absent de `#chat`, resync après reconnexion.

## 6. CI

```text
PR → lint + typecheck + unit + composants (toujours)
   → build
   → E2E smoke (parcours 1, 3, 5) sur préview locale avec API mockée (MSW)
Nightly → E2E complet contre staging + tests visuels
```

Budget : la suite PR doit rester < 5 min.
