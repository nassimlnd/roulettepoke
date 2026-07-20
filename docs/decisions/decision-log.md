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

## 2026-07-20 — Phase d'audit multidisciplinaire

### D9. 9 experts en agents parallèles, relancés sur Opus
Les 9 audits experts ont été menés par des agents spécialisés parallèles (chacun
avec ses fichiers d'audit + captures en entrée). Une limite d'API a interrompu
les 4 derniers en cours ; ils ont été relancés sur le modèle Opus (à la demande
du propriétaire), les 5 premiers rapports (produit, UX, UI, Nuxt, mobile) étant
déjà complets et de qualité. Résultat : 9 rapports (`docs/experts/01…09`,
~5 100 lignes), convergents sur le diagnostic central.

### D10. Direction visuelle recommandée : « PHOSPHORE » + 2 greffes
Le directeur artistique recommande **A · PHOSPHORE** en pilier (seul territoire
qui *résout* les deux identités que le jeu possède déjà — sprites pixel + son
chiptune — au lieu de les combattre ; coût d'assets le plus bas ; le plus loin
du cliché casino ; risque licence maîtrisable par discipline), augmenté de la
**voix de C · GUINGUETTE** (bonimenteur) sur les moments de spectacle et du
**cadrage catalogue de B · CARNET** sur la collection/end-game. Second choix
assumé : **B · CARNET DE TERRAIN**. **Décision à valider par le propriétaire**
(cf. `docs/RECOMMANDATION-FINALE.md`).

### D11. Diagnostic central convergent (produit + UX + motion)
Trois experts indépendants convergent : *le gameplay est riche côté serveur mais
l'interface ne le raconte pas.* Priorités partagées : résultat de tirage sous le
fold (C1), célébration plate (M1), doublon/pity muets, hub absent, confiance
entamée (Guide faux). Cette convergence fonde la recommandation finale.

### D12. Aucune recommandation n'exige d'évolution backend pour la v1
Toutes les recommandations prioritaires sont réalisables **frontend seul ou avec
l'API existante**. Quatre souhaits backend sont regroupés (pity exact, temps réel
hors chat, défis week-end, uniformisation des enveloppes), chacun avec un
fallback frontend — aucun n'est bloquant.

## 2026-07-20 — Validation du propriétaire, démarrage de la refonte

### D13. Décisions validées par le propriétaire
1. **Direction visuelle : PHOSPHORE + greffes** (retenue).
2. **Périmètre v1 : « Tout »** — les 6 fondations P1 (résultat visible +
   célébrations, doublon + pity, hub, Guide = vérité, fondations API/stores,
   friction alignée au risque).
3. **Compte de test `AuditNassim` conservé** (pour tests ultérieurs).

### D14. Spin reconstruit nativement (révise D7)
Le propriétaire décide de **reconstruire le jeu Spin de son côté avec une nouvelle
direction artistique** (différente de l'actuelle) plutôt que de conserver l'iframe.
Conséquence : Spin devient un **parcours natif de la refonte** (plus une boîte
noire en iframe). Prérequis avant de l'implémenter : **explorer l'API interne de
Spin** (`POST /api/spin/start` et suivants), non inventoriée pendant l'audit
(jeu séparé). Traité en **parcours secondaire** (après le cœur), il ne bloque pas
les 6 fondations P1. La nouvelle DA de Spin s'alignera sur Phosphore (à confirmer
au moment de la conception de cet écran).
