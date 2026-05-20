import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkGoalToEvent } from '../../modules/state/link-goal-to-event.js';

// Mock Foundry globals
globalThis.ui = { notifications: { info: vi.fn() } };

function makeActor(eras) {
  const updates = {};
  return {
    system: { eras },
    update: vi.fn(async (patch) => {
      // Simulate Foundry merging the patch into system
      Object.assign(updates, patch);
      // Apply linkedGoalIds and linkedGoalId directly so
      // subsequent reads see the updated state
      for (const [path, value] of Object.entries(patch)) {
        applyPath(eras, path, value);
      }
    }),
    _updates: updates
  };
}

// Apply a dot-path update into the nested eras structure
function applyPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

describe('linkGoalToEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a goal ID to an era-level event', async () => {
    const actor = makeActor({
      era1: {
        events: {
          evt1: { linkedGoalIds: [], linkedGoalId: null }
        }
      }
    });

    const result = await linkGoalToEvent(actor, 'goalA', 'era1', null, 'evt1');

    expect(result).toBe(true);
    const updateCall = actor.update.mock.calls[0][0];
    expect(updateCall['system.eras.era1.events.evt1.linkedGoalIds']).toEqual(['goalA']);
    expect(updateCall['system.eras.era1.events.evt1.linkedGoalId']).toBeNull();
    expect(ui.notifications.info).toHaveBeenCalledWith('Goal linked to event.');
  });

  it('should add a goal ID to an experience-level event', async () => {
    const actor = makeActor({
      era1: {
        experiences: {
          exp1: {
            events: {
              evt2: { linkedGoalIds: [], linkedGoalId: null }
            }
          }
        }
      }
    });

    const result = await linkGoalToEvent(actor, 'goalB', 'era1', 'exp1', 'evt2');

    expect(result).toBe(true);
    const updateCall = actor.update.mock.calls[0][0];
    expect(updateCall['system.eras.era1.experiences.exp1.events.evt2.linkedGoalIds']).toEqual(['goalB']);
    expect(updateCall['system.eras.era1.experiences.exp1.events.evt2.linkedGoalId']).toBeNull();
  });

  it('should not duplicate an already-linked goal ID', async () => {
    const actor = makeActor({
      era1: {
        events: {
          evt1: { linkedGoalIds: ['goalA'], linkedGoalId: null }
        }
      }
    });

    const result = await linkGoalToEvent(actor, 'goalA', 'era1', null, 'evt1');

    expect(result).toBe(false);
    expect(actor.update).not.toHaveBeenCalled();
  });

  it('should migrate legacy linkedGoalId into the array', async () => {
    const actor = makeActor({
      era1: {
        events: {
          evt1: { linkedGoalIds: [], linkedGoalId: 'goalOld' }
        }
      }
    });

    const result = await linkGoalToEvent(actor, 'goalNew', 'era1', null, 'evt1');

    expect(result).toBe(true);
    const updateCall = actor.update.mock.calls[0][0];
    // Legacy goal migrated and new goal added, deduplicated
    expect(updateCall['system.eras.era1.events.evt1.linkedGoalIds']).toEqual(
      expect.arrayContaining(['goalOld', 'goalNew'])
    );
    expect(updateCall['system.eras.era1.events.evt1.linkedGoalId']).toBeNull();
  });

  it('should deduplicate when legacy linkedGoalId matches the new goal', async () => {
    const actor = makeActor({
      era1: {
        events: {
          evt1: { linkedGoalIds: [], linkedGoalId: 'goalX' }
        }
      }
    });

    const result = await linkGoalToEvent(actor, 'goalX', 'era1', null, 'evt1');

    // goalX already exists via legacy field - should return false
    expect(result).toBe(false);
    expect(actor.update).not.toHaveBeenCalled();
  });

  it('should return false for missing era', async () => {
    const actor = makeActor({});
    const result = await linkGoalToEvent(actor, 'goalA', 'nonexistent', null, 'evt1');
    expect(result).toBe(false);
  });

  it('should return false for missing event', async () => {
    const actor = makeActor({
      era1: { events: {} }
    });
    const result = await linkGoalToEvent(actor, 'goalA', 'era1', null, 'nonexistent');
    expect(result).toBe(false);
  });

  it('should return false when actor is null', async () => {
    const result = await linkGoalToEvent(null, 'goalA', 'era1', null, 'evt1');
    expect(result).toBe(false);
  });

  it('should preserve existing goal IDs when adding a new one', async () => {
    const actor = makeActor({
      era1: {
        events: {
          evt1: { linkedGoalIds: ['goal1', 'goal2'], linkedGoalId: null }
        }
      }
    });

    const result = await linkGoalToEvent(actor, 'goal3', 'era1', null, 'evt1');

    expect(result).toBe(true);
    const updateCall = actor.update.mock.calls[0][0];
    expect(updateCall['system.eras.era1.events.evt1.linkedGoalIds']).toEqual(['goal1', 'goal2', 'goal3']);
  });

  it('should handle missing linkedGoalIds field gracefully', async () => {
    const actor = makeActor({
      era1: {
        events: {
          evt1: { linkedGoalId: null }
          // linkedGoalIds is undefined
        }
      }
    });

    const result = await linkGoalToEvent(actor, 'goalA', 'era1', null, 'evt1');

    expect(result).toBe(true);
    const updateCall = actor.update.mock.calls[0][0];
    expect(updateCall['system.eras.era1.events.evt1.linkedGoalIds']).toEqual(['goalA']);
  });
});