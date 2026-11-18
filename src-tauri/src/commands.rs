//! Komendy IPC łączące interfejs (React) z silnikiem obrazów w Ruście.

use std::path::{Path, PathBuf};

use serde::Deserialize;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::imaging::{tr, ImageStore, RenderOptions, SavedFile};

/// Wczytuje bajty zdjęcia do magazynu i zwraca identyfikator operacji.
///
/// Bajty przychodzą jako surowe ciało żądania IPC (`Uint8Array` po stronie JS),
/// więc nie ma kosztownego kodowania do JSON.
#[tauri::command]
pub fn load_image(state: State<'_, ImageStore>, request: Request<'_>) -> Result<u64, String> {
  let bytes = match request.body() {
    InvokeBody::Raw(data) => data.clone(),
    _ => return Err("Expected raw image bytes.".to_string()),
  };

  if bytes.is_empty() {
    return Err("Empty image payload.".to_string());
  }

  state.insert(bytes)
}

/// Zwraca rozmiar pliku wynikowego (bez przesyłania bajtów do interfejsu).
#[tauri::command]
pub async fn estimate_image(
  state: State<'_, ImageStore>,
  options: RenderOptions,
) -> Result<u64, String> {
  let store = state.handle();

  tauri::async_runtime::spawn_blocking(move || store.render(&options).map(|bytes| bytes.len() as u64))
    .await
    .map_err(|error| error.to_string())?
}

/// Renderuje zdjęcie i zwraca gotowe bajty (np. do podglądu lub testów).
#[tauri::command]
pub async fn render_image(
  state: State<'_, ImageStore>,
  options: RenderOptions,
) -> Result<Response, String> {
  let store = state.handle();

  let bytes = tauri::async_runtime::spawn_blocking(move || store.render(&options))
    .await
    .map_err(|error| error.to_string())??;

  Ok(Response::new(bytes))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportOptions {
  #[serde(flatten)]
  pub render: RenderOptions,
  pub file_name: String,
  pub dialog_title: String,
  pub filter_name: String,
  /// Ścieżka podana z góry — pomija okno dialogowe (np. eksport programowy).
  #[serde(default)]
  pub target_path: Option<String>,
}

/// Renderuje zdjęcie w Ruście, otwiera natywne okno „Zapisz jako” i zapisuje plik.
///
/// Bajty nigdy nie wracają do WebView2 — cała ścieżka (render → zapis) jest natywna.
#[tauri::command]
pub async fn export_image(
  app: AppHandle,
  state: State<'_, ImageStore>,
  options: ExportOptions,
) -> Result<Option<SavedFile>, String> {
  let store = state.handle();
  let render = options.render.clone();

  let bytes = tauri::async_runtime::spawn_blocking(move || store.render(&render))
    .await
    .map_err(|error| error.to_string())??;

  let extension = Path::new(&options.file_name)
    .extension()
    .and_then(|value| value.to_str())
    .unwrap_or("bin")
    .to_string();

  let path = match options.target_path {
    Some(path) => PathBuf::from(path),
    None => {
      let mut dialog = app
        .dialog()
        .file()
        .set_title(options.dialog_title)
        .set_file_name(options.file_name)
        .add_filter(options.filter_name, &[extension.as_str()]);

      if let Ok(downloads) = app.path().download_dir() {
        dialog = dialog.set_directory(downloads);
      }

      // Wersja asynchroniczna: okno obsługuje wątek UI, więc nie blokujemy
      // wątku roboczego runtime'u, gdy użytkownik wybiera miejsce zapisu.
      let (sender, receiver) = std::sync::mpsc::channel();
      dialog.save_file(move |selected| {
        let _ = sender.send(selected);
      });

      let selected = tauri::async_runtime::spawn_blocking(move || receiver.recv().ok().flatten())
        .await
        .map_err(|error| error.to_string())?;

      let Some(target) = selected else {
        return Ok(None);
      };

      target.into_path().map_err(|error| error.to_string())?
    }
  };

  let size = bytes.len() as u64;
  let written = path.clone();

  tauri::async_runtime::spawn_blocking(move || write_bytes(&written, &bytes))
    .await
    .map_err(|error| error.to_string())??;

  Ok(Some(SavedFile {
    path: path.to_string_lossy().to_string(),
    size,
  }))
}

fn write_bytes(target: &PathBuf, bytes: &[u8]) -> Result<(), String> {
  if let Some(parent) = target.parent() {
    if !parent.as_os_str().is_empty() && !parent.exists() {
      std::fs::create_dir_all(parent)
        .map_err(|error| format!("Nie można utworzyć katalogu docelowego: {error}"))?;
    }
  }

  std::fs::write(target, bytes)
    .map_err(|error| format!("{}: {error}", tr("pl", "Nie można zapisać pliku", "Could not write the file")))
}
