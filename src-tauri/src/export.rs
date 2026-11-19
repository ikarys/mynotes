use tauri::ipc::Request;

#[tauri::command]
pub async fn export_file(request: Request<'_>) -> Result<bool, String> {
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => bytes,
        _ => return Err("expected raw file bytes".to_string()),
    };

    let file_name = header_to_str(request.headers(), "x-file-name")?;
    let ext = header_to_str(request.headers(), "x-file-ext")?;

    if ext != "png" {
        return Err("unsupported export type".to_string());
    }

    let name = sanitize_file_name(&percent_decode(&file_name));
    let label = "PNG image";

    let Some(path) = rfd::FileDialog::new()
        .set_file_name(format!("{name}.{ext}"))
        .add_filter(label, &[ext])
        .save_file()
    else {
        return Ok(false);
    };

    std::fs::write(path, bytes).map_err(|e| e.to_string())?;
    Ok(true)
}

fn header_to_str(headers: &tauri::http::HeaderMap, key: &str) -> Result<String, String> {
    let value = headers.get(key).ok_or_else(|| format!("missing {key}"))?;
    value
        .to_str()
        .map(|s| s.to_string())
        .map_err(|e| e.to_string())
}

pub fn sanitize_file_name(name: &str) -> String {
    let filtered: String = name
        .chars()
        .filter(|c| !matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '?' | '*') && !c.is_control())
        .collect();

    let trimmed = filtered.trim_matches(|c: char| c == ' ' || c == '.');
    let mut result: String = trimmed.chars().take(80).collect();

    if result.is_empty() {
        return "note".to_string();
    }

    if is_windows_reserved(&result) {
        result = format!("_{}", result);
        result = result.chars().take(80).collect();
    }

    result
}

fn is_windows_reserved(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    let base = lower.split('.').next().unwrap_or("");

    matches!(base, "con" | "prn" | "aux" | "nul")
        || ((base.starts_with("com") || base.starts_with("lpt"))
            && base.len() == 4
            && base.as_bytes()[3].is_ascii_digit())
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;

    while i < bytes.len() {
        if bytes[i] == b'%'
            && i + 2 < bytes.len()
            && let (Some(hi), Some(lo)) = (hex_val(bytes[i + 1]), hex_val(bytes[i + 2]))
        {
            out.push(hi * 16 + lo);
            i += 3;
            continue;
        }
        out.push(bytes[i]);
        i += 1;
    }

    String::from_utf8_lossy(&out).into_owned()
}

fn hex_val(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_strips_forbidden_chars_and_traversal() {
        assert_eq!(sanitize_file_name("../..\\evil"), "evil");
        assert_eq!(sanitize_file_name("a/b\\c"), "abc");
        assert_eq!(sanitize_file_name("<a>"), "a");
    }

    #[test]
    fn sanitize_empty_or_only_dots() {
        assert_eq!(sanitize_file_name(""), "note");
        assert_eq!(sanitize_file_name("..."), "note");
        assert_eq!(sanitize_file_name(" . . "), "note");
    }

    #[test]
    fn sanitize_length_cap() {
        let long = "a".repeat(100);
        assert_eq!(sanitize_file_name(&long).len(), 80);
    }

    #[test]
    fn sanitize_reserved_names() {
        assert_eq!(sanitize_file_name("CON"), "_CON");
        assert_eq!(sanitize_file_name("con.txt"), "_con.txt");
        assert_eq!(sanitize_file_name("COM1"), "_COM1");
        assert_eq!(sanitize_file_name("LPT9"), "_LPT9");
        assert_eq!(sanitize_file_name("computer"), "computer");
    }

    #[test]
    fn percent_decode_utf8() {
        assert_eq!(percent_decode("%C3%A9t%C3%A9"), "été");
    }

    #[test]
    fn percent_decode_malformed() {
        assert_eq!(percent_decode("%zz"), "%zz");
        assert_eq!(percent_decode("a%"), "a%");
    }
}
