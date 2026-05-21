import { describe, it, expect } from 'vitest';
import { syncActorName } from '/systems/continuum-v2/modules/state/sync-actor-name.js';

describe('syncActorName', () => {
  it('should sync system.personal.name when formData.name is present', () => {
    const formData = { name: 'Alice' };
    syncActorName(formData);
    expect(formData['system.personal.name']).toBe('Alice');
  });

  it('should not set system.personal.name when formData.name is absent', () => {
    const formData = {};
    syncActorName(formData);
    expect(formData['system.personal.name']).toBeUndefined();
  });

  it('should return the same object reference', () => {
    const formData = { name: 'Bob' };
    const result = syncActorName(formData);
    expect(result).toBe(formData);
  });

  it('should not overwrite system.personal.name when formData.name is empty string', () => {
    const formData = { name: '' };
    syncActorName(formData);
    expect(formData['system.personal.name']).toBeUndefined();
  });
});