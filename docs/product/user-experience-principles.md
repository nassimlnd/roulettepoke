# Principes d'expérience (règles UX)

> Règles UX **concrètes et opposables** issues du brainstorming des audits
> produit, UX, UI et mobile. Elles servent de contrat de conception pour toute
> la refonte : chaque écran, chaque composant, chaque état doit pouvoir être
> confronté à ces règles. Elles répondent point par point aux questions de
> fondation posées dans le cahier des charges.

## A. Principes fondamentaux (les réponses aux questions cadres)

1. **Émotion principale** → l'excitation contenue d'une ouverture de booster
   entre amis (attente, trouvaille, fierté partagée). Jamais l'anxiété casino.
2. **Première chose comprise par un nouveau joueur** → « je tire des cartes pour
   compléter ma collection Pokémon, et j'ai des coins pour le faire ». En une
   phrase, avant le premier clic.
3. **Information toujours visible** → le **solde de coins** et l'**action
   primaire du contexte**. Sur le jeu : le solde et « Lancer ».
4. **Action toujours dominante** → une seule action primaire par écran, la plus
   grande, la plus contrastée, jamais concurrencée visuellement (aujourd'hui la
   home a ~19 cibles pour 1 action utile — à corriger).
5. **Éviter les erreurs de manipulation** → la friction est **proportionnelle au
   risque** : toute action destructive ou irréversible passe par une
   confirmation explicite ; les actions sûres sont immédiates.
6. **Rendre chaque action satisfaisante** → tout geste produit une réponse dans
   le viewport, dans les 100 ms pour le feedback d'appui, et une résolution
   visible (même un doublon « dit » quelque chose).
7. **Créer du suspense sans ralentir** → le suspense est **scénarisé mais
   skippable** : tout moment > 2 s peut être passé ; le résultat étant déjà connu
   du serveur, l'attente est un choix de mise en scène, budgété (cf.
   `docs/design/animation-system.md`).
8. **Comprendre une partie sans explication longue** → onboarding contextuel
   « juste à temps » (une info au moment où elle sert) plutôt qu'un tutoriel
   massif ; les libellés sont auto-porteurs (aucun besoin de hint).
9. **Encourager une nouvelle partie** → chaque fin d'action propose le **pas
   suivant** (relancer, voir le résultat dans la collection, tenter l'objectif
   débloqué) ; chaque fin de session donne un **prochain rendez-vous**.
10. **Lisibilité malgré les animations** → l'animation ne masque jamais
    l'information ; elle a toujours une version `prefers-reduced-motion`
    équivalente en contenu ; le texte du résultat ne dépend jamais de la seule
    couleur.

## B. Règles d'interaction (opposables)

### Boutons primaires
- Un seul par écran, style `solid` couleur `primary`, toujours au-dessus du fold
  sur mobile, cible ≥ 44 px, coût total (biome + multi) affiché **avant** le clic.
- État `loading` obligatoire pendant l'appel (anti double-clic, déjà bien fait).

### Actions destructives / irréversibles
- **Confirmation systématique** avec récapitulatif du coût et de la perte
  (fusion : « 10 × X → 1 × Y » ; roulette d'équipe : « la carte tirée quitte ta
  collection » ; retrait : « −10 🪙, définitif »).
- Bouton de confirmation en couleur `error` ou `warning`, jamais présélectionné.
- Option « ne plus me demander » persistée **uniquement** pour les destructions
  répétitives à faible enjeu unitaire (fusion), jamais pour l'irréversible unique.
- Même pattern visuel de confirmation partout (cohérence du traitement du risque).

### Confirmations & choix forcés
- Un choix sans retour possible (choix de carte événementiel) est **annoncé
  comme définitif** avant que le joueur ne s'engage.

### Délais, états bloqués, cooldowns
- Tout état verrouillé temporel affiche **une heure de retour ou un compte à
  rebours** (un composant unique `CooldownBadge`), jamais « Revenez demain » nu.
- Tout état verrouillé de progression est un **jalon** (barre + objectif + CTA),
  jamais une erreur rouge.
- « Chargement… » a toujours un skeleton dimensionné et un état d'échec
  réessayable (pas de spinner infini).

### Doubles clics & actions concurrentes
- Bouton désactivé + `loading` pendant l'action ; les filtres de la roulette
  restent verrouillés pendant tout un cycle (y compris une série multi).

### Transitions
- Transitions courtes (150–300 ms) entre vues ; jamais bloquantes ; respectent
  `prefers-reduced-motion`.

### Notifications
- **File de toasts unique** (Nuxt UI) pour les succès/erreurs asynchrones ;
  jamais d'overlay flottant qui recouvre du contenu (bannières → toasts ou
  centre de notifications) ; jamais deux bandeaux d'erreur empilés.
- Les badges de compteur affichent **un nombre**, pas un point rouge muet.

### Erreurs (voir aussi § D)
- Aucun message technique brut (« Failed to fetch », stack) n'atteint le joueur.
- Toute erreur dit : ce qui s'est passé, ce que le joueur peut faire, si son
  action a été prise en compte, si ses données sont conservées.

