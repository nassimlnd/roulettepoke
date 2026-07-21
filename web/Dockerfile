# syntax=docker/dockerfile:1

# ─── Étape 1 : build du SPA statique (ssr:false → fichiers statiques) ──────────
FROM node:22-slim AS build
WORKDIR /app

# pnpm est piloté par le champ "packageManager" du package.json.
RUN corepack enable

# Dépendances d'abord (cache Docker). --ignore-scripts : le postinstall
# `nuxt prepare` a besoin du code source (copié juste après), et les binaires
# natifs (esbuild, oxide…) sont en "allowBuilds:false" → prebuilt, rien à compiler.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Code source + génération statique. Le build télécharge les polices
# (@nuxt/fonts) : cette étape a besoin d'un accès réseau sortant.
COPY . .
RUN pnpm exec nuxi generate

# ─── Étape 2 : runtime Nginx (sert le statique + proxifie /api & /images) ──────
FROM nginx:stable-alpine AS runtime

# Backend proxifié. On réécrit Origin/Referer vers cette origine (le backend
# rejette tout Origin étranger). Surchargeable au run :
#   docker run -e API_TARGET=https://… -e API_HOST=…
ENV API_TARGET="https://pokeroulette.poulineau.ovh" \
    API_HOST="pokeroulette.poulineau.ovh"

# Le SPA statique généré à l'étape 1.
COPY --from=build /app/.output/public /usr/share/nginx/html

# Config Nginx templatée : l'entrypoint officiel applique envsubst sur
# /etc/nginx/templates/*.template au démarrage (seules $API_TARGET/$API_HOST
# sont substituées ; les variables nginx comme $uri/$http_upgrade sont préservées).
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
# CMD hérité de l'image nginx (entrypoint → envsubst → nginx -g 'daemon off;').
