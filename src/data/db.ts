import Database from 'better-sqlite3';
import path from 'node:path';

const DB_FILENAME = 'opengoat.db';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS goals (
  id            TEXT PRIMARY KEY,
  statement     TEXT NOT NULL,
  category      TEXT NOT NULL,
  current_val   REAL NOT NULL,
  target_val    REAL NOT NULL,
  unit          TEXT NOT NULL,
  deadline      TEXT NOT NULL,
  active_path   TEXT,
  status        TEXT DEFAULT 'active',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resource_profiles (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL REFERENCES goals(id),
  profile       TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS paths (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL REFERENCES goals(id),
  data          TEXT NOT NULL,
  rank          INTEGER NOT NULL,
  is_active     INTEGER DEFAULT 0,
  generated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gap_log (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL REFERENCES goals(id),
  value         REAL NOT NULL,
  note          TEXT,
  logged_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interventions (
  id              TEXT PRIMARY KEY,
  goal_id         TEXT NOT NULL REFERENCES goals(id),
  trigger_type    TEXT NOT NULL,
  question        TEXT NOT NULL,
  user_response   TEXT,
  constraint_type TEXT,
  unlock_action   TEXT,
  resolved        INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS missions (
  id              TEXT PRIMARY KEY,
  goal_id         TEXT NOT NULL REFERENCES goals(id),
  path_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  estimated_hours REAL NOT NULL,
  status          TEXT DEFAULT 'pending',
  week            INTEGER NOT NULL,
  difficulty      INTEGER DEFAULT 2,
  xp              INTEGER NOT NULL,
  completed_at    TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS week_scores (
  id             TEXT PRIMARY KEY,
  goal_id        TEXT NOT NULL REFERENCES goals(id),
  week_number    INTEGER NOT NULL,
  velocity_score REAL NOT NULL,
  consistency    REAL NOT NULL,
  momentum       REAL NOT NULL,
  path_fit       REAL NOT NULL,
  total          REAL NOT NULL,
  rank           TEXT NOT NULL,
  xp             INTEGER NOT NULL,
  gap_at_week    REAL,
  scored_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(goal_id, week_number)
);

CREATE TABLE IF NOT EXISTS plugin_registry (
  name          TEXT PRIMARY KEY,
  version       TEXT NOT NULL,
  type          TEXT NOT NULL,
  manifest      TEXT NOT NULL,
  installed_at  TEXT DEFAULT (datetime('now'))
);
`;

const LEGACY_PATHS_TABLE = 'paths_legacy';
const LEGACY_MISSIONS_TABLE = 'missions_legacy';
const LEGACY_SCORES_TABLE = 'week_scores_legacy';

function tableExists(db: Database.Database, table: string): boolean {
  const row = db.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
  ).get(table) as { name: string } | undefined;

  return Boolean(row);
}

function getColumns(db: Database.Database, table: string): Set<string> {
  if (!tableExists(db, table)) {
    return new Set();
  }

  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

function hasColumns(db: Database.Database, table: string, required: string[]): boolean {
  const columns = getColumns(db, table);
  return required.every((column) => columns.has(column));
}

function renameLegacyTable(
  db: Database.Database,
  table: string,
  requiredColumns: string[],
  legacyName: string
): void {
  if (!tableExists(db, table) || hasColumns(db, table, requiredColumns)) {
    return;
  }

  if (tableExists(db, legacyName)) {
    db.exec(`DROP TABLE ${table}`);
    return;
  }

  db.exec(`ALTER TABLE ${table} RENAME TO ${legacyName}`);
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
  backfillExpression?: string
): void {
  if (!tableExists(db, table) || getColumns(db, table).has(column)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);

  if (backfillExpression) {
    db.exec(`
      UPDATE ${table}
      SET ${column} = ${backfillExpression}
      WHERE ${column} IS NULL
    `);
  }
}

function migrateLegacyLogs(db: Database.Database): void {
  if (!tableExists(db, 'logs') || !tableExists(db, 'gap_log')) {
    return;
  }

  db.exec(`
    INSERT OR IGNORE INTO gap_log (id, goal_id, value, note, logged_at)
    SELECT id, goal_id, amount, note, logged_at
    FROM logs
  `);
}

function migrateLegacyPaths(db: Database.Database): void {
  if (!tableExists(db, LEGACY_PATHS_TABLE) || !tableExists(db, 'paths')) {
    return;
  }

  const rows = db.prepare(
    `SELECT id, goal_id, name, playbook_id, selected_at
     FROM ${LEGACY_PATHS_TABLE}
     ORDER BY goal_id ASC, selected_at ASC, id ASC`
  ).all() as Array<{
    id: string;
    goal_id: string;
    name: string;
    playbook_id: string;
    selected_at: string | null;
  }>;

  if (rows.length === 0) {
    return;
  }

  const goalRows = db.prepare('SELECT id, active_path FROM goals').all() as Array<{
    id: string;
    active_path: string | null;
  }>;
  const activePathByGoal = new Map(goalRows.map((row) => [row.id, row.active_path]));
  const rankByGoal = new Map<string, number>();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO paths (id, goal_id, data, rank, is_active, generated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const row of rows) {
    const nextRank = (rankByGoal.get(row.goal_id) ?? 0) + 1;
    rankByGoal.set(row.goal_id, nextRank);

    const migratedPath = {
      id: row.id,
      name: row.name,
      tagline: row.playbook_id ? `Legacy playbook: ${row.playbook_id}` : 'Legacy path data',
      whyFastest: 'Migrated from a pre-v1.0 path. Run `opengoat paths` to regenerate a full ranked plan.',
      confidenceScore: 0,
      weeksToClose: 0,
      weeklyHoursRequired: 0,
      capitalRequired: 0,
      skillGaps: [],
      resourceFit: {
        time: 'stretch',
        capital: 'stretch',
        skills: 'stretch',
        network: 'stretch',
        overall: 0
      },
      milestones: [],
      firstAction: {
        description: 'Run `opengoat paths` to regenerate this legacy path.',
        timeRequired: 10,
        output: 'A fresh ranked path set'
      },
      rank: Math.min(nextRank, 5) as 1 | 2 | 3 | 4 | 5
    };

    insert.run(
      row.id,
      row.goal_id,
      JSON.stringify(migratedPath),
      nextRank,
      activePathByGoal.get(row.goal_id) === row.id ? 1 : 0,
      row.selected_at ?? new Date().toISOString()
    );
  }
}

function migrateLegacyMissions(db: Database.Database): void {
  if (!tableExists(db, LEGACY_MISSIONS_TABLE) || !tableExists(db, 'missions')) {
    return;
  }

  db.exec(`
    INSERT OR IGNORE INTO missions (
      id, goal_id, path_id, title, description, estimated_hours,
      status, week, difficulty, xp, completed_at, created_at
    )
    SELECT
      id,
      goal_id,
      path_id,
      title,
      description,
      COALESCE(est_hours, 1),
      COALESCE(status, 'pending'),
      week_number,
      COALESCE(difficulty, 2),
      COALESCE(xp, 100),
      completed_at,
      created_at
    FROM ${LEGACY_MISSIONS_TABLE}
  `);
}

function migrateLegacyScores(db: Database.Database): void {
  if (!tableExists(db, LEGACY_SCORES_TABLE) || !tableExists(db, 'week_scores')) {
    return;
  }

  db.exec(`
    INSERT OR IGNORE INTO week_scores (
      id, goal_id, week_number, velocity_score, consistency,
      momentum, path_fit, total, rank, xp, gap_at_week, scored_at
    )
    SELECT
      id,
      goal_id,
      week_number,
      COALESCE(velocity, 0),
      COALESCE(consistency, 0),
      COALESCE(execution, 0),
      COALESCE(reflection, 0),
      total,
      rank,
      xp,
      gap_end,
      scored_at
    FROM ${LEGACY_SCORES_TABLE}
  `);
}

function clearBrokenActivePathReferences(db: Database.Database): void {
  if (!tableExists(db, 'goals') || !tableExists(db, 'paths')) {
    return;
  }

  db.exec(`
    UPDATE goals
    SET active_path = NULL
    WHERE active_path IS NOT NULL
      AND active_path NOT IN (SELECT id FROM paths)
  `);
}

function migrateDatabase(db: Database.Database): void {
  renameLegacyTable(db, 'paths', ['data', 'rank', 'is_active'], LEGACY_PATHS_TABLE);
  renameLegacyTable(db, 'missions', ['estimated_hours', 'week'], LEGACY_MISSIONS_TABLE);
  renameLegacyTable(
    db,
    'week_scores',
    ['velocity_score', 'momentum', 'path_fit', 'gap_at_week'],
    LEGACY_SCORES_TABLE
  );

  db.exec(SCHEMA_SQL);

  ensureColumn(db, 'goals', 'updated_at', 'TEXT', `datetime('now')`);
  ensureColumn(db, 'resource_profiles', 'updated_at', 'TEXT', `datetime('now')`);

  migrateLegacyLogs(db);
  migrateLegacyPaths(db);
  migrateLegacyMissions(db);
  migrateLegacyScores(db);
  clearBrokenActivePathReferences(db);
}

class DB {
  private static instance: Database.Database | null = null;

  static getInstance(): Database.Database {
    if (!this.instance) {
      const dbPath = getDatabasePath();
      this.instance = new Database(dbPath);
      this.instance.pragma('journal_mode = WAL');
      this.instance.pragma('foreign_keys = ON');
      migrateDatabase(this.instance);
    }

    return this.instance;
  }
}

export function getDatabasePath(baseDir: string = process.cwd()): string {
  return path.join(baseDir, DB_FILENAME);
}

export const getDB = (): Database.Database => DB.getInstance();
