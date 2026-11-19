use sha2::{Digest, Sha256};
use std::fmt;
use std::io;

#[derive(Debug)]
pub enum ImageError {
    TooLarge,
    UnknownFormat,
    Io(std::io::Error),
}

impl fmt::Display for ImageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ImageError::TooLarge => write!(f, "image too large"),
            ImageError::UnknownFormat => write!(f, "unknown image format"),
            ImageError::Io(err) => write!(f, "io error: {err}"),
        }
    }
}

impl std::error::Error for ImageError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ImageError::Io(err) => Some(err),
            _ => None,
        }
    }
}

impl From<io::Error> for ImageError {
    fn from(err: io::Error) -> Self {
        ImageError::Io(err)
    }
}

pub const MAX_IMAGE_BYTES: usize = 50 * 1024 * 1024;

pub fn sniff_extension(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) {
        Some("png")
    } else if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        Some("jpg")
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Some("gif")
    } else if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && bytes[8..12] == *b"WEBP" {
        Some("webp")
    } else {
        None
    }
}

pub fn save_image(dir: &std::path::Path, bytes: &[u8]) -> Result<std::path::PathBuf, ImageError> {
    if bytes.len() > MAX_IMAGE_BYTES {
        return Err(ImageError::TooLarge);
    }
    let ext = sniff_extension(bytes).ok_or(ImageError::UnknownFormat)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let hash: String = hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();

    std::fs::create_dir_all(dir)?;
    let name = format!("{hash}.{ext}");
    let path = dir.join(&name);
    if !path.exists() {
        let tmp = dir.join(format!("{name}.tmp"));
        std::fs::write(&tmp, bytes)?;
        std::fs::rename(&tmp, &path)?;
    }
    Ok(path)
}

pub fn prune(
    dir: &std::path::Path,
    only_in: Option<&str>,
    is_referenced: impl Fn(&str) -> bool,
) -> std::io::Result<usize> {
    if !dir.exists() {
        return Ok(0);
    }

    let mut removed = 0;
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let file_name = entry.file_name();
        let Some(name) = file_name.to_str() else {
            continue;
        };
        if !is_stored_image_name(name) {
            continue;
        }

        if let Some(content) = only_in
            && !content.contains(name)
        {
            continue;
        }

        if !is_referenced(name) {
            std::fs::remove_file(&path)?;
            removed += 1;
        }
    }

    Ok(removed)
}

fn is_stored_image_name(name: &str) -> bool {
    let Some((hash, ext)) = name.split_once('.') else {
        return false;
    };

    if hash.len() != 64 {
        return false;
    }
    if !hash
        .chars()
        .all(|c| c.is_ascii_hexdigit() && c.is_ascii_lowercase())
    {
        return false;
    }

    matches!(ext, "png" | "jpg" | "gif" | "webp")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sniff_supported_formats_and_reject_others() {
        assert_eq!(
            sniff_extension(&[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            Some("png")
        );
        assert_eq!(sniff_extension(&[0xff, 0xd8, 0xff]), Some("jpg"));
        assert_eq!(sniff_extension(b"GIF87a"), Some("gif"));
        assert_eq!(sniff_extension(b"GIF89a"), Some("gif"));
        assert_eq!(sniff_extension(b"RIFF\x00\x00\x00\x00WEBP"), Some("webp"));

        assert_eq!(sniff_extension(b"<svg></svg>"), None);
        assert_eq!(sniff_extension(b"<html></html>"), None);
        assert_eq!(sniff_extension(b""), None);
        assert_eq!(sniff_extension(&[0xff, 0xd8]), None);
        assert_eq!(sniff_extension(b"RIFF\x00\x00\x00WEBP"), None);
    }

    #[test]
    fn save_image_deduplicates_and_uses_hash_names() {
        let dir = tempfile::tempdir().unwrap();
        let bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1];
        let other = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 2];

        let first = save_image(dir.path(), &bytes).unwrap();
        let second = save_image(dir.path(), &bytes).unwrap();
        assert_eq!(first, second);

        let files: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.file_name())
            .collect();
        assert_eq!(files.len(), 1);

        let third = save_image(dir.path(), &other).unwrap();
        assert_ne!(first, third);
    }

    #[test]
    fn save_image_rejects_oversized_input() {
        let dir = tempfile::tempdir().unwrap();
        let big = vec![0u8; MAX_IMAGE_BYTES + 1];
        assert!(matches!(
            save_image(dir.path(), &big),
            Err(ImageError::TooLarge)
        ));
    }

    #[test]
    fn prune_removes_unreferenced_stored_images_and_keeps_referenced() {
        let dir = tempfile::tempdir().unwrap();
        let unreferenced = "a".repeat(64) + ".png";
        let referenced = "b".repeat(64) + ".png";
        let foreign = "notes.txt";

        std::fs::write(dir.path().join(&unreferenced), b"png").unwrap();
        std::fs::write(dir.path().join(&referenced), b"png").unwrap();
        std::fs::write(dir.path().join(foreign), b"text").unwrap();

        let removed = prune(dir.path(), None, |name| name == referenced).unwrap();
        assert_eq!(removed, 1);
        assert!(!dir.path().join(&unreferenced).exists());
        assert!(dir.path().join(&referenced).exists());
        assert!(dir.path().join(foreign).exists());
    }

    #[test]
    fn prune_respects_only_in_filter() {
        let dir = tempfile::tempdir().unwrap();
        let included = "c".repeat(64) + ".png";
        let excluded = "d".repeat(64) + ".png";

        std::fs::write(dir.path().join(&included), b"png").unwrap();
        std::fs::write(dir.path().join(&excluded), b"png").unwrap();

        let removed = prune(dir.path(), Some(&included), |_| false).unwrap();
        assert_eq!(removed, 1);
        assert!(!dir.path().join(&included).exists());
        assert!(dir.path().join(&excluded).exists());
    }
}
