# Kadr — prywatna edycja i kompresja zdjęć

Nowoczesna, minimalistyczna aplikacja webowa do kompresji, zmiany rozmiaru i cenzurowania zdjęć. **Działa w 100% po stronie klienta** — pliki nigdy nie opuszczają urządzenia. Nie ma backendu, kont, telemetrii ani wysyłania obrazów na serwer.

## Funkcje

- **Wgrywanie zdjęć** — przeciągnij i upuść albo wybierz plik (JPG, PNG, WebP).
- **Schowek** — wklej zrzut ekranu przez `Ctrl+V` lub przycisk „Wklej ze schowka”.
- **Podgląd na żywo** — interaktywny canvas, dopasowanie do okna, zoom, skala 1:1.
- **Przed / po** — przytrzymaj przycisk „Przytrzymaj: oryginał”, aby zobaczyć zdjęcie bez zmian.
- **Kompresja** — suwak jakości 10–100% z szacowaniem rozmiaru pliku na żywo.
- **Zmiana rozmiaru** — presety (Oryginał, 1920 px Full HD, 1080 px Social media, 800 px Dokumenty/urząd) oraz własne wymiary z blokadą proporcji.
- **Cenzura** — pędzel pikselujący lub rozmywający wrażliwe dane, regulacja rozmiaru, cofanie i czyszczenie.
- **EXIF** — metadane (GPS, model aparatu, data) są automatycznie usuwane przy eksporcie, ponieważ obraz jest rysowany od nowa na canvasie.
- **Eksport** — JPG, PNG, WebP lub PDF (jedna strona dopasowana do zdjęcia).
- **Motyw** — domyślnie ciemny, z przełącznikiem jasny/ciemny zapisywanym w `localStorage`.

## Stos technologiczny

- React 19 + Vite
- Tailwind CSS 4
- Lucide Icons
- jsPDF (ładowany dynamicznie tylko przy eksporcie PDF)
- HTML5 Canvas API — cała obróbka obrazu

## Uruchomienie

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem wyświetlonym przez Vite (domyślnie `http://localhost:5173`).

## Build produkcyjny

```bash
npm run build
npm run preview
```

Folder `dist/` zawiera w pełni statyczną aplikację — można ją hostować na dowolnym serwerze plików lub CDN. Nie potrzebuje żadnego API ani bazy danych.

## Aplikacja desktopowa (Tauri 2 + WebView2)

Projekt zawiera powłokę Tauri w katalogu `src-tauri/`. Wymagania: Rust (toolchain MSVC) oraz Visual Studio Build Tools z obciążeniem „Desktop development with C++”.

```bash
# tryb developerski (Vite + okno natywne)
npm run desktop:dev

# build produkcyjny → src-tauri/target/release/Kadr.exe
npm run desktop:build
```

Wyniki:
- `src-tauri/target/release/Kadr.exe` — samodzielna aplikacja (WebView2),
- `src-tauri/target/release/bundle/nsis/Kadr_1.0.0_x64-setup.exe` — instalator NSIS.

W oknie natywnym eksport plików (JPG/PNG/WebP/PDF) korzysta z systemowego okna „Zapisz jako” i zapisuje bajty bezpośrednio na dysku — dzięki temu PDF z jsPDF działa niezależnie od mechanizmu pobierania WebView2. Uprawnienia okna i wtyczki `dialog` opisuje `src-tauri/capabilities/default.json`.

## Prywatność

- Obrazy są dekodowane i przetwarzane wyłącznie w pamięci przeglądarki.
- Eksport tworzy nowy plik za pomocą `canvas.toBlob()`; nie są kopiowane żadne metadane EXIF.
- Aplikacja nie wykonuje żadnych żądań sieciowych do zewnętrznych usług i nie korzysta z zewnętrznych fontów ani analityki.
- Jedyny zapis lokalny to preferencja motywu w `localStorage`.
