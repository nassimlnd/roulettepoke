<script setup lang="ts">
// Placeholder temporaire — remplacé par la roulette + le hub à l'étape suivante.
const auth = useAuthStore()
</script>

<template>
  <div class="space-y-4">
    <h1 class="font-display text-2xl font-extrabold">
      Salut {{ auth.user?.username }} !
    </h1>
    <p class="text-muted">
      Roulette en construction…
    </p>
  </div>
</template>
