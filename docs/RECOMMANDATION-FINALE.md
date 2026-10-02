# Recommandation finale — audit avant refonte de PokeRoulette

> Document de synthèse pour décision. Il consolide 9 rapports d'experts, l'audit
> de l'application en production (178 captures, 275 appels API), et les documents
> produit/design/technique. **À valider avant toute implémentation.**
> Rien n'a encore été codé ; le scaffold Nuxt (`web/`) est vierge.

## 1. Ce qui a été fait

- **Exploration complète** de l'app en production (compte end-game + compte de
  test « nouveau joueur ») : 178 captures sur 5 résolutions, 275 appels API
  journalisés, protocole WebSocket du chat, code source de production lu
  intégralement (37 fichiers, ~10 400 lignes).
- **Audit multidisciplinaire** par 9 experts (produit/game design, UX jeux web,
  UI, création, motion, frontend Nuxt, accessibilité, responsive/mobile, sécurité)
  — ~5 100 lignes de rapports, tous fondés sur les preuves de l'audit.
- **Documentation** : cartographie, inventaires (fonctionnel, API + types TS,
  états, UI), parcours, problèmes classés, vision produit, principes UX, design
  system, 3 directions visuelles, architecture Nuxt/Pinia/API, plans de migration
  et de tests, journal de décisions.

## 2. Le diagnostic en une phrase

> **PokeRoulette est un bon jeu que son interface ne raconte pas.**

