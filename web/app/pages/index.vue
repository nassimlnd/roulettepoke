<script setup lang="ts">
definePageMeta({ public: true })
// Connecté → jeu ; sinon → login (le middleware gère aussi la garde).
const auth = useAuthStore()
onMounted(() => {
  navigateTo(auth.isAuthenticated ? '/play' : '/login', { replace: true })
})
</script>

<template>
  <div />
</template>
