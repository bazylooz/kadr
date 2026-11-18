mod commands;
mod imaging;

use std::io::Write;

use imaging::ImageStore;

/// Zapisuje bajty pliku w ścieżce wskazanej przez użytkownika.
#[tauri::command]
fn write_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
  let target = std::path::PathBuf::from(path);

  if target.as_os_str().is_empty() {
    return Err("Nie wybrano ścieżki zapisu.".into());
  }

  if let Some(parent) = target.parent() {
    if !parent.as_os_str().is_empty() && !parent.exists() {
      std::fs::create_dir_all(parent)
        .map_err(|error| format!("Nie można utworzyć katalogu docelowego: {error}"))?;
    }
  }

  let mut file =
    std::fs::File::create(&target).map_err(|error| format!("Nie można utworzyć pliku: {error}"))?;

  file
    .write_all(&bytes)
    .map_err(|error| format!("Nie można zapisać danych: {error}"))?;

  file.flush().map_err(|error| error.to_string())?;

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .manage(ImageStore::new())
    .invoke_handler(tauri::generate_handler![
      write_file,
      commands::load_image,
      commands::estimate_image,
      commands::render_image,
      commands::export_image,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
