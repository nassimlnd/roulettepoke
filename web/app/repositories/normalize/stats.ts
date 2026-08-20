// Normalisation du payload agrégé /stats — restructuré par la v4.
//
// La normalisation résout ici le PALMARÈS complet : libellés, infobulles,
// messages d'attente et phrases chiffrées viennent du jeu d'origine
// (src/pages/stats.js), pour que la page reste bête et que le vocabulaire des
// récompenses (« Bernard Pivot », « Banqueroute », « Mon précieux »…) soit
// exactement celui que les joueurs connaissent.
import type { WireStats, WireStatsAnecdotes } from '~/types/api'
import type { DomainStats, StatAward, StatAwardGroup } from '~/types/domain'

const num = (n: number): string => n.toLocaleString('fr-FR')
const s = (n: number): string => (n > 1 ? 's' : '')

// L'original tire 2 ex-aequo AU HASARD (pickAtMostTwo) ; ici le choix est
// déterministe — les 2 premiers, puis « +N » — pour que deux rendus successifs
// soient identiques.
function cap(names: string[]): string[] {
  if (names.length <= 2) return names
  return [...names.slice(0, 2), `+${names.length - 2}`]
}

type Tone = StatAward['tone']

function award(
  key: string,
  icon: string,
  label: string,
  tone: Tone,
  hint: string,
  empty: string,
  data: { players: string[] } | null | undefined,
  detail: (d: never) => string
): StatAward {
  if (!data || !data.players?.length) {
    return { key, icon, label, tone, hint, names: [], detail: empty }
  }
  return { key, icon, label, tone, hint, names: cap(data.players), detail: detail(data as never) }
}

// Variante « entrées » : chaque ex-aequo porte ses propres champs (une carte
// différente par joueur, un duo tyran → victime…).
function entriesAward<E>(
  key: string,
  icon: string,
  label: string,
  tone: Tone,
  hint: string,
  empty: string,
  data: { entries: E[] } | null | undefined,
  formatEntry: (e: E) => string,
  detail: (d: { entries: E[] }) => string
): StatAward {
  if (!data || !data.entries?.length) {
    return { key, icon, label, tone, hint, names: [], detail: empty }
  }
  return { key, icon, label, tone, hint, names: cap(data.entries.map(formatEntry)), detail: detail(data) }
}

