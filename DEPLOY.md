# Déploiement (Docker + Nginx)

Deux services :

- **`web`** — le frontend Nuxt buildé, lancé comme **serveur Node** (Nitro) sur
  le port **3000** (interne au réseau Docker).
- **`nginx`** — **reverse-proxy** : `/api` et `/images` → backend (en réécrivant
  l'en-tête `Origin`, sinon le backend rejette l'origine étrangère par un 500) ;
  tout le reste → le service `web`. C'est l'équivalent prod du `devProxy` de dev.

Le navigateur ne voit qu'une seule origine (nginx) : les appels `/api` du SPA
restent same-origin, et nginx les réécrit/route vers le backend.

## Construire & lancer

```bash
# depuis la racine du repo
docker compose up -d --build
# → http://localhost:8080
```

`web` est buildé depuis le `Dockerfile` (Node build → serveur Nitro autonome) ;
`nginx` utilise l'image officielle + le template monté en volume.

## Configuration

Variables d'environnement du service **nginx** (le proxy), surchargeables :

| Variable     | Rôle                                                                 | Défaut                               |
|--------------|----------------------------------------------------------------------|--------------------------------------|
| `API_TARGET` | Origine backend proxifiée (schéma + hôte) ; sert aussi à réécrire `Origin`/`Referer` | `https://pokeroulette.poulineau.ovh` |
| `API_HOST`   | Hôte envoyé dans `Host` (+ SNI TLS) vers le backend                  | `pokeroulette.poulineau.ovh`         |

Le service **web** écoute sur `NITRO_HOST=0.0.0.0` / `NITRO_PORT=3000` (réglables).

> Il n'y a **aucune** URL d'API dans le build : le SPA appelle toujours `/api`
> en relatif. C'est nginx (`API_TARGET`) qui décide où ça part. `NUXT_API_TARGET`
> ne concerne que le `devProxy` de développement.

## TLS

Nginx écoute en **HTTP sur :80** (publié sur `:8080`). En prod, termine le **TLS
en amont** (load-balancer cloud, Traefik, ou un Nginx/Caddy de bord avec tes
certificats) qui transmet à ce service. Le WebSocket du chat (`/api/ws/chat`)
passe par la règle `/api/` — l'upgrade fonctionne car l'`Origin` y est réécrit.

## Lancer sans Compose (2 conteneurs sur un réseau)

```bash
docker network create pkrnet
docker build -t pokeroulette-web .
docker run -d --name web --network pkrnet \
  -e NITRO_HOST=0.0.0.0 -e NITRO_PORT=3000 pokeroulette-web
docker run -d --name nginx --network pkrnet -p 8080:80 \
  -e API_TARGET=https://pokeroulette.poulineau.ovh -e API_HOST=pokeroulette.poulineau.ovh \
  -v "$PWD/nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro" \
  nginx:stable-alpine
```
