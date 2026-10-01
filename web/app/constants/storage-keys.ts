// Clés localStorage centralisées (typo-safe, une seule source).
//
// ⚠️ Les VALEURS ci-dessous sont figées : les modifier ferait perdre les données
// déjà stockées côté navigateur (déconnexion, perte de préférences). Les préfixes
// hétérogènes (`gacha_` hérité de l'ancien front, `pkr_`, sans préfixe) sont donc
// conservés tels quels ; toute unification devra gérer une migration.
export const STORAGE_KEYS = {
  token: 'gacha_token', // JWT (partagé avec l'ancien front pendant la migration)
  revealMode: 'gacha_reveal_mode',
  selectedBiome: 'gacha_selected_biome',
  dailyBonusSeen: 'daily_bonus_seen', // suffixé par le jour Paris à l'usage
  volume: 'pkr_volume',
  muted: 'pkr_muted',
  reducedMotion: 'pkr_reduced_motion',
  spriteStyle: 'pkr_sprite_style',
  teamRollSkipConfirm: 'pkr_team_roll_skip_confirm',
  replaySpeed: 'replay_speed',
  spinMuted: 'spin_muted',
  eventsDismissed: 'pkr_events_dismissed', // empreinte du bandeau d'événements masqué
  contestRevealSeen: 'contest_reveal_seen', // id du dernier concours dont le dévoilement a été proposé (même clé que l'ancien front)
  onboardingDismissed: 'gacha_onboarding_dismissed' // même clé que l'ancien front
} as const
