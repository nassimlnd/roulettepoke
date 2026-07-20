// Après restauration du token (localStorage), hydrate l'utilisateur UNE fois.
// C'est le seul endroit qui déclenche /auth/me (effet de bord : bonus quotidien).
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  if (auth.token) {
    await auth.fetchMeOnce()
    // Célébration du bonus quotidien si crédité à ce chargement.
    if (auth.rewardClaimed === false) {
      const badges = 0 // affiné par la page arènes ; message générique ici
      const toast = useToast()
      toast.add({
        title: 'Bonus quotidien !',
        description: `Ta récompense de connexion a été créditée${badges ? ` (+${badges} badges)` : ''}.`,
        color: 'secondary',
        icon: 'i-lucide-coins'
      })
    }
  }
})
