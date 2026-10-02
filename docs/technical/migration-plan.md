# Plan de migration — ancien frontend → Nuxt 4.5

> Principe directeur : **l'ancien front reste en production jusqu'à la parité
> validée**. Le nouveau front se développe dans `web/`, se teste contre l'API
> réelle (comptes de test), et bascule en une fois par domaine servi — avec
> retour arrière trivial (re-pointer le reverse proxy). Aucune modification
> backend n'est nécessaire pour coexister : même API, même token Bearer.

## Pré-requis transverses

- Les 3 comptes de référence pour tester : compte end-game (propriétaire),
  compte de test « nouveau joueur », compte intermédiaire (à créer au moment
  des tests d'équipe/arènes — il devra posséder des cartes et une équipe).
- Fixtures API : les JSON de `artifacts/network/` servent de base aux mocks.
- Le jeu iframe Spin est traité comme boîte noire (page hôte refaite, iframe
  conservée à l'identique, protocole `postMessage spin:close` reproduit).

## Étapes

### 0. Inventaire de l'existant ✅ (fait — cette PR)
Docs d'audit + captures + journaux réseau. **Critère** : un lecteur peut
reconstituer le fonctionnement complet sans ouvrir l'app.

### 1. Socle Nuxt (`web/`)
- Fichiers : `nuxt.config.ts` (ssr: false ou routeRules à décider, cf.
  frontend-architecture.md), `app.config.ts` (couleurs Nuxt UI), `main.css`
  (tokens), structure `app/` (components/composables/stores/services/types),
  ESLint strict + `typecheck` + CI existante (`web/.github/workflows/ci.yml`).
- Risques : dérive de configuration TS strict tardive → activer strict dès J1.
- **Critères** : `pnpm lint && pnpm typecheck && pnpm build` verts en CI ;
  page vide qui tourne.
- Retour arrière : n/a (n'affecte pas la prod).

### 2. Couche API + types
- Fichiers : `app/types/api.ts` (types de `api-inventory.md`),
  `app/services/api/*` (client $fetch typé, normalisation des réponses,
  erreurs humanisées, 401 centralisé), mocks Vitest à partir des fixtures.
- Dépendances : étape 1.
- Risques : divergences entre types observés et cas réels non vus (champs
  optionnels) → tolérance aux champs inconnus, logs de dev.
- **Critères** : tests unitaires de la couche (login, roll, erreurs 401/400,
  normalisation) verts ; aucun composant n'appelle `fetch` directement.

### 3. Authentification
- Fichiers : store `auth`, pages `login/register/forgot/reset`, middleware
  de garde, persistance token (compatible `gacha_token` existant pour ne pas
  déconnecter les joueurs à la bascule — décision cf. architecture).
- Risques : double session ancien/nouveau front → même clé localStorage et
  même domaine = session partagée naturellement.
- **Critères** : E2E Playwright : login OK, mauvais mot de passe, accès
  route privée sans token → redirection, F5 conserve la session, logout.

### 4. Design system
- Fichiers : `app.config.ts` (thème), `app/components/base/*` (PokeCard,
  CoinCounter, RarityBadge, StatBar, EmptyState, GameModal…), page de
  démonstration interne `/_kit` (revue visuelle rapide).
- Dépendances : direction visuelle validée (phase de validation).
- **Critères** : tous les composants de base avec états (hover/focus/disabled/
  loading) + tests de composants + contrastes AA vérifiés.

### 5. Parcours principaux (cœur du jeu)
Ordre de migration (du plus autonome au plus dépendant) :
1. **Roulette** (`#home`) — moteur de bande, modes de révélation, biomes,
   multi-roll, événements spéciaux, inventaire/tickets, avatar.
2. **Collection** — grille virtualisée, filtres, vente, fusion (avec la
   confirmation manquante).
3. **Équipe** — roulette d'équipe, réorganisation, retraits.
4. **Arènes + entraînement** — jauges de duel, animations de combat,
   historique, badges.
- Risques : parité des règles fines (verrouillage des filtres pendant un
  spin, résolution différée des choix de carte en multi-roll, tickets
  consommés entre deux tirages d'une série — tout est documenté dans
  existing-features.md) → checklist de parité par écran + E2E dédiés.
- **Critères** : par écran, la checklist de parité passe ; E2E du parcours ;
  revue visuelle aux 5 résolutions de l'audit.

### 6. Parcours secondaires
5. **Jackpot** (rouleaux, lignes, feeds) ;
6. **Tournoi** (préparation, bracket, replays, anti-spoiler, historique) ;
7. **Ligue** (défi, récompense risquée, capture légendaire) ;
8. **Échanges** (3 étapes, badges d'action) ;
9. **Chat** (WS partagé page/widget, resync) ;
10. **Classement / Stats / Suggestions / Patch notes / Guide / Spin (hôte)**.
- **Critères** : idem étape 5 ; pour le chat, test de coupure/reconnexion.

### 7. Animations & célébrations
- Intégration du système de motion (cf. design/animation-system.md) : niveaux
  de célébration, sons portés (Web Audio), `prefers-reduced-motion`.
- **Critères** : revue des 7 niveaux de succès ; 60 fps sur mobile milieu de
  gamme (profil Chrome DevTools throttle ×4) ; version reduced-motion complète.

### 8. Tests responsive
- Passage des 5 résolutions de référence sur tous les écrans (Playwright
  projects) + zones tactiles ≥44 px + safe areas.
- **Critères** : captures comparées, zéro scroll horizontal, cibles validées.

### 9. Tests d'accessibilité
- axe-core automatisé (CI) + parcours clavier manuels (roulette, modales,
  menus) + lecteur d'écran sur les 3 moments clés (tirage, duel, jackpot).
- **Critères** : 0 violation bloquante axe ; checklist a11y du design system.

### 10. Non-régression finale
- Suite E2E complète contre un environnement de staging (ou la prod avec le
  compte de test) : les 14 parcours listés dans testing-strategy.md.
- Beta fermée : faire jouer 3-5 joueurs de la communauté sur l'URL de staging
  (leur feedback est le vrai test de non-régression du « feel »).
- **Critères** : E2E verts 3 jours consécutifs ; feedback beta traité.

### 11. Bascule
- Déploiement du nouveau front sur le domaine principal, ancien front archivé
  sur un sous-chemin (`/legacy/`) pendant 2 semaines.
- Le token localStorage étant partagé, aucun re-login n'est nécessaire.
- Retour arrière : re-pointer le domaine sur l'ancien build (statique, aucune
  migration de données — bascule purement front).
- **Critères** : monitoring des erreurs JS + retours joueurs 1 semaine.

## Matrice risques globaux

| Risque | Probabilité | Impact | Mitigation |
| --- | --- | --- | --- |
| Comportement API non documenté découvert en cours de route | moyenne | moyen | fixtures réelles + tolérance aux champs inconnus + logs dev |
| Régression d'une règle fine du jeu (pity, tickets, verrous) | moyenne | fort | checklists de parité par écran issues de existing-features.md |
| Écart de « feel » (animations moins satisfaisantes) | moyenne | fort | beta fermée communauté avant bascule |
| Deux fronts avec états localStorage divergents | faible | faible | mêmes clés localStorage reprises (documentées dans states-inventory.md) |
| Charge de l'unique mainteneur backend (questions/évolutions) | haute | moyen | tout ce qui est « frontend seul » d'abord ; évolutions backend regroupées en une liste unique à la fin |
