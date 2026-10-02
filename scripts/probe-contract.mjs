#!/usr/bin/env node
// Sondage de contrat : rejoue les lectures de l'API de production et compare
// les clés reçues à nos interfaces `WireX` (web/app/types/api.ts).
//
// Pourquoi : nos types wire sont écrits à la main et ne sont confrontés à la
// production qu'à l'occasion d'une tâche. Entre la 4.0 et la 5.1 de l'original,
// quatorze champs sont apparus, un a disparu et un endpoint répond 404 — sans
// qu'aucun test ne bronche. Ce script rend la dérive visible en une commande.
//
// Usage :
//   POKEROULETTE_IDENTIFIER=… POKEROULETTE_PASSWORD=… node scripts/probe-contract.mjs
//   (identifiants d'un compte de TEST — jamais commités, jamais le compte principal)
//
// Sortie : pour chaque endpoint, les clés reçues mais absentes de notre type
// (« + ») et les clés de notre type absentes de la réponse (« − »). Un endpoint
// qui ne répond plus 200 est signalé en tête. Code de sortie 1 si une dérive
// est détectée, pour servir de garde-fou dans un script ou une CI.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.env.POKEROULETTE_BASE_URL ?? 'https://pokeroulette.poulineau.ovh'
const identifier = process.env.POKEROULETTE_IDENTIFIER
const password = process.env.POKEROULETTE_PASSWORD
if (!identifier || !password) {
  console.error('Renseigne POKEROULETTE_IDENTIFIER et POKEROULETTE_PASSWORD (compte de test).')
  process.exit(2)
}

// ─── Nos interfaces, extraites de types/api.ts par expression régulière ───────
const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'web', 'app', 'types', 'api.ts'), 'utf8')
// Analyse à profondeur d'accolades : une interface peut contenir des objets
// imbriqués, on ne retient que ses clés de premier niveau. Les clés optionnelles
// (`clé?:`) ne sont pas réclamées à la réponse.
const ifaces = {}
for (const m of src.matchAll(/export interface (\w+)[^{]*\{/g)) {
  let depth = 1
  let i = m.index + m[0].length
  const start = i
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') depth--
    i++
  }
  const body = src.slice(start, i - 1)
  const required = []
  const all = []
  let d = 0
  for (const line of body.split('\n')) {
    const key = d === 0 ? line.match(/^\s*([\w$]+)(\??)\s*:/) : null
    if (key) {
      all.push(key[1])
      if (!key[2]) required.push(key[1])
    }
    for (const ch of line) {
      if (ch === '{') d++
      else if (ch === '}') d--
    }
  }
  ifaces[m[1]] = { all, required }
}

// ─── Endpoints lus et interface attendue (chemin dans la réponse → type) ──────
// `pick` extrait l'objet à comparer ; `type` est le nom de notre interface.
const PROBES = [
  { path: '/auth/me', pick: r => r.user, type: 'WireUser' },
  { path: '/collection', pick: r => r.cards[0], type: 'WireOwnedCard', also: 'WireCard' },
  { path: '/roll/biomes', pick: r => r.biomes[0], type: 'WireBiome' },
  { path: '/gym', pick: r => r[0], type: 'WireGym' },
  { path: '/training/status', pick: r => r, type: 'TrainingStatus' },
  { path: '/team?scope=global', pick: r => r[0], type: 'WireTeamMember' },
  { path: '/inventory', pick: r => r, type: 'WireInventory' },
  { path: '/slot-machine/status', pick: r => r, type: 'SlotStatus' },
  { path: '/league/status', pick: r => r, type: 'LeagueStatus' },
  { path: '/tournament/current', pick: r => r.tournament, type: 'WireTournament' },
  { path: '/trades/eligibility?generation=1', pick: r => r, type: 'TradeEligibility' },
  { path: '/leaderboard', pick: r => r, type: 'WireLeaderboardResponse' },
  { path: '/leaderboard', pick: r => r.top10[0], type: 'WireLeaderboardRow' },
  { path: '/leaderboard/recent-shinies', pick: r => r.shinies[0], type: 'WireRecentShiny' },
  { path: '/stats', pick: r => r, type: 'WireStats' },
  { path: '/stats', pick: r => r.players[0], type: 'WireStatsPlayer' },
  { path: '/stats', pick: r => r.anecdotes, type: 'WireStatsAnecdotes' },
  { path: '/motus/today', pick: r => r, type: 'MotusToday' },
  { path: '/suggestions', pick: r => r.suggestions[0], type: 'WireSuggestion' },
  { path: '/polls', pick: r => r.polls[0], type: 'WirePoll' },
  { path: '/notifications', pick: r => r, type: 'NotificationsResponse' },
  { path: '/spin/status', pick: r => r, type: 'SpinStatus' },
  { path: '/collection/zarbi', pick: r => r.forms[0], type: 'WireZarbiForm' },
  { path: '/chat/history', pick: r => r, type: 'WireChatHistory' },
  { path: '/game-events/current', pick: r => r, type: 'WireGameEvents' },
  { path: '/game-events/current', pick: r => r.goal, type: 'WireCommunityGoal' }
]

async function call(path, opts = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) }
  })
  let body = null
  try { body = await res.json() } catch { /* corps vide */ }
  return { status: res.status, body }
}

const login = await call('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) })
if (login.status !== 200 || !login.body?.token) {
  console.error(`Connexion refusée (${login.status}) : ${login.body?.error ?? '?'}`)
  process.exit(2)
}
const auth = { Authorization: `Bearer ${login.body.token}` }

let drift = 0
const cache = new Map()
for (const probe of PROBES) {
  if (!cache.has(probe.path)) cache.set(probe.path, await call(probe.path, { headers: auth }))
  const { status, body } = cache.get(probe.path)
  if (status !== 200) {
    console.log(`✖ ${probe.path} → HTTP ${status}`)
    drift++
    continue
  }
  let obj
  try { obj = probe.pick(body) } catch { obj = undefined }
  if (!obj || typeof obj !== 'object') {
    console.log(`· ${probe.path} (${probe.type}) : rien à comparer (réponse vide pour ce compte)`)
    continue
  }
  if (!ifaces[probe.type]) {
    console.log(`? ${probe.type} introuvable dans types/api.ts`)
    drift++
    continue
  }
  const known = new Set([...ifaces[probe.type].all, ...(ifaces[probe.also]?.all ?? [])])
  const required = new Set([...ifaces[probe.type].required, ...(ifaces[probe.also]?.required ?? [])])
  const received = new Set(Object.keys(obj))
  const plus = [...received].filter(k => !known.has(k))
  const minus = [...required].filter(k => !received.has(k))
  const mark = plus.length || minus.length ? '⚠' : '✓'
  if (plus.length || minus.length) drift++
  console.log(`${mark} ${probe.path} (${probe.type})${plus.length ? `  + ${plus.join(', ')}` : ''}${minus.length ? `  − ${minus.join(', ')}` : ''}`)
}
console.log(drift ? `\n${drift} dérive(s) de contrat.` : '\nAucune dérive de contrat.')
process.exit(drift ? 1 : 0)
