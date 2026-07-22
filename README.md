# Encyclopedia Metallum (Userscript)

Suche, Filter, Bandansicht und Streaming-Links als Overlay **direkt auf
metal-archives.com**. Kein Proxy, kein Server, kein API-Key.

## Dateien
| Datei | Zweck |
|---|---|
| `encyclopedia-metallum.user.js` | Das Userscript – das eigentliche Programm |
| `index.html` | Installationsseite zum Weitergeben an andere |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Symbole für die Seite |

Nicht mehr benötigt (alte Proxy-Variante): `app.js`, `worker.js`,
`manifest.webmanifest`.

## Was es macht
- Button **⚡ METALLUM** unten rechts auf jeder MA-Seite
- Eigene Oberfläche: Suchfeld + Filter (Genre, Land, Jahr)
- Bandansicht: Logo groß (antippbar), Foto klein (antippbar), Stammdaten,
  Diskografie mit **▶ YTM**-Button je Release, Lineup, ähnliche Bands
- Buttons: Spotify, YouTube Music, YouTube

## Weitergeben an andere (empfohlen)
Mit der Installationsseite werden aus vielen Handgriffen drei Taps.

1. Auf GitHub ein Repository anlegen (öffentlich).
2. Diese Dateien hochladen: `encyclopedia-metallum.user.js`, `index.html`,
   `icon-192.png`.
3. **Settings → Pages** → Branch `main`, Ordner `/ (root)` → Save.
4. Nach etwa einer Minute erreichbar unter
   `https://DEIN-NAME.github.io/DEIN-REPO/`

Diesen Link weitergeben. Die Seite erkennt den Browser, blendet nur die
nötigen Schritte ein und verlinkt das Skript so, dass Tampermonkey es direkt
zur Installation anbietet – kein Download, keine Dateiauswahl.

Die Seite ermittelt die Skript-Adresse selbst. Es ist nichts anzupassen,
solange beide Dateien im selben Ordner liegen.

## Selbst installieren (ohne Installationsseite)
1. Firefox installieren (Chrome unterstützt keine Erweiterungen).
2. In Firefox: Menü ⋮ → Add-ons → **Tampermonkey** hinzufügen.
3. Die Datei `encyclopedia-metallum.user.js` öffnen oder in Tampermonkey
   unter Dashboard → Dienstprogramme auswählen → Installieren.
4. `https://www.metal-archives.com/#mx` öffnen → Menü ⋮ →
   **Zum Startbildschirm hinzufügen**.

Die Verknüpfung muss aus Firefox heraus angelegt werden. Sie öffnet dann
immer Firefox – der Standardbrowser bleibt davon unberührt.

## Suche vom Homescreen (Widget-Ersatz)
Ein echtes Android-Widget kann nur eine installierte App liefern. Firefox
bringt aber ein eigenes Suchwidget mit – zusammen mit einer eigenen
Suchmaschine ergibt das ein Suchfeld auf dem Homescreen, das direkt in der
Oberfläche landet.

Das Skript nimmt dafür einen Suchbegriff aus der Adresse entgegen:

    https://www.metal-archives.com/#mx=emperor

### Eigene Suchmaschine in Firefox anlegen
1. Firefox → Menü ⋮ → **Einstellungen** → **Suche** → **Suchmaschine hinzufügen**
2. Name: `Metal Archives`
3. Adresse: `https://www.metal-archives.com/#mx=%s`
4. Kürzel (falls abgefragt): `ma`

Danach in der Adressleiste `ma emperor` eingeben – die Suche läuft sofort in
der Oberfläche. Die normale Standardsuche bleibt unverändert.

### Suchfeld auf den Homescreen
Variante A – ohne Eingriff in die Standardsuche:
Firefox-Suchwidget auf den Homescreen legen (Homescreen lange drücken →
Widgets → Firefox), antippen und mit dem Kürzel suchen: `ma emperor`.

Variante B – ein Tippen weniger:
In den Sucheinstellungen `Metal Archives` als **Standardsuchmaschine** setzen.
Dann geht jede Eingabe im Suchwidget direkt an Metal Archives. Nachteil: Auch
die normale Websuche in Firefox läuft dann dorthin.

## Update von einer älteren Version
Tampermonkey erkennt ein Skript an Name + Namespace. Eine Version mit anderem
Namen (z. B. das frühere „Metal Explorer") wird als eigenes Skript geführt und
muss im Dashboard gelöscht werden, sonst laufen beide gleichzeitig.

## Wenn kein Button erscheint
| Prüfung | Wie |
|---|---|
| Skript aktiv? | Tampermonkey öffnen – „Encyclopedia Metallum" muss eingeschaltet sein |
| Läuft es auf der Seite? | Am Rechner: F12 → Konsole → dort steht `[Encyclopedia Metallum] Userscript geladen` |
| Richtige Adresse? | Nur `https://www.metal-archives.com/...` – mit `www.` |
| Sicherheitsprüfung sichtbar? | Warten, bis die echte Seite geladen ist |
| Werbeblocker? | uBlock für die Seite testweise ausschalten |
| Button außerhalb des Bildschirms? | `#mx` an die Adresse hängen – öffnet sich die Oberfläche, läuft das Skript |

## Hinweis zur Darstellung
Das Skript setzt auf metal-archives.com ein Mobil-Viewport (die Seite bringt
keins mit). Dadurch wird die Oberfläche handybreit dargestellt. Nebeneffekt:
Auch die MA-Seite selbst rendert dann in Handybreite.

## Grenzen
- Funktioniert nur, solange die MA-Seite im Browser lädt.
- Die genutzten AJAX-Adressen sind inoffiziell und können sich ändern.
- Rein private Nutzung. Encyclopaedia Metallum ist werbefrei und
  spendenfinanziert.
