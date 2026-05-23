# BuchSammler 📚

ISBN-Scanner und Reservierungssystem für Buchsammelstellen.  
**Kostenlos · Keine Domain · Kein Server** – läuft auf GitHub Pages + Supabase.

---

## Deployment in 6 Schritten

### Schritt 1 – GitHub-Account
Registriere dich kostenlos auf [github.com](https://github.com) (falls noch nicht vorhanden).

### Schritt 2 – Repository anlegen
- Neues Repository mit dem Namen **`buchsammler`** erstellen
- Als **Public** markieren
- Ohne README initialisieren

### Schritt 3 – Dateien hochladen
Alle Dateien aus diesem ZIP per Drag-and-Drop in das Repository hochladen:
```
index.html
manifest.json
sw.js
css/style.css
js/config.js
js/app.js
supabase_setup.sql
admin/index.html
icons/icon-192.png   ← eigenes Buchsymbol 192×192 px
icons/icon-512.png   ← eigenes Buchsymbol 512×512 px
```

### Schritt 4 – GitHub Pages aktivieren
Repository → **Settings** → **Pages** → Source: `Deploy from branch` → Branch: `main` → **Save**

Deine App ist nach ca. 2 Minuten erreichbar unter:
```
https://DEIN-NAME.github.io/buchsammler/
```

### Schritt 5 – Supabase einrichten
1. Kostenloses Projekt auf [supabase.com](https://supabase.com) anlegen (Region: `eu-central-1`)
2. **SQL Editor → New Query** → Inhalt von `supabase_setup.sql` einfügen → **Run**
3. **Settings → API** → Project URL und Anon/Public Key kopieren
4. In `js/config.js` eintragen:
   ```js
   const GITHUB_USER  = 'dein-github-name';
   const SUPABASE_URL  = 'https://XXXX.supabase.co';
   const SUPABASE_ANON = 'eyJh…';
   ```
5. Datei neu in GitHub hochladen (bestehende Datei ersetzen)

### Schritt 6 – QR-Codes drucken
- App öffnen → Orte → Admin → **Stationen** → Sammelstellen anlegen
- **QR-Codes** → QR als PNG herunterladen → ausdrucken → laminieren → am Standort aufhängen

---

## Nutzung

Nutzer scannen den QR-Code am Standort mit ihrem Smartphone.  
Die App öffnet sich direkt mit der richtigen Sammelstelle vorgewählt.  
**Kein Account nötig** – nur Nickname eingeben und loslegen.

### Punkte-System (XP)
| Aktion | Punkte |
|---|---|
| Buch einstellen | +10 XP |
| Buch entnehmen & melden | +5 XP |
| Buch reservieren | +3 XP |

### Level-Stufen
| Level | XP | Icon |
|---|---|---|
| Leser | 0 | 📖 |
| Sammler | 50 | 📚 |
| Kurator | 150 | 🏛️ |
| Bibliothekar | 350 | 🦉 |
| Buchmeister | 700 | 🏆 |

---

## App auf iPhone/Android installieren

**iPhone (Safari):** Teilen-Button → „Zum Home-Bildschirm"  
**Android (Chrome):** Drei-Punkte-Menü → „App installieren"

Die App verhält sich dann wie eine native App (kein Browser-UI sichtbar).

---

## Technologie

- **Frontend:** Vanilla HTML/CSS/JS – PWA mit Service Worker
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL, kostenloser Free-Tier)
- **Hosting:** [GitHub Pages](https://pages.github.com) (kostenlos, HTTPS inklusive)
- **ISBN-Daten:** [Open Library API](https://openlibrary.org/developers/api) (kostenlos)
- **Barcode-Scan:** BarcodeDetector API (Chrome/Android nativ; iOS via Kamera + manuelle Eingabe)
