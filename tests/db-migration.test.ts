import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

describe('database migrations', () => {
  const originalCwd = process.cwd();
  const tempDirs: string[] = [];

  afterEach(() => {
    process.chdir(originalCwd);
    vi.resetModules();

    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()!;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('migrates legacy table shapes to the v1 schema', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opengoat-db-'));
    tempDirs.push(tempDir);

    const dbPath = path.join(tempDir, 'opengoat.db');
    const legacy = new Database(dbPath);
    legacy.exec(`
      CREATE TABLE goals (
        id TEXT PRIMARY KEY,
        statement TEXT NOT NULL,
        category TEXT NOT NULL,
        current_val REAL NOT NULL,
        target_val REAL NOT NULL,
        unit TEXT NOT NULL,
        deadline TEXT NOT NULL,
        active_path TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE paths (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES goals(id),
        name TEXT NOT NULL,
        playbook_id TEXT NOT NULL,
        selected_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE missions (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES goals(id),
        path_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        est_hours REAL NOT NULL,
        actual_hours REAL,
        status TEXT DEFAULT 'pending',
        week_number INTEGER NOT NULL,
        difficulty INTEGER DEFAULT 2,
        xp INTEGER NOT NULL,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE week_scores (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES goals(id),
        week_number INTEGER NOT NULL,
        execution REAL NOT NULL,
        consistency REAL NOT NULL,
        velocity REAL NOT NULL,
        reflection REAL NOT NULL,
        total REAL NOT NULL,
        rank TEXT NOT NULL,
        xp INTEGER NOT NULL,
        gap_end REAL,
        embedding TEXT,
        scored_at TEXT DEFAULT (datetime('now')),
        UNIQUE(goal_id, week_number)
      );
    `);

    legacy.prepare(`
      INSERT INTO goals (id, statement, category, current_val, target_val, unit, deadline, active_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('goal-1', 'Launch product', 'launch', 10, 100, 'users', '2026-06-01', 'path-1');
    legacy.prepare(`
      INSERT INTO paths (id, goal_id, name, playbook_id)
      VALUES (?, ?, ?, ?)
    `).run('path-1', 'goal-1', 'Legacy path', 'legacy-playbook');
    legacy.prepare(`
      INSERT INTO missions (id, goal_id, path_id, title, description, est_hours, status, week_number, difficulty, xp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('mission-1', 'goal-1', 'path-1', 'Call prospects', 'Reach out to 10 leads.', 2, 'pending', 1, 2, 120);
    legacy.prepare(`
      INSERT INTO week_scores (id, goal_id, week_number, execution, consistency, velocity, reflection, total, rank, xp, gap_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('score-1', 'goal-1', 1, 80, 70, 60, 50, 67, 'Operator', 670, 90);
    legacy.close();

    process.chdir(tempDir);
    vi.resetModules();

    const { getDB } = await import('../src/data/db.js');
    const db = getDB();

    const pathColumns = db.prepare(`PRAGMA table_info(paths)`).all() as Array<{ name: string }>;
    expect(pathColumns.some((column) => column.name === 'data')).toBe(true);

    const migratedPath = db.prepare(`SELECT * FROM paths WHERE id = 'path-1'`).get() as any;
    expect(migratedPath.is_active).toBe(1);
    expect(JSON.parse(migratedPath.data).name).toBe('Legacy path');

    const migratedMission = db.prepare(`SELECT estimated_hours, week FROM missions WHERE id = 'mission-1'`).get() as any;
    expect(migratedMission.estimated_hours).toBe(2);
    expect(migratedMission.week).toBe(1);

    const migratedScore = db.prepare(`
      SELECT velocity_score, momentum, path_fit, gap_at_week
      FROM week_scores
      WHERE id = 'score-1'
    `).get() as any;
    expect(migratedScore.velocity_score).toBe(60);
    expect(migratedScore.momentum).toBe(80);
    expect(migratedScore.path_fit).toBe(50);
    expect(migratedScore.gap_at_week).toBe(90);

    db.close();
  });
});
