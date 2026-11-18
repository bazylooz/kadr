# Kadr — Private Photo Editing & Compression

A modern, minimalist web application for compressing, resizing, and redacting photos. **Runs 100% client-side** — files never leave your device. No backend, accounts, telemetry, or server uploads.

## Features

- **Image Upload** — drag and drop or select a file (JPG, PNG, WebP).
- **Clipboard** — paste a screenshot using `Ctrl+V` or the "Paste from clipboard" button.
- **Live Preview** — interactive canvas, fit-to-window, zoom, and 1:1 scale.
- **Before / After** — hold the "Hold: original" button to view the unedited photo.
- **Compression** — 10–100% quality slider with real-time file size estimation.
- **Resizing** — presets (Original, 1920 px Full HD, 1080 px Social media, 800 px Documents/official forms) as well as custom dimensions with aspect ratio lock.
- **Redaction** — pixelate or blur brush for sensitive data, brush size adjustment, undo, and clear.
- **EXIF Stripping** — metadata (GPS, camera model, date) is automatically removed upon export as the image is redrawn from scratch on the canvas.
- **Export** — JPG, PNG, WebP, or PDF (single page fitted to the image).
- **Theme** — dark mode by default, with a light/dark toggle saved in `localStorage`.

## Tech Stack

- React 19 + Vite
- Tailwind CSS 4
- Lucide Icons
- jsPDF (dynamically loaded only on PDF export)
- HTML5 Canvas API — all image processing

## Getting Started

```bash
npm install
npm run dev
```

The application will be available at the address displayed by Vite (default: `http://localhost:5173`).

## Production Build

```bash
npm run build
npm run preview
```

The `dist/` directory contains a fully static application — it can be hosted on any file server or CDN and requires no API or database.

## Desktop Application (Tauri 2 + WebView2)

The project includes a Tauri wrapper in the `src-tauri/` directory. Prerequisites: Rust (MSVC toolchain) and Visual Studio Build Tools with the "Desktop development with C++" workload.

```bash
# development mode (Vite + native window)
npm run desktop:dev

# production build -> src-tauri/target/release/Kadr.exe
npm run desktop:build
```

Build outputs:
- `src-tauri/target/release/Kadr.exe` — standalone application (WebView2),
- `src-tauri/target/release/bundle/nsis/Kadr_1.0.0_x64-setup.exe` — NSIS installer.

In the native window, file exports (JPG/PNG/WebP/PDF) use the system "Save As" dialog and write bytes directly to disk — allowing jsPDF exports to work independently of WebView2's download mechanism. Window permissions and the `dialog` plugin are configured in `src-tauri/capabilities/default.json`.

## Privacy

- Images are decoded and processed exclusively in browser memory.
- Exporting creates a new file using `canvas.toBlob()`; no EXIF metadata is copied over.
- The application makes zero network requests to external services and uses no external fonts or analytics.
- The only local storage used is the theme preference in `localStorage`.
```
