import { describe, it, expect } from 'vitest';
import { insertEvent } from '../../../modules/temporal-engine/commands/insert-event.js';

describe('insertEvent', () => {
  it('should insert an event into an empty history', () => {
    const history = [];
    const newEvent = { id: 'birth', age: 0, time: 1000 };
    
    const updatedHistory = insertEvent(history, newEvent);
    
    expect(updatedHistory).toHaveLength(1);
    expect(updatedHistory[0].sort).toBe(1000);
  });

  it('should insert an event between two existing events', () => {
    const history = [
      { id: 'e1', age: 0, sort: 1000 },
      { id: 'e3', age: 20, sort: 2000 }
    ];
    const newEvent = { id: 'e2', age: 10 };
    
    const updatedHistory = insertEvent(history, newEvent);
    
    expect(updatedHistory).toHaveLength(3);
    expect(updatedHistory[1].id).toBe('e2');
    expect(updatedHistory[1].sort).toBe(1500); // Bisected
  });

  it('should maintain chronological order by age', () => {
    const history = [
      { id: 'e1', age: 10, sort: 1000 },
      { id: 'e2', age: 30, sort: 2000 }
    ];
    const newEvent = { id: 'e3', age: 20 };
    
    const updatedHistory = insertEvent(history, newEvent);
    
    expect(updatedHistory[0].id).toBe('e1');
    expect(updatedHistory[1].id).toBe('e3');
    expect(updatedHistory[2].id).toBe('e2');
  });

  it('should perform a local reindex if there is no sort room', () => {
    const history = [
      { id: 'e1', age: 10, sort: 1000 },
      { id: 'e2', age: 30, sort: 1001 }
    ];
    const newEvent = { id: 'e3', age: 20 };
    
    const updatedHistory = insertEvent(history, newEvent);
    
    expect(updatedHistory[1].id).toBe('e3');
    // The engine should have gapped them
    expect(updatedHistory[0].sort).toBe(1000);
    expect(updatedHistory[1].sort).toBe(2000);
    expect(updatedHistory[2].sort).toBe(3000);
  });

  it('should handle sort collisions by regapping', () => {
    const history = [
      { id: 'e1', age: 10, sort: 1000 },
      { id: 'e2', age: 10, sort: 1000 } // Collision
    ];
    const newEvent = { id: 'e3', age: 10 };
    
    const updatedHistory = insertEvent(history, newEvent);
    
    expect(updatedHistory[0].sort).toBe(1000);
    expect(updatedHistory[1].sort).toBe(2000);
    expect(updatedHistory[2].sort).toBe(3000);
  });
});
