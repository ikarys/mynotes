mod commands;
mod export;
mod images;
mod shell;
mod storage;

use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_global_shortcut::{Builder as ShortcutBuilder, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            shell::show_main(app)
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let store = storage::Store::open(&data_dir.join("mynotes.db"))?;
            app.manage(commands::AppState {
                store: Mutex::new(store),
                images_dir: data_dir.join("images"),
            });

            shell::build_tray(app)?;

            if !cfg!(debug_assertions) {
                let marker = data_dir.join("autostart-initialized");
                if !marker.exists() {
                    let autolaunch = app.autolaunch();
                    if let Err(e) = autolaunch.enable() {
                        eprintln!("failed to enable autostart on first run: {e}");
                    }
                    if let Err(e) = std::fs::write(&marker, "") {
                        eprintln!("failed to write autostart marker: {e}");
                    }
                }
            }

            match ShortcutBuilder::new().with_shortcuts(["ctrl+alt+space"]) {
                Ok(builder) => {
                    let plugin = builder
                        .with_handler(|app, _shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                shell::toggle_main(app);
                            }
                        })
                        .build();
                    if let Err(e) = app.handle().plugin(plugin) {
                        eprintln!("failed to register global shortcut: {e}");
                    }
                }
                Err(e) => eprintln!("failed to configure global shortcut: {e}"),
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
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
            shell::app_ready,
            export::export_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
