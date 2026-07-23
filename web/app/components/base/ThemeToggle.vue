<script setup lang="ts">
// Bascule rapide clair / sombre. Le réglage complet (dont « Système ») vit dans
// les Réglages ; ce bouton fait l'aller-retour direct. L'icône annonce la
// destination du clic : lune quand on est en clair, soleil quand on est en sombre.
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="isDark ? 'Passer en mode clair' : 'Passer en mode sombre'"
    :title="isDark ? 'Mode clair' : 'Mode sombre'"
    @click="toggle"
  >
    <UIcon
      :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
      class="size-5"
    />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  color: var(--ui-text-muted);
  background: transparent;
  transition: color .15s ease, background .15s ease;
}
.theme-toggle:hover { color: var(--ui-text); background: var(--ui-bg-muted); }
.theme-toggle:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 2px; }
</style>
