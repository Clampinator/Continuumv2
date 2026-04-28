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

  it('should output startAge/endAge/startTime/endTime field names', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Test Exp', dateFrom: '2020-01-01', dateTo: '2022-01-01' }
          }
      }];
      const levelNodes = [
          { age: 0, time: new Date('2020-01-01T12:00:00Z').getTime(), expId: 'exp1' },
          { age: SECONDS_IN_YEAR * 2, time: new Date('2022-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results[0];

      expect(exp1.startAge).toBeDefined();
      expect(exp1.endAge).toBeDefined();
      expect(exp1.startTime).toBeDefined();
      expect(exp1.endTime).toBeDefined();
      expect(exp1.isClosed).toBe(true);
      expect(exp1.startX).toBeUndefined();
      expect(exp1.endX).toBeUndefined();
  });

  it('should include bonus field on each experience', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Recent Exp', dateFrom: '2023-01-01', dateTo: '2024-01-01' }
          }
      }];
      const levelNodes = [
          { age: 0, time: new Date('2023-01-01T12:00:00Z').getTime(), expId: 'exp1' },
          { age: SECONDS_IN_YEAR, time: new Date('2024-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 2, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      expect(results[0].bonus).toBeDefined();
      expect(typeof results[0].bonus).toBe('number');
  });

  it('should cap bonus at 3 even when duration and distance both contribute', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Long Recent', dateFrom: '2020-01-01', dateTo: '2025-01-01' }
          }
      }];
      const levelNodes = [
          { age: 0, time: new Date('2020-01-01T12:00:00Z').getTime(), expId: 'exp1' },
          { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5.5, time: new Date('2025-06-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      expect(results[0].bonus).toBeLessThanOrEqual(3);
  });

  it('should apply duration bonus +1 at exactly 2 years boundary (inclusive)', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Two Year Exp', dateFrom: '2020-01-01', dateTo: '2022-01-01' }
          }
      }];
      // Duration is exactly 2 years (2 * SECONDS_IN_YEAR)
      const levelNodes = [
          { age: 0, time: new Date('2020-01-01T12:00:00Z').getTime(), expId: 'exp1' },
          { age: SECONDS_IN_YEAR * 2, time: new Date('2022-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      // NOW is far enough that distance bonus = 0
      const nowNode = { age: SECONDS_IN_YEAR * 15, time: new Date('2035-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      // Duration <= 2 years -> duration bonus = +1
      // Distance > 10 years -> distance bonus = 0
      expect(results[0].bonus).toBe(1);
  });

  it('should apply duration bonus +2 just above 2 years', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Over Two Year', dateFrom: '2020-01-01', dateTo: '2022-06-01' }
          }
      }];
      const levelNodes = [
          { age: 0, time: new Date('2020-01-01T12:00:00Z').getTime(), expId: 'exp1' },
          { age: SECONDS_IN_YEAR * 2.5, time: new Date('2022-06-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 15, time: new Date('2035-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      // Duration > 2, <= 4 -> duration bonus = +2
      // Distance > 10 -> distance bonus = 0
      expect(results[0].bonus).toBe(2);
  });

  it('should support .x/.y node format (legacy engine output)', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Legacy Exp', dateFrom: '2020-01-01', dateTo: '' }
          }
      }];
      const legacyNodes = [
          { x: 0, y: new Date('2020-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { x: SECONDS_IN_YEAR * 5, y: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, legacyNodes, nowNode);
      expect(results).toHaveLength(1);
      expect(results[0].isOngoing).toBe(true);
  });
});