Le gameplay est riche et sain côté serveur (boucle hebdomadaire compétitive,
transparence des probabilités, résolution anti-triche, personnalité française
drôle). Mais l'interface casse le paiement émotionnel : le résultat du tirage est
hors écran, toutes les raretés se célèbrent pareil, le doublon (ressource centrale
et 100 % des tirages d'un joueur avancé) est muet, l'end-game réel (chasse aux
shiny, course au score) est invisible, l'état du jeu est éparpillé sur cinq pages,
et le Guide contredit l'app. **Cette convergence est confirmée indépendamment par
les experts produit, UX et motion.**

## 3. Les 5 problèmes critiques (preuves dans `docs/audit/frontend-issues.md`)

| # | Problème | Preuve |
| --- | --- | --- |
| C1 | Le résultat du tirage s'affiche **sous la ligne de flottaison** | `home/roll-result-new-card.png` |
| C2 | **Aucun onboarding** de la boucle cœur | `onboarding/first-visit-home.png` |
| C3 | **Messages d'erreur techniques bruts** (« Failed to fetch »), 401 sans issue | `errors/*` |
| C4 | La navbar **re-fetch 4 endpoints à chaque navigation** (64× observés) | `api-log.json`, `navbar.js` |
| C5 | **Fusion sans confirmation** (détruit 10 cartes) | `collection.js` |
| C6 | Le **Guide contredit l'app** (biomes « sans surcoût » vs 50–300 🪙) | `#rules` vs `/roll/biomes` |

## 4. Recommandations consolidées (format normalisé, top priorités)

Les recommandations détaillées de chaque expert sont dans `docs/experts/*`. Voici
les priorités transverses, au format demandé.

---

### [P1] Ramener le résultat du tirage dans l'écran et hiérarchiser les célébrations

**Problème** — Le moment de récompense du geste central s'affiche hors écran, et
un shiny 1/500 se célèbre comme un commun ; le doublon n'est pas verbalisé.
**Preuve** — C1, M1 ; `home/roll-result-*.png` ; `states-inventory.md` § succès.
**Impact** — Le levier dopamine n°1 du jeu, à chaque tirage de chaque joueur.
**Recommandation** — Résultat rendu dans le viewport ; escalade de célébration à
5 paliers branchée sur la hiérarchie à 7 niveaux (`animation-system.md`) ;
verbalisation « NOUVELLE CARTE ! » vs « Doublon ×N » ; plein écran réservé au
légendaire/shiny ; respect de `prefers-reduced-motion`.
**Proposition visuelle** — A : l'écran « sature » ; B : sceau de cire doré ; C :
« LE GROS LOT » (cf. `visual-directions.md`).
**Animation** — 5 paliers budgétés (`docs/experts/05`, RM2) ; skippable.
**Complexité** — Moyenne.
**Dépendances** — Frontend seul (`RollResult.rarity/is_alt/isNew` déjà fournis).
**Critères d'acceptation** — Carte gagnée entièrement visible sans scroll en
1440×900 et 375×812 ; légendaire/shiny = séquence plein écran distincte ; doublon
et nouveauté verbalisés en texte.

---

### [P1] Verbaliser le doublon et afficher le pity shiny estimé

**Problème** — Le doublon (100 % des tirages d'un joueur avancé, 5 usages) n'a
aucun feedback ; le pity shiny (règle écrite) est invisible partout.
**Preuve** — `states-inventory.md` ; `api-inventory.md` §limitations 6 ;
`social/leaderboard-desktop.png` (end-game = chasse shiny, écarts de 3–15 pts).
**Impact** — Donne un sens à chaque tirage du mid/end-game : la réponse frontend
au « plus rien à faire au quotidien ».
**Recommandation** — Au doublon : « chance shiny estimée ~(N+1)/500 ✨ » (formule
du Guide sur `quantity`, étiquetée « estimation ») ; tri collection par chance
shiny ; compteur shiny mis en avant.
**Complexité** — Faible (l'exactitude serveur est un souhait backend, avec ce
fallback).
**Dépendances** — API existante (`/collection` expose `quantity`).
**Critères d'acceptation** — Tout doublon affiche exemplaires + pity estimé ; tri
par chance shiny ; l'estimation est remplaçable sans changement d'UI si l'endpoint
backend arrive.

---

### [P1] Transformer `#home` en hub de session (« Aujourd'hui / Cette semaine »)

**Problème** — Le hub du jeu ne montre ni quotas, ni échéances, ni progression ;
l'end-game y voit le même écran qu'un compte neuf ; le joueur visite 5 pages pour
connaître ses quotas.
**Preuve** — m8 ; `existing-user-flows.md` § rythme ; `home/home-desktop-fullpage.png`.
**Impact** — Structure chaque session, réduit la charge mentale, expose les
contenus oubliés — en **baissant** les appels API (store à TTL vs C4).
**Recommandation** — Sous la roulette : « Aujourd'hui » (bonus, entraînement,
jackpot), « Cette semaine » (arène, tournoi, ligue, échange, Spin avec comptes à
rebours), « Objectifs » (calculés selon l'état), « Il se passe quoi » (feed).
**Complexité** — Moyenne.
**Dépendances** — API existante (données déjà récupérées par la navbar).
**Critères d'acceptation** — État des 3 quotas + 5 échéances lisible sans
navigation ; le total d'appels par navigation n'augmente pas (store + TTL mesuré).

---

### [P1] Faire du Guide la source de vérité (confiance)

**Problème** — Le Guide annonce le filtre biome « sans surcoût » (réel 50–300 🪙) ;
comptages et version incohérents.
**Preuve** — C6 ; `GET /roll/biomes` ; `empty-states/collection-empty.png`.
**Impact** — Confiance : dans un jeu fondé sur des probabilités affichées, une
règle fausse jette le doute sur toutes les autres.
**Recommandation** — Le Guide lit les coûts depuis l'API ; terminologie unifiée
(146 standards + 5 légendaires) ; une seule source de version ; ajouter les règles
manquantes (pity chiffré, échanges).
**Complexité** — Faible.
**Dépendances** — API existante.
**Critères d'acceptation** — Aucun écart Guide/app (revue croisée) ; le coût biome
du Guide vient du même endpoint que la roulette.

---

### [P1] Fondations transverses : couche API (401 + erreurs), stores (solde + TTL)

**Problème** — Erreurs techniques brutes, 401 sans issue (C3) ; navbar qui
re-fetch 4× par navigation (C4) ; solde optimiste divergent depuis 4+ sources (M7).
**Preuve** — `errors/*`, `api-log.json`, `navbar.js`, `home.js`.
**Impact** — Fondation dont dépend toute la refonte ; à poser en premier.
**Recommandation** — Couche `$fetch` typée + 401 centralisé + erreurs humanisées
(`api-integration-strategy.md`) ; store `wallet` unique réconcilié + stores à TTL
(`state-management.md`) ; `/auth/me` appelé une seule fois par session.
**Complexité** — Moyenne.
**Dépendances** — Frontend seul.
**Critères d'acceptation** — Aucun message technique brut ; tout 401 propose une
reconnexion sans perdre la route ; solde identique partout ; navigation interne =
zéro requête navbar.

---

### [P1] Aligner la friction sur le risque (fusion, roulette d'équipe)

**Problème** — La fusion détruit 10 cartes sans confirmation alors que la vente
d'une carte en a une ; la roulette d'équipe retire définitivement une carte en un
clic (rappel one-shot).
**Preuve** — C5, F3/F4 ; `team/team-desktop.png`.
**Impact** — Destruction irréversible par mauvais clic de la ressource centrale.
**Recommandation** — Confirmation de fusion (bilan) et de roulette d'équipe (pool
visible + rappel destructif), sur le modèle du pari légendaire ; pattern de
confirmation unique (`interaction-system.md`).
**Complexité** — Faible.
**Dépendances** — API existante.
**Critères d'acceptation** — Impossible de fusionner sans confirmation ; pool
éligible visible avant tout lancer d'équipe ; rappel de destruction à chaque
lancer.

---

Les recommandations **P2/P3** (onboarding J1, course au score, objectifs
calculés, timeline tournoi, cooldowns unifiés, end-game affiché, near-miss du
jackpot, contenu du week-end, accessibilité, mobile) sont détaillées dans les
rapports experts et les documents produit/design. Elles se construisent sur ces
fondations P1.

## 5. Classement des recommandations

| Priorité | Recommandation | Impact utilisateur | Impact produit | Difficulté | Risque | Dépendance backend |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Résultat visible + célébrations | Très fort | Très fort | Moyenne | Faible | Non |
| P1 | Doublon + pity estimé | Très fort | Fort (end-game) | Faible | Faible | Non (exact = souhait) |
| P1 | Hub « Aujourd'hui/Semaine » | Fort | Fort | Moyenne | Faible | Non |
| P1 | Guide = vérité | Moyen | Fort (confiance) | Faible | Faible | Non |
| P1 | Fondations API + stores | Moyen (indirect) | Fort | Moyenne | Faible | Non |
| P1 | Friction alignée au risque | Moyen-fort | Moyen | Faible | Faible | Non |
| P2 | Onboarding J1 | Fort (activation) | Fort | Moyenne | Faible | Non |
| P2 | Course au score + fil social | Fort (end-game) | Fort | Faible | Faible | Non |
| P2 | Timeline tournoi | Moyen-fort | Moyen | Faible | Faible | Non |
| P2 | Cooldowns unifiés | Moyen | Moyen | Faible | Faible | Non |
| P2 | Objectifs calculés | Moyen-fort | Fort | Moyenne | Faible | Non |
| P3 | End-game affiché | Moyen | Fort (rétention) | Moyenne | Faible | Non |
| P3 | Near-miss jackpot | Moyen | Moyen | Faible | Faible | Non |
| P3 | Accessibilité AA | Moyen | Moyen | Moyenne | Faible | Non |
| P3 | Contenu du week-end | Moyen | Moyen | Moyenne | Faible | Non |

## 6. Direction visuelle recommandée

**A · PHOSPHORE** (la console de poche émancipée) **en pilier**, augmentée de deux
greffes. Argumentaire (rapport création `docs/experts/04`, synthèse
`docs/design/visual-directions.md`) :

1. **Seule direction qui *résout* au lieu de *combattre*** les deux identités que
   le jeu possède déjà : les sprites **sont** du pixel, le son **est** une puce
   chiptune. Aujourd'hui les deux flottent sur un fond Material qui ne parle ni
   l'une ni l'autre langue. B doit tordre le son ; C ne règle pas le fond pixel.
2. **La plus buildable** : coût d'assets le plus bas (9 duotones biome quasi
   gratuits, ~40 icônes), compatible avec le budget JS/asset de l'architecture,
   dark-first sans effort, se pose intégralement sur les tokens du design system.
