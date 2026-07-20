# 09 — Sécurité frontend (AppSec web / jeux)

> Audit statique du code de production téléchargé (`prod-src/src/`) + observations
> réseau déjà collectées (`artifacts/network/*.json`). **Aucun test d'intrusion,
> aucun contournement** : lecture de code et de journaux redactés uniquement.
> Cible : préparer la refonte Nuxt 4.5 (`web/`).

## Synthèse

L'application actuelle a une **posture de sécurité globalement correcte pour son
architecture** (SPA vanilla, zéro dépendance runtime, rendu manuel par
`innerHTML`). Deux forts structurants sont confirmés :

1. **Anti-triche sain** — le résultat de toute action (tirage, duel, capture,
   vente) est **résolu côté serveur AVANT l'animation** ; le client n'envoie
   jamais de valeur sensible (montant, probabilité, résultat), seulement des
   identifiants de choix. Confirmé endpoint par endpoint dans `api/client.js`.
2. **Token hors URL sur le WebSocket** — l'auth chat passe par le premier message
   applicatif, pas par la query string (évite la fuite dans les access logs).

Le **risque n°1 est le XSS stocké par nom d'utilisateur**. Le code applique
`escapeHtml` de façon **inégale** : le tchat, les suggestions et les
notifications sont échappés (bon modèle) ; mais **les noms de joueurs sont
interpolés bruts** dans le classement, la page stats, le tournoi, la bannière
globale et les feeds. Comme le token de session vit en `localStorage`
(`gacha_token`, lisible en JS), **tout XSS = vol de session immédiat**. La
sévérité réelle dépend d'une question backend unique : **les noms
d'utilisateur sont-ils contraints à l'inscription ?** (aucune validation côté
client — `register.js` n'a ni `pattern` ni `maxlength`).

La refonte Nuxt/Vue **corrige nativement 90 % de ce risque** (les mustaches Vue
`{{ }}` échappent par défaut), à condition de bannir `v-html` sur toute donnée
serveur. Restent à mettre en place : CSP + en-têtes, migration du stockage de
token (évolution backend souhaitable), redaction des logs, durcissement de la
chaîne de dépendances (nouvelle surface).

---

## Findings classés

### 🔴 Critique

#### F1 — XSS stocké global via le nom du vainqueur de tournoi
- **Fichier** : `components/tournamentBanner.js:61` — fonction `renderTournamentBanner` / `renderBanner`.
- **Variable** : `${champion.username}` (et `${champion.prize}`) interpolés bruts dans `el.innerHTML`.
- **Exploitabilité** : **maximale**. La bannière est un bandeau **global au-dessus
  de tout le site** (montée par `main.js:61` à **chaque** navigation). Pendant la
  fenêtre « vainqueur » (jeudi 15 h → vendredi 15 h, heure Paris), un nom de
  joueur porteur d'un payload s'exécute **chez tous les joueurs connectés**, sans
  qu'ils visitent la page tournoi. Donnée contrôlée par l'attaquant s'il peut
  gagner/placer 1er un compte au pseudo malveillant **et** si les pseudos ne sont
  pas assainis côté backend.

### 🟠 Élevé

#### F2 — XSS stocké via noms de joueurs dans les surfaces publiques
Données **contrôlées par un joueur** (pseudo) rendues brutes en `innerHTML`,
visibles par d'autres joueurs :

| Fichier:ligne | Fonction | Variable | Contexte |
| --- | --- | --- | --- |
| `leaderboard.js:233` | `buildRowHTML` | `${player.username}` | texte (top 10, contexte, tricheurs) |
| `leaderboard.js:160` | `loadShinyFeed` | `${s.username}` | texte (feed shiny public) |
| `stats.js:153` | sélecteur joueur | `${p.username}` | **attribut `value="…"`** + texte |
| `stats.js:314,331,345,383,396,409` | anecdotes | `names(...)` (pseudos) | texte |
| `stats.js:553` | prédiction | `${p.username}` | texte |
| `slot-machine.js:710` | recent-wins | `${w.username}` | texte |
| `tournament.js:124,163,184,280,285,330,341,345,432,508` | participants / matchups / bracket / parcours / résumé | `username`, `player1_name`, `player2_name`, `opponent` | texte |
| `tournament.js:53,186` | `avatarHtml`, matchup | `${p.username}` | **attribut `alt=""` / `title=""`** |

- **Exploitabilité** : élevée. `stats.js:153` est le cas le plus net —
  injection en **contexte attribut** (`value="${p.username}"`), une évasion par
  `"` suffit. Le classement et les feeds sont vus par tous.
- **Impact** : exécution JS dans la session d'autrui → **exfiltration du
  `gacha_token`** (`localStorage`, cf. F4) = compromission de compte, propagation
  possible (ver de chat/leaderboard).
- **Preuve du caractère systémique** : `escapeHtml` existe et est correctement
  appliqué ailleurs (`chat.js:118,121`, `chatWidget.js:129,131`,
  `suggestions.js`, `navbar.js:259`) — l'échappement est **oublié**, pas absent.

#### F3 — `escapeHtml` inadapté au contexte attribut (guillemets non échappés)
- **Fichier** : helper dupliqué dans `chat.js:130`, `chatWidget.js:140`,
  `navbar.js:266`, `suggestions.js:240` (`div.textContent = str; return div.innerHTML`).
- **Problème** : ce helper échappe `< > &` mais **pas `"` ni `'`**. Utilisé en
  contexte attribut, il laisse passer une évasion.
- **Preuve** : `chat.js:120` `data-username="${escapeHtml(m.username)}"` reste
  contournable si un pseudo contient `"` (rendu admin uniquement, portée
  limitée). `navbar.js:258` `data-link="${n.link ?? ''}"` : attribut **non
  échappé du tout** (valeur serveur, alimente `location.hash`).
- **Bon contre-exemple à généraliser** : `suggestions.js:246` définit un
  `escapeAttr` dédié (escapeHtml + remplacement de `"`) — l'auteur avait
  conscience de la distinction texte/attribut.

### 🟡 Moyen

#### F4 — Token de session en `localStorage`, sans expiration ni refresh côté client
- **Fichier** : `api/client.js:3-5` (`getToken` → `localStorage.gacha_token`),
  `:22-28` (envoi Bearer), `login.js:37`, `register.js:29`.
- **Problème** : (1) le token est **lisible par n'importe quel script** → tout
  XseSS (F1/F2) l'exfiltre ; (2) **pas de gestion d'expiration** côté client
  (api-inventory : 401 traité de façon inégale selon les pages) ; (3) **pas de
  refresh token** → session unique, révocation seulement via `token_version`
  backend ; (4) `getMyUserId` (`client.js:10-18`) **décode le payload JWT sans
  vérifier la signature** — acceptable car purement informatif (l'autorisation
  reste serveur), mais à ne pas transformer en contrôle de sécurité.
- **Contrainte structurante** : l'API **attend un Bearer et ne pose aucun
  cookie** → un `httpOnly` est **impossible sans évolution backend**. À dire
  explicitement (cf. Recommandation P2-B et Questions backend).
- **Impact** : F1/F2 + F4 = chaîne complète « pseudo piégé → vol de session ».

#### F5 — Reflet de messages d'erreur serveur en `innerHTML`
- **Fichiers** : `home.js:602`, `team.js:70,608`, `stats.js:32`,
  `leaderboard.js:83,134`, `gyms.js:417,1114,1229`, `roulette.js:545`
  (`showError`) → `${err.message}` / `${error.message}` injectés en `innerHTML`.
- **Problème** : `err.message` provient de `data.error` renvoyé par le serveur
  (`client.js:32`). XSS réfléchi **si** un endpoint réinjecte un jour une entrée
  utilisateur dans son message d'erreur. Aujourd'hui messages statiques FR → non
  déclenchable, mais gap défensif.
- **Bon contre-exemple** : `login.js:42`, `register.js:32`, `suggestions.js:48`
  utilisent `.textContent` (sûr).

### 🔵 Info / à préserver

#### F6 — Anti-triche confirmé sain (à conserver tel quel)
- `roulette.js:76-113` : `api.roll.perform()` (résultat serveur) et
  `previewBatch()` (décor) en parallèle ; la vraie carte est **insérée à
  `WIN_INDEX`**, l'animation ne fait que s'y arrêter. La preview **ne prédit pas**
  le résultat (indépendante). Idem duels : `player_wins_duel` / `roll_value`
  viennent du serveur (`gyms.js:846`), le client anime une issue déjà décidée.
- **Revue endpoint par endpoint (`client.js`)** : le client n'émet que des
  **identifiants de choix** (`cardId`, `biome`, `gymId`, `targetId`, `tradeId`,
  `lines`, `choiceId`…). **Aucun montant, probabilité ou résultat n'est envoyé.**
- **Manipulable côté client, impact serveur nul** : solde optimiste
  (`home.js:607-613` `user.coins -= card.rollCost` — **affichage seul**, M7) ;
  mode de révélation (`localStorage`) ; vitesse/jitter d'animation (cosmétique).
  → Aucun n'altère l'état serveur. **Garde-fou refonte** : un futur solde
  « optimiste » dans un store Pinia ne doit **jamais** servir de source de vérité
  pour autoriser une action ; toujours reconfirmer via la réponse serveur.

#### F7 — « Anti-spoiler » = confort d'UX, pas un secret
- `tournament.js` livre `t.matches` complet (`battle_log`, `winner_id`) au
  chargement ; le « Mon parcours » (`mountMyJourney`) et les boutons « Révéler »
  ne font que **masquer visuellement** des données déjà en mémoire JS / onglet
  réseau. De même `roulette.js:214` stocke la carte gagnante dans
  `dataset.realCard` avant le reveal (modes masqué/smart).
- **Non-problème sécurité** (résultat serveur-autoritatif), mais à **ne pas
  confondre avec une donnée cachée** : si un vrai secret de révélation est voulu,
  c'est le **backend** qui doit le retenir jusqu'à l'action.

#### F8 — Exposition de données : limitée et surtout intentionnelle
- **Email** : seulement **le sien**, renvoyé par `/auth/login`, `/auth/register`,
  `/auth/me` (redacté `[EMAIL]` dans les logs → redaction OK, aucune fuite
  inter-joueurs constatée). **Mais** `/auth/me` est appelé à quasi chaque
  navigation et l'email **n'est jamais utilisé** par le front → surface inutile.
- **UUIDs** : exposés partout (participants, leaderboard, chat `user_id`, trades,
  JWT). Opaques → risque faible, mais présents.
- **Équipes adverses avant lock de tournoi** : **voulu** (spoiler stratégique,
  confirmé par l'intro tournoi et `my-analysis`) — pas une fuite.
- **Previews de roulette** : décor ; poids réels mais **indépendants du vrai
  roll** ; données déjà semi-publiques (`/collection/all`, `/stats` taux). Faible.

#### F9 — Journalisation : quasi vierge aujourd'hui, risque à venir
- `team.js:570` (`console.warn` URL image) et `reset-password.js:81`
  (`console.error('[RESET]', err)`) — **aucun ne logge de token**. La page reset
  logge un objet erreur brut (à éviter : contexte manipulant un token de reset).
- Le **vrai** risque naît dans la couche API de la refonte (interceptors
  `$fetch`/`ofetch`, logs de dev) → prescrire la redaction du token (P2-C).

#### F10 — WebSocket : bien conçu, quelques questions backend
- `lib/chatConnection.js:85-89` : auth par 1er message, **token hors URL**
  (confirmé par `websocket-log.json` : `framesSent` = `auth` token `[REDACTED]`,
  URL sans token). Reconnexion + resync corrects. Rendu des messages échappé
  (`chat.js`, `chatWidget.js`).
- Questions à confirmer côté serveur : voir section dédiée.

---

## Prescriptions pour la refonte (Nuxt 4.5)

1. **Rendu par défaut = échappé.** Utiliser les mustaches Vue `{{ }}` / le binding
   de texte pour **toute** donnée serveur. **Interdire `v-html`** sur des données
   utilisateur ; si un rendu riche est requis (rare), passer par un assainisseur
   (DOMPurify) avec allow-list stricte. Ajouter une **règle ESLint**
   `vue/no-v-html` (warn → error hors composants explicitement audités).
2. **Aucun `innerHTML` de donnée serveur** dans les rares helpers hors composants.
   Un seul helper d'échappement partagé, **distinguant texte et attribut**
   (reprendre `escapeAttr`), plutôt que 4 copies de `escapeHtml`.
3. **Couche API centralisée** (`$fetch`/composable) : gestion 401 unique
   (redirection + toast), **redaction du token dans tout log**, jamais de
   `console.*` d'une réponse auth. Désactiver `devtools`/logs verbeux en prod.
4. **Store de session** : token en mémoire de préférence ; si persistance
   nécessaire tant que le backend n'évolue pas, rester sur un stockage unique et
   **minimiser la fenêtre XSS via la CSP** (le stockage ne sécurise pas, la CSP si).
5. **Ne jamais faire du solde/état optimiste une source d'autorisation** (F6).
6. **Préserver** : résolution serveur avant animation (F6), token hors URL WS
   (F10), échappement du chat/suggestions (à généraliser).

---

## Questions à poser au backend

1. **Pseudos** : sont-ils contraints à l'inscription (charset/longueur/unicité,
   rejet de `< > " '` et du HTML) ? C'est le facteur qui fait passer F1/F2 de
   « théorique » à « exploité ». (Le front n'impose **rien** : `register.js:8`.)
2. **Cookie de session** : le backend peut-il émettre le JWT en **cookie
   `HttpOnly; Secure; SameSite=Lax/Strict`** (en plus ou à la place du Bearer) ?
   Sans ça, `httpOnly` est impossible et le token reste volable par XSS.
3. **Refresh token / expiration** : durée de vie du JWT ? mécanisme de refresh ?
   révocation autre que `token_version` ?
4. **`/auth/me`** : peut-on **retirer `email`** de la réponse (jamais consommé par
   le front) ? Et documenter l'effet de bord (crédit du bonus quotidien) pour
   n'appeler l'endpoint **qu'une fois** au boot.
5. **WebSocket** : le serveur **vérifie-t-il l'`Origin`** à l'upgrade
   (anti Cross-Site WebSocket Hijacking) ? Rate-limiting des messages (la limite
   300 caractères est **client-only**, `chat.js:13`) ? Le token WS partage-t-il
   durée de vie et révocation avec le Bearer REST ?
6. **Messages d'erreur** : garantir qu'aucun `error` renvoyé ne réinjecte une
   entrée utilisateur (F5).
7. **Iframe Spin** (`/api/spin/start`, hors `client.js`) : confirmer l'origine et
   le protocole `postMessage` (validation de `event.origin` des deux côtés) pour
   ne pas casser l'iframe avec la CSP (cf. P2-A).

---

## Recommandations priorisées

## [P1] Généraliser l'échappement des noms de joueurs (XSS stocké)
- **Problème** : les pseudos (données contrôlées par l'utilisateur) sont
  interpolés bruts en `innerHTML` dans les surfaces publiques ; le pire cas est la
  bannière globale du vainqueur, exécutée chez tous les joueurs connectés.
- **Preuve** : `tournamentBanner.js:61` (`${champion.username}`) ;
  `leaderboard.js:233,160` ; `stats.js:153` (attribut `value`), `:314-409,553` ;
  `slot-machine.js:710` ; `tournament.js:53,124,163,184,280,285,330,341,432,508`.
  Contre-exemple correct : `chat.js`, `suggestions.js`, `navbar.js:259`.
- **Impact** : exécution JS dans la session d'autrui → vol du `gacha_token`
  (F4) → compromission de compte, propagation.
- **Recommandation** : dans la refonte, rendre tous les pseudos via texte Vue
  (échappé par défaut) ; bannir `v-html` sur donnée serveur (ESLint
  `vue/no-v-html`). Tant que l'ancien front vit, corriger a minima F1
  (bannière globale) et `stats.js:153` en priorité via `escapeHtml`/`escapeAttr`.
- **Complexité** : Faible (refonte : quasi gratuit ; hotfix ancien front : S).
- **Dépendances** : Question backend n°1 (contrainte pseudos) pour calibrer
  l'urgence du hotfix.
- **Critères d'acceptation** : aucun pseudo/nom serveur rendu via `v-html` ou
  `innerHTML` ; règle ESLint active en CI ; un pseudo de test
  `"><img src=x onerror=alert(1)>` s'affiche littéralement partout (classement,
  stats, tournoi, bannière, feeds).

## [P1] Distinguer contexte texte et contexte attribut dans l'échappement
- **Problème** : le helper `escapeHtml` (textContent→innerHTML) **n'échappe pas
  les guillemets**, donc reste contournable en contexte attribut.
- **Preuve** : `chat.js:120` `data-username="${escapeHtml(...)}"` ;
  `navbar.js:258` `data-link="${n.link}"` non échappé ; `tournament.js:53`
  `alt="${p.username}"`. Bon modèle : `suggestions.js:246` `escapeAttr`.
- **Impact** : évasion d'attribut → injection de gestionnaire d'événement
  (`" onmouseover=…`) même sur du code « échappé ».
- **Recommandation** : un helper unique côté refonte, `escapeAttr` pour tout
  binding d'attribut dynamique ; préférer le binding d'attribut Vue (`:attr`) qui
  gère l'encodage. Supprimer les 4 copies divergentes de `escapeHtml`.
- **Complexité** : Faible.
- **Dépendances** : P1 (même chantier d'échappement).
- **Critères d'acceptation** : plus aucune interpolation manuelle dans une
  valeur d'attribut ; un pseudo contenant `"` ne casse aucun attribut.

## [P2-A] Poser une CSP + en-têtes de sécurité (sans casser l'iframe Spin)
- **Problème** : le nouveau front n'a **aucune** politique d'en-têtes
  (`nuxt.config.ts` vide côté sécurité) ; une CSP est le meilleur filet contre le
  vol de token par XSS résiduel.
- **Preuve** : `web/nuxt.config.ts` (pas de `security`/headers) ; l'app héberge
  une **iframe Spin même-origine** (`api-inventory.md` §4, `postMessage`) à
  préserver.
- **Impact** : sans CSP, un seul XSS suffit à exfiltrer `gacha_token` vers un
  domaine tiers.
- **Recommandation** : adopter le module `nuxt-security` (CSP à **nonce** pour
  l'hydratation Nuxt, headers auto). CSP réaliste :
  `default-src 'self'` ; `script-src 'self' 'nonce-…'` ;
  `style-src 'self' 'unsafe-inline'` (Tailwind/Nuxt UI injectent du style —
  sinon nonce) ; `img-src 'self' data:` (sprites `/images/*.webp` + placeholders) ;
  `connect-src 'self' wss://<host>` (WS chat même-origine) ; `font-src 'self'` ;
  `frame-src 'self'` et `frame-ancestors 'self'` (**autorise l'iframe Spin
  même-origine**, bloque le clickjacking tiers) ; `object-src 'none'` ;
  `base-uri 'self'` ; `form-action 'self'`. En-têtes complémentaires :
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Strict-Transport-Security` (HTTPS confirmé), `Permissions-Policy` minimal,
  `X-Frame-Options: SAMEORIGIN` (compat — **jamais `DENY`**).
- **Complexité** : Moyenne (itérer sur `script-src`/`style-src` avec Nuxt UI).
- **Dépendances** : Question backend n°7 (origine iframe Spin) ;
  `connect-src` doit inclure l'hôte WS de prod.
- **Critères d'acceptation** : CSP active, **0 erreur console** en navigation
  complète, **iframe Spin fonctionnelle**, chat WS connecté ; une balise
  `<script>` injectée est bloquée par la CSP (report-only puis enforce).

## [P2-B] Migrer le stockage de session vers un cookie httpOnly (évolution backend)
- **Problème** : `gacha_token` en `localStorage` est lisible par tout script →
  n'importe quel XSS vole la session ; pas d'expiration/refresh gérés côté client.
- **Preuve** : `client.js:3-5,22-28` ; `login.js:37` ; `register.js:29` ;
  api-inventory (« pas de refresh token, pas d'expiration côté client »).
- **Impact** : chaîne « XSS → vol de token → prise de compte » ; token longue
  durée non révocable finement.
- **Recommandation** : **compromis frontend** immédiat — garder le Bearer mais
  réduire la fenêtre XSS (P1, P2-A) et tenir le token en mémoire de store plutôt
  qu'exposé globalement. **Évolution backend souhaitable** (la vraie correction,
  car l'API ne pose aujourd'hui aucun cookie) : émettre le JWT en cookie
  `HttpOnly; Secure; SameSite=Lax` + protection CSRF (double-submit token ou
  en-tête custom) + refresh token court. Gérer les 401 de façon centralisée
  (redirection login + toast).
- **Complexité** : Moyenne côté front, **dépend du backend** pour le httpOnly.
- **Dépendances** : Questions backend n°2 et n°3.
- **Critères d'acceptation** : à terme, le token n'est **plus accessible en JS** ;
  un XSS de démonstration ne peut plus lire la session ; 401 → reconnexion propre.

## [P2-C] Redaction systématique du token dans la couche API et les logs
- **Problème** : la refonte introduira des interceptors et du logging de dev où
  le token / l'en-tête `Authorization` fuient facilement.
- **Preuve** : app actuelle presque vierge (`team.js:570`, `reset-password.js:81`,
  aucun token loggé) — le risque est **prospectif**, dans la nouvelle couche
  `$fetch`.
- **Impact** : token en clair dans la console navigateur, Sentry, logs SSR ou de
  build → fuite de session.
- **Recommandation** : intercepteur unique qui **masque `Authorization` et tout
  champ `token`** avant tout log ; interdire `console.*` d'une réponse auth ;
  scrubber côté outil d'observabilité (Sentry `beforeSend`). Règle de revue :
  aucun `console.log(response)` sur une requête authentifiée.
- **Complexité** : Faible.
- **Dépendances** : couche API centralisée (Prescription 3).
- **Critères d'acceptation** : grep `Authorization`/`token` dans les sorties de
  log = 0 valeur en clair ; test unitaire du redacteur.

## [P3-A] Durcir la chaîne de dépendances (nouvelle surface supply-chain)
- **Problème** : l'app actuelle a **zéro dépendance runtime** (aucune surface
  supply-chain) ; la refonte ajoute Nuxt, Nuxt UI, Tailwind, Iconify.
- **Preuve** : `web/package.json` (nuxt 4.5, @nuxt/ui 4, tailwind 4, iconify) ;
  `pnpm-lock.yaml` **présent** (lockfile OK), `renovate.json` **présent**
  (updates auto + `lockFileMaintenance`), mais `ci.yml` ne fait que **lint +
  typecheck** — **pas d'audit**.
- **Impact** : une dépendance vulnérable ou compromise s'exécute dans le front.
- **Recommandation** : ajouter `pnpm audit --audit-level=high` (ou
  `osv-scanner`/Socket) en CI, **échec sur high/critical** ; épingler
  `packageManager` (déjà fait : `pnpm@11.13.1`) ; conserver le lockfile commité ;
  affiner Renovate (grouper, automerge des patchs, alertes sécurité). Vérifier
  que `@iconify-json/*` sont bien des **données offline** (pas d'appel à l'API
  Iconify en ligne) dans la config Nuxt UI — sinon l'ajouter à `connect-src`.
- **Complexité** : Faible.
- **Dépendances** : —
- **Critères d'acceptation** : CI rouge si une vuln high/critical est introduite ;
  Renovate ouvre des PRs ; aucun appel réseau runtime vers un CDN d'icônes.

## [P3-B] Réduire la surface de données exposée au client
- **Problème** : `/auth/me` renvoie l'email (jamais utilisé par le front) à quasi
  chaque navigation ; combiné à un XSS, c'est de la PII exfiltrable en plus de la
  session.
- **Preuve** : api-inventory (`User.email`), logs (`/auth/me`, `/auth/login`,
  `/auth/register` contiennent `email`, redacté) ; aucun usage de `email` dans le
  code front lu.
- **Impact** : PII exposée sans besoin ; `/auth/me` non idempotent appelé en
  boucle (effet de bord bonus quotidien).
- **Recommandation** : demander au backend de **retirer `email` de `/auth/me`**
  (le garder sur login/register si utile au tunnel) ; côté front, **n'appeler
  `/auth/me` qu'une fois** au boot et alimenter un store, plutôt qu'à chaque page
  (cf. rapport frontend §navbar).
- **Complexité** : Faible côté front, **dépend du backend** pour le champ email.
- **Dépendances** : Question backend n°4.
- **Critères d'acceptation** : la réponse `/auth/me` ne contient plus d'email ;
  un seul appel `/auth/me` par session ; le solde/profil vit dans un store unique.

---

### Annexe — Récapitulatif « qui contrôle la donnée »

| Donnée interpolée brute | Source | Contrôlée par | Exploitabilité |
| --- | --- | --- | --- |
| `username` / `player*_name` / `opponent` | comptes joueurs | **un joueur** | **Élevée à Critique** (F1/F2) |
| `card.name`, `pokemon.name`, `gym_name`, `badge_name`, `type.name` | catalogue serveur (Pokédex/arènes, table fixe) | back/admin | Faible (défensif) |
| `err.message` (`innerHTML`) | `data.error` serveur (statique FR) | back | Faible (réfléchi conditionnel, F5) |
| `n.message` (notif) | serveur | back | Faible — **déjà échappé** (`navbar.js:259`) |
| notes de patch (`${item}` avec HTML) | **codées en dur dans le bundle** (`patchNotes.js`) | développeur | Nulle (statique, pas de la donnée serveur) |
| `user.username` (`home.js:78`) | son propre compte | soi-même | **Self-XSS** seulement |
