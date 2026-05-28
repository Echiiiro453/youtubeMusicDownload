#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      use tauri_plugin_shell::ShellExt;
      
      let app_handle = app.handle();
      let sidecar = app_handle.shell().sidecar("backend").unwrap();
      
      // Spawning sidecar in background
      let (_rx, _child) = sidecar.spawn().expect("failed to spawn sidecar");

      if cfg!(debug_assertions) {
        app_handle.plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
