use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub type Result<T> = rusqlite::Result<T>;

pub const TRASH_DAYS: i64 = 30;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Doc,
    Mindmap,
}

impl Kind {
    fn as_str(self) -> &'static str {
        match self {
            Kind::Doc => "doc",
            Kind::Mindmap => "mindmap",
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct NoteMeta {
    pub id: i64,
    pub kind: Kind,
    pub title: String,
    pub updated_at: i64,
    /// Start of the plain text, so a list can show a preview without loading notes.
    pub excerpt: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Note {
    pub id: i64,
    pub kind: Kind,
    pub title: String,
    pub content: String,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Session {
    pub open_tabs: Vec<i64>,
    pub active_tab: Option<i64>,
}

pub struct Store {
    conn: Connection,
}

impl Store {
    pub fn open(path: &std::path::Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        init(&conn)?;
        Ok(Self { conn })
    }

    #[cfg(test)]
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        init(&conn)?;
        Ok(Self { conn })
    }

    pub fn create_note(&self, kind: Kind) -> Result<Note> {
        let now = now_ms();
        self.conn.execute(
            "INSERT INTO notes (kind, title, content, created_at, updated_at)
             VALUES (?1, '', '', ?2, ?2)",
            params![kind.as_str(), now],
        )?;
        let id = self.conn.last_insert_rowid();
        Ok(Note {
            id,
            kind,
            title: String::new(),
            content: String::new(),
            updated_at: now,
        })
    }

    pub fn load_note(&self, id: i64) -> Result<Option<Note>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, kind, title, content, updated_at FROM notes WHERE id = ?")?;
        let mut rows = stmt.query_map(params![id], |row| {
            Ok(Note {
                id: row.get(0)?,
                kind: kind_from_row(row, 1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;
        match rows.next() {
            Some(Ok(note)) => Ok(Some(note)),
            Some(Err(err)) => Err(err),
            None => Ok(None),
        }
    }

    pub fn save_note(&self, id: i64, title: &str, content: &str, text: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        let previous: i64 = tx.query_row(
            "SELECT updated_at FROM notes WHERE id = ?",
            params![id],
            |row| row.get(0),
        )?;
        let now = now_ms();
        let updated = std::cmp::max(now, previous.saturating_add(1));
        tx.execute(
            "UPDATE notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
            params![title, content, updated, id],
        )?;
        tx.execute("DELETE FROM notes_fts WHERE rowid = ?", params![id])?;
        tx.execute(
            "INSERT INTO notes_fts(rowid, title, body) VALUES (?1, ?2, ?3)",
            params![id, title, text],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn trash_note(&self, id: i64) -> Result<()> {
        let now = now_ms();
        let updated = self.conn.execute(
            "UPDATE notes SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            params![now, id],
        )?;
        if updated == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    pub fn list_trash(&self) -> Result<Vec<NoteMeta>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, kind, title, updated_at, '' FROM notes
             WHERE deleted_at IS NOT NULL
             ORDER BY deleted_at DESC, id DESC",
        )?;
        let rows = stmt.query_map([], meta_from_row)?;
        rows.collect()
    }

    pub fn restore_note(&self, id: i64) -> Result<()> {
        let restored = self.conn.execute(
            "UPDATE notes SET deleted_at = NULL WHERE id = ?1 AND deleted_at IS NOT NULL",
            params![id],
        )?;
        if restored == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    pub fn purge_note(&self, id: i64) -> Result<()> {
        self.conn.query_row(
            "SELECT 1 FROM notes WHERE id = ?1 AND deleted_at IS NOT NULL",
            params![id],
            |_| Ok(()),
        )?;
        self.erase_notes(&[id])
    }

    pub fn purge_trash(&self, older_than_ms: Option<i64>) -> Result<Vec<String>> {
        let mut ids = Vec::new();
        let mut contents = Vec::new();
        match older_than_ms {
            None => {
                let mut stmt = self
                    .conn
                    .prepare("SELECT id, content FROM notes WHERE deleted_at IS NOT NULL")?;
                let rows = stmt.query_map([], |row| {
                    Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
                })?;
                for row in rows {
                    let (id, content) = row?;
                    ids.push(id);
                    contents.push(content);
                }
            }
            Some(cutoff) => {
                let mut stmt = self.conn.prepare(
                    "SELECT id, content FROM notes
                     WHERE deleted_at IS NOT NULL AND deleted_at < ?1",
                )?;
                let rows = stmt.query_map(params![cutoff], |row| {
                    Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
                })?;
                for row in rows {
                    let (id, content) = row?;
                    ids.push(id);
                    contents.push(content);
                }
            }
        }
        self.erase_notes(&ids)?;
        Ok(contents)
    }

    fn erase_notes(&self, ids: &[i64]) -> Result<()> {
        if ids.is_empty() {
            return Ok(());
        }
        let tx = self.conn.unchecked_transaction()?;
        for id in ids {
            tx.execute("DELETE FROM notes WHERE id = ?", params![id])?;
            tx.execute("DELETE FROM notes_fts WHERE rowid = ?", params![id])?;
        }
        tx.commit()?;
        // The WAL keeps old page copies until checkpointed.
        self.conn
            .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |_| Ok(()))?;
        Ok(())
    }

    pub fn list_notes(&self) -> Result<Vec<NoteMeta>> {
        let mut stmt = self.conn.prepare(
            "SELECT n.id, n.kind, n.title, n.updated_at, coalesce(substr(f.body, 1, 300), '')
             FROM notes AS n
             LEFT JOIN notes_fts AS f ON f.rowid = n.id
             WHERE n.deleted_at IS NULL
             ORDER BY n.updated_at DESC, n.id DESC",
        )?;
        let rows = stmt.query_map([], meta_from_row)?;
        rows.collect()
    }

    pub fn search(&self, query: &str) -> Result<Vec<NoteMeta>> {
        let Some(fts) = fts_query(query) else {
            let mut recent = self.list_notes()?;
            recent.truncate(50);
            return Ok(recent);
        };
        let mut stmt = self.conn.prepare(
            "SELECT n.id, n.kind, n.title, n.updated_at, substr(notes_fts.body, 1, 300)
             FROM notes_fts
             JOIN notes AS n ON n.id = notes_fts.rowid
             WHERE notes_fts MATCH ?1 AND n.deleted_at IS NULL
             ORDER BY bm25(notes_fts)
             LIMIT 50",
        )?;
        let rows = stmt.query_map(params![fts], meta_from_row)?;
        rows.collect()
    }

    pub fn get_session(&self) -> Result<Session> {
        let mut stmt = self
            .conn
            .prepare("SELECT open_tabs, active_tab FROM session WHERE id = 1")?;
        let mut rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, Option<i64>>(1)?))
        })?;
        match rows.next() {
            Some(Ok((open_tabs, active_tab))) => {
                let open_tabs = serde_json::from_str::<Vec<i64>>(&open_tabs).unwrap_or_default();
                Ok(Session {
                    open_tabs,
                    active_tab,
                })
            }
            Some(Err(err)) => Err(err),
            None => Ok(Session::default()),
        }
    }

    pub fn set_session(&self, session: &Session) -> Result<()> {
        let open_tabs = serde_json::to_string(&session.open_tabs)
            .map_err(|err| rusqlite::Error::ToSqlConversionFailure(Box::new(err)))?;
        self.conn.execute(
            "INSERT INTO session (id, open_tabs, active_tab)
             VALUES (1, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET
               open_tabs = excluded.open_tabs,
               active_tab = excluded.active_tab",
            params![open_tabs, session.active_tab],
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        match self.conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        ) {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(err) => Err(err),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO settings (key, value)
             VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn is_referenced(&self, needle: &str) -> Result<bool> {
        self.conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM notes WHERE instr(content, ?1) > 0)",
            params![needle],
            |row| row.get::<_, bool>(0),
        )
    }
}

fn init(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA secure_delete = ON;
         PRAGMA foreign_keys = ON;
         CREATE TABLE IF NOT EXISTS notes (
             id INTEGER PRIMARY KEY,
             kind TEXT NOT NULL CHECK (kind IN ('doc', 'mindmap')),
             title TEXT NOT NULL DEFAULT '',
             content TEXT NOT NULL DEFAULT '',
             created_at INTEGER NOT NULL,
             updated_at INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS session (
             id INTEGER PRIMARY KEY CHECK (id = 1),
             open_tabs TEXT NOT NULL,
             active_tab INTEGER
         );
         CREATE TABLE IF NOT EXISTS settings (
             key TEXT PRIMARY KEY,
             value TEXT NOT NULL
         );
         CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
             title,
             body,
             tokenize = 'unicode61 remove_diacritics 2'
         );
         INSERT INTO notes_fts(notes_fts, rank) VALUES('secure-delete', 1);",
    )?;
    let user_version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if user_version < 2 {
        conn.execute("ALTER TABLE notes ADD COLUMN deleted_at INTEGER", [])?;
        conn.pragma_update(None, "user_version", 2)?;
    }
    Ok(())
}

pub(crate) fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn meta_from_row(row: &rusqlite::Row<'_>) -> Result<NoteMeta> {
    Ok(NoteMeta {
        id: row.get(0)?,
        kind: kind_from_row(row, 1)?,
        title: row.get(2)?,
        updated_at: row.get(3)?,
        excerpt: row.get(4)?,
    })
}

fn kind_from_row(row: &rusqlite::Row, column: usize) -> Result<Kind> {
    match row.get::<_, String>(column)? {
        kind if kind == "doc" => Ok(Kind::Doc),
        kind if kind == "mindmap" => Ok(Kind::Mindmap),
        other => Err(rusqlite::Error::FromSqlConversionFailure(
            column,
            rusqlite::types::Type::Text,
            format!("unknown note kind {other:?}").into(),
        )),
    }
}

fn fts_query(input: &str) -> Option<String> {
    let tokens: Vec<String> = input
        .split_whitespace()
        .map(|token| format!("\"{}\"*", token.replace('"', "\"\"")))
        .collect();
    (!tokens.is_empty()).then(|| tokens.join(" "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_save_load_round_trip_and_updated_increases() {
        let store = Store::open_in_memory().unwrap();
        let note = store.create_note(Kind::Doc).unwrap();
        assert_eq!(note.kind, Kind::Doc);
        assert_eq!(note.title, "");
        assert_eq!(note.content, "");

        store
            .save_note(note.id, "Title", "content", "text")
            .unwrap();
        let loaded = store.load_note(note.id).unwrap().unwrap();
        assert_eq!(loaded.kind, Kind::Doc);
        assert_eq!(loaded.title, "Title");
        assert_eq!(loaded.content, "content");
        assert!(loaded.updated_at > note.updated_at);

        store
            .save_note(note.id, "Title2", "content2", "text2")
            .unwrap();
        let loaded_again = store.load_note(note.id).unwrap().unwrap();
        assert!(loaded_again.updated_at > loaded.updated_at);
    }

    #[test]
    fn list_notes_orders_most_recent_first() {
        let store = Store::open_in_memory().unwrap();
        let first = store.create_note(Kind::Doc).unwrap();
        let second = store.create_note(Kind::Mindmap).unwrap();
        store.save_note(first.id, "first", "", "").unwrap();
        store.save_note(second.id, "second", "", "").unwrap();

        let list = store.list_notes().unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].id, second.id);
        assert_eq!(list[1].id, first.id);
    }

    #[test]
    fn list_notes_carries_a_bounded_excerpt() {
        let store = Store::open_in_memory().unwrap();
        let note = store.create_note(Kind::Doc).unwrap();
        let empty = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(
                note.id,
                "title",
                "",
                &format!("title\n{}", "x".repeat(1000)),
            )
            .unwrap();

        let list = store.list_notes().unwrap();
        let saved = list.iter().find(|m| m.id == note.id).unwrap();
        assert!(saved.excerpt.starts_with("title\nxxx"));
        assert_eq!(saved.excerpt.chars().count(), 300);
        assert_eq!(list.iter().find(|m| m.id == empty.id).unwrap().excerpt, "");
    }

    #[test]
    fn search_matches_text_title_prefix_and_accent_insensitive() {
        let store = Store::open_in_memory().unwrap();
        let hello = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(hello.id, "hello", "world", "hello text")
            .unwrap();
        let cafe = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(cafe.id, "café", "only content word", "café text")
            .unwrap();
        let ete = store.create_note(Kind::Doc).unwrap();
        store.save_note(ete.id, "été", "no search", "été").unwrap();

        assert_eq!(store.search("hello").unwrap().len(), 1);
        assert_eq!(store.search("text").unwrap().len(), 2);
        assert_eq!(store.search("hel").unwrap().len(), 1);
        assert_eq!(store.search("ete").unwrap().len(), 1);
        assert!(store.search("world").unwrap().is_empty());

        let two_quotes = "\"\"";
        for query in ["\"", "NEAR(", "a OR", "*", two_quotes] {
            assert!(store.search(query).is_ok());
        }

        assert_eq!(store.search("").unwrap(), store.list_notes().unwrap());
        assert_eq!(store.search("   ").unwrap(), store.list_notes().unwrap());
    }

    #[test]
    fn trash_hides_from_list_and_search_and_restore_brings_it_back() {
        let store = Store::open_in_memory().unwrap();
        let note = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(note.id, "trash", "body", "trash me")
            .unwrap();

        assert_eq!(store.list_notes().unwrap().len(), 1);
        assert_eq!(store.search("trash").unwrap().len(), 1);

        store.trash_note(note.id).unwrap();
        assert!(store.list_notes().unwrap().is_empty());
        assert!(store.search("trash").unwrap().is_empty());
        assert!(matches!(
            store.trash_note(note.id).unwrap_err(),
            rusqlite::Error::QueryReturnedNoRows
        ));

        let trash = store.list_trash().unwrap();
        assert_eq!(trash.len(), 1);
        assert_eq!(trash[0].id, note.id);
        assert_eq!(trash[0].title, "trash");

        store.restore_note(note.id).unwrap();
        assert!(matches!(
            store.restore_note(note.id).unwrap_err(),
            rusqlite::Error::QueryReturnedNoRows
        ));

        let list = store.list_notes().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, note.id);
        assert!(store.list_trash().unwrap().is_empty());
        assert_eq!(store.search("trash").unwrap().len(), 1);
    }

    #[test]
    fn trash_note_missing_id_is_error() {
        let store = Store::open_in_memory().unwrap();
        assert!(matches!(
            store.trash_note(999).unwrap_err(),
            rusqlite::Error::QueryReturnedNoRows
        ));
    }

    #[test]
    fn purge_note_on_live_note_is_error_and_leaves_it() {
        let store = Store::open_in_memory().unwrap();
        let note = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(note.id, "live", "body", "live text")
            .unwrap();

        assert!(matches!(
            store.purge_note(note.id).unwrap_err(),
            rusqlite::Error::QueryReturnedNoRows
        ));
        assert_eq!(store.list_notes().unwrap().len(), 1);
        assert!(store.load_note(note.id).unwrap().is_some());
    }

    #[test]
    fn purge_trash_cutoff_only_erases_old_notes() {
        let store = Store::open_in_memory().unwrap();
        let old = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(old.id, "old", "old content", "old text")
            .unwrap();
        store.trash_note(old.id).unwrap();
        store
            .conn
            .execute(
                "UPDATE notes SET deleted_at = 1000 WHERE id = ?",
                params![old.id],
            )
            .unwrap();

        let fresh = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(fresh.id, "fresh", "fresh content", "fresh text")
            .unwrap();
        store.trash_note(fresh.id).unwrap();
        store
            .conn
            .execute(
                "UPDATE notes SET deleted_at = 2000 WHERE id = ?",
                params![fresh.id],
            )
            .unwrap();

        let contents = store.purge_trash(Some(1500)).unwrap();
        assert_eq!(contents, vec!["old content".to_string()]);
        assert!(store.load_note(old.id).unwrap().is_none());
        assert!(store.load_note(fresh.id).unwrap().is_some());

        let trash = store.list_trash().unwrap();
        assert_eq!(trash.len(), 1);
        assert_eq!(trash[0].id, fresh.id);
    }

    #[test]
    fn trash_then_purge_removes_from_list_and_search() {
        let store = Store::open_in_memory().unwrap();
        let note = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(note.id, "delete", "body", "delete me")
            .unwrap();

        assert_eq!(store.search("delete").unwrap().len(), 1);
        store.trash_note(note.id).unwrap();

        assert!(store.list_notes().unwrap().is_empty());
        assert!(store.search("delete").unwrap().is_empty());
        assert_eq!(store.list_trash().unwrap().len(), 1);

        store.purge_note(note.id).unwrap();
        assert!(store.list_trash().unwrap().is_empty());
        assert!(store.load_note(note.id).unwrap().is_none());
    }

    #[test]
    fn session_default_set_get_and_overwrite() {
        let store = Store::open_in_memory().unwrap();
        assert_eq!(store.get_session().unwrap(), Session::default());

        let session = Session {
            open_tabs: vec![1, 2],
            active_tab: Some(2),
        };
        store.set_session(&session).unwrap();
        assert_eq!(store.get_session().unwrap(), session);

        let next = Session {
            open_tabs: vec![3],
            active_tab: None,
        };
        store.set_session(&next).unwrap();
        assert_eq!(store.get_session().unwrap(), next);
    }

    #[test]
    fn settings_missing_set_and_overwrite() {
        let store = Store::open_in_memory().unwrap();
        assert_eq!(store.get_setting("hotkey").unwrap(), None);
        store.set_setting("hotkey", "Alt+Space").unwrap();
        assert_eq!(
            store.get_setting("hotkey").unwrap().as_deref(),
            Some("Alt+Space")
        );
        store.set_setting("hotkey", "Ctrl+Space").unwrap();
        assert_eq!(
            store.get_setting("hotkey").unwrap().as_deref(),
            Some("Ctrl+Space")
        );
    }

    #[test]
    fn save_note_missing_id_is_error() {
        let store = Store::open_in_memory().unwrap();
        let err = store.save_note(999, "t", "c", "x").unwrap_err();
        assert!(matches!(err, rusqlite::Error::QueryReturnedNoRows));
    }

    #[test]
    fn file_store_persists_across_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("notes.db");

        {
            let store = Store::open(&path).unwrap();
            let note = store.create_note(Kind::Doc).unwrap();
            store
                .save_note(note.id, "persist", "content", "text")
                .unwrap();
            let session = Session {
                open_tabs: vec![note.id],
                active_tab: Some(note.id),
            };
            store.set_session(&session).unwrap();
        }

        let store = Store::open(&path).unwrap();
        let list = store.list_notes().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].title, "persist");
        assert_eq!(
            store.load_note(list[0].id).unwrap().unwrap().content,
            "content"
        );
        assert_eq!(
            store.get_session().unwrap(),
            Session {
                open_tabs: vec![list[0].id],
                active_tab: Some(list[0].id),
            }
        );
    }

