// Notes de version de CE front — le « nouveau » PokéRoulette. Le jeu lui-même
// (règles, serveur, cartes) suit les versions de l'original, 5.1.1 aujourd'hui ;
// la numérotation ci-dessous ne concerne que l'interface, à partir de sa
// refonte. Pour publier : ajouter une entrée EN TÊTE, date au format ISO.
//
// Import explicite (`~/config/release-notes`) : Nuxt n'auto-importe pas config/.
export type NoteSectionType = 'new' | 'fix' | 'roadmap'
export interface NoteGroup { label: string, items: readonly string[] }
export interface NoteSection { type: NoteSectionType, groups: readonly NoteGroup[] }
export interface ReleaseNote {
  version: string
  /** AAAA-MM-JJ */
  date: string
  title: string
  major?: boolean
  sections: readonly NoteSection[]
}

export const NOTE_SECTION_META: Record<NoteSectionType, { icon: string, label: string }> = {
  new: { icon: 'i-lucide-sparkles', label: 'Nouveautés' },
  fix: { icon: 'i-lucide-wrench', label: 'Corrections' },
  roadmap: { icon: 'i-lucide-compass', label: 'À venir' }
}

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: '2.7',
    date: '2026-10-01',
    title: 'Paintkemon et les historiques',
    sections: [
      {
        type: 'new',
        groups: [
          { label: '🎨 Paintkemon', items: [
            'Un coloriage numéroté à compléter avec tous les dresseurs, sans enjeu : choisis une couleur, colorie les cases qui portent son numéro, et regarde le dessin avancer en direct.'
          ] },
          { label: '⚔️ Arènes', items: [
            'L\'historique de tes combats, région par région : date, badge, résultat, équipe engagée — et chaque combat se rejoue.'
          ] },
          { label: '🎰 Jackpot', items: [
            'Ton historique personnel : lots, mises et dates, à côté des derniers gros lots.'
          ] },
          { label: '🎒 Sac à dos', items: [
            'L\'œuf mystérieux confié par la pension de l\'Aventure apparaît dans le sac, avec l\'avancement de son incubation.'
          ] },
          { label: '📰 Nouveautés', items: [
            'Cette page : ce qui change dans l\'interface, version par version, avec une pastille dans la barre de navigation à chaque nouvelle version.'
          ] }
        ]
      },
      {
        type: 'fix',
        groups: [
          { label: '🧩 Icônes', items: [
            'Dix-sept icônes s\'affichaient vides (disciplines du Concours, Johto et Hoenn dans le sélecteur de région, récompenses des Stats, événements) : corrigé.'
          ] }
        ]
      },
      {
        type: 'roadmap',
        groups: [
          { label: '', items: [
            'Une v3 avec sa propre API est à l\'étude, pour ne plus dépendre du serveur d\'origine à chaque version du jeu.'
          ] }
        ]
      }
    ]
  },
  {
    version: '2.6',
    date: '2026-10-01',
    title: 'Concours, tournoi complet, échanges',
    sections: [
      {
        type: 'new',
        groups: [
          { label: '🎀 Concours', items: [
            'Le Concours hebdomadaire au complet : discipline et restriction de la semaine, candidats éligibles classés par stat, inscription à 10 🪙 dans la bourse de ton choix.',
            'La répétition de danse (2 points par manche, une seule tentative, seconde chance si tu échoues dès la première).',
            'Le dévoilement mis en scène devant trois juges, proposé une fois puis rejouable ; le gagnant choisit son Légendaire ; l\'historique des concours.',
            'Les cinq stats de concours sur la fiche de chaque carte.'
          ] },
          { label: '🏆 Tournoi', items: [
            'Type et biome avantagés de la semaine, rappelés sur la page Équipe avec une chip sur chaque Pokémon concerné.',
            'Le tableau complet, le replay de chaque match, « Mon parcours » et l\'historique des tournois passés.'
          ] },
          { label: '🔄 Échanges', items: [
            'Formes de Zarbi demandées ou proposées, exemplaires possédés affichés, Légendaires de Kanto échangeables, annulation possible après avoir répondu.'
          ] }
        ]
      }
    ]
  },
  {
    version: '2.5',
    date: '2026-10-01',
    title: 'Le serveur donne le rythme',
    sections: [
      {
        type: 'new',
        groups: [
          { label: '🎁 Événements', items: [
            'Le bandeau des événements du jour (Soldes, Journée d\'une région, Pluie d\'événements, Prime ×2, Jackpot en folie, Arènes ouvertes, marchand, Aventure chanceuse), avec le prix réellement débité sur chaque booster.',
            'Le marchand signale les cartes qu\'il recherche dans ta collection et son prix remplace le prix de vente.'
          ] },
          { label: '🏠 Accueil', items: [
            'L\'objectif de la semaine (progression collective et ta contribution), les activités du jour réconciliées avec le serveur, les Premiers pas et leurs 150 🪙 par région.'
          ] },
          { label: '🔔 Notifications', items: [
            'La cloche ouvre enfin la liste des notifications, avec des liens vers les pages concernées.'
          ] }
        ]
      }
    ]
  },
  {
    version: '2.4',
    date: '2026-10-01',
    title: 'Hoenn',
    major: true,
    sections: [
      {
        type: 'new',
        groups: [
          { label: '🌊 Troisième région', items: [
            'Hoenn : sa bourse, ses huit arènes, son équipe, son classement, son entraînement et ses sprites — le jeu passe à trois générations.',
            'Le bureau de change : la prime du jour tombe dans une région, et tu peux la faire passer sur une autre depuis le sélecteur de région.'
          ] },
          { label: '🔐 Compte', items: [
            'L\'inscription demande désormais de vérifier ton e-mail, avec un bouton pour renvoyer le message.'
          ] },
          { label: '🥚 Tirages', items: [
            'L\'éclosion de l\'œuf de la pension est révélée comme une carte au lieu de faire planter la révélation.',
            'Tournoi et Ligue : tu choisis la bourse qui paie l\'inscription et reçoit la récompense.'
          ] }
        ]
      },
      {
        type: 'fix',
        groups: [
          { label: '💰 Bourses', items: [
            'La vente d\'une carte d\'une autre région créditait la mauvaise bourse à l\'affichage : corrigé.'
          ] }
        ]
      }
    ]
  },
  {
    version: '2.3',
    date: '2026-08-23',
    title: 'Vente intelligente',
    sections: [
      {
        type: 'new',
        groups: [
          { label: '🃏 Collection', items: [
            'La vente intelligente : revend en une fois les doublons devenus inutiles (shiny déjà obtenue, doublons shiny) sans toucher au dernier exemplaire ni aux réserves de fusion, avec un aperçu avant de confirmer.'
          ] }
        ]
      },
      {
        type: 'fix',
        groups: [
          { label: '📊 Stats', items: [
            'La page Stats est reconstruite sur le nouveau contrat du serveur.'
          ] }
        ]
      }
    ]
  },
  {
    version: '2.2',
    date: '2026-08-09',
    title: 'Motus, Zarbi et la voix des joueurs',
    sections: [
      {
        type: 'new',
        groups: [
          { label: '🔤 Motus', items: [
            'Le mot du jour : grille, clavier virtuel, une forme de Zarbi à la clé, et une victoire qui se fête.'
          ] },
          { label: '💡 Idées', items: [
            'Idées, feuille de route et sondages : la voix des joueurs a sa page.'
          ] },
          { label: '🃏 Collection', items: [
            'Les 28 formes de Zarbi, et une grille qui remplit la largeur.',
            'Les jeux de sprites sont embarqués ; leur sélecteur est refait et tient enfin sur un téléphone.'
          ] }
        ]
      },
      {
        type: 'fix',
        groups: [
          { label: '🏅 Régions', items: [
            'Classements par région, seuil d\'échange régional, prime du jour déplaçable.'
          ] }
        ]
      }
    ]
  },
  {
    version: '2.1',
    date: '2026-08-06',
    title: 'Johto',
    major: true,
    sections: [
      {
        type: 'new',
        groups: [
          { label: '🍃 Deuxième région', items: [
            'Johto : deux bourses, deux parcours d\'arènes, trois équipes (Tournoi, Kanto, Johto) et un filtre Génération dans la collection.'
          ] }
        ]
      },
      {
        type: 'fix',
        groups: [
          { label: '🔐 Connexion', items: [
            'La connexion et le solde sont rétablis après le changement de contrat du serveur.'
          ] }
        ]
      }
    ]
  },
  {
    version: '2.0',
    date: '2026-07-30',
    title: 'Le nouveau front',
    major: true,
    sections: [
      {
        type: 'new',
        groups: [
          { label: '🎲 Jouer', items: [
            'Ouverture ×5 groupée, sac à dos (Charme Chroma et tickets biome/type), mode nuit, révélation shiny cinématique.'
          ] },
          { label: '🃏 Collection', items: [
            'Filtres cumulables, shiny verrouillés unifiés, sprite animé au clic, choix du style de sprite par génération.'
          ] },
          { label: '🧭 Navigation', items: [
            'Une navigation mobile complète, un menu Compétition accessible au clavier, le montant du bonus quotidien annoncé.',
            'Deux vagues de l\'audit : plus de culs-de-sac, un jeu plus lisible.'
          ] }
        ]
      }
    ]
  }
]

export const LATEST_VERSION: string = RELEASE_NOTES[0]!.version
