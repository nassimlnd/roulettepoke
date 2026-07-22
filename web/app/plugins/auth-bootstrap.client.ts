import { parisDayKey } from '~/utils/paris-time'

// Après restauration du token (localStorage), hydrate l'utilisateur UNE fois.
// C'est le seul endroit qui déclenche /auth/me (effet de bord : bonus quotidien).
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  if (!auth.token) return
  await auth.fetchMeOnce()
  if (!auth.meLoaded) return // /auth/me a échoué (offline / 401) : rien à célébrer

  // Le bonus de connexion est crédité côté serveur au 1er /auth/me du jour. On
  // ne le célèbre qu'UNE fois par jour civil (Paris) et par appareil : le champ
  // `rewardClaimed` renvoyé par l'API n'est pas un marqueur fiable de « tout
  // juste crédité » (il reste à false à chaque appel), sinon le toast se
  // rejouait à chaque rechargement de page. On mémorise le dernier jour fêté.
  const today = parisDayKey()
  if (localStorage.getItem('daily_bonus_seen') === today) return
  localStorage.setItem('daily_bonus_seen', today)

  useToast().add({
    title: 'Bonus quotidien !',
    description: 'Ta récompense de connexion a été créditée.',
    color: 'secondary',
    icon: 'i-lucide-coins'
  })
})
