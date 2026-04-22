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
});
