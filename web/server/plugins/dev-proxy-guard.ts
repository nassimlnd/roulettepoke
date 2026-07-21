// En dev, le proxy `/api` (et le WebSocket du chat, `ws: true`) tape sur le
// backend distant. Quand une socket amont se coupe brutalement — keep-alive
// expiré, ou upgrade WebSocket rejeté par le backend (l'Origin n'est pas réécrit
// sur l'upgrade en dev, seulement en prod) — httpxy émet un `read ECONNRESET`
// que personne n'attrape. Il remonte alors en `unhandledRejection` et `nuxi`
// redémarre tout le serveur, en boucle (« Restarting Nuxt due to error »).
//
// Ces resets amont sont bénins. On les avale (DEV UNIQUEMENT) pour couper la
// boucle de redémarrage, tout en laissant planter les vraies erreurs. En prod
// (SPA statique) ce plugin ne tourne pas.
export default defineNitroPlugin(() => {
  if (!import.meta.dev) return

  const isUpstreamReset = (e: unknown): boolean => {
    const code = (e as NodeJS.ErrnoException | null | undefined)?.code
    return code === 'ECONNRESET' || code === 'EPIPE'
  }

  // On prévient une fois, puis on silencie : la reconnexion du chat toutes les
  // 3 s en génère beaucoup et inonderait la console.
  let silenced = 0
  const swallow = (err: unknown): boolean => {
    if (!isUpstreamReset(err)) return false
    if (silenced === 0) {
      console.warn(
        '[dev] Socket amont coupée (ECONNRESET) — proxy /api ou WebSocket du chat. '
        + 'Ignoré pour éviter le redémarrage de Nuxt ; les suivants sont silencieux.'
      )
    }
    silenced++
    return true
  }

  process.on('unhandledRejection', (reason) => {
    if (swallow(reason)) return
    // Vraie erreur : on rétablit le comportement par défaut (log + arrêt →
    // redémarrage par nuxi), au lieu de la masquer.
    console.error('[unhandledRejection]', reason)
    process.exit(1)
  })

  process.on('uncaughtException', (err) => {
    if (swallow(err)) return
    console.error('[uncaughtException]', err)
    process.exit(1)
  })
})
