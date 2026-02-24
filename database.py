"""
database.py - SQLite database initialization and session management
"""
import sqlite3
import os
from pathlib import Path

DB_PATH = os.getenv("DATABASE_URL", "family_companion.db")


def get_connection():
    """Get a database connection with row factory for dict-like access"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables"""
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Conversations table - stores full chat history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            relation_type TEXT NOT NULL CHECK(relation_type IN ('mother','father','brother','sister')),
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            emotion TEXT DEFAULT 'neutral',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully")
