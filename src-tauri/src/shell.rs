use std::sync::atomic::{AtomicBool, Ordering};

use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

// VISIBLE is left out: restoring it would show the window on a `--hidden` autostart.
pub const WINDOW_STATE: StateFlags = StateFlags::all().difference(StateFlags::VISIBLE);

static FIRST_READY: AtomicBool = AtomicBool::new(true);

#[tauri::command]
pub fn app_ready(app: tauri::AppHandle) {
    let first = FIRST_READY.swap(false, Ordering::SeqCst);
    if first && std::env::args().any(|a| a == "--hidden") {
        return;
    }
    show_main(&app);
}

pub fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        // Lets the user type right away after the global shortcut or the tray.
        let _ = window.emit("focus-note", ());
    }
}

// Saved on hide, not only on exit: a tray app is usually ended by a Windows
// shutdown, which never runs the plugin's exit hook.
pub fn hide_main(app: &tauri::AppHandle) {
    if let Err(e) = app.save_window_state(WINDOW_STATE) {
        eprintln!("failed to save window state: {e}");
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

pub fn toggle_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(false);
        let focused = window.is_focused().unwrap_or(false);
        if visible && focused {
            hide_main(app);
        } else {
            show_main(app);
        }
    }
}

pub fn toggle_autostart(app: &tauri::AppHandle) {
    let autolaunch = app.autolaunch();
    match autolaunch.is_enabled() {
        Ok(enabled) => {
            if enabled {
                if let Err(e) = autolaunch.disable() {
                    eprintln!("failed to disable autostart: {e}");
                }
            } else if let Err(e) = autolaunch.enable() {
                eprintln!("failed to enable autostart: {e}");
            }
        }
        Err(e) => eprintln!("failed to query autostart: {e}"),
    }
}

pub fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "show", "Show mynotes", true, None::<&str>)?,
            &CheckMenuItem::with_id(
                app,
                "autostart",
                "Start with Windows",
                true,
                autostart_enabled,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
        ],
    )?;

    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("mynotes")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main(app),
            "autostart" => toggle_autostart(app),
            "quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}
