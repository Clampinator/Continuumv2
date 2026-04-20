import { describe, it, expect } from 'vitest';
import { insertSpan } from '../../../modules/temporal-engine/commands/insert-span.js';

describe('insertSpan', () => {
  it('should insert a span and shift subsequent events', () => {
    const history = [
      { id: 'birth', age: 0, time: 1000, sort: 1000 },
      { id: 'death', age: 100, time: 101000, sort: 2000 }
    ];
    
    // Insert a 5000ms jump at age 50
    const newSpan = { id: 'span1', age: 50, arrivalTime: 55000, isSpan: true };
    
    const updatedHistory = insertSpan(history, newSpan);
    
    expect(updatedHistory).toHaveLength(3);
    const span = updatedHistory.find(e => e.id === 'span1');
    const death = updatedHistory.find(e => e.id === 'death');
    
    expect(span.sort).toBe(1500);
    // Death should now be at 106000 (101000 + displacement)
    // The displacement is arrivalTime (55000) - projectedTime (51000) = 4000ms
    expect(death.time).toBe(105000);
  });

  it('should maintain subjective age deltas after propagation', () => {
    const history = [
        { id: 'birth', age: 0, time: 1000, sort: 1000 },
        { id: 'e1', age: 20, time: 21000, sort: 2000 }
    ];
    
    // Insert a span back in time by 10000ms at age 10
    // Projected time at age 10 is 11000ms. 
    // Arrival at 1000ms. 
    // Displacement = 1000 - 11000 = -10000ms
    const backSpan = { id: 'back', age: 10, arrivalTime: 1000, isSpan: true };
    
    const updatedHistory = insertSpan(history, backSpan);
    
    const e1 = updatedHistory.find(e => e.id === 'e1');
    expect(e1.time).toBe(11000); // 21000 - 10000
  });

  it('should throw an error if isSpan is false', () => {
    expect(() => insertSpan([], { isSpan: false })).toThrow('insertSpan requires an event with isSpan: true');
  });
});
