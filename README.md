# Metal Explorer

Rein statische Web-App (nur HTML/JS) als mobil-optimierter „Skin" für
[Encyclopaedia Metallum](https://www.metal-archives.com/) mit Streaming-Links.
**Keine Installation, kein Server, keine Admin-Rechte.**

## Features
- Suche nach Bandname; Filter: Genre, Land, Gründungsjahr
- Detailansicht: Logo, Foto, Stammdaten, Lineup, Diskografie mit Review-Scores, ähnliche Bands
- Buttons je Band: Spotify, YouTube Music, YouTube
- PWA: „Zum Homescreen hinzufügen" → startet wie eine App

## Wie es funktioniert
Der Browser darf metal-archives.com wegen CORS nicht direkt abfragen. Die App
holt die Daten deshalb über einen CORS-Proxy und parst sie im Browser.
- Standard: mehrere **öffentliche Proxys mit Fallback** (kein Setup nötig).
- Optional: **eigener Cloudflare-Worker** (unter ⚙ eintragbar) für Zuverlässigkeit.

Metal Archives sitzt hinter Cloudflare. Öffentliche Proxys werden manchmal
geblockt → dann den eigenen Worker nutzen (Schritt B unten).

---

## Schritt A — Auf GitHub Pages stellen (nur Browser)

1. Auf <https://github.com> einloggen → **New repository** → Name z. B.
   `metal-explorer` → **Public** → **Create**.
2. Im leeren Repo: **uploading an existing file** anklicken.
3. Diese Dateien per Drag & Drop hochladen (alle, ohne Ordner):
   `index.html`, `app.js`, `manifest.webmanifest`,
   `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
   (`README.md`, `worker.js`, `.gitignore` optional) → **Commit changes**.
4. **Settings → Pages** → unter „Branch" `main` + `/ (root)` wählen → **Save**.
5. Nach ~1 Min erscheint dort die URL, z. B.
   `https://DEIN-NAME.github.io/metal-explorer/`. Auf dem Handy öffnen.
6. **Zum Homescreen:** iPhone (Safari): Teilen-Symbol → „Zum Home-Bildschirm".
   Android (Chrome): Menü ⋮ → „Zum Startbildschirm hinzufügen".

Suche testen. Klappt sie → fertig. Kommt „kein Proxy erreichbar" → Schritt B.

## Schritt B — Eigener Cloudflare-Worker (nur Browser, zuverlässiger)

1. Kostenloses Konto auf <https://dash.cloudflare.com> (nichts installieren).
2. Linkes Menü **Workers & Pages → Create → Create Worker** → Namen vergeben →
   **Deploy**.
3. **Edit code** öffnen, den kompletten Inhalt von `worker.js` einfügen
   (vorhandenen Beispielcode ersetzen) → **Deploy**.
4. Du bekommst eine URL wie `https://metal-xyz.DEIN-SUBDOMAIN.workers.dev`.
5. In der App oben rechts **⚙** → diese URL eintragen → **Speichern**.

Ab jetzt laufen alle Anfragen über deinen Worker. Der Worker lässt nur
metal-archives.com-URLs durch.

---

## Dateien
| Datei | Zweck |
|---|---|
| `index.html` | Oberfläche (mobil-optimiert, PWA) |
| `app.js` | Logik: Proxy-Abruf + Parsing im Browser |
| `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png` | PWA / Homescreen |
| `worker.js` | optionaler Cloudflare-Worker-Proxy (Schritt B) |

## Hinweise
- Rein private Nutzung. MA ist werbefrei/spendenfinanziert – bitte nicht spammen.
- Die AJAX-Endpunkte sind inoffiziell und können sich ändern. Bei kaputtem
  Parsing die Selektoren in `app.js` (Funktion `parseBand`) anpassen.
