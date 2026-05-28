import sqlite3
import os
import time
from utils import get_data_dir

DB_PATH = os.path.join(get_data_dir(), "downloads.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS downloads (
                playlist_id TEXT,
                video_id    TEXT,
                title       TEXT,
                file_path   TEXT,
                status      TEXT,
                created_at  REAL,
                url         TEXT,
                PRIMARY KEY (playlist_id, video_id)
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key     TEXT PRIMARY KEY,
                value   TEXT
            );
        """)
        try:
            cur.execute("ALTER TABLE downloads ADD COLUMN url TEXT;")
        except: 
            pass
        conn.commit()
        conn.close()
        print("Banco de dados SQLite inicializado.")
    except Exception as e:
        print(f"Erro ao inicializar DB: {e}")

def mark_downloaded_db(playlist_id: str, video_id: str, title: str, file_path: str, url: str = None):
    if not playlist_id or not video_id: return
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO downloads
            (playlist_id, video_id, title, file_path, status, created_at, url)
            VALUES (?, ?, ?, ?, 'downloaded', ?, ?);
        """, (playlist_id, video_id, title, file_path, time.time(), url))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Erro ao salvar no DB: {e}")

def mark_error_db(playlist_id: str, video_id: str, title: str, error_msg: str):
    if not playlist_id or not video_id: return
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO downloads
            (playlist_id, video_id, title, file_path, status, created_at)
            VALUES (?, ?, ?, '', ?, ?);
        """, (playlist_id, video_id, title, f"error:{error_msg[:180]}", time.time()))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Erro ao salvar erro no DB: {e}")

def get_downloaded_ids(playlist_id: str) -> list[str]:
    if not playlist_id: return []
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT video_id FROM downloads WHERE playlist_id = ? AND status = 'downloaded';", (playlist_id,))
        rows = cur.fetchall()
        conn.close()
        return [r["video_id"] for r in rows]
    except:
        return []

def mark_missing_db(playlist_id: str, video_id: str):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE downloads SET status = 'missing' WHERE playlist_id = ? AND video_id = ?;", (playlist_id, video_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Erro ao marcar missing: {e}")

def get_download_record(playlist_id: str, video_id: str) -> dict:
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT playlist_id, video_id, title, url FROM downloads WHERE playlist_id = ? AND video_id = ?;", (playlist_id, video_id))
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None
    except:
        return None
