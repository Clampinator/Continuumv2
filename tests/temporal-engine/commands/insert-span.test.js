import { describe, it, expect } from 'vitest';
import { insertSpan } from '../../../modules/temporal-engine/commands/insert-span.js';

describe('insertSpan', () => {
  it('should insert a span and shift subsequent events', () => {
    const history = [
      { id: 'birth', x: 0, y: 1000, sort: 1000, isBirth: true },
      { id: 'death', x: 100, y: 101000, sort: 2000 }
    ];
    
    // Insert a 4000ms jump at age 50
    // Projected time at age 50 is 51000ms.
    // Arrival at 55000ms.
    const newSpan = { id: 'span1', x: 50, arrivalY: 55000, record: { eventIsSpan: true }, sort: 1500 };
    
    const updatedHistory = insertSpan(history, newSpan);
    
    expect(updatedHistory).toHaveLength(3);
    const span = updatedHistory.find(e => e.id === 'span1');
    const death = updatedHistory.find(e => e.id === 'death');
    
    expect(span.sort).toBe(1500); // birth(1000), span1(1500), death(2000) - No re-gap needed
    // Death should now be at 105000 (101000 + displacement of 4000)
    expect(death.y).toBe(105000);
  });

  it('should maintain subjective age deltas after propagation', () => {
    const history = [
        { id: 'birth', x: 0, y: 1000, sort: 1000, isBirth: true },
        { id: 'e1', x: 20, y: 21000, sort: 2000 }
    ];
    
    // Insert a span back in time by 10000ms at age 10
    // Projected time at age 10 is 11000ms. 
    // Arrival at 1000ms. 
    // Displacement = 1000 - 11000 = -10000ms
    const backSpan = { id: 'back', x: 10, arrivalY: 1000, record: { eventIsSpan: true }, sort: 1500 };
    
    const updatedHistory = insertSpan(history, backSpan);
    
    const e1 = updatedHistory.find(e => e.id === 'e1');
    expect(e1.y).toBe(11000); // 21000 - 10000
  });

  it('should throw an error if eventIsSpan is false', () => {
    expect(() => insertSpan([], { record: { eventIsSpan: false } })).toThrow('insertSpan requires an event with eventIsSpan: true');
  });
});
