import { describe, it, expect } from 'vitest';
import { generateExperiences } from '../../modules/lifeline/services/segment-generator/generate-experiences.js';
import { SECONDS_IN_YEAR } from '../../modules/temporal-engine/constants.js';

describe('Experience Box Geometry Engine', () => {
  it('should identify an open experience and project it to the NOW node', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Open Exp', dateFrom: '2020-01-01', dateTo: '' }
          }
      }];
      const levelNodes = [
          { age: 0, time: new Date('2020-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };
      
      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');
      
      expect(exp1.isOngoing).toBe(true);
      expect(exp1.endAge).toBe(nowNode.age);
  });

  it('should identify a closed experience and truncate it at the closing node', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Closed Exp', dateFrom: '2020-01-01', dateTo: '2022-01-01' }
          }
      }];
      const levelNodes = [
          { age: 0, time: new Date('2020-01-01T12:00:00Z').getTime(), expId: 'exp1' },
          { age: SECONDS_IN_YEAR * 2, time: new Date('2022-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };
      
      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');
      
      expect(exp1.isOngoing).toBe(false);
      expect(exp1.endAge).toBe(SECONDS_IN_YEAR * 2);
  });

  it('should calculate "The Forgetting" fade correctly over 15 years', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Old Exp', dateFrom: '2000-01-01', dateTo: '2005-01-01' }
          }
      }];
      const levelNodes = [
          { age: 0, time: new Date('2000-01-01T12:00:00Z').getTime(), expId: 'exp1' },
          { age: SECONDS_IN_YEAR * 5, time: new Date('2005-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      
      // Case A: Exactly at the end (100% opacity)
      const nowNodeA = { age: SECONDS_IN_YEAR * 5, time: new Date('2005-01-01T12:00:00Z').getTime() };
      const resA = generateExperiences(sortedEras, levelNodes, nowNodeA);
      expect(resA[0].opacity).toBe(1.0);

      // Case B: 15 years later (10% opacity)
      const nowNodeB = { age: SECONDS_IN_YEAR * 20, time: new Date('2020-01-01T12:00:00Z').getTime() };
      const resB = generateExperiences(sortedEras, levelNodes, nowNodeB);
      expect(resB[0].opacity).toBeCloseTo(0.1, 5);

      // Case C: 30 years later (lingers at 10% opacity)
      const nowNodeC = { age: SECONDS_IN_YEAR * 35, time: new Date('2035-01-01T12:00:00Z').getTime() };
      const resC = generateExperiences(sortedEras, levelNodes, nowNodeC);
      expect(resC[0].opacity).toBe(0.1);
  });
});
