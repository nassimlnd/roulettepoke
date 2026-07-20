// https://nuxt.com/docs/api/configuration/nuxt-config

// Backend cible pour le proxy /api en développement (l'app est servie
// same-origin en production, donc aucun proxy n'est nécessaire au build).
const API_TARGET = process.env.NUXT_API_TARGET || 'https://pokeroulette.poulineau.ovh'

export default defineNuxtConfig({
  // Jeu 100 % authentifié derrière login : aucun SEO utile, aucun état à hydrater.

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  ssr: false,

  // Composants référencés par nom de fichier (sans préfixe de dossier) :
  // <AppNavbar>, <GameCard>, <RouletteStrip>… plutôt que <BaseAppNavbar>.
  components: [{ path: '~/components', pathPrefix: false }],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
      link: [{ rel: 'icon', href: '/favicon.ico' }]
    }
  },

  css: ['~/assets/css/main.css'],

  // Dark-first (le clair reste un P3 activable ; cf. design system).
  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },

  compatibilityDate: '2026-06-30',

  // En dev, on tape sur le vrai backend via un proxy same-origin (le WebSocket
  // du chat est proxifié par le devProxy nitro) ; en prod, le reverse-proxy sert
  // /api à côté de l'app. On réécrit Origin/Referer sur l'origine du backend :
  // celui-ci rejette (500) les requêtes cross-origin (Origin=localhost), ce qui
  // ne se produit pas en production (app same-origin).
  nitro: {
    devProxy: {
      '/api': {
        target: `${API_TARGET}/api`,
        changeOrigin: true,
        ws: true,
        headers: { origin: API_TARGET, referer: `${API_TARGET}/` }
      },
      // Sprites Pokémon, badges, icônes de types — servis par le backend.
      '/images': { target: `${API_TARGET}/images`, changeOrigin: true }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // SPA : on bundle les icônes utilisées côté client (scan du code) pour ne
  // JAMAIS dépendre du réseau (l'API Iconify est bloquée dans cet environnement).
  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 512
    }
  }
})
