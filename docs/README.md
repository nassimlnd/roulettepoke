# Documentation — refonte frontend de PokeRoulette

Audit complet réalisé avant la refonte (Nuxt 4.5 + Vue 3 + TypeScript + Nuxt UI +
Pinia). **L'API et les règles métier ne changent pas.** Rien n'a encore été codé :
cette documentation est à valider avant l'implémentation.

## 👉 Commencer ici

**[RECOMMANDATION-FINALE.md](./RECOMMANDATION-FINALE.md)** — synthèse pour
décision : diagnostic, recommandations classées, direction visuelle recommandée,
décisions à valider, risques.

## Plan de la documentation

### `audit/` — l'existant, factuel
| Fichier | Contenu |
| --- | --- |
| [application-map](./audit/application-map.md) | Cartographie : 19 routes, architecture actuelle |
| [existing-features](./audit/existing-features.md) | Inventaire fonctionnel complet (toutes les règles) |
| [existing-user-flows](./audit/existing-user-flows.md) | Les 11 parcours utilisateur observés |
| [ui-inventory](./audit/ui-inventory.md) | Composants, tokens de fait, animations, sons |
| [api-inventory](./audit/api-inventory.md) | Endpoints + **types TypeScript observés** + WebSocket |
| [states-inventory](./audit/states-inventory.md) | Tous les états (session, chargement, vide, succès, erreur) |
| [frontend-issues](./audit/frontend-issues.md) | Problèmes classés par criticité (C1–C6, M1–M8, m1–m12) |
| [screenshots-index](./audit/screenshots-index.md) | Les 178 captures indexées (route/résolution/état) |

### `product/` — la vision
product-vision · gameplay-analysis · **user-experience-principles** (les règles
UX opposables) · proposed-user-flows · feature-opportunities.

### `design/` — la forme
**visual-directions** (les 3 directions) · design-system · interaction-system ·
animation-system · responsive-strategy · accessibility-guidelines.

### `technical/` — l'ingénierie
frontend-architecture · api-integration-strategy · state-management ·
testing-strategy · migration-plan.

### `experts/` — les 9 audits détaillés
01 produit/game design · 02 UX jeux web · 03 UI designer · 04 création/identité ·
05 motion · 06 frontend Nuxt · 07 accessibilité · 08 responsive/mobile ·
09 sécurité frontend.

### `decisions/`
[decision-log](./decisions/decision-log.md) — journal des décisions (D1–D12).

## Artefacts (hors `docs/`)
- `artifacts/screenshots/` — 178 captures (5 résolutions, 2 profils de compte) + `manifest.json`.
- `artifacts/network/` — 275 appels API + frames WebSocket (tokens/emails redactés).
- `exploration/` — scripts Playwright d'exploration (voir son `README.md`).
