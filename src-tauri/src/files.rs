use serde::Serialize;
use std::path::Path;

pub const MAX_TEXT_BYTES: usize = 5 * 1024 * 1024;

pub fn decode_text(bytes: &[u8]) -> Result<String, String> {
    if bytes.len() > MAX_TEXT_BYTES {
        return Err("File is larger than 5 MB".to_string());
    }

    let bytes = bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(bytes);
    let text =
        String::from_utf8(bytes.to_vec()).map_err(|_| "File is not UTF-8 text".to_string())?;
    Ok(text.replace("\r\n", "\n"))
}

fn is_markdown_ext(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| matches!(ext.to_ascii_lowercase().as_str(), "md" | "markdown"))
        .unwrap_or(false)
}

#[derive(Serialize)]
pub struct OpenedFile {
    pub name: String,
    pub markdown: bool,
    pub text: String,
}

#[tauri::command]
pub fn save_text(name: String, markdown: String, plain: String) -> Result<bool, String> {
    // The path comes only from the native dialog, the webview never chooses where to write.
    let Some(path) = rfd::FileDialog::new()
        .set_file_name(format!("{}.md", crate::export::sanitize_file_name(&name)))
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("Text", &["txt"])
        .save_file()
    else {
        return Ok(false);
    };

    let content = if is_markdown_ext(&path) {
        markdown
    } else {
        plain
    };
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn open_text_file() -> Result<Option<OpenedFile>, String> {
    let Some(path) = rfd::FileDialog::new()
        .add_filter("Text files", &["md", "markdown", "txt"])
        .pick_file()
    else {
        return Ok(None);
    };

    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_TEXT_BYTES as u64 {
        return Err("File is larger than 5 MB".to_string());
    }

    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let text = decode_text(&bytes)?;
    let name = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "note".to_string());

    Ok(Some(OpenedFile {
        name,
        markdown: is_markdown_ext(&path),
        text,
    }))
}

#[tauri::command]
pub fn open_data_dir(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    use tauri_plugin_opener::OpenerExt;

    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    app.opener()
        .open_path(dir.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_text_strips_bom_and_normalizes_crlf() {
        let bytes = b"\xEF\xBB\xBFhello\r\nworld";
        assert_eq!(decode_text(bytes).unwrap(), "hello\nworld");
    }

    #[test]
    fn decode_text_rejects_invalid_utf8() {
        let bytes = [0xff, 0xfe, 0x00];
        assert_eq!(decode_text(&bytes).unwrap_err(), "File is not UTF-8 text");
    }

    #[test]
    fn decode_text_rejects_oversize() {
        let bytes = vec![0u8; MAX_TEXT_BYTES + 1];
        assert_eq!(decode_text(&bytes).unwrap_err(), "File is larger than 5 MB");
    }

    #[test]
    fn is_markdown_ext_matches_md_and_markdown_case_insensitive() {
        assert!(is_markdown_ext(Path::new("a.md")));
        assert!(is_markdown_ext(Path::new("a.MD")));
        assert!(is_markdown_ext(Path::new("a.markdown")));
        assert!(is_markdown_ext(Path::new("a.Markdown")));
        assert!(!is_markdown_ext(Path::new("a.txt")));
        assert!(!is_markdown_ext(Path::new("a")));
    }
}
