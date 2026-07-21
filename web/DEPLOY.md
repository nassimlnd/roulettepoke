# Déploiement (Docker + Nginx)

L'app est un **SPA statique** (`ssr: false`) : le navigateur appelle `/api` et
`/images` en **relatif** (même origine). Le conteneur Nginx sert les fichiers
statiques **et** proxifie `/api` + `/images` vers le backend, en **réécrivant
l'en-tête `Origin`** (le backend rejette toute origine étrangère par un 500).
C'est l'équivalent prod du `devProxy` de dev.

## Construire & lancer

```bash
# depuis web/
docker build -t pokeroulette-web .
docker run -d -p 8080:80 --name pokeroulette pokeroulette-web
# → http://localhost:8080
```

Ou avec Compose :

```bash
docker compose up -d --build
```

## Configuration

Deux variables d'environnement (surchargeables au run), avec les valeurs par défaut :

| Variable     | Rôle                                              | Défaut                               |
|--------------|---------------------------------------------------|--------------------------------------|
| `API_TARGET` | Origine backend proxifiée (schéma + hôte) ; sert aussi de valeur pour `Origin`/`Referer` réécrits | `https://pokeroulette.poulineau.ovh` |
| `API_HOST`   | Hôte envoyé dans l'en-tête `Host` (+ SNI TLS)     | `pokeroulette.poulineau.ovh`         |

```bash
docker run -d -p 8080:80 \
  -e API_TARGET=https://mon-backend.example.fr \
  -e API_HOST=mon-backend.example.fr \
  pokeroulette-web
```

> Il n'y a **aucune** URL d'API dans le build : le SPA appelle toujours `/api`
> en relatif. C'est Nginx (`API_TARGET`) qui décide où ça part. `NUXT_API_TARGET`
> ne concerne que le `devProxy` de développement.

## TLS

Le conteneur écoute en **HTTP sur :80**. En prod, termine le **TLS en amont**
(load-balancer cloud, Traefik, ou un Nginx/Caddy de bord avec tes certificats)
qui transmet ensuite à ce conteneur. Le WebSocket du chat (`/api/ws/chat`) passe
par la même règle `/api/` — l'upgrade fonctionne car l'`Origin` y est réécrit.

## Cas « même domaine que le backend »

Si tu sers l'app depuis le domaine du backend lui-même, la réécriture d'`Origin`
n'est pas nécessaire (l'origine correspond déjà). Tu peux alors te passer du proxy
`/api` et pointer Nginx uniquement sur le statique — mais garder ce conteneur
tel quel marche aussi.
