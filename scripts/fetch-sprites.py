#!/usr/bin/env python3
"""Rapatrie les sprites Pokémon en local, dans web/public/sprites/.

Pourquoi : les styles de sprite étaient servis par raw.githubusercontent.com,
qui n'est pas un CDN — débit limité, et surtout des requêtes qui *pendent* au
lieu d'échouer (l'événement `error` d'une <img> ne se déclenche jamais, d'où le
contournement par préchargement côté front). En local, tout est instantané,
disponible hors-ligne, et servi par le même hôte que l'application.

Deux traitements selon la nature du style :

  · Pixel art (Gen 1 à 5, Gen 7) — copié TEL QUEL. Redimensionner du pixel art
    le détruirait ; c'est au navigateur de l'agrandir en `image-rendering:
    pixelated`. Ces jeux sont minuscules de toute façon (0,4 à 5,7 Ko l'unité).

  · Rendus 3D et illustrations (HOME, Artwork) — redimensionnés à 256 px et
    convertis en WebP. La source fait 475 à 512 px pour 120 à 140 Ko, alors que
    la fenêtre d'une carte fait 105 px (210 px sur un écran 2×) : on servait
    douze fois trop de pixels. Après conversion, 10 à 12 Ko l'unité.

Gen 5 animé n'est PAS rapatrié : 18 Mo de GIF, et le ré-encodage en WebP animé
donne un fichier deux fois plus gros (mesuré) — il reste servi par jsDelivr.

Le script est idempotent et reprenable : un fichier déjà présent et non vide est
sauté. Relancer après une coupure ne retélécharge que ce qui manque.

Usage :  python3 scripts/fetch-sprites.py [--force] [--only STYLE[,STYLE...]]
Requiert : Pillow.
"""

from __future__ import annotations

import argparse
import io
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

# jsDelivr plutôt que raw.githubusercontent : vrai CDN, et il tient la charge
# des quelque 3 600 requêtes de ce script sans se faire limiter.
BASE = "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon"
OUT_ROOT = Path(__file__).resolve().parent.parent / "web" / "public" / "sprites"

# Bornes du Pokédex couvert par le jeu (Kanto + Johto).
DEX_MAX = 251

# Taille cible des styles ré-encodés. La fenêtre d'art d'une carte fait ~105 px ;
# 256 couvre confortablement les écrans 2× sans servir du 512 inutile.
TARGET_PX = 256
WEBP_QUALITY = 80


@dataclass(frozen=True)
class Style:
    key: str
    path: str
    ext: str
    # Dernier n° national disponible dans ce jeu. Gen 1 s'arrête à 151 : les
    # jeux Rouge/Bleu ne connaissaient pas Johto.
    dex_max: int = DEX_MAX
    has_shiny: bool = True
    # True = redimensionner et convertir en WebP (rendus 3D / illustrations).
    resize: bool = False


STYLES: list[Style] = [
    Style("gen1", "versions/generation-i/red-blue", "png", dex_max=151, has_shiny=False),
    Style("gen2", "versions/generation-ii/crystal", "png"),
    Style("gen3", "versions/generation-iii/emerald", "png"),
    Style("gen4", "versions/generation-iv/heartgold-soulsilver", "png"),
    Style("gen5", "versions/generation-v/black-white", "png"),
    Style("gen7", "versions/generation-vii/ultra-sun-ultra-moon", "png"),
    Style("home", "other/home", "png", resize=True),
    Style("artwork", "other/official-artwork", "png", resize=True),
]


def fetch(url: str, attempts: int = 3) -> bytes | None:
    """Renvoie le corps de la réponse, ou None sur 404. Réessaie le reste."""
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "pokeroulette-sprites/1"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if i == attempts - 1:
                raise
        except Exception:
            if i == attempts - 1:
                raise
        time.sleep(2 ** i)
    return None


def to_webp(raw: bytes) -> bytes:
    """Redimensionne en carré TARGET_PX et encode en WebP, alpha préservé."""
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    if max(im.size) > TARGET_PX:
        im = im.resize((TARGET_PX, TARGET_PX), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=WEBP_QUALITY, method=6)
    return buf.getvalue()


def job(style: Style, num: int, shiny: bool, force: bool) -> tuple[str, int]:
    """Télécharge un sprite. Renvoie (état, octets écrits)."""
    out_ext = "webp" if style.resize else style.ext
    out_dir = OUT_ROOT / style.key / ("shiny" if shiny else "")
    out = out_dir / f"{num}.{out_ext}"
    if not force and out.exists() and out.stat().st_size > 0:
        return ("sauté", out.stat().st_size)

    url = f"{BASE}/{style.path}/{'shiny/' if shiny else ''}{num}.{style.ext}"
    raw = fetch(url)
    if raw is None:
        return ("absent", 0)

    data = to_webp(raw) if style.resize else raw
    out_dir.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    return ("écrit", len(data))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="réécrit les fichiers déjà présents")
    ap.add_argument("--only", help="limite à ces styles (séparés par des virgules)")
    ap.add_argument("--workers", type=int, default=16)
    args = ap.parse_args()

    styles = STYLES
    if args.only:
        wanted = {s.strip() for s in args.only.split(",")}
        styles = [s for s in STYLES if s.key in wanted]
        unknown = wanted - {s.key for s in STYLES}
        if unknown:
            print(f"Style inconnu : {', '.join(sorted(unknown))}", file=sys.stderr)
            return 2

    grand_total = 0
    for style in styles:
        tasks = [(style, n, False) for n in range(1, style.dex_max + 1)]
        if style.has_shiny:
            tasks += [(style, n, True) for n in range(1, style.dex_max + 1)]

        written = skipped = missing = 0
        total_bytes = 0
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(job, s, n, sh, args.force) for s, n, sh in tasks]
            for f in as_completed(futures):
                state, size = f.result()
                total_bytes += size
                if state == "écrit":
                    written += 1
                elif state == "sauté":
                    skipped += 1
                else:
                    missing += 1

        grand_total += total_bytes
        note = f", {missing} absent(s)" if missing else ""
        print(
            f"{style.key:8s} {len(tasks):4d} sprites  "
            f"{written:4d} écrit(s) {skipped:4d} sauté(s){note}  "
            f"{total_bytes / 1024 / 1024:6.2f} Mo"
        )

    print(f"{'TOTAL':8s} {grand_total / 1024 / 1024:.2f} Mo dans {OUT_ROOT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
