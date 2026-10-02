# Stratégie de gestion d'état (Pinia)

> Distillation du rapport `docs/experts/06-frontend-nuxt.md` §5. Principe : **pas
> de store global unique** ; des stores spécialisés par domaine, avec un cache à
> TTL pour tuer les 4 fetchs de navbar par navigation (C4) et un store `wallet`
> qui règle l'incohérence du solde (M7).

## Principes

1. **Un store par domaine métier** (14 stores), responsabilités étanches.
2. **Persistance ciblée** via `useLocalStorage` (VueUse) dans le state — clés
   `gacha_*` existantes réutilisées (migration douce), pas de plugin de
   persistance global.
3. **Convention de cache** : chaque store « lecture » garde `fetchedAt` et expose
   `ensureFresh(ttlMs)` (fetch **dédupliqué** si périmé, cf. `dedupe.ts`).
4. **Le serveur a toujours raison** sur le solde (réconciliation, pas d'optimisme
   divergent).
5. **`/auth/me` appelé une seule fois par session applicative** (effet de bord :
   crédite le bonus quotidien — appeler plusieurs fois serait un bug métier).

## Cartographie des stores

| Store | Rôle | Persisté | TTL / invalidation |
| --- | --- | --- | --- |
| `auth` | token, user, `rewardClaimed`, `pendingChoice`, `fetchMeOnce()`, `handleSessionExpired()` | token seul | `fetchMeOnce` 1×/session ; ré-armé au reset quotidien |
| `wallet` | **solde unique** `coins`, `reconcile()`, débit optimiste + rollback | non | écrasé par chaque `reconcile` (serveur > optimiste) |
| `collection` | catalogue annoté, `sell`, `merge`, getters `mergeables`/`byBiome`… | non | TTL 5 min + invalidation (roll `isNew`, merge, sell, team.roll, trade) |
| `inventory` | objets, tickets biome/type actifs, charme | non | TTL 5 min + invalidation (spin, événement, vente shiny, roll) |
| `team` | 6 membres, `roll`/`swap`/`remove`/`clear` | non | invalidation par mutation |
| `gym` | arènes, badges, détails, historique, entraînement | non | TTL 5 min + reset lundi 00:00 (via `quotas`) |
| `league` | statut, estimation, dernier run | non | TTL 5 min (navbar) + reset jeudi 12:00 |
| `tournament` | courant, analyse, liste, `register` | `seenTournamentIds` | **TTL 60 s** + `refreshOnFocus` + poll 30 s en fenêtre chaude jeudi |
| `slotMachine` | statut, gains récents, historique | non | invalidation post spin + reset minuit |
| `trades` | échanges, joueurs, éligibilité, `actionsRequired` (badge) | non | **TTL 60 s** + `refreshOnFocus` + poll 60 s si page visible |
| `chat` | messages (≤200 + live), WS, `lastReadId` | `lastReadId` | temps réel (pas de TTL) ; refetch historique à chaque (re)connexion |
| `notifications` | items, non-lus | non | **TTL 60 s** + `refreshOnFocus` + poll 60 s |
| `quotas` | **agrégateur** (aucun fetch) : bonus/entraînement/jackpot/arène/ligue/trade/tournoi, chacun `{available, nextResetAt, label}` | non | recalcul continu via `useCountdown` ; `onResetExpired` invalide le store source |
| `preferences` | mode révélation, biome, vitesse replay, volume, muted, reduced-motion, intros vues, bannières masquées | **tout** (clés existantes) | — |

## Points d'implémentation critiques

### `wallet` — la fin du solde incohérent (M7)

Une seule règle : *toute réponse API portant un solde absolu appelle `reconcile`*.

```ts
// Sources de solde absolu : auth/me (user.coins), training/status,
// slot-machine/status, POST sell (newCoins), POST spin (newCoins)…
reconcile(coins, source) {
  this.pendingDebits = []            // les débits optimistes en vol sont écrasés
  this.coins = coins
  this.lastSync = { source, at: now }
}
// Débit optimiste (roll 10🪙, retrait 10🪙, inscription 20🪙) : affiché
// immédiatement, confirmé par la réponse (rollCost) ou rollback sur erreur.
```

Conséquence : le solde est **identique sur toutes les pages** et se resynchronise
après chaque réponse serveur qui le contient (l'API n'a pas d'endpoint de solde
seul — cf. `api-inventory.md` §7).

### `auth.fetchMeOnce()` — l'effet de bord maîtrisé

`/auth/me` **crédite le bonus quotidien** côté serveur. La promesse est mémoïsée
(module scope) : un seul GET par session applicative. `rewardClaimed === false`
⇒ toast « Bonus quotidien +100 🪙 (+10/badge) » (résout le bonus silencieux) ;
`pendingChoice` ⇒ rouvre la modale de choix de carte au montage de `/play`. Le
store `quotas` ré-arme la promesse au passage de minuit (Paris).

Appelé par un **plugin d'app** après restauration du token, **jamais** par le
middleware ni par les pages.

### Données navbar — la fin des 4 fetchs par navigation (C4)

`AppNavbar` **lit** les stores `tournament`/`league`/`trades`/`notifications` ;
chacun fait `ensureFresh(TTL)` monté **une fois** au layout, puis TTL +
`refreshOnFocus`. Une navigation interne ne déclenche **zéro** requête (vs
4×/navigation, 64 appels à `tournament/current` observés à l'audit).

## Dépendances inter-stores (graphe)

```text
auth ──► wallet (init via user.coins)
wallet ◄── collection.sell, team.remove, gym.train, slot.spin, league.claim,
           tournament.register  (toutes réconcilient le solde)
collection ◄──► inventory   (vente shiny → charme ; roll → ticket consommé)
team ──► collection          (roll d'équipe retire une carte)
gym ──► team, wallet         (combat)
league ──► gym (badges), collection (capture), wallet
quotas ──► lit TOUS les stores de jeu (agrégateur, lecture seule)
preferences ──► autonome (aucune dépendance)
```

## Ce que ça permet (par rapport à l'existant)

- Solde cohérent partout (résout M7).
- Un seul appel `/auth/me` par session (effet de bord maîtrisé).
- Navigation sans re-fetch (résout C4).
- Un hub « Aujourd'hui / Cette semaine » alimenté par `quotas` sans requête
  supplémentaire (les données sont déjà dans les stores).
- États divergents inter-onglets réduits (réconciliation systématique + polling
  au `focus`).
