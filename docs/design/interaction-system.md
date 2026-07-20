# Système d'interaction

> Comment les éléments réagissent au toucher/clic/clavier. Complète les *règles*
> (`docs/product/user-experience-principles.md`), le *visuel*
> (`design-system.md`) et le *mouvement* (`animation-system.md`) par la
> **spécification comportementale** des patterns d'interaction. Sources : rapports
> UX (02), UI (03), motion (05), a11y (07).

## 1. Contrat d'états (tout élément interactif)

| État | Feedback | Timing |
| --- | --- | --- |
| hover (desktop) | fond +1 niveau ; carte : `translateY(-2px)` | 150 ms `--ease-snap` |
| press / active | `scale(0.98)` | 75 ms |
| focus-visible | `ring-2 ring-primary/60` (jamais supprimé) | immédiat |
| disabled | `opacity-50` + `cursor-not-allowed` + **raison en tooltip** | — |
| loading | spinner intégré, largeur conservée (anti double-clic) | pendant l'action |

Feedback tactile mobile : états `:active` visibles ; **haptics** Android
optionnels (`navigator.vibrate`) sur les moments clés (résultat, victoire).

## 2. Arbre de décision des overlays (un seul système)

L'ancien front a 3 systèmes d'overlay aux fermetures divergentes (m1). La refonte
en a **un** (Nuxt UI / `useOverlay`), avec un choix de contenant clair :

```text
Décision courte, bloquante (confirmer/choisir)      → UModal centrée
  └ irréversible sans annulation (choix de carte)   → UModal :dismissible="false"
Contenu latéral riche (inventaire, filtres desktop) → USlideover
Contenu mobile depuis le bas (filtres, détail)      → UDrawer (snap points, handle)
Célébration épique+ / replay                        → UModal fullscreen
Menu contextuel                                     → UDropdownMenu / UPopover
Info éphémère (succès, erreur async)                → UToast (file globale)
```

Tous fournissent focus trap + Escape + retour de focus + `role="dialog"`. **Escape
ferme toujours** (sauf `:dismissible="false"`, où l'action est obligatoire mais
**annoncée comme définitive**).

## 3. Confirmations proportionnelles au risque

| Action | Confirmation | Contenu de la modale |
| --- | --- | --- |
| Vente unitaire | oui (existant) | prix / cas shiny → charme |
| Retrait d'équipe | oui | **coût −10 🪙 ET non-restitution** rappelés ensemble |
| Vider l'équipe | oui | destruction totale |
| **Fusion** | **oui (nouveau — corrige C5)** | « 10 × Chenipan → 1 × Chrysacier » + impact éligibilité échange ; option « ne plus demander » |
| **Roulette d'équipe** | **oui (nouveau)** | « la carte tirée quitte ta collection » + pool éligible ; option « ne plus demander » |
| Choix de carte (événement) | pas d'annulation | **annoncé « ce choix est définitif »** avant engagement |
| Pari légendaire (ligue) | oui (existant — le bon modèle) | récap + % de capture |

Bouton de confirmation destructive en `warning`/`error`, **jamais présélectionné**.
« Ne plus me demander » : autorisé **uniquement** pour la fusion (destruction
répétitive à faible enjeu unitaire), jamais pour l'irréversible unique.

## 4. Politique de feedback (toasts vs inline vs live)

| Type de feedback | Canal |
| --- | --- |
| Succès async qui doit survivre à la navigation (vente, fusion, trade reçu, bonus quotidien) | **toast global** (`useToast`) |
| Résultat d'une action en cours de vue (résultat de tirage, combat) | **inline dans le viewport** + `aria-live` |
| Erreur de chargement d'une zone | **inline** (`ErrorState` réessayable) |
| Erreur réseau globale / hors-ligne | **bannière globale** unique (jamais empilée) |
| Variation de solde | **CoinCounter** animé + `aria-live` |

Jamais deux bandeaux d'erreur empilés ; jamais de message technique brut ; jamais
d'overlay flottant qui recouvre du contenu (les bannières deviennent des toasts ou
des entrées du centre de notifications).

## 5. Boutons & actions primaires

- **Un seul `solid primary` par écran** ; le reste en `soft`/`ghost`/`outline`.
- Coût total (biome + multi) affiché **avant** le clic sur Lancer.
- Toute action asynchrone passe en `loading` (conserve l'anti double-clic
  généralisé de l'existant, une vraie force à garder).
- Les filtres de la roulette restent **verrouillés pendant tout un cycle** (y
  compris une série multi-roll).

## 6. Cooldowns & états bloqués (composant unique `CountdownChip`)

- Tout état verrouillé temporel affiche **une heure de retour ou un compte à
  rebours** (jamais « Revenez demain » nu) ; le même composant sert arène,
  entraînement, jackpot, ligue, échange.
- À l'échéance atteinte (page ouverte), l'état se **déverrouille sans
  rechargement**.
- Tout état verrouillé de **progression** est un jalon (barre + objectif + CTA),
  jamais une erreur rouge.

## 7. Saisie (formulaires)

- `UForm` + `UFormField` avec **labels visibles** (fin du placeholder-label de
  l'ancien front) ; validation **live** (Zod), messages sous le champ.
- Mobile : `inputmode`/`autocomplete` corrects ; le composer du chat suit le
  `visualViewport` (reste visible clavier ouvert) ; la tab bar se masque clavier
  ouvert.
- Erreur de soumission : message humanisé sous le formulaire, saisie préservée.

## 8. Skip & interruption (théâtre)

- Tout moment de mise en scène > 2 s est **skippable** (clic/tap/Escape) →
  affichage instantané du résultat déjà déterminé (aucun avantage, cf.
  `animation-system.md` §3).
- Les replays conservent leur contrôle de vitesse (×1/×2/×4, persisté) et le skip
  au clic — déjà bien fait dans l'existant.

## 9. Temps réel

- Chat : reconnexion silencieuse (existant) **mais** indicateur visible d'une
  déconnexion durable et d'un bannissement (aujourd'hui muets).
- Trades/tournoi : polling au `focus`/`visibilitychange` ; changement d'état →
  entrée dans le centre de notifications + badge **numéroté**.

## 10. Ce que l'interaction préserve de l'existant

Boutons désactivés pendant l'action, verrouillage des filtres pendant un spin,
skip des replays, résolution serveur avant animation, modales d'intro
pédagogiques, reconnexion+resync du chat — autant de comportements corrects à
**porter tels quels**.
