# Inventaire API — PokeRoulette

> Sources : `src/api/client.js` de production (surface complète), 275 appels
> observés via Playwright (`artifacts/network/api-log*.json`), frames WebSocket
> (`websocket-log.json`). Les types TypeScript ci-dessous décrivent **les
> réponses réellement observées** ; les champs non observés sont marqués
> `// non observé` et devront être confirmés.

## Conventions générales

- Base : même origine, préfixe **`/api`**. Contenu `application/json`.
- **Auth** : `Authorization: Bearer <JWT>` ; token stocké en
  `localStorage.gacha_token`, **pas de refresh token**, pas d'expiration gérée
  côté client (401 → message d'erreur, gestion inégale selon les pages).
- Le JWT contient `{ id }` (décodé côté client pour connaître son user id —
  utilisé par trades et chat).
- **Erreurs** : `{ "error": string }` avec status 4xx/5xx. Messages en français,
  directement affichés à l'utilisateur. 401 observé : `Token invalide ou expiré`.
- Pas de pagination générique observée (listes bornées côté serveur : chat 200
  messages, leaderboard top 10, feeds ~20).
- Pas de versionnage d'API, pas d'en-têtes de cache observés sur les données.

## Types de base observés

```ts
type UUID = string;          // ex. "3ebe7408-787b-4ad5-8ab4-be58dc5f1491"
type ISODate = string;       // ex. "2026-07-20T15:48:14.504Z"

type Rarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire' | 'Alt'; // 'Alt' = shiny dans /collection
type Biome = 'Lac' | 'Mer' | 'Forêt' | 'Montagnes' | 'Ville' | 'Plaines'
           | 'Désert' | 'Cave' | 'Tundra' | 'Légendaire';
type PokeType = 'Combat' | 'Dragon' | 'Eau' | 'Feu' | 'Fée' | 'Glace' | 'Insecte'
              | 'Normal' | 'Plante' | 'Poison' | 'Psy' | 'Roche' | 'Sol'
              | 'Spectre' | 'Vol' | 'Électrik';

interface ApiError { error: string }

interface User {
  id: UUID;
  username: string;
  email: string;
  coins: number;
  avatar_url: string | null;
  avatar_is_alt: boolean;
  charme_chroma_rolls: number;   // tirages boostés restants
}

interface Card {
  id: UUID;
  num: number;                   // n° Pokédex
  name: string;                  // "Bulbizarre" / "Bulbizarre ☆" (shiny)
  image_url: string;             // "/images/bulbasaur.webp"
  rarity: Rarity;
  level: 1 | 2 | 3;              // niveau d'évolution
  parent_card_id: UUID;          // id de la carte de base de la lignée
  is_alt: boolean;               // version shiny
  biome: Biome;
  type: PokeType;
  base_weight?: number;          // poids de tirage (présent sur /roll)
  biome_id?: UUID;
  standard_id?: UUID | null;     // pour les alts : id de la version standard
  created_at?: ISODate;
}

interface OwnedCard extends Card {
  quantity: number | null;       // null (endpoint /collection) ou 0 si non possédée (/collection/all)
  obtained_at: ISODate | null;
  owned: boolean;
}

interface BattleRound {
  round: number;
  player_pokemon: { name: string; image_url?: string };
  champion_pokemon: { name: string; image_url?: string };
  win_probability: number;       // % (seuil de la jauge)
  player_wins_duel: boolean;
  roll_value?: number;           // valeur tirée, si fournie — anime la jauge exactement
}

interface TeamMember {
  team_entry_id: UUID;
  position: number;
  id: UUID; name: string; type: PokeType; rarity: Rarity; image_url: string;
  type_image_url?: string;
}
```

## Endpoints REST

### Auth — `/api/auth`

| Méthode & chemin | Corps requête | Réponse (observée) |
| --- | --- | --- |
| `POST /auth/register` | `{ username, email, password }` | `201 { user: User & { created_at, token_version }, token }` — **100 🪙 offerts à la création** |
| `POST /auth/login` | `{ email, password }` | `200 { user: User, token }` ; `401 { error }` si identifiants invalides |
| `GET /auth/me` | — | `200 { user: User, rewardClaimed: boolean, pendingChoice: PendingChoice \| null }` — **déclenche le bonus quotidien** (100 + 10/badge) ; `rewardClaimed` indique s'il était déjà pris ; `pendingChoice` = choix de carte non résolu `{ id, leftCard: Card, rightCard: Card }` |
| `POST /auth/forgot-password` | `{ email }` | `200` (message générique) |
| `POST /auth/reset-password` | `{ token, password }` | `200` |
| `GET /auth/avatar-cards` | — | `200 { cards: Card[] }` (cartes possédées éligibles) |
| `PUT /auth/avatar` | `{ cardId }` | `200 { avatar_url, avatar_is_alt }` |

### Roll — `/api/roll`

| Méthode & chemin | Requête | Réponse |
| --- | --- | --- |
| `GET /roll/biomes` | — | `{ biomes: { biome: Biome; card_count: number; biome_weight: number; cost: number; owned_count: number }[] }` — coûts observés : Ville 50, Montagnes 60, Forêt 60, Plaines 70, Mer 80, Lac 135, Cave 240, Désert 240, Tundra 300 ⚠️ (le Guide dit « sans surcoût ») |
| `POST /roll` | `{ biome? }` | `{ card: RollResult }` — débite le coût, applique pity shiny/charme, peut renvoyer un **événement spécial** |
| `GET /roll/preview-batch?count&biome&type` | — | `{ cards: Card[] }` — cartes plausibles pour remplir la bande (poids réels, ne débite rien) |
| `GET /roll/preview` | — | 1 carte (non utilisé par le front actuel en pratique) |
| `GET /roll/combo-check?biome&type` | — | `{ available: boolean }` — un ticket filtre-t-il vers ≥1 Pokémon ? |

```ts
type RollResult =
  | (Card & { isNew: boolean; owned: boolean; rollCost: number })            // tirage normal
  | { isSpecialEvent: true; eventType: 'coins'; amount: number; rollCost: number }
  | { isSpecialEvent: true; eventType: 'charme_chroma'; rollCost: number }
  | { isSpecialEvent: true; eventType: 'card_choice'; choiceId: UUID;
      leftCard: Card & { owned: boolean }; rightCard: Card & { owned: boolean }; rollCost: number };
```

### Collection & fusion

| Méthode & chemin | Requête | Réponse |
| --- | --- | --- |
| `GET /collection` | — | `{ cards: OwnedCard[] }` — catalogue complet annoté (`owned`, `quantity`) |
| `GET /collection/all` | — | idem avec `quantity: 0` pour les non possédées (catalogue de référence) |
| `POST /collection/sell` | `{ cardId }` | `{ sellPrice: number; newCoins: number; charmeObtained?: boolean }` (shiny → charme) |
| `POST /merge` | `{ parentCardId, currentLevel }` | `{ card: Card }` — consomme 10 exemplaires, donne l'évolution |

### Team — `/api/team`

| Méthode & chemin | Requête | Réponse |
| --- | --- | --- |
| `GET /team` | — | `TeamMember[]` (max 6, ordonnés) |
| `POST /team/roll` | — | `TeamMember` — ⚠️ retire la carte de la collection |
| `GET /team/preview-batch?count` | — | `{ cards: Card[] }` |
| `POST /team/swap` | `{ idA, idB }` | `200` |
| `DELETE /team/:teamEntryId` | — | `200` — coûte 10 🪙 |
| `DELETE /team` | — | `200` — vide l'équipe (gratuit) |

### Gym & training

| Méthode & chemin | Réponse |
| --- | --- |
| `GET /gym` | `Gym[]` : `{ id, order_num: 1-8, name, type, badge_name, badge_image_url, badge_obtained_at, last_attempt_this_week, has_badge, can_attempt }` |
| `GET /gym/:id` | `Gym & { type_image_url, type_color, champion_team: ChampionPokemon[], recommended_types?: { name, color, image_url }[] }` |
| `GET /gym/badges` | `{ gym_id, order_num, badge_name, badge_image_url, obtained_at }[]` |
| `GET /gym/:id/estimate` | `{ estimated_win_probability: number; training_bonus?: number; matchups: { player, champion, probability }[] }` ; `400 { error: "Votre équipe est vide" }` |
| `POST /gym/:id/battle` | `{ won: boolean; badge_name?: string; log: BattleRound[]; player_team: Card[]; champion_team: Card[] }` — 1/semaine |
| `GET /gym/history` | `{ gym_name, order_num, badge_name?, badge_image_url?, attempted_at, won, battle_log: { player_team } }[]` |
| `GET /training/status` | `{ bonus: number; canFightToday: boolean; coins: number }` |
| `POST /training/battle` | `{ won, coins_gained?, new_bonus, log: BattleRound[], player_team, trainer_team }` — 1/jour |

### League — `/api/league`

| Méthode & chemin | Réponse |
| --- | --- |
| `GET /league/status` | `{ eligible: boolean; cycleStart: ISODate \| null; alreadyAttempted: boolean; lastRun: LeagueRun \| null; legendaries: { id, name, image_url }[] }` |
| `GET /league/estimate` | `{ overall_win_probability; stages: { opponent_name, opponent_type: 'player'\|'npc', estimated_win_probability }[]; typeRecommendations: { toPrivilege: {type}[]; toAvoid: {type}[] } }` |
| `POST /league/challenge` | `LeagueRun` : `{ runId, won, battleLog: { opponent_name, opponent_type, won, log: BattleRound[] }[] }` — 1/semaine |
| `POST /league/:runId/reward/coins` | `200` (+500 🪙) |
| `GET /league/:runId/legendary-estimate/:cardId` | `{ capture_probability: number; challengers: string[] }` |
| `POST /league/:runId/reward/legendary` | `{ won: boolean; card: Card; log: BattleRound[] }` |

### Tournament — `/api/tournament`

| Méthode & chemin | Réponse |
| --- | --- |
| `GET /tournament/current` | `{ tournament: Tournament \| null }` |
| `GET /tournament/:id` | `{ tournament: Tournament }` |
| `GET /tournament/list` | `{ tournaments: TournamentSummary[] }` |
| `POST /tournament/register` | `200` — débite 20 🪙, fenêtre lundi→mardi 12:00 |
| `GET /tournament/my-analysis` | `{ myTeam: Card[]; myTeamIsLocked: boolean; teamsAreLocked: boolean; hasOpponents: boolean; analysis: { strongPokemon: Card[]; weakPokemon: Card[] }; matchups: { username, avatar_url, winProbability, oppWinProbability, team }[]; typeRecommendations }` |

```ts
interface Tournament {
  id: UUID;
  tournament_date: ISODate;                // le jeudi du tournoi
  status: 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
  prize_pool: number;                      // 40 × participants (observé : 640 pour 16)
  created_at: ISODate; completed_at: ISODate | null;
  participants: { user_id: UUID; username: string; avatar_url: string | null; avatar_is_alt: boolean | null }[];
  is_registered?: boolean;
  teamsAreLocked?: boolean;
  snapshots?: Record<UUID, Card[]>;        // équipes figées par joueur
  matches?: TournamentMatch[];
  results?: { placement: number; username: string; prize: number; avatar_url; avatar_is_alt }[];
}
interface TournamentMatch {
  round: number;                           // 0 = match pour la 3e place, max = finale
  player1_id: UUID | null; player1_name: string | null;
  player2_id: UUID | null; player2_name: string | null;
  winner_id: UUID | null; is_bye: boolean;
  battle_log: BattleRound[] | null;
}
```

### Slot machine — `/api/slot-machine`

| Méthode & chemin | Réponse |
| --- | --- |
| `GET /slot-machine/status` | `{ canSpin: boolean; lastSpin: ISODate \| null; coins: number }` |
| `POST /slot-machine/spin` | corps `{ lines: 1\|2\|3 }` → `{ cells: Record<'0_top'…'2_bot', SlotSymbol>; lineResults: LineResult[]; cost: number; newCoins: number }` |
| `GET /slot-machine/recent-wins` | `{ wins: { username; prizes: Prize[]; spun_at }[] }` |
| `GET /slot-machine/my-history` | `{ history: { prizes: Prize[]; cost: number; spun_at }[] }` |

```ts
type SlotSymbol = 'legendary' | 'charme' | 'biome_ticket' | 'type_ticket' | 'coins';
type LineResult =
  | { line: LineName; type: 'nothing' }
  | { line: LineName; type: 'coins'; amount: number }
  | { line: LineName; type: 'charme' }
  | { line: LineName; type: 'biome_ticket'; slug: string; biome: Biome }
  | { line: LineName; type: 'type_ticket'; slug: string; typeName: PokeType }
  | { line: LineName; type: 'legendary'; card: Card };
type LineName = 'L1' | 'L2' | 'L3' | 'D1' | 'D2';
```

### Inventory — `/api/inventory`

| Méthode & chemin | Requête | Réponse |
| --- | --- | --- |
| `GET /inventory` | — | `{ items: { item_type: string; quantity: number }[]; activeBiomeTicket: string \| null; activeTypeTicket: string \| null }` — `item_type` ex. `charme_chroma`, `tirage_biome_foret`, `tirage_type_eau` ; tickets actifs en slug |
| `POST /inventory/activate-charme` | — | `{ rolls: number }` (event `charmeActivated` côté front) |
| `POST /inventory/activate-biome-ticket` | `{ biomeSlug }` | `200` |
| `POST /inventory/activate-type-ticket` | `{ typeSlug }` | `200` |
| `POST /inventory/deactivate-biome-ticket` / `-type-ticket` | — | `200` (retour à l'inventaire) |

### Autres

| Méthode & chemin | Réponse |
| --- | --- |
| `GET /leaderboard` | `{ top10: LeaderboardRow[]; playerContext: { above; current; below } \| null }` — `LeaderboardRow = { username, avatar_url, avatar_is_alt, avatar_rarity, crowned, tournament_medal_placement: 1\|2\|3\|null, standard_count, legendary_count, shiny_count, score, badges: {image_url,name}[], rank }` |
| `GET /leaderboard/cheaters` | `{ cheaters: LeaderboardRow[] }` |
| `GET /leaderboard/recent-shinies` | `{ shinies: { username, name, image_url, is_alt, rarity, rolled_at, is_duplicate, source: 'roll'\|… }[] }` |
| `GET /stats` | `{ global: { total_rolls, shiny_obtained, shiny_rate, legendary_rate, … }; gyms: { name, badge_holders, … }[]; spin: …; players: …[]; pool: …; anecdotes: … }` (gros payload agrégé, une seule requête) |
| `GET /event` (confirm) | `POST /event/card-choice` corps `{ choiceId, cardId }` → `{ card: Card & { isNew } }` |
| `GET /notifications` | `{ notifications: { id, message, link: string \| null, read, created_at }[]; unreadCount }` |
| `POST /notifications/read-all` | `200` |
| `GET /suggestions` | `{ suggestions: { id, title?, text, status, author?, sugg_up, sugg_down, my_suggestion_vote, admin_note, note_voting_enabled, note_up, note_down, my_note_vote, is_official? }[]; isAdmin }` (forme partiellement observée) |
| `POST /suggestions` / `POST /suggestions/roadmap` / `PATCH /suggestions/:id` / `POST /suggestions/:id/vote` | cf. client.js — vote `{ target: 'suggestion'\|'note', value: 1\|-1 }` |
| `GET /chat/history` | `{ messages: ChatMessage[]; isAdmin: boolean }` — `ChatMessage = { id, user_id, message, created_at, username }` (200 max) |
| `GET /chat/banned` / `POST /chat/ban/:userId` (`{reason}`) / `POST /chat/unban/:userId` | modération admin |
| `GET /trades/eligibility` | `{ uniqueStandardCount, minRequired: 120, tradedThisWeek, eligible }` |
| `GET /trades/players` | `{ id, username, avatar_url, avatar_is_alt, cooldown_until: ISODate \| null }[]` ; `400` si non éligible |
| `GET /trades/players/:id/cards?rarity` | `{ id, name, image_url, rarity, quantity, viewer_owns }[]` |
| `GET /trades` | `Trade[]` : `{ id, status: 'pending_target'\|'pending_initiator'\|'completed'\|'declined'\|'cancelled'\|'expired', initiator_id, initiator_username, target_id, target_username, requested_card_name, requested_card_rarity, offered_card_name?, offered_card_rarity?, created_at, completed_at? }` |
| `POST /trades` (`{targetId, requestedCardId}`) / `POST /trades/:id/respond` (`{accept, offeredCardId}`) / `POST /trades/:id/confirm` (`{accept}`) / `POST /trades/:id/cancel` | flux d'échange |
| `POST /spin/start` | `{ starters: { num, name, image_url, type }[] , … }` — **utilisé par l'app iframe Spin** (hors client.js !) |
| `GET /spin/status` | `{ hasStarters, rewardedThisWeek, legendaryGrantedThisWeek, legendaryTransfersThisWeek, legendaryTransferRate }` |

## WebSocket — `wss://<host>/api/ws/chat`

```text
→ {"type":"auth","token":"<JWT>"}          (1er message après ouverture)
← {"type":"authenticated"}
← {"type":"message","id":…,"user_id":…,"message":…,"created_at":…,"username":…}
← {"type":"purge","user_id":…}             (messages d'un banni à retirer)
Fermetures définitives : 4001 (session expirée), 4003 (banni) — pas de retry.
Envoi : {"text":"…"} (≤300 caractères).
```

Un seul socket partagé entre la page `#chat` et le widget ; reconnexion 3 s ;
après reconnexion, re-fetch de l'historique et rejeu des messages manqués.

## Dépendances entre appels (par page)

| Page | Appels au chargement |
| --- | --- |
| Toute navigation | `renderNavbar()` → `tournament/current` + `league/status` + `trades` + `notifications` (cache 20 s) — ⚠️ ×4 requêtes à chaque changement de hash |
| `#home` | `auth/me` → montage roulette ; `roll/biomes` (async) ; `inventory` (statut tickets) ; par spin : `roll` + `roll/preview-batch` en parallèle ; si ticket : `roll/combo-check` |
| `#collection` | `collection` + `collection/all` + `inventory` en parallèle |
| `#team` | `team` + `gym/badges` + `gym` + `inventory` en parallèle |
| `#gyms` | `gym` + `gym/badges` → `gym/:id` → (`estimate` + `history` + `training/status` en parallèle, non bloquants) |
| `#tournament` | `tournament/current` → si inscrit `tournament/my-analysis` → `auth/me` (pour l'id !) |
| `#slot-machine` | `status` → `recent-wins` + `my-history` |
| `#trades` | `trades` + `trades/players` + `trades/eligibility` en parallèle |
| `#chat` | `chat/history` + WS |

## Limitations & incohérences observées

1. **Pas de rafraîchissement de session** : token unique, 401 silencieux ou
   affiché brut selon la page ; certaines pages restent sur « erreur » sans
   proposer de se reconnecter.
2. **Coûts biome** : le Guide (`#rules`) affiche « sans surcoût », l'API renvoie
   50–300 🪙 selon le biome. Le front affiche le coût réel — c'est le Guide qui ment.
3. **`GET /auth/me` a un effet de bord** (crédit du bonus quotidien) — un GET
   non idempotent, à connaître pour le nouveau front (à appeler UNE fois).
4. **`/api/spin/start` absent de client.js** : l'app iframe Spin a sa propre
   surface API non inventoriée ici (hors périmètre immédiat, mais la refonte de
   la page hôte doit conserver l'iframe et son protocole `postMessage`).
5. **Réponses non uniformes** : certaines routes renvoient un tableau nu
   (`/gym`, `/team`, `/trades`), d'autres un objet enveloppé (`{cards}`,
   `{tournament}`) ; `rarity` d'une carte shiny vaut `'Alt'` dans `/collection`
   mais `is_alt=true` + rareté réelle ailleurs (ex. avatar `avatar_rarity`).
6. **Pity shiny non exposé** : la chance courante par carte (1/500 × exemplaires)
   n'est pas renvoyée par l'API — le front ne peut pas l'afficher par carte.
7. **Pas d'endpoint de solde seul** : le solde arrive via `auth/me`,
   `training/status`, `slot-machine/status`, réponses de vente/spin… (sources
   multiples à réconcilier dans un store).
8. **Événement spécial impossible avec filtre biome/ticket** (règle métier,
   confirmée par le code : `Uniquement sur les tirages standards`).
9. **`/api/tournament/current` appelé 64× pendant l'exploration** (navbar sans
   cache) — attention à reproduire un pattern de cache dans le nouveau front.

## Ce que le nouveau frontend peut améliorer seul vs backend

| Sujet | Frontend seul | Confirmé backend requis |
| --- | --- | --- |
| Cache/mutualisation des appels navbar (tournoi, ligue, trades, notifs) | ✅ store + TTL | — |
| Affichage du solde cohérent partout | ✅ store unique | — |
| Skeletons, retries, gestion 401 centralisée (redirect + toast) | ✅ | — |
| Affichage du pity shiny par carte | ❌ | ✅ nouvel endpoint ou champ |
| Notifications temps réel (hors chat) | ❌ (polling possible) | ✅ WS/SSE dédié |
| Mise à jour temps réel des trades/tournoi | ❌ (polling) | ✅ |
| Uniformisation des enveloppes de réponse | contournable (couche d'adaptation) | idéalement backend |
| Correction du Guide (coûts biome) | ✅ contenu du front | — |
| Historique complet des tirages du joueur | ❌ non exposé | ✅ |
