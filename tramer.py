#!/usr/bin/env python3
"""Trame une photo en 1 bit (matrice de Bayer 8x8), comme la couverture de l'étang.

Usage :
    python3 tramer.py photo.jpg images/covers/ma-couverture.png
    python3 tramer.py photo.jpg sortie.png --largeur 820 --encre "#1c1c1c" --fond "#efefef"
    python3 tramer.py photo.jpg sortie.png --gamma 0.8      # photo déjà claire : moins relever les ombres

Dépendances : pip install pillow numpy   (scikit-image en option pour le contraste local)
"""
import argparse

import numpy as np
from PIL import Image


def bayer(n):
    m = np.array([[0, 2], [3, 1]])
    while m.shape[0] < n:
        m = np.block([[4 * m + 0, 4 * m + 2], [4 * m + 3, 4 * m + 1]])
    return (m + 0.5) / m.size


def hex_rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def main():
    ap = argparse.ArgumentParser(description="Trame une photo en 1 bit pour le gabarit minimal.")
    ap.add_argument("source", help="photo d'origine (jpg, png...)")
    ap.add_argument("sortie", help="fichier PNG à écrire")
    ap.add_argument("--largeur", type=int, default=820, help="largeur en pixels (820 = largeur de la couverture)")
    ap.add_argument("--encre", default="#1c1c1c", help="couleur des pixels sombres")
    ap.add_argument("--fond", default="#efefef", help="couleur des pixels clairs")
    ap.add_argument("--gamma", type=float, default=0.62, help="< 1 éclaircit les ombres, > 1 assombrit")
    ap.add_argument("--sans-contraste-local", action="store_true", help="désactive l'égalisation CLAHE")
    a = ap.parse_args()

    im = Image.open(a.source).convert("RGB")
    h = round(im.height * a.largeur / im.width)
    im = im.resize((a.largeur, h), Image.LANCZOS)

    rgb = np.asarray(im, dtype=np.float64) / 255.0
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

    # Étirement des niveaux, puis relevé des ombres
    lo, hi = np.percentile(lum, [1, 99.7])
    lum = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1) ** a.gamma

    # Contraste local, si scikit-image est installé
    if not a.sans_contraste_local:
        try:
            from skimage import exposure
            lum = exposure.equalize_adapthist(lum, clip_limit=0.012, kernel_size=96)
        except ImportError:
            pass

    t = bayer(8)
    seuil = np.tile(t, (lum.shape[0] // 8 + 1, lum.shape[1] // 8 + 1))[: lum.shape[0], : lum.shape[1]]
    bits = (lum > seuil).astype(np.uint8)

    out = Image.fromarray(bits, mode="L").convert("P")
    out.putpalette(hex_rgb(a.encre) + hex_rgb(a.fond) + [0, 0, 0] * 254)
    out.save(a.sortie, optimize=True, bits=1)
    print(f"{a.sortie} : {a.largeur}x{h}, {bits.mean():.0%} de pixels clairs")


if __name__ == "__main__":
    main()
