// Déduplication des GET simultanés : deux composants qui montent en même temps
// et demandent la même ressource ⇒ une seule requête réseau. Utilisé par les
// `ensureFresh` des stores.
const inFlight = new Map<string, Promise<unknown>>()

export function dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key)
  if (existing) return existing as Promise<T>

  const promise = factory().finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}
