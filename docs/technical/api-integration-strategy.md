# Stratégie d'intégration API

> Distillation du rapport `docs/experts/06-frontend-nuxt.md` §6 + de
> `docs/audit/api-inventory.md`. Objectif : une couche d'accès **centralisée,
> typée, résiliente**, seul point de contact avec l'API existante — aucun
> composant ne construit de requête HTTP.

## Architecture en 3 couches

```text
Composant ──► Store/Composable ──► Repository ──► $api ($fetch) ──► /api
                                      │
                              types wire (api.ts) → types domain (domain.ts)
```

1. **`$api`** — instance `$fetch` unique (plugin Nuxt) : baseURL, Bearer,
   timeout, retry idempotent, 401 centralisé.
2. **Repositories** — un par domaine, seul endroit qui connaît les formes
   « wire » de l'API et les normalise en types `domain`.
3. **Types** — `api.ts` (repris de l'inventaire API), `domain.ts` (consommés par
   le reste de l'app).

## Le plugin `$api`

```ts
const api = $fetch.create({
  baseURL: '/api',
  timeout: 15_000,
  retry: 1,
  retryStatusCodes: [408, 425, 429, 502, 503, 504],   // idempotent only
  retryDelay: 400,
  onRequest({ options }) {
    const token = useAuthStore().token
    if (token) options.headers.set('Authorization', `Bearer ${token}`)
  },
  onResponseError({ response }) {
    if (response?.status === 401) useAuthStore().handleSessionExpired()
  }
})
```

Points clés :

- **Bearer injecté** depuis le store `auth` (jamais de token en dur).
- **Retry uniquement sur les codes transitoires idempotents** — ofetch ne
  retente jamais POST/PUT/PATCH/DELETE ; aucun retry sur un 500 métier ni sur un
  roll/combat (non idempotents).
- **Timeout 15 s** ⇒ plus de « Chargement… » infini.

## 401 centralisé (résout C3)

`handleSessionExpired()` est **idempotent** (un seul déclenchement même si
4 requêtes échouent en rafale) :

1. purge le token et les stores ;
2. toast « Session expirée — reconnectez-vous » ;
3. `navigateTo('/login?next=' + route.fullPath)` — retour à la page d'origine
   après reconnexion.

Le WS chat fermé en code **4001** emprunte exactement le même chemin.

## Erreurs humanisées (`utils/errors.ts`)

```ts
export function humanizeError(err: unknown): string {
  if (err instanceof FetchError) {
    if (!err.response) return 'Connexion impossible. Vérifiez votre réseau puis réessayez.'
    const apiMsg = (err.data as ApiError | undefined)?.error
    if (apiMsg) return apiMsg                    // messages FR du backend, conçus pour l'UI
    if (err.response.status >= 500) return 'Le serveur a un souci. Réessayez dans un instant.'
  }
  return 'Une erreur inattendue est survenue.'   // plus jamais de « TypeError: Failed to fetch »
}
```

Les messages d'erreur métier de l'API (en français, ex. « Votre équipe est
vide », « Pas assez de coins ») sont déjà conçus pour l'affichage : on les
réutilise. Seules les erreurs techniques sont remplacées.

## Annulation & déduplication

- **Annulation** : les fetchs de **page** passent un `AbortSignal` lié au cycle
  de vie (`onScopeDispose`) — quitter une page annule ses lectures en cours. Les
  **mutations** n'en reçoivent jamais (on n'annule pas un roll parti).
- **Déduplication** (`utils/dedupe.ts`) : map module-scope `clé → promesse en
  vol`, utilisée par les `ensureFresh` des stores — deux composants qui montent
  simultanément ⇒ une seule requête.

## Repositories — normaliser les réponses non uniformes (résout M6)

L'API n'est pas homogène (`api-inventory.md` §Limitations 5) : `/gym`, `/team`,
`/trades` renvoient un **tableau nu**, d'autres une **enveloppe** (`{cards}`,
`{tournament}`) ; la rareté d'un shiny vaut `'Alt'` dans `/collection` mais
`is_alt + rareté réelle` ailleurs. **Les repositories absorbent ces différences
une fois pour toutes.**

```ts
// types/domain.ts — consommé par stores/composants
export interface DomainCard {
  id: UUID; num: number; name: string; imageUrl: string
  rarity: Exclude<Rarity, 'Alt'>   // TOUJOURS la rareté réelle
  isShiny: boolean                 // 'Alt' / is_alt / suffixe ☆ réconciliés ici
  level: 1|2|3; biome: Biome; type: PokeType
  parentCardId: UUID; standardId: UUID | null
}

// repositories/team.ts — tableau nu absorbé ici, une fois
export const teamRepo = {
  list: () => useApi()<TeamMember[]>('/team'),
  roll: () => useApi()<TeamMember>('/team/roll', { method: 'POST' }),
}

// repositories/collection.ts — enveloppe + normalisation 'Alt'
export const collectionRepo = {
  async all(): Promise<DomainOwnedCard[]> {
    const { cards } = await useApi()<{ cards: OwnedCard[] }>('/collection/all')
    return cards.map(normalizeOwnedCard)   // 'Alt' → isShiny + rareté standard
  },
}
```

Un repository par domaine (`auth`, `roll`, `collection`, `team`, `gym`,
`training`, `league`, `tournament`, `slot`, `inventory`, `trades`, `chat`,
`social`, `stats`). Si le backend uniformise un jour ses enveloppes, **seuls les
repositories changent** — le reste de l'app est isolé.

## Temps réel & quasi-temps réel

- **Chat (WebSocket)** : singleton porté dans le store `chat`, comportements
  préservés à l'identique (auth 1er message, reconnexion 3 s, 4001/4003
  définitifs, resync historique + dédup par id, purge par `user_id`, limite
  300 caractères).
- **Trades / tournoi / notifications** : pas de WS côté API ⇒ **polling léger
  conditionnel** (`usePolling`) : 60 s onglet visible + revalidation au focus ;
  30 s sur la page tournoi en fenêtre chaude (jeudi 11:55–12:30 Paris). Coût
  réseau **très inférieur** à l'existant (4 req/navigation) tout en étant plus
  frais.
- Un WS/SSE générique (trades, notifs) est un souhait **backend** (hors
  périmètre) ; l'archi l'anticipe (les stores exposent `applyExternalUpdate()`,
  le transport est interchangeable).

## Iframe Spin (préservée)

`spin.vue` = hôte minimal : carte d'état hebdo (`GET /spin/status`) +
`<iframe src="/spin/?iframe=true">` en overlay, écoute `message` avec
**`event.origin === location.origin`**. Au `spin:close` : refresh `spin/status`
+ `wallet` (les 250 🪙 arrivent par là) + `collection` si transfert légendaire.
Le jeu interne n'est pas refondu (décision D7).

## Logs de développement (sécurité)

En dev uniquement, un intercepteur peut journaliser requêtes/réponses — **avec
redaction systématique du token et des emails** (comme les scripts d'audit).
Jamais de log en production.

## Journalisation des risques API à confirmer avec le backend

Repris de `api-inventory.md` (§ incohérences) — regroupés dans
`docs/product/feature-opportunities.md` « Questions ouvertes » :

1. Heure exacte des resets quotidiens (UTC ? Europe/Paris ?) pour des comptes à
   rebours justes.
2. Contraintes sur les usernames (impact XSS au rendu — cf. rapport sécurité).
3. Faisabilité d'un endpoint de pity shiny exact.
4. Uniformisation éventuelle des enveloppes de réponse (confort, non bloquant).
