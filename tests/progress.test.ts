import { describe, it, expect } from 'vitest';
import { calculateProgress } from '../src/lib/progress.js';

describe('progress calculations', () => {
  it('calculates 7-day velocity and projection from recent history', () => {
    const now = new Date('2026-03-22T00:00:00.000Z').getTime();
    const goal = {
      id: 'goal-1',
      statement: 'Reach 1000',
      category: 'income',
      currentVal: 400,
      targetVal: 1000,
      unit: '$',
      deadline: '2026-04-19',
      status: 'active',
      createdAt: new Date('2026-03-01T00:00:00.000Z')
    } as const;

    const history = [
      { id: '1', goalId: 'goal-1', value: 100, loggedAt: new Date('2026-03-10T00:00:00.000Z') },
      { id: '2', goalId: 'goal-1', value: 250, loggedAt: new Date('2026-03-18T00:00:00.000Z') },
      { id: '3', goalId: 'goal-1', value: 400, loggedAt: new Date('2026-03-22T00:00:00.000Z') }
    ];

    const progress = calculateProgress(goal, history as any, 400, now);
    expect(progress.gapRemaining).toBe(600);
    expect(progress.closedPercent).toBe(40);
    expect(progress.velocity7d).toBeCloseTo(262.5, 1);
    expect(progress.velocityLabel).toContain('7-day average');
    expect(progress.projectedDate).not.toContain('No projection');
  });

  it('falls back cleanly when there is not enough data', () => {
    const goal = {
      id: 'goal-2',
      statement: 'Run a marathon',
      category: 'fitness',
      currentVal: 1,
      targetVal: 10,
      unit: 'km',
      deadline: '2026-06-01',
      status: 'active',
      createdAt: new Date('2026-03-01T00:00:00.000Z')
    } as const;

    const history = [{ id: '1', goalId: 'goal-2', value: 1, loggedAt: new Date('2026-03-22T00:00:00.000Z') }];
    const progress = calculateProgress(goal, history as any, 1, new Date('2026-03-22T00:00:00.000Z').getTime());

    expect(progress.velocity7d).toBe(0);
    expect(progress.projectedDate).toBe('No projection (log more data)');
  });
});
