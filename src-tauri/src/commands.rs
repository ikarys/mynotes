use crate::storage::{Kind, Note, NoteMeta, Session};
use std::sync::Mutex;
use tauri::State;

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
pub fn delete_note(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let store = lock(&state.store)?;
    store.delete_note(id).map_err(|err| err.to_string())
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
