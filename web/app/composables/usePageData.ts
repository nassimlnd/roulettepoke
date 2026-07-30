// Boilerplate de chargement de page : exécute `loader` au montage et expose
// `loading` (true → false une fois résolu/échoué) et `errorMsg` (message
// humanisé si le loader rejette). Remplace le trio onMounted/try-catch-finally
// recopié à l'identique dans une dizaine de pages.
//
//   const { loading, errorMsg } = usePageData(() => store.ensureFresh())
//
// `errorMsg` est un ref inscriptible : une page peut le réutiliser pour ses
// propres erreurs (ex. échec d'une action secondaire).
//
// `retry` rejoue le chargement. Sans lui, un échec réseau transformait la page
// en cul-de-sac : le joueur n'avait que le rechargement complet du navigateur
// pour s'en sortir. À exposer systématiquement via <PageError>.
export function usePageData(loader: () => Promise<void>) {
  const loading = ref(true)
  const errorMsg = ref('')

  async function run() {
    loading.value = true
    errorMsg.value = ''
    try {
      await loader()
    } catch (err) {
      errorMsg.value = humanizeError(err)
    } finally {
      loading.value = false
    }
  }

  onMounted(run)
  return { loading, errorMsg, retry: run }
}
