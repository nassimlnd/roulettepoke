// https://nuxt.com/docs/api/configuration/nuxt-config

// Backend cible pour le proxy /api en développement (l'app est servie
// same-origin en production, donc aucun proxy n'est nécessaire au build).
const API_TARGET = process.env.NUXT_API_TARGET || 'https://pokeroulette.poulineau.ovh'

// URL PUBLIQUE du site (le front est servi sur ce domaine, distinct du backend
// API) — pour les métadonnées absolues (Open Graph, Twitter Card, canonical, et
// donc l'og:image). Surchargeable via l'env (NUXT_PUBLIC_SITE_URL) au déploiement.
const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL || 'https://roulettepoke.nassimlounadi.fr'
const SITE_NAME = 'PokéRoulette'
const SITE_TITLE = 'PokéRoulette — Ouvre, collectionne, deviens Maître'
// ≤ 125 caractères : au-delà, les aperçus sociaux tronquent (surtout sur mobile).
const SITE_DESC = 'Ouvre des boosters, complète ton Pokédex et pars à l\'aventure en combats réels — jusqu\'au légendaire.'
const OG_IMAGE = `${SITE_URL}/og-image.png`

export default defineNuxtConfig({
  // L'accueil `/` est une landing PUBLIQUE : les métadonnées globales ci-dessous
  // (dans le HTML initial servi, même en SPA) sont ce que voient les crawlers et
  // les aperçus de partage. Le reste du jeu est derrière login.

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  ssr: false,

  // Composants référencés par nom de fichier (sans préfixe de dossier) :
  // <AppNavbar>, <HoloCard>, <BoosterPack>… plutôt que <BaseAppNavbar>.
  components: [{ path: '~/components', pathPrefix: false }],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: SITE_TITLE,
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: SITE_DESC },
        { name: 'author', content: SITE_NAME },
        { name: 'theme-color', content: '#e8402f' },
        // Open Graph (Facebook, Discord, LinkedIn, iMessage…)
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:title', content: SITE_TITLE },
        { property: 'og:description', content: SITE_DESC },
        { property: 'og:url', content: SITE_URL },
        { property: 'og:image', content: OG_IMAGE },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'PokéRoulette — ouvre, collectionne, deviens Maître' },
        { property: 'og:locale', content: 'fr_FR' },
        // Twitter / X
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: SITE_TITLE },
        { name: 'twitter:description', content: SITE_DESC },
        { name: 'twitter:image', content: OG_IMAGE },
        { name: 'twitter:image:alt', content: 'PokéRoulette — ouvre, collectionne, deviens Maître' }
      ],
      // Icônes générées depuis le vrai logo de l'app (composant PokeBall).
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48.png' },
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'canonical', href: SITE_URL }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  // Clair par défaut (univers Pokémon blanc/gris ; le sombre reste activable).
  colorMode: {
    preference: 'light',
    fallback: 'light'
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

  // Polices auto-hébergées au build (aucun CDN au runtime). Direction Mochidex.
  fonts: {
    families: [
      { name: 'Fredoka', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Nunito', provider: 'google', weights: [400, 600, 700, 800] }
    ]
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
