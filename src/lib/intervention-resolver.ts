import type { Intervention } from '../types/intervention.js';

export interface InterventionResolution {
  constraintType: Intervention['constraintType'];
  unlockAction: string;
}

const KEYWORDS: Array<{
  constraintType: Intervention['constraintType'];
  matches: string[];
  unlockAction: string;
}> = [
  {
    constraintType: 'time',
    matches: ['time', 'busy', 'schedule', 'work', 'hours', 'calendar'],
    unlockAction: 'Block a concrete 60-90 minute slot today and define one visible output for that session.'
  },
  {
    constraintType: 'skill',
    matches: ['skill', 'learn', 'don\'t know', 'unclear technically', 'stuck technically', 'hard'],
    unlockAction: 'Shrink the work to a tutorial-sized slice and finish one proof-of-work before returning to the larger task.'
  },
  {
    constraintType: 'resource',
    matches: ['money', 'resource', 'budget', 'tool', 'equipment', 'capital'],
    unlockAction: 'Reduce scope to what you can do with current resources or identify the single cheapest missing input to acquire next.'
  },
  {
    constraintType: 'external',
    matches: ['waiting', 'client', 'approval', 'reply', 'response', 'dependency', 'blocked by'],
    unlockAction: 'Send the blocking request now, set a follow-up date, and create one parallel task that does not depend on the response.'
  },
  {
    constraintType: 'motivation',
    matches: ['motivation', 'tired', 'burned out', 'avoid', 'procrast', 'energy'],
    unlockAction: 'Cut the task down to a 15-minute starter action and begin before you evaluate how you feel about it.'
  }
];

export function resolveInterventionResponse(response: string): InterventionResolution {
  const normalized = response.trim().toLowerCase();

  for (const entry of KEYWORDS) {
    if (entry.matches.some((match) => normalized.includes(match))) {
      return {
        constraintType: entry.constraintType,
        unlockAction: entry.unlockAction
      };
    }
  }

  return {
    constraintType: 'clarity',
    unlockAction: 'Rewrite the next move as one action you can finish in under 2 hours, then execute only that step.'
  };
}
