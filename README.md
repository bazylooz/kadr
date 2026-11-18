# Kadr — Private Photo Editing & Compression

A modern, minimalist desktop and web application for compressing, resizing, and redacting photos. **Runs 100% locally** — files never leave your device. No cloud backend, accounts, telemetry, or server uploads.

## Features

- **Image Upload** — drag and drop or select a file (JPG, PNG, WebP).
- **Clipboard** — paste a screenshot using `Ctrl+V` or the "Paste from clipboard" button.
- **Live Preview** — interactive canvas, fit-to-window, zoom, and 1:1 scale.
- **Before / After** — hold the "Hold: original" button to view the unedited photo.
- **Compression** — 10–100% quality slider with real-time file size estimation.
- **Resizing** — presets (Original, 1920 px Full HD, 1080 px Social media, 800 px Documents/official forms) as well as custom dimensions with aspect ratio lock.
- **Redaction** — pixelate or blur brush for sensitive data, brush size adjustment, undo, and clear.
- **EXIF Stripping** — metadata (GPS, camera model, date) is automatically removed upon export as the image is re-encoded from scratch.
- **Export** — JPG, PNG, WebP, or PDF (single page fitted to the image).
- **Theme** — dark mode by default, with a light/dark toggle saved in `localStorage`.

## Tech Stack

- **Frontend:** React 19 + Vite, Tailwind CSS 4, Lucide Icons
- **Desktop & Native Processing:** Tauri 2 + Rust (`src-tauri/src/imaging/`) — high-speed native image redaction/censoring, encoding/compression, and PDF generation
- **Web Fallback:** HTML5 Canvas API & jsPDF (dynamically loaded on PDF export when running in a browser)

## Getting Started (Web Mode)

```bash
npm install
npm run dev
```

The application will be available at the address displayed by Vite (default: `http://localhost:5173`).

## Production Build (Web)

```bash
npm run build
npm run preview
```

The `dist/` directory contains a fully static application — it can be hosted on any file server or CDN and requires no API or database.

## Desktop Application (Tauri 2 + Rust)

The project includes a native Tauri 2 backend in the `src-tauri/` directory. Image processing operations (censoring/redaction, format encoding, and PDF assembly) are offloaded to Rust for maximum performance and low memory overhead.

**Prerequisites:** Rust (MSVC toolchain) and Visual Studio Build Tools with the "Desktop development with C++" workload.

```bash
# development mode (Vite + native window)
npm run desktop:dev

# production build -> src-tauri/target/release/Kadr.exe
npm run desktop:build
```

**Build outputs:**
- `src-tauri/target/release/Kadr.exe` — standalone application (WebView2).
- `src-tauri/target/release/bundle/nsis/Kadr_1.0.0_x64-setup.exe` — NSIS installer.

In the native desktop app, image processing and PDF generation execute natively in Rust, and file exports (JPG/PNG/WebP/PDF) use the system "Save As" dialog via the Tauri `dialog` plugin configured in `src-tauri/capabilities/default.json`.

## Privacy

- All image decoding, redaction, and re-encoding happen strictly locally on your machine (natively in Rust on desktop, or in browser memory on web).
- Exporting generates a clean file from raw pixel buffers; no EXIF or GPS metadata is preserved.
- The application makes zero network requests to external services and uses no external fonts or analytics.
- The only local storage used is the theme preference in `localStorage`.
