import { describe, it, expect, vi } from 'vitest';
import { generateManifest } from '../../modules/span-graph/projection/manifest-generator.js';

// Mock viewport converts world to screen at 10x scale
const mockViewport = {
  worldToScreen: vi.fn((x, y) => ({ x: x * 10, y: y * 10 })),
  container: { getBoundingClientRect: () => ({ width: 10000, height: 500 }) },
  actor: null
};

const SECONDS_PER_YEAR = 31536000;

describe('Manifest Generator: Yet Nodes', () => {
  it('should project Yet nodes with screen coordinates from world positions', () => {
    const yetAge = 30 * SECONDS_PER_YEAR;
    const state = {
      segments: [],
      nodes: [{ id: 'now', x: 25 * SECONDS_PER_YEAR, y: 1000000, isNow: true }],
      yetNodes: [
        {
          id: 'yet1', description: 'Meet myself',
          hasAge: true, hasDate: false,
          worldAge: yetAge, worldTime: 1000000,
          isViolated: false, frag: 0, isDragging: false
        }
      ]
    };

    const manifest = generateManifest(state, mockViewport, null);

    expect(manifest.yetNodes).toHaveLength(1);
    expect(manifest.yetNodes[0].id).toBe('yet1');
    expect(manifest.yetNodes[0].hasAge).toBe(true);
    expect(manifest.yetNodes[0].hasDate).toBe(false);
    expect(manifest.yetNodes[0].isViolated).toBe(false);
  });

  it('should project dashed cyan rails from NOW to each non-violated Yet', () => {
    const nowAge = 25 * SECONDS_PER_YEAR;
    const yetAge = 30 * SECONDS_PER_YEAR;
    const nowTime = 1000000;

    const state = {
      segments: [],
      nodes: [{ id: 'now', x: nowAge, y: nowTime }],
      yetNodes: [
        {
          id: 'yet1', description: 'Age locked',
          hasAge: true, hasDate: false,
          worldAge: yetAge, worldTime: nowTime,
          isViolated: false, frag: 0, isDragging: false
        }
      ]
    };

    const manifest = generateManifest(state, mockViewport, null);

    // Should have 1 yet rail (from NOW to Yet)
    const yetRails = manifest.rails.filter(r => r.type === 'yet');
    expect(yetRails).toHaveLength(1);
    expect(yetRails[0].p1.x).toBe(nowAge * 10);
    expect(yetRails[0].p1.y).toBe(nowTime * 10);
    expect(yetRails[0].p2.x).toBe(yetAge * 10);
    expect(yetRails[0].p2.y).toBe(nowTime * 10);
  });

  it('should NOT project yet rails for violated Yets', () => {
    const nowAge = 25 * SECONDS_PER_YEAR;
    const state = {
      segments: [],
      nodes: [{ id: 'now', x: nowAge, y: 1000000 }],
      yetNodes: [
        {
          id: 'yet1', description: 'Violated',
          hasAge: true, hasDate: false,
          worldAge: 20 * SECONDS_PER_YEAR, worldTime: 1000000,
          isViolated: true, frag: 2, isDragging: false
        }
      ]
    };

    const manifest = generateManifest(state, mockViewport, null);

    const yetRails = manifest.rails.filter(r => r.type === 'yet');
    expect(yetRails).toHaveLength(0);
  });

  it('should project multiple yet rails for multiple non-violated Yets', () => {
    const nowAge = 25 * SECONDS_PER_YEAR;
    const nowTime = 1000000;
    const state = {
      segments: [],
      nodes: [{ id: 'now', x: nowAge, y: nowTime }],
      yetNodes: [
        {
          id: 'yet1', description: 'First',
          hasAge: true, hasDate: false,
          worldAge: 30 * SECONDS_PER_YEAR, worldTime: nowTime,
          isViolated: false, frag: 0, isDragging: false
        },
        {
          id: 'yet2', description: 'Second',
          hasAge: false, hasDate: true,
          worldAge: nowAge, worldTime: 2000000,
          isViolated: false, frag: 0, isDragging: false
        }
      ]
    };

    const manifest = generateManifest(state, mockViewport, null);

    const yetRails = manifest.rails.filter(r => r.type === 'yet');
    expect(yetRails).toHaveLength(2);
  });

  it('should use interaction drag position for dragged Yets', () => {
    const nowAge = 25 * SECONDS_PER_YEAR;
    const nowTime = 1000000;
    const state = {
      segments: [],
      nodes: [{ id: 'now', x: nowAge, y: nowTime }],
      yetNodes: [
        {
          id: 'yet1', description: 'Drag me',
          hasAge: true, hasDate: false,
          worldAge: 30 * SECONDS_PER_YEAR, worldTime: nowTime,
          isViolated: false, frag: 0, isDragging: false
        }
      ]
    };

    const interaction = {
      yetDrag: { id: 'yet1', screenX: 500, screenY: 300 }
    };

    const manifest = generateManifest(state, mockViewport, interaction);

    // Yet node should use drag position
    expect(manifest.yetNodes[0].x).toBe(500);
    expect(manifest.yetNodes[0].y).toBe(300);
    expect(manifest.yetNodes[0].isDragging).toBe(true);

    // Rail from NOW to drag position
    const yetRails = manifest.rails.filter(r => r.type === 'yet');
    expect(yetRails).toHaveLength(1);
    expect(yetRails[0].p2.x).toBe(500);
    expect(yetRails[0].p2.y).toBe(300);
  });

  it('should return empty yetNodes array when no Yets present', () => {
    const state = {
      segments: [],
      nodes: [{ id: 'now', x: 0, y: 0 }]
    };

    const manifest = generateManifest(state, mockViewport, null);
    expect(manifest.yetNodes).toEqual([]);
    expect(manifest.rails.filter(r => r.type === 'yet')).toHaveLength(0);
  });
});