### Succès (voir aussi § C)
- Le résultat est dans le viewport ; l'intensité de la célébration est
  proportionnelle à l'enjeu ; la prochaine action est proposée.

### Actions en temps réel
- Le chat reconnecte silencieusement (déjà fait) mais **signale** une
  déconnexion durable et un bannissement (aujourd'hui muet).
- Le solde est une **source de vérité unique** (store), réconciliée après chaque
  réponse serveur — fin du calcul optimiste divergent.

## C. Success states — 7 niveaux (le détail motion est dans `docs/design/animation-system.md`)

Le principe produit : **l'intensité de la célébration est proportionnelle à la
rareté de l'événement**, et une célébration ne ralentit jamais la relance.

| Niveau | Événement | Intensité | Prochaine action proposée |
| --- | --- | --- | --- |
| 1 — mineur | doublon, coins d'événement | inline discret + son court ; **verbalise le pity** (« chance shiny ~N/500 ») | relancer |
| 2 — bonne prise | nouvelle carte commune/rare | inline + halo + son de rareté | relancer / voir dans la collection |
| 3 — belle prise | épique, nouvelle évolution | inline renforcé, carte mise en avant | relancer / fusionner si possible |
| 4 — série | multi-roll, série d'entraînement | récap groupé avec meilleur tirage mis en avant | relancer la série |
| 5 — étape franchie | badge d'arène, jalon débloqué | encart marquant + progression mise à jour | prochain défi débloqué |
| 6 — rare | **légendaire ou shiny** (~1/500) | **plein écran**, pause avant révélation, fanfare | montrer / partager / relancer |
| 7 — exceptionnel | victoire de ligue, capture légendaire, victoire de tournoi | **séquence dédiée** (référence : capture actuelle) | réclamer la récompense / revoir |

Règle transverse : les niveaux 6–7 sont **impressionnants mais bornés** (pas de
confetti qui bloque 5 s la relance) et toujours skippables ; les niveaux 1–4
sont **rapides** pour ne pas fatiguer un joueur qui tire en série.

## D. Error states — catalogue et contrat

Chaque erreur répond aux 4 questions (quoi / que faire / mon action a-t-elle
compté / mes données sont-elles gardées).

| Cas | Message type | Issue offerte | Action comptée ? |
| --- | --- | --- | --- |
| Réponse incorrecte / défaite duel | mise en scène existante (à garder) | rejouer/plan | oui, affichée |
| Coins insuffisants | « Il te manque X 🪙 » | **liens vers les 3 sources** (entraînement/jackpot/bonus) | non débité |
| Erreur réseau | « Connexion perdue » | **bouton Réessayer** effectif + bannière hors-ligne globale | indiqué |
| Session expirée (401) | « Ta session a expiré » | **bouton Se reconnecter** + retour à la page d'origine | saisie préservée |
| Partie/tournoi introuvable | « Introuvable » | retour à la liste | n/a |
| Joueur déconnecté (chat) | indicateur de reconnexion | auto + manuel | historique resynchronisé |
| Action impossible (quota) | « Déjà fait — dispo dans Xh » (CooldownBadge) | rendez-vous daté | oui |
| Conflit temps réel (carte échangée entre-temps) | « Cette carte n'est plus disponible » | rafraîchir | non appliqué |
| Chargement trop long | skeleton → « Ça prend plus de temps que prévu » | Réessayer | n/a |
| API indisponible | page d'erreur globale (pas 5 bandeaux) | Réessayer + statut | n/a |

## E. Règles mobiles (le mobile est l'expérience principale)

- La roulette **et** son résultat tiennent ensemble sur un écran de 375×667
  (budget vertical contractuel).
- Navigation par **bottom tab bar** (5 onglets) atteignable au pouce, pas par un
  hamburger de 19 liens.
- **Zéro élément flottant** (bannière, bulle de chat) au-dessus du jeu.
- Cibles ≥ 44 px, `env(safe-area-inset-*)` respectés, feedback tactile
  (états actifs, haptics Android optionnels).
- Tableaux denses (leaderboard) → cartes empilées ; bracket → scroll horizontal
  par tour.

## F. Règles d'accessibilité (exigées dès le design system, pas rattrapées)

- Contraste AA sur tout texte porteur d'information (les couples douteux actuels
  sont corrigés dans la palette — cf. `docs/design/design-system.md`).
- Information jamais portée par la seule couleur (rareté doublée d'un texte/icône,
  % sur les jauges).
- `prefers-reduced-motion` : version équivalente en information de chaque
  animation clé.
- Modales accessibles (focus trap, Escape, `role="dialog"`) — un seul système
  d'overlay.
- `aria-live` sur les résultats de tirage/combat et les toasts.
- Réglages son (mute/volume) et animations accessibles et persistés.

## Comment utiliser ces règles

- **En conception** : chaque maquette d'écran est validée contre les sections
  A–F avant implémentation.
- **En revue de code** : les critères d'acceptation des recommandations experts
  (`docs/experts/*`) sont la traduction testable de ces règles.
- **En test** : la stratégie de tests (`docs/technical/testing-strategy.md`)
  assertionne les règles critiques (résultat visible sans scroll, confirmation
  avant destruction, aucun message technique brut, cooldowns datés).
