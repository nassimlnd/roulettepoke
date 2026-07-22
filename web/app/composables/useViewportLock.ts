import type { MaybeRefOrGetter } from 'vue'

// Verrou de viewport pour les overlays plein écran.
//
// La page réserve en permanence une gouttière de scrollbar (`html {
// scrollbar-gutter: stable }`, cf. main.css) pour éviter les sauts de mise en
// page entre pages qui défilent et pages qui tiennent dans l'écran. Sous un
// overlay plein écran sombre (combat, aventure, écran d'arène), cette gouttière
// vide — peinte par le navigateur AU-DESSUS des éléments `position: fixed` — se
// voit comme une bande claire sur le bord droit. On la neutralise le temps qu'un
// overlay couvre l'écran.
//
// Comptage global par référence : quand la carte d'aventure, l'écran d'arène et
// le combat se superposent, le verrou reste actif en continu et ne se relâche
// qu'au dernier overlay fermé — aucun scintillement au passage de l'un à l'autre.
let locks = 0
function acquire() {
  locks++
  if (locks === 1) document.documentElement.classList.add('viewport-locked')
}
function release() {
  locks = Math.max(0, locks - 1)
  if (locks === 0) document.documentElement.classList.remove('viewport-locked')
}

export function useViewportLock(active: MaybeRefOrGetter<boolean> = true) {
  let held = false
  const sync = (on: boolean) => {
    if (on && !held) {
      held = true
      acquire()
    } else if (!on && held) {
      held = false
      release()
    }
  }
  watch(() => toValue(active), sync, { immediate: true })
  onBeforeUnmount(() => sync(false))
}