function buildAwardGroups(a: WireStatsAnecdotes | undefined): StatAwardGroup[] {
  const r = a?.roulette ?? {}
  const j = a?.jackpot ?? {}
  const sp = a?.spin ?? {}
  const m = a?.motus ?? {}
  const t = a?.tournoi ?? {}

  return [
    {
      key: 'roulette',
      label: 'Roulette',
      icon: 'i-lucide-dices',
      awards: [
        award('most_shiny_dupes', 'i-lucide-copy', 'Plus de doublons Shiny', 'neutral',
          'Le plus de doublons Shiny tirés — plusieurs exemplaires du même Pokémon en version brillante.',
          'Aucun doublon Shiny pour l\'instant', r.most_shiny_dupes,
          (d: { dupes: number }) => `${num(d.dupes)} doublon${s(d.dupes)}`),
        entriesAward('specialist', 'i-lucide-target', 'Le spécialiste', 'gold',
          'Le plus grand nombre d\'exemplaires d\'une seule carte, tout Pokémon confondu (Zarbi exclu).',
          'Pas encore de données', r.specialist,
          e => `${e.username} (${e.card_name})`,
          d => `${num(d.entries[0]!.quantity)} exemplaires`),
        entriesAward('precious', 'i-lucide-gem', 'Mon précieux', 'neutral',
          'Le plus d\'exemplaires détenus du Pokémon standard le moins possédé du jeu (hors Shiny/Légendaire).',
          'Pas encore de données', r.precious,
          e => `${e.username} (${e.card_name})`,
          d => `${num(d.entries[0]!.quantity)} exemplaire${s(d.entries[0]!.quantity)}`),
        award('shiny_hunter', 'i-lucide-sparkles', 'Shiny Hunter', 'good',
          'Le plus de Shiny obtenus avec le Charme Chroma actif.',
          'Pas encore de données', r.shiny_hunter,
          (d: { count: number }) => `${num(d.count)} shiny`)
      ]
    },
    {
      key: 'jackpot',
      label: 'Jackpot',
      icon: 'i-lucide-cherry',
      awards: [
        award('ka_tching', 'i-lucide-coins', 'Ka-tching', 'gold',
          'Le plus de coins gagnés au total au Jackpot.',
          'Pas encore de gains au Jackpot', j.ka_tching,
          (d: { total_won: number }) => `${num(d.total_won)} coins gagnés`),
        award('big_winner', 'i-lucide-party-popper', '« Ça fait beaucoup là non ? »', 'good',
          'Le plus de parties gagnées au Jackpot (au moins une ligne touchée).',
          'Pas encore de victoire au Jackpot', j.big_winner,
          (d: { wins: number }) => `${num(d.wins)} victoire${s(d.wins)}`),
        award('banqueroute', 'i-lucide-trending-down', 'Banqueroute', 'bad',
          'Le plus perdu au global au Jackpot (valeur estimative pour Charme Chroma/ticket/légendaire : 50/20/250 coins).',
          'Personne n\'est encore dans le rouge au Jackpot', j.banqueroute,
          (d: { total_lost: number }) => `${num(d.total_lost)} coins perdus`),
        award('legendary_hunter', 'i-lucide-crown', 'Légendaire Hunter', 'gold',
          'Le plus de légendaires remportés au Jackpot.',
          'Aucun légendaire remporté au Jackpot pour l\'instant', j.legendary_hunter,
          (d: { leg_wins: number }) => `${num(d.leg_wins)} légendaire${s(d.leg_wins)}`)
      ]
    },
    {
      key: 'spin',
      label: 'Aventure',
      icon: 'i-lucide-compass',
      awards: [
        award('spin_lucky', 'i-lucide-clover', 'Chanceux / Chanceuse', 'good',
          'Le plus de légendaires transférés avec le moins de tentatives.',
          'Aucun légendaire transféré pour l\'instant', sp.lucky,
          (d: { attempts_count: number, transfers_count: number }) =>
            `${num(d.attempts_count)} tentatives → ${num(d.transfers_count)} transfert${s(d.transfers_count)}`),
        award('spin_unlucky', 'i-lucide-cloud-rain', 'Malchanceux / Malchanceuse', 'bad',
          'Le plus de tentatives sans obtenir de transfert légendaire.',
          'Tout le monde a eu de la chance jusqu\'ici', sp.unlucky,
          (d: { attempts_count: number, transfers_count: number }) =>
            `${num(d.attempts_count)} tentatives, ${num(d.transfers_count)} transfert${s(d.transfers_count)}`),
        award('spin_determined', 'i-lucide-dumbbell', 'Déterminé·e', 'gold',
          'Le plus de tentatives malgré un maximum de transferts déjà obtenus — la persévérance qui paie.',
          'Pas encore assez de données', sp.determined,
          (d: { attempts_count: number, transfers_count: number }) =>
            `${num(d.attempts_count)} tentatives → ${num(d.transfers_count)} transferts`),
        award('egg_master', 'i-lucide-egg', '« BOUM la team Shape »', 'neutral',
          'Le plus d\'œufs mystérieux obtenus (comptés à l\'éclosion dans la PokéRoulette classique).',
          'Aucun œuf obtenu pour l\'instant', sp.egg_master,
          (d: { eggs: number }) => `${num(d.eggs)} œuf${s(d.eggs)} obtenu${s(d.eggs)}`)
      ]
    },
    {
      key: 'motus',
      label: 'Motus',
      icon: 'i-lucide-whole-word',
      awards: [
        award('bernard_pivot', 'i-lucide-medal', 'Bernard Pivot', 'gold',
          'Le plus de fois premier à trouver le mot du jour (bonus +10 coins).',
          'Pas encore de données', m.bernard_pivot,
          (d: { wins: number }) => `${num(d.wins)} fois premier`),
        award('rap_god', 'i-lucide-mic', 'Rap God', 'neutral',
          'La collection de formes de Zarbi la plus complète.',
          'Pas encore de données', m.rap_god,
          (d: { forms_owned: number }) => `${num(d.forms_owned)}/28 formes`),
        award('encore', 'i-lucide-repeat', '« Encore... »', 'bad',
          'Le plus de doublons de formes de Zarbi (exemplaires au-delà du premier de chaque forme).',
          'Aucun doublon de Zarbi pour l\'instant', m.encore,
          (d: { dupes: number }) => `${num(d.dupes)} doublon${s(d.dupes)}`),
        award('on_te_voit', 'i-lucide-eye', '« On te voit... »', 'good',
          'Le plus de mots trouvés dès le premier essai.',
          'Personne n\'a encore trouvé du premier coup', m.on_te_voit,
          (d: { one_shots: number }) => `${num(d.one_shots)} mot${s(d.one_shots)} en 1 coup`)
      ]
    },
    {
      key: 'tournoi',
      label: 'Tournoi',
      icon: 'i-lucide-trophy',
      awards: [
        award('most_wins', 'i-lucide-trophy', 'Le plus de tournois gagnés', 'gold',
          'Le plus de tournois remportés (placement n°1).',
          'Aucun tournoi remporté pour l\'instant', t.most_wins,
          (d: { wins: number }) => `${num(d.wins)} tournoi${s(d.wins)}`),
        award('tournoi_lucky', 'i-lucide-clover', 'Chanceux / Chanceuse', 'good',
          'Le plus de duels de tournoi gagnés alors qu\'ils étaient donnés perdants (≤ 25 % de chances de victoire).',
          'Pas encore assez de données', t.lucky,
          (d: { win_low: number }) => `${num(d.win_low)} duel${s(d.win_low)} gagné${s(d.win_low)} à ≤ 25 %`),
        award('tournoi_unlucky', 'i-lucide-cloud-rain', 'Malchanceux / Malchanceuse', 'bad',
          'Le plus de duels de tournoi perdus alors qu\'ils étaient donnés favoris (≥ 75 % de chances de victoire).',
          'Pas encore assez de données', t.unlucky,
          (d: { loss_high: number }) => `${num(d.loss_high)} duel${s(d.loss_high)} perdu${s(d.loss_high)} à ≥ 75 %`),
        entriesAward('tyran_victime', 'i-lucide-swords', 'Tyran et Victime', 'neutral',
          'Le duo avec le plus de victoires d\'un même joueur contre un même adversaire, tous tournois confondus.',
          'Pas encore assez de données', t.tyran_victime,
          e => `${e.tyran} → ${e.victime}`,
          d => `${num(d.entries[0]!.wins)} victoires`)
      ]
    }
  ]
}

