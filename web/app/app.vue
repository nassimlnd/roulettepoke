<script setup lang="ts">
useSeoMeta({
  title: 'PokeRoulette',
  description: 'Le jeu gacha de collection Pokémon entre amis.'
})
</script>

<template>
  <UApp :toaster="{ position: 'top-center' }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
