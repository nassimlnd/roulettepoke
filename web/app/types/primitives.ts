// Primitives partagées — définies UNE SEULE fois puis importées côté wire
// (api) ET domaine. Évite que domain.ts dépende de api.ts pour des scalaires
// (couplage de couche) et garantit une source de vérité unique.

export type UUID = string
export type ISODate = string

// Rareté « wire » telle que renvoyée par l'API ('Alt' = shiny dans /collection).
export type Rarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire' | 'Alt'
// Rareté « domaine » après réconciliation du 'Alt' en isShiny + rareté réelle.
export type RealRarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire'

export type Biome
  = | 'Lac' | 'Mer' | 'Forêt' | 'Montagnes' | 'Ville' | 'Plaines'
    | 'Désert' | 'Cave' | 'Tundra' | 'Légendaire'
export type PokeType
  = | 'Combat' | 'Dragon' | 'Eau' | 'Feu' | 'Fée' | 'Glace' | 'Insecte'
    | 'Normal' | 'Plante' | 'Poison' | 'Psy' | 'Roche' | 'Sol'
    | 'Spectre' | 'Vol' | 'Électrik'

// Symboles et lignes de la machine à sous — partagés wire ↔ domaine.
export type SlotSymbol = 'legendary' | 'charme' | 'biome_ticket' | 'type_ticket' | 'coins'
export type SlotLine = 'L1' | 'L2' | 'L3' | 'D1' | 'D2'

// Unions de statut — partagées entre la forme wire et la forme domaine.
export type TradeStatus = 'pending_target' | 'pending_initiator' | 'completed' | 'declined' | 'cancelled' | 'expired'
export type TournamentStatus = 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
