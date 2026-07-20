# Opportunités fonctionnelles

> Idées d'amélioration classées par faisabilité. **Aucune ne modifie les règles
> métier ni ne suppose de nouvelle mécanique serveur, sauf mention explicite
> « évolution backend » (toujours accompagnée d'un fallback frontend).**
> Chaque opportunité est reliée aux recommandations experts et à l'API réelle
> (`docs/audit/api-inventory.md`).

## Classement par impact / effort / dépendance

| # | Opportunité | Impact | Effort | Dépendance |
| --- | --- | --- | --- | --- |
| O1 | Résultat de tirage visible + célébration par palier | Très fort | Moyen | Frontend seul |
| O2 | Doublon verbalisé + pity shiny estimé | Très fort | Faible | API existante |
| O3 | Hub « Aujourd'hui / Cette semaine / Objectifs » | Fort | Moyen | API existante |
| O4 | Guide = source de vérité (coûts biome dynamiques) | Fort | Faible | API existante |
| O5 | Onboarding de la boucle cœur (J1) | Fort | Moyen | Frontend seul |
| O6 | Course au score en delta + fil social sur le hub | Fort | Faible | API existante |
| O7 | Stratégie d'erreur globale (401, réseau, toasts) | Fort | Moyen | Frontend seul |
| O8 | Économie destructive sécurisée (pool, confirmations) | Moyen-fort | Faible | API existante |
| O9 | Timeline du cycle tournoi | Moyen-fort | Faible | API existante |
| O10 | Cooldowns unifiés (CooldownBadge) | Moyen | Faible | API existante |
| O11 | End-game affiché (#gyms, #league) | Moyen | Moyen | API existante |
| O12 | Jackpot : near-miss + défaite scénarisée | Moyen | Faible | API existante |
| O13 | Contenu du creux vendredi→dimanche | Moyen | Moyen | API existante |
| O14 | Réglages joueur (son, animations, thème) | Moyen | Faible | Frontend seul |
| O15 | Guide contextuel (« ? » par page → ancre) | Moyen | Faible | Frontend seul |
| O16 | Pity shiny exact (endpoint dédié) | Fort | — | **Évolution backend** |
| O17 | Notifications temps réel hors chat (trades/tournoi) | Moyen | — | **Évolution backend** |
| O18 | Défis du week-end récompensés | Moyen | — | **Évolution backend** |
| O19 | PWA installable | Moyen | Moyen | Frontend seul |

## Détail des opportunités frontend / API existante

### O2 — Le pity shiny estimé (le contenu end-game gratuit)
`/collection` expose `quantity` ; le Guide donne la formule (+1/500 par
exemplaire). Le front peut donc afficher « chance shiny estimée ~(N+1)/500 »
sur chaque doublon et permettre de trier la collection par chance shiny. C'est
la réponse la plus rentable au problème « plus rien à faire au quotidien » :
elle donne un sens à chaque tirage d'un joueur avancé. Étiqueter « estimation ».

### O3 — Le hub, cœur de la refonte
Agrège des données que la navbar récupère déjà (`tournament/current`,
`league/status`, `trades`, `notifications`) + `training/status`,
`slot-machine/status`, `gym`, `spin/status`, `trades/eligibility`. Un store à
TTL fait **baisser** le nombre d'appels (aujourd'hui 4 fetchs par navigation,
64× `tournament/current` observés) tout en affichant enfin l'agenda du jeu.

### O6 — La course au score
`/leaderboard` renvoie `playerContext` (voisins above/below). Afficher le delta
nominal (« +9 pts sur Vince, −6 sur Jdsd ») avec équivalence en prises
(1 shiny = 10 pts) transforme un classement passif en moteur de tirages. Le
signal « ton rang a changé depuis ta dernière visite » se calcule en mémorisant
le rang en localStorage.

### O11 — L'end-game affiché
Aucune page privée ne doit se réduire à une phrase d'attente. `#league` hors
cycle peut montrer le dernier run (`league/status.lastRun` + replays), les
4 adversaires probables (top du `tournament/current`), le compte à rebours
d'ouverture. `#gyms` end-game peut montrer l'historique (`gym/history`) et les
stats de règne. Zéro backend.

### O12 — Le near-miss du jackpot
`POST /slot-machine/spin` renvoie **toutes** les `cells` (pas seulement les
lignes gagnantes). Le front peut donc détecter les lignes à 2 symboles
identiques et les scénariser (« Presque ! »), transformant la défaite
quotidienne en teaser du lendemain — sans toucher aux probabilités réelles.

## Détail des évolutions backend souhaitables (avec fallback)

### O16 — Pity shiny exact
**Souhait** : un champ/endpoint exposant la vraie probabilité shiny courante par
carte (le calcul serveur peut différer de la formule affichée : plafonds,
arrondis). **Fallback** : l'estimation frontend d'O2, clairement étiquetée —
remplaçable sans changement d'UI le jour où l'endpoint arrive.

### O17 — Temps réel hors chat
**Souhait** : WS/SSE pour notifier instantanément un trade reçu, un changement
de phase de tournoi. **Fallback** : polling léger piloté par `visibilitychange`
et `focus` (déjà prévu dans l'architecture Nuxt) — suffisant pour une
communauté de 30 joueurs.

### O18 — Défis du week-end
**Souhait** : des micro-objectifs récompensés pour combler le creux
vendredi→dimanche. **Fallback** : faire du week-end la « préparation du lundi »
(revoir les replays, bilan, plan des resets) à partir de données existantes —
sans récompense inventée.

## Opportunités écartées (et pourquoi)

- **Refondre le jeu Spin** : c'est une application séparée (iframe, API propre).
  La refonte conserve l'intégration ; refaire le jeu interne est un projet
  distinct hors périmètre.
- **Monétisation / boutique** : hors de l'esprit du jeu (communauté d'amis,
  économie interne équilibrée). Aucune opportunité de ce type n'est proposée.
- **Inventer des récompenses** : formellement exclu — toute récompense affichée
  doit être servie par le backend existant. Les « objectifs » du hub sont des
  repères de navigation, pas une nouvelle économie.
- **Changer les probabilités / l'équilibrage** : hors périmètre (règles métier
  inchangées).

## Questions ouvertes à trancher avec le propriétaire (backend)

Regroupées ici pour une décision unique (cf. `docs/audit/api-inventory.md` et
les rapports experts) :

1. Contraintes sur les usernames à l'inscription (impacte le risque XSS au
   rendu — cf. rapport sécurité) ?
2. Heure exacte des resets quotidiens (minuit UTC ? Europe/Paris ?) pour des
   comptes à rebours justes ?
3. Faisabilité d'un endpoint de pity shiny exact (O16) ?
4. Intérêt pour du temps réel hors chat (O17) et/ou des défis week-end (O18) ?
5. Le compte de test d'audit (`AuditNassim`) doit-il être supprimé ?
