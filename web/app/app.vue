<!-- Racine de l'app. Les métadonnées SEO (title, description, Open Graph…) sont
     définies une seule fois dans nuxt.config.ts › app.head — pas de useSeoMeta
     ici pour éviter une seconde source divergente. -->
<template>
  <UApp :toaster="{ position: 'top-center' }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
