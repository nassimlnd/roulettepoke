// Couleur sémantique d'une probabilité de victoire (0–100) : vert = favorable,
// orange = incertain, rouge = défavorable. Auto-importé (util de 1er niveau).
// Source unique — copies auparavant dupliquées (et divergentes) dans
// gyms/tournament/league.
export function probColor(p: number): string {
  if (p >= 60) return '#3f9e66'
  if (p >= 40) return '#cc6f16'
  return '#c62617'
}
