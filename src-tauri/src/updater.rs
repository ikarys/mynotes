use serde::Serialize;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub installed: bool,
}

#[cfg(target_os = "linux")]
fn is_installed() -> bool {
    // The updater can only replace an AppImage (it sets APPIMAGE); a .deb belongs
    // to the package manager, so its users get the download page instead.
    std::env::var_os("APPIMAGE").is_some()
}

#[cfg(not(target_os = "linux"))]
fn is_installed() -> bool {
    // The NSIS installer puts it there; the portable exe has none, and installing
    // an update over it would create a second copy.
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|dir| dir.join("uninstall.exe").exists()))
        .unwrap_or(false)
}

#[tauri::command]
pub async fn check_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    Ok(update.map(|update| UpdateInfo {
        version: update.version,
        installed: is_installed(),
    }))
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    if !is_installed() {
        return Err("portable build: download the new version from the website".to_string());
    }

    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update {
        update
            .download_and_install(|_chunk: usize, _total: Option<u64>| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
