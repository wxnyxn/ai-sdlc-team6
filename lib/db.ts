// lib/db.ts
// Single source of truth for all database interfaces, schema, and CRUD operations.
// Uses better-sqlite3 (synchronous — NO async/await for queries).
// Database file: todos.db in project root.
// Add all new tables, interfaces, and DB objects here.

import Database from 'better-sqlite3';
import path from 'path';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const DB_PATH = path.join(process.cwd(), 'todos.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    NOT NULL UNIQUE,
    created_at TEXT   NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id       TEXT    NOT NULL UNIQUE,
    credential_public_key TEXT  NOT NULL,
    counter             INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                TEXT    NOT NULL,
    completed            INTEGER NOT NULL DEFAULT 0,
    priority             TEXT    NOT NULL DEFAULT 'medium',
    due_date             TEXT,
    recurrence_pattern   TEXT,
    reminder_offset_minutes INTEGER,
    last_notification_sent  TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id    INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    title      TEXT    NOT NULL,
    completed  INTEGER NOT NULL DEFAULT 0,
    position   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tags (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name    TEXT    NOT NULL,
    color   TEXT    NOT NULL DEFAULT '#6b7280'
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                 TEXT    NOT NULL,
    description          TEXT,
    priority             TEXT    NOT NULL DEFAULT 'medium',
    due_date_offset_days INTEGER NOT NULL DEFAULT 0,
    subtasks             TEXT    NOT NULL DEFAULT '[]',
    category             TEXT
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    description TEXT,
    recurring   INTEGER NOT NULL DEFAULT 0
  );
`);

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: string;
  counter: number;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: number;
  priority: Priority;
  due_date: string | null;
  recurrence_pattern: RecurrencePattern | null;
  reminder_offset_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  // Joined fields (populated by queries)
  subtask_count?: number;
  tags?: Tag[];
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
  position: number;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  priority: Priority;
  due_date_offset_days: number;
  subtasks: string; // JSON string: [{ title: string, position: number }]
  category: string | null;
}

export interface Holiday {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
  description: string | null;
  recurring: number;
}

// ---------------------------------------------------------------------------
// User DB
// ---------------------------------------------------------------------------

export const userDB = {
  findByUsername: db.prepare<[string], User>('SELECT * FROM users WHERE username = ?'),
  findById: db.prepare<[number], User>('SELECT * FROM users WHERE id = ?'),
  create: db.prepare<[string], { lastInsertRowid: number }>(
    'INSERT INTO users (username) VALUES (?)'
  ),
};

// ---------------------------------------------------------------------------
// Authenticator DB
// ---------------------------------------------------------------------------

export const authenticatorDB = {
  findByCredentialId: db.prepare<[string], Authenticator>(
    'SELECT * FROM authenticators WHERE credential_id = ?'
  ),
  findByUserId: db.prepare<[number], Authenticator[]>(
    'SELECT * FROM authenticators WHERE user_id = ?'
  ),
  create: db.prepare(
    'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter) VALUES (?, ?, ?, ?)'
  ),
  updateCounter: db.prepare(
    'UPDATE authenticators SET counter = ? WHERE credential_id = ?'
  ),
};

// ---------------------------------------------------------------------------
// Todo DB
// ---------------------------------------------------------------------------

export const todoDB = {
  findAllByUserId: db.prepare<[number], Todo>(
    `SELECT t.*,
       (SELECT COUNT(*) FROM subtasks s WHERE s.todo_id = t.id) AS subtask_count
     FROM todos t
     WHERE t.user_id = ?
     ORDER BY
       CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       t.due_date ASC NULLS LAST`
  ),
  findById: db.prepare<[number, number], Todo>(
    'SELECT * FROM todos WHERE id = ? AND user_id = ?'
  ),
  create: db.prepare(
    `INSERT INTO todos (user_id, title, priority, due_date, recurrence_pattern, reminder_offset_minutes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ),
  update: db.prepare(
    `UPDATE todos SET title = ?, priority = ?, due_date = ?, completed = ?,
      recurrence_pattern = ?, reminder_offset_minutes = ?
     WHERE id = ? AND user_id = ?`
  ),
  delete: db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?'),
  markNotified: db.prepare(
    "UPDATE todos SET last_notification_sent = datetime('now') WHERE id = ?"
  ),
  findDueReminders: db.prepare<[number], Todo>(
    `SELECT * FROM todos
     WHERE user_id = ?
       AND completed = 0
       AND reminder_offset_minutes IS NOT NULL
       AND due_date IS NOT NULL
       AND (last_notification_sent IS NULL OR
            last_notification_sent < datetime('now', '-1 hour'))
       AND datetime(due_date, '-' || reminder_offset_minutes || ' minutes') <= datetime('now')`
  ),
};

// ---------------------------------------------------------------------------
// Subtask DB
// ---------------------------------------------------------------------------

export const subtaskDB = {
  findByTodoId: db.prepare<[number], Subtask>(
    'SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC'
  ),
  findById: db.prepare<[number], Subtask>(
    'SELECT * FROM subtasks WHERE id = ?'
  ),
  create: db.prepare(
    'INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)'
  ),
  update: db.prepare(
    'UPDATE subtasks SET title = ?, completed = ?, position = ? WHERE id = ?'
  ),
  delete: db.prepare('DELETE FROM subtasks WHERE id = ?'),
};

// ---------------------------------------------------------------------------
// Tag DB
// ---------------------------------------------------------------------------

export const tagDB = {
  findByUserId: db.prepare<[number], Tag>(
    'SELECT * FROM tags WHERE user_id = ?'
  ),
  findByTodoId: db.prepare<[number], Tag>(
    `SELECT t.* FROM tags t
     JOIN todo_tags tt ON tt.tag_id = t.id
     WHERE tt.todo_id = ?`
  ),
  create: db.prepare(
    'INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)'
  ),
  update: db.prepare(
    'UPDATE tags SET name = ?, color = ? WHERE id = ? AND user_id = ?'
  ),
  delete: db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?'),
  addToTodo: db.prepare(
    'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)'
  ),
  removeFromTodo: db.prepare(
    'DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?'
  ),
};

// ---------------------------------------------------------------------------
// Template DB
// ---------------------------------------------------------------------------

export const templateDB = {
  findByUserId: db.prepare<[number], Template>(
    'SELECT * FROM templates WHERE user_id = ?'
  ),
  findById: db.prepare<[number, number], Template>(
    'SELECT * FROM templates WHERE id = ? AND user_id = ?'
  ),
  create: db.prepare(
    `INSERT INTO templates (user_id, name, description, priority, due_date_offset_days, subtasks, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ),
  update: db.prepare(
    `UPDATE templates SET name = ?, description = ?, priority = ?, due_date_offset_days = ?, subtasks = ?, category = ?
     WHERE id = ? AND user_id = ?`
  ),
  delete: db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?'),
};

// ---------------------------------------------------------------------------
// Holiday DB
// ---------------------------------------------------------------------------

export const holidayDB = {
  findAll: db.prepare<[], Holiday>('SELECT * FROM holidays ORDER BY date ASC'),
  findByMonth: db.prepare<[string], Holiday>(
    "SELECT * FROM holidays WHERE strftime('%Y-%m', date) = ?"
  ),
  create: db.prepare(
    'INSERT INTO holidays (name, date, description, recurring) VALUES (?, ?, ?, ?)'
  ),
  delete: db.prepare('DELETE FROM holidays WHERE id = ?'),
};

export default db;
