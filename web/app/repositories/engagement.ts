import type { WireActivity, WireOnboardingStatus, WireOnboardingClaim } from '~/types/api'
import type { Api } from './_client'

// Activités du jour (4.2.0) et checklist « Premiers pas » (4.4.0) : deux
// listes produites par le serveur, la vérité de « ce qu'il reste à faire ».
export const activitiesRepo = {
  today: async (api: Api): Promise<WireActivity[]> => {
    const { activities } = await api<{ activities: WireActivity[] }>('/activities/today')
    return activities
  }
}

export const onboardingRepo = {
  status: (api: Api) => api<WireOnboardingStatus>('/onboarding/status'),
  claim: (api: Api) => api<WireOnboardingClaim>('/onboarding/claim', { method: 'POST' })
}
