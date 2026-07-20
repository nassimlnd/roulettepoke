<script setup lang="ts">
// Layout public : carte centrée, sans navbar ni stores de jeu.
</script>

<template>
  <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-default px-4">
    <div
      class="phosphor-dots pointer-events-none absolute inset-0 opacity-40"
      aria-hidden="true"
    />
    <div class="relative w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>
