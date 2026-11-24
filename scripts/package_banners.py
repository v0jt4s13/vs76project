#!/usr/bin/env python3
"""Package standalone banner HTML samples in dark and light variants."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "web" / "src" / "banner-packages"
OUTPUT = ROOT / "web" / "public" / "downloads" / "bannery"
FORMATS = {
    "leaderboard": ("750x100", "leaderboard.html"),
    "rectangle": ("300x250", "rectangle.html"),
    "skyscraper": ("300x600", "skyscraper.html"),
}

for key, (dimensions, filename) in FORMATS.items():
    source = (SOURCES / filename).read_text(encoding="utf-8")
    for theme in ("dark", "light"):
        package = f"vs76project-{dimensions}-{theme}"
        html = source.replace('class="theme-dark"', f'class="theme-{theme}"', 1)
        readme = (
            f"# Banner vs76project {dimensions} ({'jasny' if theme == 'light' else 'ciemny'} motyw)\n\n"
            "Otwórz `index.html`, aby wyświetlić banner. Kod jest samodzielny: style, animacje i grafika są osadzone w pliku HTML.\n\n"
            "Przed użyciem podmień `https://example.com/` w `href` na docelowy adres kampanii. Animacje CSS respektują `prefers-reduced-motion`.\n"
        )
        OUTPUT.mkdir(parents=True, exist_ok=True)
        with ZipFile(OUTPUT / f"{package}.zip", "w", ZIP_DEFLATED) as archive:
            archive.writestr("index.html", html)
            archive.writestr("README.md", readme)
            archive.write(ROOT / "web" / "public" / "fonts" / "noto-sans-regular.woff", "fonts/noto-sans-regular.woff")
            archive.write(ROOT / "web" / "public" / "fonts" / "noto-sans-semibold.woff", "fonts/noto-sans-semibold.woff")
            archive.write(ROOT / "web" / "public" / "fonts" / "LICENSE-Noto.txt", "fonts/LICENSE-Noto.txt")
        print(OUTPUT / f"{package}.zip")
