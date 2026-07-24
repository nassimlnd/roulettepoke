// Boilerplate de chargement de page : exécute `loader` au montage et expose
// `loading` (true → false une fois résolu/échoué) et `errorMsg` (message
// humanisé si le loader rejette). Remplace le trio onMounted/try-catch-finally
// recopié à l'identique dans une dizaine de pages.
//
//   const { loading, errorMsg } = usePageData(() => store.ensureFresh())
//
// `errorMsg` est un ref inscriptible : une page peut le réutiliser pour ses
// propres erreurs (ex. échec d'une action secondaire).
export function usePageData(loader: () => Promise<void>) {
  const loading = ref(true)
  const errorMsg = ref('')
  onMounted(async () => {
    try {
      await loader()
    } catch (err) {
      errorMsg.value = humanizeError(err)
    } finally {
      loading.value = false
    }
  })
  return { loading, errorMsg }
}
