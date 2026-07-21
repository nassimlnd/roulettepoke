# syntax=docker/dockerfile:1

# ─── Étape 1 : build de l'app (→ serveur Nitro autonome) ───────────────────────
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

# L'app Nuxt vit dans web/. Dépendances d'abord (cache Docker). --ignore-scripts :
# le postinstall `nuxt prepare` a besoin du code source (copié juste après), et les
# binaires natifs (esbuild, oxide…) sont en "allowBuilds:false" → prebuilt.
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Code source + build. `nuxt build` produit .output/ (serveur Node Nitro qui sert
# le SPA + ses assets). Télécharge les polices (@nuxt/fonts) → accès réseau requis.
COPY web/ ./
RUN pnpm build

# ─── Étape 2 : runtime (serveur Node) ──────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

# La sortie Nitro est autonome (deps serveur bundlées) : pas de node_modules ni
# de source à copier, juste .output.
COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
