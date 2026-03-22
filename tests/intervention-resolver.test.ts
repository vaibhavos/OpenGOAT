import { describe, it, expect } from 'vitest';
import { resolveInterventionResponse } from '../src/lib/intervention-resolver.js';

describe('intervention resolver', () => {
  it('classifies time constraints', () => {
    const resolution = resolveInterventionResponse('I do not have enough time after work this week.');
    expect(resolution.constraintType).toBe('time');
  });

  it('classifies external blockers', () => {
    const resolution = resolveInterventionResponse('I am waiting on client approval before I can continue.');
    expect(resolution.constraintType).toBe('external');
  });

  it('defaults to clarity when no strong keyword is found', () => {
    const resolution = resolveInterventionResponse('Everything feels fuzzy and I am not sure what to do first.');
    expect(resolution.constraintType).toBe('clarity');
  });
});
