use crate::storage::{Kind, Note, NoteMeta, Session};
use std::str::FromStr;
use std::sync::Mutex;
use tauri::State;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub struct AppState {
    pub store: Mutex<crate::storage::Store>,
    pub images_dir: std::path::PathBuf,
}

const POISONED: &str = "storage lock poisoned";

fn lock<'a>(
    mutex: &'a Mutex<crate::storage::Store>,
) -> Result<std::sync::MutexGuard<'a, crate::storage::Store>, String> {
    mutex.lock().map_err(|_| POISONED.to_string())
}

fn prune_purged_contents(state: &AppState, contents: &[String]) {
    if contents.is_empty() {
        return;
    }
    let store = match lock(&state.store) {
        Ok(store) => store,
        Err(e) => {
            eprintln!("failed to prune images after purge: {e}");
            return;
        }
    };
    for content in contents {
        if let Err(e) = crate::images::prune(&state.images_dir, Some(content), |name| {
            store.is_referenced(name).unwrap_or(true)
        }) {
            eprintln!("failed to prune images after purge: {e}");
        }
    }
}

pub const DEFAULT_HOTKEY: &str = "Ctrl+Alt+Space";
pub const HOTKEY_SETTING: &str = "hotkey";

pub fn parse_hotkey(s: &str) -> Result<Shortcut, String> {
    let shortcut = Shortcut::from_str(s).map_err(|err| err.to_string())?;
    // A bare key registered globally would be swallowed in every app.
    if shortcut.mods.is_empty() {
        return Err("The shortcut needs Ctrl, Alt, Shift or Win".to_string());
    }
    Ok(shortcut)
}

fn stored_hotkey(state: &AppState) -> Result<String, String> {
    let store = lock(&state.store)?;
    let value = store
        .get_setting(HOTKEY_SETTING)
        .map_err(|err| err.to_string())?;
    Ok(value.unwrap_or_else(|| DEFAULT_HOTKEY.to_string()))
}

#[tauri::command]
pub fn get_hotkey(state: State<'_, AppState>) -> Result<String, String> {
    stored_hotkey(&state)
}

// While the user records a new shortcut, the live one would fire and hide the window.
#[tauri::command]
pub fn suspend_hotkey(app: tauri::AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn resume_hotkey(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let shortcut = parse_hotkey(&stored_hotkey(&state)?)?;
    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();
    shortcuts.register(shortcut).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn set_hotkey(
    hotkey: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let new_shortcut = parse_hotkey(&hotkey)?;
    let old_shortcut = parse_hotkey(&stored_hotkey(&state)?).ok();
    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();

    if shortcuts.register(new_shortcut).is_err() {
        if let Some(old) = old_shortcut {
            let _ = shortcuts.register(old);
        }
        return Err(format!("{hotkey} is not available, another app may use it"));
    }

    let store = lock(&state.store)?;
    store
        .set_setting(HOTKEY_SETTING, &hotkey)
        .map_err(|err| err.to_string())?;
    Ok(hotkey)
}

#[tauri::command]
pub fn list_notes(state: State<'_, AppState>) -> Result<Vec<NoteMeta>, String> {
    let store = lock(&state.store)?;
    store.list_notes().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn load_note(id: i64, state: State<'_, AppState>) -> Result<Option<Note>, String> {
    let store = lock(&state.store)?;
    store.load_note(id).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn create_note(kind: Kind, state: State<'_, AppState>) -> Result<Note, String> {
    let store = lock(&state.store)?;
    store.create_note(kind).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn save_note(
    id: i64,
    title: String,
    content: String,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let store = lock(&state.store)?;
    store
        .save_note(id, &title, &content, &text)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn rename_note(id: i64, title: String, state: State<'_, AppState>) -> Result<String, String> {
    let store = lock(&state.store)?;
    store.rename_note(id, &title).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn set_pinned(id: i64, pinned: bool, state: State<'_, AppState>) -> Result<(), String> {
    let store = lock(&state.store)?;
    store.set_pinned(id, pinned).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn set_locked(id: i64, locked: bool, state: State<'_, AppState>) -> Result<(), String> {
    let store = lock(&state.store)?;
    store.set_locked(id, locked).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn trash_note(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let store = lock(&state.store)?;
    store.trash_note(id).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_trash(state: State<'_, AppState>) -> Result<Vec<NoteMeta>, String> {
    let store = lock(&state.store)?;
    store.list_trash().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn restore_note(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let store = lock(&state.store)?;
    store.restore_note(id).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn purge_note(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let store = lock(&state.store)?;
    let content = store
        .load_note(id)
        .map_err(|err| err.to_string())?
        .map(|n| n.content);
    store.purge_note(id).map_err(|err| err.to_string())?;
    drop(store);

    if let Some(content) = content {
        prune_purged_contents(&state, &[content]);
    }

    Ok(())
}

#[tauri::command]
pub fn empty_trash(state: State<'_, AppState>) -> Result<(), String> {
    let store = lock(&state.store)?;
    let contents = store.purge_trash(None).map_err(|err| err.to_string())?;
    drop(store);
    prune_purged_contents(&state, &contents);
    Ok(())
}

#[tauri::command]
pub fn search(query: String, state: State<'_, AppState>) -> Result<Vec<NoteMeta>, String> {
    let store = lock(&state.store)?;
    store.search(&query).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_session(state: State<'_, AppState>) -> Result<Session, String> {
    let store = lock(&state.store)?;
    store.get_session().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn set_session(session: Session, state: State<'_, AppState>) -> Result<(), String> {
    let store = lock(&state.store)?;
    store.set_session(&session).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn save_image(
    request: tauri::ipc::Request<'_>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => bytes,
        _ => return Err("expected raw image bytes".to_string()),
    };
    crate::images::save_image(&state.images_dir, bytes)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|err| err.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_hotkey_requires_a_modifier_and_a_known_key() {
        assert!(parse_hotkey("Alt+Space").is_ok());
        assert!(parse_hotkey("Ctrl+Shift+KeyN").is_ok());
        assert_eq!(
            parse_hotkey("Space").unwrap_err(),
            "The shortcut needs Ctrl, Alt, Shift or Win"
        );
        assert!(parse_hotkey("").is_err());
        assert!(parse_hotkey("Alt+Nope").is_err());
    }
}
