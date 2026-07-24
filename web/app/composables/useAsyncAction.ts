// Enveloppe une action asynchrone déclenchée par l'utilisateur : gère l'état
// « en cours » (`pending`) et affiche un toast d'erreur humanisé si l'action
// échoue. La logique de succès (toast dédié, fermeture de modale, refresh)
// reste chez l'appelant, DANS le callback — ainsi une erreur survenant après
// l'appel réseau est traitée comme le code d'origine (bloc try commun).
//
//   const { pending, run } = useAsyncAction()
//   const submit = () => run(async () => {
//     await store.doThing()
//     toast.add({ title: 'OK', color: 'success' })
//     open.value = false
//   })
//
// Remplace le squelette pending/try/catch-toast/finally recopié dans une
// douzaine de gestionnaires d'action. Renvoie le résultat du callback, ou
// `undefined` s'il a échoué.
export function useAsyncAction() {
  const toast = useToast()
  const pending = ref(false)

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    pending.value = true
    try {
      return await fn()
    } catch (err) {
      toast.add({ title: humanizeError(err), color: 'error' })
      return undefined
    } finally {
      pending.value = false
    }
  }

  return { pending, run }
}