export function normalizeStats(w: WireStats): DomainStats {
  const g = w.global
  return {
    roulette: {
      totalRolls: g.roulette.total_rolls,
      shinyObtained: g.roulette.shiny_obtained,
      shinyRate: g.roulette.shiny_rate,
      legendaryRate: g.roulette.legendary_rate
    },
    jackpot: {
      totalSpins: g.jackpot.total_spins,
      totalCoins: g.jackpot.total_coins,
      totalItems: g.jackpot.total_items,
      totalLegendaries: g.jackpot.total_legendaries
    },
    spin: {
      totalRuns: g.spin.total_runs,
      totalTransfers: g.spin.total_transfers,
      avgRunsForReward: g.spin.avg_runs_for_reward,
      avgRunsForLegendary: g.spin.avg_runs_for_legendary
    },
    motus: {
      totalGames: g.motus.total_games,
      totalWins: g.motus.total_wins
    },
    players: [...w.players]
      .map(pl => ({
        username: pl.username,
        totalRolls: pl.total_rolls,
        shinyRolls: pl.shiny_rolls,
        legendaryRolls: pl.legendary_rolls,
        ownedStd: pl.owned_std,
        ownedShiny: pl.owned_shiny,
        spinRuns: pl.spin_runs,
        spinTransfers: pl.spin_transfers,
        nemesis: pl.nemesis?.opponents?.length ? { opponents: pl.nemesis.opponents, count: pl.nemesis.count } : null,
        victim: pl.victim?.opponents?.length ? { opponents: pl.victim.opponents, count: pl.victim.count } : null
      }))
      .sort((x, y) => x.username.localeCompare(y.username, 'fr', { sensitivity: 'base' })),
    pool: { totalStd: w.pool.total_std, totalShiny: w.pool.total_shiny },
    awardGroups: buildAwardGroups(w.anecdotes)
  }
}
