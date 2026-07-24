// Décodage best-effort du payload JWT côté client (informatif pour l'UI ;
// l'autorisation réelle reste vérifiée côté serveur). Auto-importé (util de
// 1er niveau). Ne vérifie PAS la signature — ne jamais s'en servir pour une
// décision de sécurité.

// Extrait l'id utilisateur (`payload.id`) d'un token JWT, ou null si absent /
// malformé.
export function decodeJwtUserId(token: string | null): string | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload)).id ?? null
  } catch {
    return null
  }
}
