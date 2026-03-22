import { getDB } from '../db.js';
import { Mission } from '../../types/plugin.js';
import { v4 as uuidv4 } from 'uuid';

export class MissionsRepo {
  static getByGoal(goalId: string, week: number): Mission[] {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM missions WHERE goal_id = ? AND week = ?').all(goalId, week) as any[];
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      estimatedHours: r.estimated_hours,
      status: r.status,
      week: r.week,
      pathId: r.path_id,
      goalId: r.goal_id,
      xp: r.xp,
      difficulty: r.difficulty,
      createdAt: new Date(r.created_at + 'Z')
    }));
  }

  static create(mission: Omit<Mission, 'id' | 'createdAt'>): string {
    const db = getDB();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO missions (id, title, description, estimated_hours, status, week, path_id, goal_id, xp, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, mission.title, mission.description, mission.estimatedHours,
      mission.status, mission.week, mission.pathId, mission.goalId,
      mission.xp, mission.difficulty
    );
    return id;
  }

  static createMany(missions: Mission[]): void {
    const db = getDB();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO missions (
        id, title, description, estimated_hours, status, week, path_id, goal_id, xp, difficulty, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const mission of missions) {
        insert.run(
          mission.id,
          mission.title,
          mission.description,
          mission.estimatedHours,
          mission.status,
          mission.week,
          mission.pathId,
          mission.goalId,
          mission.xp,
          mission.difficulty,
          mission.createdAt.toISOString()
        );
      }
    })();
  }

  static getAllByGoal(goalId: string): Mission[] {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM missions WHERE goal_id = ? ORDER BY week DESC').all(goalId) as any[];
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      estimatedHours: r.estimated_hours,
      status: r.status,
      week: r.week,
      pathId: r.path_id,
      goalId: r.goal_id,
      xp: r.xp,
      difficulty: r.difficulty,
      createdAt: new Date(r.created_at + 'Z')
    }));
  }

  static markComplete(id: string): void {
    const db = getDB();
    db.prepare(`
      UPDATE missions
      SET status = 'complete', completed_at = datetime('now')
      WHERE id = ?
    `).run(id);
  }

  static markMissed(id: string): void {
    const db = getDB();
    db.prepare(`
      UPDATE missions
      SET status = 'missed'
      WHERE id = ?
    `).run(id);
  }
}
