mod commands;
mod images;
mod storage;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let store = storage::Store::open(&data_dir.join("mynotes.db"))?;
            app.manage(commands::AppState {
                store: Mutex::new(store),
                images_dir: data_dir.join("images"),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_notes,
            commands::load_note,
            commands::create_note,
            commands::save_note,
            commands::delete_note,
            commands::search,
            commands::get_session,
            commands::set_session,
            commands::save_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
