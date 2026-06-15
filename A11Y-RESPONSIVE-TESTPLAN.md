# A11Y & Responsive Testplan

Dieser Testplan verifiziert die Anforderungen aus README.md.

## 1. Tastatur-Navigation

- `Tab` durch die komplette Filterleiste: Fokus muss jederzeit sichtbar sein.
- `Enter` auf jedem Filter-Button: Panel muss aufgehen.
- `Escape` in offenem Panel: Panel muss schließen und Fokus zum auslösenden Button zurück.
- `Tab`/`Shift+Tab` in offenem Panel: Fokus darf das Panel nicht verlassen.
- `Enter`/`Leertaste` auf Kreis-Kategorien: Auswahl/Navigation muss funktionieren.

## 2. Screenreader-Prüfung

- Filter-Buttons: korrekte Ansage inkl. aktueller Auswahlanzahl.
- Dialogtitel werden korrekt vorgelesen (Marke/Farbe/Größe/Sortieren).
- Swatches: Farbe wird als Name vorgelesen.
- Sale/Neu Toggle: beide Schalter haben sinnvolle Labels.
- Statusänderungen (Öffnen/Schließen/Anwenden/Zurücksetzen) werden angekündigt.

## 3. Visuelle Zugänglichkeit

- Fokusindikator überall klar sichtbar (Button, Toggle, Swatch, Link, Chevron).
- Kontrast prüfen für Text und interaktive Zustände (Normal/Hover/Fokus/Aktiv).
- Tooltips werden nicht abgeschnitten (insb. erste Swatch-Reihe).

## 4. Reduced Motion

OS-Einstellung "Bewegung reduzieren" aktivieren und prüfen:

- Header-Marquee ist statisch.
- Hover-Scale-Effekte auf Pills sind deaktiviert.
- Filterbar-Transitionen sind deaktiviert.

## 5. Responsive Breakpoints

Mindestens diese Breiten testen:

- 320px (kleines Smartphone)
- 375px (iPhone)
- 768px (iPad Portrait)
- 1024px (iPad Landscape)
- >= 1280px (Laptop/Desktop)

Zu prüfen:

- Kein horizontales Gesamt-Overflow der Seite.
- Panels bleiben innerhalb des Viewports.
- Touch-Targets sind bedienbar.
- Navigationselemente überlappen nicht.

## 6. Browser-Matrix

- iOS Safari
- Android Chrome
- Desktop Chrome
- Desktop Firefox
- Desktop Edge

## 7. Abnahme-Kriterien

- Keine Blocker bei Tastatur- oder Screenreader-Bedienung.
- Keine abgeschnittenen oder unlesbaren Interaktionselemente.
- Keine ungewollten Bewegungen bei aktivierter Reduced-Motion-Einstellung.
- Konsistentes Verhalten über alle oben genannten Viewports und Browser.
