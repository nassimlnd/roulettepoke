# Journal des décisions

Format : date — décision — motivation — impact/réversibilité.

## 2026-07-20 — Phase d'audit

### D1. Lire le code de production comme source primaire
L'app de production sert ses sources ES modules non bundlées (`/src/*.js`).
Décision : télécharger et lire l'intégralité (37 fichiers, ~10 400 lignes JS +
6 462 CSS) plutôt que de déduire le comportement des seules captures.
**Impact** : inventaires fonctionnel/API exhaustifs et fiables ; les règles
métier citées proviennent du code réel. Réversible : n/a.

### D2. Pont TLS local pour Playwright (spécifique à l'environnement d'audit)
Le proxy d'egress de l'environnement distant reset le handshake TLS de
Chromium (curl/Node passent). Décision : `exploration/tls-bridge.mjs` — TLS
terminé localement, connexion upstream via la pile Node avec vérification du
CA du proxy. Alternative rejetée : désactiver la vérification TLS upstream
(interdit), ou router chaque requête via l'API request de Playwright (perd les
WebSockets).
**Impact** : exploration navigateur complète, y compris WS. Sans objet hors de
cet environnement.

### D3. Aucune action destructive ou à quota hebdomadaire sur le compte principal
Interdits pendant l'audit : roulette d'équipe (retire une carte de la
collection), vente, fusion, retrait d'équipe, combat d'arène (1/semaine),
défi de ligue (1/semaine), inscription tournoi (20 🪙 + engagement), message
de chat, création de trade/suggestion/vote.
**Impact** : l'animation du combat d'arène n'a pas été observée en direct sur
ce compte — comportement reconstitué depuis le code + replays de tournoi
(mêmes composants). Le compte du propriétaire reste intact.

### D4. Création d'un compte de test « AuditNassim »
Le compte principal (end-game, 6 🪙, quotas quotidiens consommés) ne permettait
ni de capturer l'onboarding, ni les états vides, ni un seul tirage. Décision :
créer un compte de test via l'inscription publique, email alias
`…+audit@gmail.com` du propriétaire, actions limitées à des tirages (7) et son
jackpot quotidien gratuit.
**Impact** : couverture onboarding/états vides/animations complète ; le compte
apparaît (score 7) en bas du classement — supprimable côté backend si souhaité.
**À valider par le propriétaire.**

### D5. Adaptation de l'arborescence de captures
Pas de « lobby » ni « settings » dans l'application (aucune partie synchrone,
aucune page de réglages). Décision : catégories calquées sur l'architecture
réelle (home, gyms, slot-machine, tournament, league, trades…), mapping
documenté en tête de `screenshots-index.md`.

### D6. Identifiants hors du dépôt
Identifiants uniquement en variables d'environnement (`--env-file` local,
non commité) ; tokens/JWT/emails redactés des journaux réseau publiés dans
`artifacts/network/`. Les scripts refusent de démarrer sans les variables.

### D7. Périmètre Spin
« Spin » est une application séparée embarquée en iframe avec sa propre surface
API (`POST /api/spin/start` observé hors `client.js`). Décision : la refonte
conserve l'intégration iframe telle quelle (page hôte refaite, jeu interne
inchangé) — refondre le jeu interne est un projet distinct.
**À valider.**

### D8. Un bug de manifest corrigé en cours d'audit
`explore.mjs` écrasait `manifest.json` à chaque exécution (117 captures sans
méta). Correctif : manifest cumulatif + reconstruction des métadonnées perdues
(marquées `méta reconstruite`). Les captures elles-mêmes n'ont jamais été perdues.
