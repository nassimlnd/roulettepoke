import { parisDayKey } from '~/utils/paris-time'
import { STORAGE_KEYS } from '~/constants/storage-keys'
import { DAILY_BONUS_BASE, DAILY_BONUS_PER_BADGE } from '~/constants/game'
import { gymRepo } from '~/repositories'
import { generationRegion, asGeneration } from '~/constants/generation'

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
  if (localStorage.getItem(STORAGE_KEYS.dailyBonusSeen) === today) return
  localStorage.setItem(STORAGE_KEYS.dailyBonusSeen, today)

  // Le montant n'est pas renvoyé par l'API, mais la formule est déterministe
  // (base + prime par badge) : on récupère les arènes pour l'annoncer
  // exactement. Requête placée APRÈS le garde-fou du jour : elle a donc lieu au
  // plus une fois par jour, pas à chaque démarrage. Si elle échoue, on annonce
  // la règle sans chiffre plutôt qu'un montant faux.
  //
  // Le bonus se compte par RÉGION : seuls les badges de la région qui reçoit
  // la prime comptent (`100 + badges × 10`). Depuis la v5 le serveur dit
  // laquelle (`dailyBonusGeneration`) — après un passage au bureau de change,
  // ce n'est plus forcément la région active. On lit /gym, qui porte le champ
  // `generation`, plutôt que /gym/badges qui mélange les parcours.
  let description = `Ta récompense de connexion a été créditée (${DAILY_BONUS_BASE} 🪙 + ${DAILY_BONUS_PER_BADGE} par badge d'arène).`
  try {
    const gen = asGeneration(auth.user?.dailyBonusGeneration ?? useWalletStore().activeGeneration)
    const region = generationRegion(gen)
    const count = (await gymRepo.getAll(useApi()))
      .filter(g => g.generation === gen && g.hasBadge).length
    const amount = dailyBonusAmount(count)
    description = count
      ? `+${amount} 🪙 créditées — ${DAILY_BONUS_BASE} de base et ${count} badge${count > 1 ? 's' : ''} de ${region}.`
      : `+${amount} 🪙 créditées. Chaque badge de ${region} ajoutera ${DAILY_BONUS_PER_BADGE} 🪙 par jour.`
  } catch {
    // On garde le texte de repli : la règle, sans montant inventé.
  }

  useToast().add({
    title: 'Bonus quotidien !',
    description,
    color: 'secondary',
    icon: 'i-lucide-coins'
  })
})
