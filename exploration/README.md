# Exploration Playwright — PokeRoulette (production)

Scripts d'audit de l'application en production (`POKEROULETTE_BASE_URL`), utilisés
pour produire les captures de `artifacts/screenshots/` et les journaux réseau de
`artifacts/network/`.

## Prérequis

1. **Identifiants** — jamais commités. Créer un fichier d'environnement hors du
   repo (ex. `~/.pokeroulette.env`) :

   ```text
   POKEROULETTE_BASE_URL=https://…
   POKEROULETTE_EMAIL=…
   POKEROULETTE_PASSWORD=…
   # compte de test jetable pour l'onboarding (alias +audit du propriétaire)
   POKEROULETTE_TEST_USERNAME=…
   POKEROULETTE_TEST_EMAIL=…
   POKEROULETTE_TEST_PASSWORD=…
   ```

2. **Pont TLS** (spécifique à l'environnement d'exécution distant Claude Code) —
   le proxy d'egress de l'environnement reset le handshake TLS de Chromium ;
   `tls-bridge.mjs` termine le TLS localement et ré-établit la connexion
   upstream avec la pile Node en vérifiant le CA du proxy :

   ```bash
   node tls-bridge.mjs &   # écoute sur 127.0.0.1:4400
   ```

   Sur un poste de développement normal (sans proxy interceptant), supprimer
   l'option `proxy` et `--ignore-certificate-errors` des scripts.

## Scripts

| Script | Rôle |
| --- | --- |
| `explore.mjs` | Exploration complète du compte principal : auth, tour statique de 15 routes × 5 résolutions, interactions (roulette, filtres, modales, jackpot, entraînement, tournoi, replays…), états d'erreur/chargement/edge cases. Phases exécutables individuellement : `node --env-file=… explore.mjs tour home edge` |
| `onboarding.mjs` | Parcours « nouveau joueur » sur le compte de test : inscription, modales d'introduction, états vides/verrouillés, animation complète de la roulette, jackpot quotidien. |
| `tls-bridge.mjs` | Pont TLS local décrit ci-dessus. |

## Règles de conduite appliquées

- Interactions strictement normales (aucun contournement, aucune triche).
- Aucune action destructive sur le compte principal : pas de roulette d'équipe
  (retire une carte de la collection), pas de vente, pas de retrait d'équipe,
  pas de fusion.
- Aucune action à quota hebdomadaire : pas de combat d'arène, pas de défi de
  ligue, pas d'inscription au tournoi.
- Aucune trace sociale : pas de message de chat, pas de création d'échange,
  pas de suggestion, pas de vote.
- Les tokens/JWT et identifiants sont redactés des journaux réseau.
- Le compte de test (`+audit`) n'existe que pour capturer l'onboarding et les
  animations ; ses seules actions sont des tirages et son spin quotidien.

## Sorties

- `artifacts/screenshots/<catégorie>/*.png` + `manifest.json` (route, résolution,
  état, action de chaque capture).
- `artifacts/network/api-log.json` — 275 appels API observés (redactés).
- `artifacts/network/websocket-log.json` — handshake et frames du chat WS.
- `artifacts/network/api-log-onboarding.json` — appels du parcours nouveau joueur.
