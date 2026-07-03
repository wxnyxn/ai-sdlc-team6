// scripts/seed-holidays.ts
// Seeds Singapore public holidays for 2025 and 2026 into the holidays table.
// Run with: npx tsx scripts/seed-holidays.ts

import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'todos.db'));
db.pragma('foreign_keys = ON');

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS holidays (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    description TEXT,
    recurring   INTEGER NOT NULL DEFAULT 0
  );
`);

const insert = db.prepare(
  'INSERT OR IGNORE INTO holidays (name, date, description, recurring) VALUES (?, ?, ?, ?)'
);

const holidays: Array<[string, string, string, number]> = [
  // 2025
  ["New Year's Day",          '2025-01-01', 'Start of the new year',                              1],
  ['Chinese New Year',         '2025-01-29', 'First day of Chinese New Year (Year of the Snake)', 0],
  ['Chinese New Year',         '2025-01-30', 'Second day of Chinese New Year',                    0],
  ['Good Friday',              '2025-04-18', 'Christian commemoration of the crucifixion',        0],
  ['Hari Raya Puasa',          '2025-03-31', 'End of Ramadan celebration',                        0],
  ['Labour Day',               '2025-05-01', 'International Workers Day',                         1],
  ['Vesak Day',                '2025-05-12', 'Buddhist celebration of the birth of Buddha',       0],
  ['Hari Raya Haji',           '2025-06-06', 'Feast of Sacrifice',                                0],
  ['National Day',             '2025-08-09', 'Singapore Independence Day',                        1],
  ['Deepavali',                '2025-10-20', 'Festival of Lights',                                0],
  ['Christmas Day',            '2025-12-25', 'Christian celebration of the birth of Jesus',       1],

  // 2026
  ["New Year's Day",          '2026-01-01', 'Start of the new year',                              1],
  ['Chinese New Year',         '2026-02-17', 'First day of Chinese New Year (Year of the Horse)', 0],
  ['Chinese New Year',         '2026-02-18', 'Second day of Chinese New Year',                    0],
  ['Good Friday',              '2026-04-03', 'Christian commemoration of the crucifixion',        0],
  ['Hari Raya Puasa',          '2026-03-20', 'End of Ramadan celebration',                        0],
  ['Labour Day',               '2026-05-01', 'International Workers Day',                         1],
  ['Vesak Day',                '2026-05-31', 'Buddhist celebration of the birth of Buddha',       0],
  ['Hari Raya Haji',           '2026-05-27', 'Feast of Sacrifice',                                0],
  ['National Day',             '2026-08-09', 'Singapore Independence Day',                        1],
  ['Deepavali',                '2026-11-08', 'Festival of Lights',                                0],
  ['Christmas Day',            '2026-12-25', 'Christian celebration of the birth of Jesus',       1],
];

let inserted = 0;
for (const [name, date, description, recurring] of holidays) {
  const result = insert.run(name, date, description, recurring);
  if (result.changes > 0) inserted++;
}

console.log(`✅ Seeded ${inserted} Singapore public holidays (${holidays.length} total entries, duplicates skipped).`);
db.close();