3. **La plus loin du cliché casino** (lueur d'écran, pas dorure/néon) ; C danse le
   plus près de l'interdit.
4. **Son seul risque sérieux — la proximité Nintendo — est maîtrisable par la
   discipline** (vert DMG interdit, coque Game Boy interdite, appareil réinventé en
   violet-nuit ; le pixel comme traitement, pas comme clone).

**Deux greffes** : la **voix de C** (bonimenteur) sur les moments de spectacle
(shiny, jackpot, tournoi — sert directement l'humour, force du produit) ; le
**cadrage catalogue de B** sur la collection/end-game (l'œuvre d'une vie — répond
au « end-game invisible »).

**Second choix assumé** si l'on privilégie l'âme au coût : **B · CARNET DE
TERRAIN** (le plus distinctif, la plus belle révélation shiny, le plus juste pour
ce qu'est le jeu à long terme — écarté en pilier uniquement pour son coût et sa
tension avec l'adrénaline/le dark-first).

**Jalon proposé avant tout code** : maquetter les **3 moments imposés** (shiny,
seuil de jauge, collection vide) dans la direction retenue, sur les écrans réels
`play`/`gyms`/`collection` — valider en une planche que « le jeu se voit enfin
comme il s'entend ».

## 7. Décisions à valider (bloquantes pour la suite)

1. **Direction visuelle** : PHOSPHORE + greffes (recommandé) / CARNET / GUINGUETTE
   / autre ?
2. **Périmètre v1** : commence-t-on par les 6 fondations P1, ou un sous-ensemble ?
3. **Compte de test d'audit** (`AuditNassim`) : à supprimer côté backend ?
4. **Iframe Spin** : confirmée conservée telle quelle (page hôte refaite, jeu
   interne inchangé) ?
5. **Questions backend** (non bloquantes v1, cf. `feature-opportunities.md`) :
   heure exacte des resets quotidiens, contraintes sur les usernames (sécurité),
   endpoint de pity exact, intérêt pour du temps réel hors chat.

## 8. Risques et inconnues restantes

| Risque / inconnue | Détail | Mitigation |
| --- | --- | --- |
| Comportement API non observé | 7 endpoints jamais déclenchés (combat arène, ligue, échange complet…) — reconstruits depuis le code | Fixtures réelles + tolérance aux champs inconnus + tests contre l'API réelle |
| Régression d'une règle fine | Pity, tickets, verrous, choix différés du multi-roll | Checklists de parité par écran (issues de `existing-features.md`) |
| Écart de « feel » | Une animation refaite peut être moins satisfaisante | Beta fermée de la communauté avant bascule |
| XSS par username (sécurité) | Pseudos non échappés au rendu actuel — la refonte Vue échappe par défaut | Contrainte « zéro `v-html` » + CSP + question backend sur les usernames |
| Charge du mainteneur backend | Un seul mainteneur | Tout le « frontend seul » d'abord ; souhaits backend regroupés en une liste |
| Heure des resets | Non confirmée (UTC vs Paris) | Fallback : afficher la date sans heure jusqu'à confirmation |
| Jeu Spin interne | Boîte noire (API propre non inventoriée) | À explorer avant la phase Spin de la refonte |

## 9. Prochaine étape

**Arrêt demandé par le cahier des charges** : ne pas commencer la refonte avant
validation. Une fois la direction visuelle et le périmètre v1 validés, l'ordre de
construction est prêt (`migration-plan.md`) : socle → couche API + stores
auth/wallet → design system + stratégie d'erreur → `/play` (roulette + hub) →
collection/équipe/arènes → reste des écrans → animations → tests responsive/a11y/
non-régression → beta → bascule.

---

## Index de la documentation d'audit

- **Audit** (`docs/audit/`) : application-map, existing-features,
  existing-user-flows, ui-inventory, api-inventory (+ types TS), states-inventory,
  frontend-issues, screenshots-index.
- **Produit** (`docs/product/`) : product-vision, gameplay-analysis,
  user-experience-principles, proposed-user-flows, feature-opportunities.
- **Design** (`docs/design/`) : visual-directions, design-system,
  interaction-system, animation-system, responsive-strategy,
  accessibility-guidelines.
- **Technique** (`docs/technical/`) : frontend-architecture,
  api-integration-strategy, state-management, testing-strategy, migration-plan.
- **Experts** (`docs/experts/`) : 01 produit · 02 UX · 03 UI · 04 création ·
  05 motion · 06 frontend Nuxt · 07 accessibilité · 08 responsive · 09 sécurité.
- **Décisions** (`docs/decisions/decision-log.md`).
- **Artefacts** : `artifacts/screenshots/` (178 captures + manifest),
  `artifacts/network/` (journaux API/WS redactés), `exploration/` (scripts
  Playwright).
