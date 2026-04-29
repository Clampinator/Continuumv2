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

  // NODE-ANCHORED TESTS: Verify experience boxes anchor to event node coordinates

  it('should anchor start corner to opener node coordinates via record.startsExpId', () => {
      const startTime = new Date('2020-06-15T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Anchored Exp', dateFrom: '2020-01-01', dateTo: '2022-01-01' }
          }
      }];
      // Opener node has startsExpId pointing to this experience.
      // The experience dateFrom says 2020-01-01 but the opener event is at 2020-06-15.
      // The box MUST anchor to the event node, not the date string.
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: startTime, expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          { age: SECONDS_IN_YEAR * 2, time: new Date('2022-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // Start corner must be anchored to opener node, not dateFrom string
      expect(exp1.startAge).toBe(SECONDS_IN_YEAR * 0.5);
      expect(exp1.startTime).toBe(startTime);
  });

  it('should anchor end corner to closer node via record.isExpEnd', () => {
      const endTime = new Date('2022-06-15T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Closed Anchored Exp', dateFrom: '2020-01-01', dateTo: '2022-01-01' }
          }
      }];
      // The dateTo says 2022-01-01 but the closer event is at 2022-06-15.
      // The box MUST anchor to the closer node.
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          { age: SECONDS_IN_YEAR * 2.5, time: endTime, expId: 'exp1',
            record: { isExpEnd: true } }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // End corner must be anchored to closer node, not dateTo string
      expect(exp1.endAge).toBe(SECONDS_IN_YEAR * 2.5);
      expect(exp1.endTime).toBe(endTime);
      expect(exp1.isClosed).toBe(true);
  });

  it('should use first chain node as opener fallback when no startsExpId marker exists', () => {
      const startTime = new Date('2020-03-15T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Fallback Exp', dateFrom: '2020-01-01', dateTo: '2022-01-01' }
          }
      }];
      // No startsExpId or isExpStart on any node. The first chain node becomes the opener.
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.25, time: startTime, expId: 'exp1' },
          { age: SECONDS_IN_YEAR * 2, time: new Date('2022-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // Start should anchor to the first chain node's coordinates
      expect(exp1.startAge).toBe(SECONDS_IN_YEAR * 0.25);
      expect(exp1.startTime).toBe(startTime);
  });

  it('should use dateTo as end boundary for closed experiences without isExpEnd', () => {
      // When an experience is closed (dateTo set) but no node carries isExpEnd,
      // the end boundary comes from dateTo, not the last chain node.
      // This prevents the box from collapsing to an interior event that
      // happened before the experience actually ended.
      const chainEndTime = new Date('2021-06-01T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Closed No Closer', dateFrom: '2020-01-01', dateTo: '2023-01-01' }
          }
      }];
      // The last chain event is at age 1.4yr (2021-06-01) but dateTo is 2023-01-01.
      // The box should extend to dateTo, NOT collapse to the last interior event.
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          { age: SECONDS_IN_YEAR * 1.4, time: chainEndTime, expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // End should come from dateTo (2023-01-01), NOT from the last chain node
      expect(exp1.isClosed).toBe(true);
      expect(exp1.endAge).toBeGreaterThan(SECONDS_IN_YEAR * 1.4);
  });

  it('should not let chain events shrink end boundary of closed experiences', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Closed Extended', dateFrom: '2020-01-01', dateTo: '2025-01-01' }
          }
      }];
      // Chain events end at age 2yr but dateTo says the experience ends at age 5yr.
      // The elastic expansion must NOT shrink the end back to age 2.
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          { age: SECONDS_IN_YEAR * 2, time: new Date('2022-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 8, time: new Date('2028-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // End should be at dateTo (approximately 5 years), not at the last chain node (2 years)
      expect(exp1.endAge).toBeGreaterThan(SECONDS_IN_YEAR * 4);
      expect(exp1.isClosed).toBe(true);
  });

  it('should anchor ongoing experience end to NOW node coordinates', () => {
      const openerTime = new Date('2020-06-15T12:00:00Z').getTime();
      const nowAge = SECONDS_IN_YEAR * 7;
      const nowTime = new Date('2027-01-01T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Ongoing Anchored', dateFrom: '2020-01-01', dateTo: '' }
          }
      }];
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: openerTime, expId: 'exp1',
            record: { startsExpId: 'exp1' } }
      ];
      const nowNode = { age: nowAge, time: nowTime };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      expect(exp1.isOngoing).toBe(true);
      // Start anchored to opener node
      expect(exp1.startAge).toBe(SECONDS_IN_YEAR * 0.5);
      expect(exp1.startTime).toBe(openerTime);
      // End anchored to NOW node
      expect(exp1.endAge).toBe(nowAge);
      expect(exp1.endTime).toBe(nowTime);
  });

  it('should fall back to mapDateToSubjective when no chain nodes exist', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Date Fallback', dateFrom: '2020-01-01', dateTo: '2022-01-01' }
          }
      }];
      // No nodes belong to this experience at all.
      // The only node is a birth node (no expId).
      const levelNodes = [
          { age: 0, time: new Date('2020-01-01T12:00:00Z').getTime() }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // Should still produce valid coordinates via date fallback
      expect(exp1).toBeDefined();
      expect(exp1.startAge).toBeDefined();
      expect(exp1.endAge).toBeDefined();
      expect(exp1.isClosed).toBe(true);
  });

  it('should anchor closed experience end at closer node, not beyond it', () => {
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Elastic Closed', dateFrom: '2020-01-01', dateTo: '2022-06-15' }
          }
      }];
      // Opener at age 0.5yr, closer (isExpEnd) at age 2.5yr.
      // A mid-chain event at age 1.5yr is between them.
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          { age: SECONDS_IN_YEAR * 1.5, time: new Date('2021-06-15T12:00:00Z').getTime(), expId: 'exp1' },
          { age: SECONDS_IN_YEAR * 2.5, time: new Date('2022-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { isExpEnd: true } }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // Start anchored to opener, end anchored to closer node
      expect(exp1.startAge).toBe(SECONDS_IN_YEAR * 0.5);
      expect(exp1.endAge).toBe(SECONDS_IN_YEAR * 2.5);
  });

  it('should expand ongoing experience end when chain events extend past opener', () => {
      const nowAge = SECONDS_IN_YEAR * 7;
      const nowTime = new Date('2027-01-01T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Ongoing Elastic', dateFrom: '2020-01-01', dateTo: '' }
          }
      }];
      // Opener at age 0.5yr, but a chain event at age 3yr.
      // Ongoing experience should still expand the box along the start axis.
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          { age: SECONDS_IN_YEAR * 3, time: new Date('2023-01-01T12:00:00Z').getTime(), expId: 'exp1' }
      ];
      const nowNode = { age: nowAge, time: nowTime };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // Start anchored to opener, end at NOW
      expect(exp1.isOngoing).toBe(true);
      expect(exp1.startAge).toBe(SECONDS_IN_YEAR * 0.5);
      expect(exp1.endAge).toBe(nowAge);
      expect(exp1.endTime).toBe(nowTime);
  });

  it('should remain visible with fading opacity after closing', () => {
      // Closed experiences must NOT disappear. They fade from 100% to 10%
      // over 15 subjective years after the end date.
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Visible After Close', dateFrom: '2020-01-01', dateTo: '2022-01-01' }
          }
      }];
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 8, time: new Date('2028-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      expect(exp1).toBeDefined();
      expect(exp1.isClosed).toBe(true);
      // Opacity should be fading but still visible (> 10%)
      expect(exp1.opacity).toBeGreaterThan(0.1);
      expect(exp1.opacity).toBeLessThan(1.0);
  });

  it('should decouple span displacement from The Forgetting opacity', () => {
      // Character spanned UP from age 10 to year 2050 (arriving at subjective age 10
      // in year 2050). NOW is at year 2055, subjective leveling age 15.
      // A closed experience that ended at subjective age 8 should calculate
      // opacity based on 15 - 8 = 7 years since, NOT the span-inflated age.
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Span Decoupled', dateFrom: '2010-01-01', dateTo: '2018-01-01' }
          }
      }];
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 5, time: new Date('2015-01-01T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } }
      ];
      // NOW node at span-inflated age 40 (spanned from age 10 to year 2050, then
      // leveled 5 years). But levelingAge = 15 (the character's true subjective age).
      const nowNode = { age: SECONDS_IN_YEAR * 40, time: new Date('2055-01-01T12:00:00Z').getTime() };
      const levelingAge = SECONDS_IN_YEAR * 15;

      const results = generateExperiences(sortedEras, levelNodes, nowNode, levelingAge);
      const exp1 = results.find(r => r.id === 'exp1');

      // Opacity should be based on 7 years since (levelingAge - endAge),
      // not 32 years (spanInflatedAge - endAge).
      // 7 years -> opacity = 1.0 - (7/15)*0.9 = 0.58
      expect(exp1.opacity).toBeCloseTo(1.0 - (7 / 15) * 0.9, 3);
      // If span-decoupling is broken, opacity would be 0.1 (clamped minimum)
      // because 32 years >> 15 years.
      expect(exp1.opacity).toBeGreaterThan(0.1);
  });

  it('should decouple span displacement from experience bonus', () => {
      // Character spanned UP. Ongoing experience started at subjective age 5.
      // Leveling age is 10, but NOW node's raw age (including span) is 35.
      // Bonus distance should use leveling age (5 years in experience),
      // NOT the span-inflated age (30 years).
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Span Bonus', dateFrom: '2005-01-01', dateTo: '' }
          }
      }];
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 5, time: new Date('2005-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } }
      ];
      // NOW node at span-inflated position, leveling age is 10.
      const nowNode = { age: SECONDS_IN_YEAR * 35, time: new Date('2040-01-01T12:00:00Z').getTime() };
      const levelingAge = SECONDS_IN_YEAR * 10;

      const results = generateExperiences(sortedEras, levelNodes, nowNode, levelingAge);
      const exp1 = results.find(r => r.id === 'exp1');

      expect(exp1.isOngoing).toBe(true);
      // Duration bonus: 5 years (levelingAge - startAge) = 5yr -> +3 duration
      // Distance bonus: 0 (ongoing) -> +3
      // Total: capped at +3
      expect(exp1.bonus).toBe(3);

      // Visual bounding box should still extend to the span-inflated NOW
      expect(exp1.endAge).toBe(SECONDS_IN_YEAR * 35);
  });

  // ENDS_EXP_ID TESTS: Closing events at era-level that carry endsExpId

  it('should anchor end corner to era-level closer node via record.endsExpId', () => {
      // When an experience is closed, the closing event is ejected to era-level
      // (expId = null) but stamped with endsExpId pointing back to the experience.
      // The box's right edge must anchor to this era-level node.
      const closerTime = new Date('2022-06-15T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Era-Level Closer', dateFrom: '2020-01-01', dateTo: '2022-06-15' }
          }
      }];
      // Opener inside the experience, closer at era-level with endsExpId
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          { age: SECONDS_IN_YEAR * 2.5, time: closerTime, expId: null,
            record: { endsExpId: 'exp1' } }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // End corner must be anchored to the era-level closer node
      expect(exp1.endAge).toBe(SECONDS_IN_YEAR * 2.5);
      expect(exp1.endTime).toBe(closerTime);
      expect(exp1.isClosed).toBe(true);
  });

  it('should prefer endsExpId over isExpEnd when both exist in the node pool', () => {
      // If multiple nodes could act as closer, endsExpId is the stronger signal
      // because it explicitly names which experience was closed.
      const closerTime = new Date('2022-06-15T12:00:00Z').getTime();
      const wrongTime = new Date('2021-01-01T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'EndsExpId Priority', dateFrom: '2020-01-01', dateTo: '2022-06-15' }
          }
      }];
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          // isExpEnd node at wrong position (should be ignored when endsExpId is available)
          { age: SECONDS_IN_YEAR * 1, time: wrongTime, expId: null,
            record: { isExpEnd: true } },
          // endsExpId node at correct position (should win)
          { age: SECONDS_IN_YEAR * 2.5, time: closerTime, expId: null,
            record: { endsExpId: 'exp1' } }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // Should anchor to the endsExpId node, not the stray isExpEnd node
      expect(exp1.endAge).toBe(SECONDS_IN_YEAR * 2.5);
      expect(exp1.endTime).toBe(closerTime);
  });

  it('should find closer by date-matching when endsExpId and isExpEnd are absent', () => {
      // Legacy data: experience was closed before endsExpId existed.
      // The closing event is era-level with no endsExpId or isExpEnd.
      // But its eventDate + eventTime matches the experience's dateTo.
      const closerTime = new Date('2022-06-15T12:00:00Z').getTime();
      const sortedEras = [{
          id: 'era1',
          experiences: {
              'exp1': { id: 'exp1', name: 'Legacy Closer', dateFrom: '2020-01-01', dateTo: '2022-06-15 12:00:00' }
          }
      }];
      const levelNodes = [
          { age: SECONDS_IN_YEAR * 0.5, time: new Date('2020-06-15T12:00:00Z').getTime(), expId: 'exp1',
            record: { startsExpId: 'exp1' } },
          // Era-level closer with no endsExpId but matching dateTo
          { age: SECONDS_IN_YEAR * 2.5, time: closerTime, expId: null,
            record: { eventDate: '2022-06-15', eventTime: '12:00:00' } }
      ];
      const nowNode = { age: SECONDS_IN_YEAR * 5, time: new Date('2025-01-01T12:00:00Z').getTime() };

      const results = generateExperiences(sortedEras, levelNodes, nowNode);
      const exp1 = results.find(r => r.id === 'exp1');

      // End should anchor to the date-matched era-level closer node
      expect(exp1.endAge).toBe(SECONDS_IN_YEAR * 2.5);
      expect(exp1.endTime).toBe(closerTime);
      expect(exp1.isClosed).toBe(true);
  });
});