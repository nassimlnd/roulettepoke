<script setup lang="ts">
definePageMeta({ public: true })
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
    <UIcon
      name="i-lucide-compass"
      class="size-12 text-dimmed"
    />
    <div>
      <h1 class="font-display text-2xl font-extrabold">
        Page introuvable
      </h1>
      <p class="mt-1 text-muted">
        Cette page n'existe pas (ou plus).
      </p>
    </div>
    <UButton
      to="/play"
      label="Retour au jeu"
    />
  </div>
</template>