    #[test]
    fn deleted_note_leaves_no_text_in_db_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("notes.db");
        let marker = "zq-secret-marker-41";
        let marker_bytes = marker.as_bytes();

        {
            let store = Store::open(&path).unwrap();
            let note = store.create_note(Kind::Doc).unwrap();
            store.save_note(note.id, marker, marker, marker).unwrap();
            store.trash_note(note.id).unwrap();
            store.purge_note(note.id).unwrap();
        }

        let db_bytes = std::fs::read(&path).unwrap();
        assert!(
            !db_bytes
                .windows(marker_bytes.len())
                .any(|window| window == marker_bytes)
        );

        let wal_path = path.with_file_name(format!(
            "{}-wal",
            path.file_name().unwrap().to_string_lossy()
        ));
        if let Ok(wal_bytes) = std::fs::read(&wal_path) {
            assert!(
                !wal_bytes
                    .windows(marker_bytes.len())
                    .any(|window| window == marker_bytes)
            );
        }
    }

    #[test]
    fn is_referenced_finds_substring_in_content() {
        let store = Store::open_in_memory().unwrap();
        let note = store.create_note(Kind::Doc).unwrap();
        store
            .save_note(note.id, "title", "abc needle def", "text")
            .unwrap();

        assert!(store.is_referenced("needle").unwrap());
        assert!(store.is_referenced("abc needle").unwrap());
        assert!(!store.is_referenced("missing").unwrap());
    }

    #[test]
    fn old_schema_is_migrated_and_trash_works() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("old.db");

        {
            let conn = Connection::open(&path).unwrap();
            conn.execute_batch(
                "PRAGMA user_version = 1;
                 CREATE TABLE notes (
                     id INTEGER PRIMARY KEY,
                     kind TEXT NOT NULL CHECK (kind IN ('doc', 'mindmap')),
                     title TEXT NOT NULL DEFAULT '',
                     content TEXT NOT NULL DEFAULT '',
                     created_at INTEGER NOT NULL,
                     updated_at INTEGER NOT NULL
                 );
                 INSERT INTO notes (kind, title, content, created_at, updated_at)
                 VALUES ('doc', 'legacy', 'legacy content', 1, 2);",
            )
            .unwrap();
        }

        let store = Store::open(&path).unwrap();
        let list = store.list_notes().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].title, "legacy");

        store.trash_note(list[0].id).unwrap();
        assert!(store.list_notes().unwrap().is_empty());
        assert_eq!(store.list_trash().unwrap().len(), 1);

        // Reopen to prove the migration is idempotent.
        drop(store);
        let store = Store::open(&path).unwrap();
        assert_eq!(store.list_trash().unwrap().len(), 1);
    }
}
