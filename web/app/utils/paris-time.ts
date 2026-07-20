// Calcul des instants de reset en heure civile Europe/Paris, DST-safe.
// Interdiction de faire `now + 7j` en UTC (faux d'une heure aux changements
// d'heure). On recompose l'instant UTC du prochain « jour J à HH:MM » Paris en
// cherchant l'offset réel à la date cible via Intl.

const TZ = 'Europe/Paris'

// Décalage (minutes) de Paris par rapport à UTC à un instant donné.
function parisOffsetMinutes(at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
  const parts = dtf.formatToParts(at)
  const map: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value)
  }
  const asUTC = Date.UTC(map.year!, map.month! - 1, map.day!, map.hour === 24 ? 0 : map.hour!, map.minute!, map.second!)
  return Math.round((asUTC - at.getTime()) / 60000)
}

// Les composantes date/heure de Paris pour un instant.
function parisParts(at: Date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
  const parts = dtf.formatToParts(at)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  // ISO weekday 1..7 (lundi..dimanche)
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday!)
  const iso = wd === 0 ? 7 : wd
  return {
    year: Number(map.year), month: Number(map.month), day: Number(map.day),
    hour: map.hour === '24' ? 0 : Number(map.hour), minute: Number(map.minute), weekday: iso
  }
}

// Convertit une date/heure civile Paris en instant UTC réel.
function parisCivilToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Approximation : on suppose l'offset, puis on corrige avec l'offset réel à
  // l'instant obtenu (gère les bascules DST sauf l'heure inexistante du saut,
  // hors de portée pour des resets à minuit/midi).
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const off = parisOffsetMinutes(new Date(guess))
  return new Date(guess - off * 60000)
}

// Prochain minuit Paris (reset quotidien : bonus, entraînement, jackpot).
export function nextDailyReset(from: Date = new Date()): Date {
  const p = parisParts(from)
  const today = parisCivilToUtc(p.year, p.month, p.day, 0, 0)
  const next = today.getTime() <= from.getTime()
    ? parisCivilToUtc(p.year, p.month, p.day + 1, 0, 0)
    : today
  return next
}

// Prochain jour de semaine ISO (1=lundi..7=dimanche) à HH:MM Paris.
// Ex : lundi 00:00 (arènes, échanges) ; jeudi 12:00 (tournoi, reset ligue).
export function nextWeekly(weekday: number, hour: number, minute = 0, from: Date = new Date()): Date {
  const p = parisParts(from)
  let deltaDays = (weekday - p.weekday + 7) % 7
  const candidateSameDay = parisCivilToUtc(p.year, p.month, p.day, hour, minute)
  if (deltaDays === 0 && candidateSameDay.getTime() <= from.getTime()) {
    deltaDays = 7
  }
  return parisCivilToUtc(p.year, p.month, p.day + deltaDays, hour, minute)
}
