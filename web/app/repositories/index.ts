// Couche repositories : SEUL point de contact avec l'API. Les stores appellent
// ces fonctions ; les composants ne touchent jamais un repository ni $fetch.
// Chaque repository connaît la forme « wire » de son endpoint et la normalise.
//
// BARREL : le découpage par feature (auth.ts, roll.ts, …) est invisible aux
// consommateurs — l'import public reste `~/repositories`.
export * from './auth'
export * from './roll'
export * from './collection'
export * from './inventory'
export * from './team'
export * from './gym'
export * from './slot'
export * from './league'
export * from './tournament'
export * from './spin'
export * from './trades'
export * from './notifications'
export * from './leaderboard'
export * from './motus'
export * from './stats'
export * from './chat'
