import { describe, it, expect, vi } from 'vitest';
import { generateManifest } from '../../modules/span-graph/projection/manifest-generator.js';

// Mock viewport with realistic worldToScreen using TARGET_RATIO
const TARGET_RATIO = -0.00057735;

function createMockViewport(zoom = 0.1, panX = 50, panY = 450) {
  return {
    worldToScreen: vi.fn((age, time) => ({
      x: (age * zoom) + panX,
      y: (time * TARGET_RATIO * zoom) + panY
    })),
    actor: {
      system: {
        eras: {}
      }
    }
  };
}

// Realistic state: Birth at Y2K epoch, events at ages 10, 20, 30
// Y values are epoch milliseconds (946684800000 = Jan 1 2000)
function createSimpleState() {
  const originTime = 946684800000; // Jan 1, 2000
  const secPerYear = 31536000;
  return {
    segments: [
      {
        startX: 0,
        startY: originTime,
        arrivalNode: { id: 'birth', x: 0, y: originTime, isBirth: true, record: { eventTitle: 'Birth' } },
        nodes: [
          { id: 'evt-1', x: 10 * secPerYear, y: originTime + 10 * secPerYear * 1000, record: { eventTitle: 'Event 1' } },
          { id: 'evt-2', x: 20 * secPerYear, y: originTime + 20 * secPerYear * 1000, record: { eventTitle: 'Event 2' } },
          { id: 'now', x: 30 * secPerYear, y: originTime + 30 * secPerYear * 1000, record: { eventTitle: 'NOW' } }
        ],
        exitPoint: null
      }
    ],
    nodes: [
      { id: 'birth', x: 0, y: originTime, isBirth: true, record: { eventTitle: 'Birth' } },
      { id: 'evt-1', x: 10 * secPerYear, y: originTime + 10 * secPerYear * 1000, record: { eventTitle: 'Event 1' } },
      { id: 'evt-2', x: 20 * secPerYear, y: originTime + 20 * secPerYear * 1000, record: { eventTitle: 'Event 2' } },
      { id: 'now', x: 30 * secPerYear, y: originTime + 30 * secPerYear * 1000, record: { eventTitle: 'NOW' } }
    ],
    nowNode: { id: 'now', x: 30 * secPerYear, y: originTime + 30 * secPerYear * 1000 },
    eras: [],
    spanPool: { consumed: 0, total: 0 }
  };
}

describe('Manifest Generator: Insert-Span Displacement', () => {
  it('should produce shifted nodes when isInsertSpan is true with displacement', () => {
    const viewport = createMockViewport();
    const state = createSimpleState();
    // 1-year displacement in ms
    const displacement = 31536000000;
    const secPerYear = 31536000;
    const originTime = 946684800000;
    // Click at age 15 (midpoint between events at 10 and 20)
    const departureAge = 15 * secPerYear;
    const departureTime = originTime + 15 * secPerYear * 1000;

    const interaction = {
      isDragging: true,
      isPending: false,
      mode: 'insert-span',
      activeNodeId: null,
      currentWorld: { eventAge: departureAge, eventTime: departureTime + displacement },
      startWorld: { eventAge: departureAge, eventTime: departureTime },
      insertionContext: {
        departureAge,
        departureTime,
        segmentIndex: 0
      },
      displacementResult: {
        departureAge,
        departureTime,
        arrivalTime: departureTime + displacement,
        displacement,
        isUpSpan: true,
        isDownSpan: false,
        nextEventFloor: null
      }
    };

    const manifest = generateManifest(state, viewport, interaction);

    // Check that nodes after departure age have shifted
    const evt2Node = manifest.nodes.find(n => n.id === 'evt-2');
    expect(evt2Node).toBeDefined();

    // evt-2 should be at shifted time: original + displacement
    const evt2ShiftedTime = (originTime + 20 * secPerYear * 1000) + displacement;
    const expectedScreenY = (evt2ShiftedTime * TARGET_RATIO * 0.1) + 450;
    const unshiftedScreenY = ((originTime + 20 * secPerYear * 1000) * TARGET_RATIO * 0.1) + 450;

    // The shifted and unshifted Y must be significantly different (1 year of displacement)
    const diff = Math.abs(evt2Node.y - unshiftedScreenY);
    expect(diff).toBeGreaterThan(100); // Should be hundreds of pixels apart
  });

  it('should split the splice segment rail at departure point', () => {
    const viewport = createMockViewport();
    const state = createSimpleState();
    const displacement = 31536000000;
    const secPerYear = 31536000;
    const originTime = 946684800000;
    const departureAge = 15 * secPerYear;
    const departureTime = originTime + 15 * secPerYear * 1000;

    const interaction = {
      isDragging: true,
      isPending: false,
      mode: 'insert-span',
      activeNodeId: null,
      currentWorld: { eventAge: departureAge, eventTime: departureTime + displacement },
      startWorld: { eventAge: departureAge, eventTime: departureTime },
      insertionContext: {
        departureAge,
        departureTime,
        segmentIndex: 0
      },
      displacementResult: {
        departureAge,
        departureTime,
        arrivalTime: departureTime + displacement,
        displacement,
        isUpSpan: true,
        isDownSpan: false,
        nextEventFloor: null
      }
    };

    const manifest = generateManifest(state, viewport, interaction);

    // Should have insert-departure and insert-arrival nodes
    const depNode = manifest.nodes.find(n => n.id === 'insert-departure');
    const arrNode = manifest.nodes.find(n => n.id === 'insert-arrival');
    expect(depNode).toBeDefined();
    expect(arrNode).toBeDefined();

    // Should have a span rail with isInserting
    const spanRails = manifest.rails.filter(r => r.type === 'span' && r.isInserting);
    expect(spanRails.length).toBeGreaterThanOrEqual(1);
  });

  it('should render normally when isInsertSpan is false', () => {
    const viewport = createMockViewport();
    const state = createSimpleState();

    const interaction = {
      isDragging: false,
      isPending: false,
      mode: null,
      activeNodeId: null,
      currentWorld: null,
      startWorld: null,
      insertionContext: null,
      displacementResult: null
    };

    const manifest = generateManifest(state, viewport, interaction);

    // Should NOT have insert nodes
    expect(manifest.nodes.find(n => n.id === 'insert-departure')).toBeUndefined();
    expect(manifest.nodes.find(n => n.id === 'insert-arrival')).toBeUndefined();
  });

  it('should not shift nodes before the departure age', () => {
    const viewport = createMockViewport();
    const state = createSimpleState();
    const displacement = 31536000000;
    const secPerYear = 31536000;
    const originTime = 946684800000;
    const departureAge = 15 * secPerYear;
    const departureTime = originTime + 15 * secPerYear * 1000;

    const interaction = {
      isDragging: true,
      isPending: false,
      mode: 'insert-span',
      activeNodeId: null,
      currentWorld: { eventAge: departureAge, eventTime: departureTime + displacement },
      startWorld: { eventAge: departureAge, eventTime: departureTime },
      insertionContext: {
        departureAge,
        departureTime,
        segmentIndex: 0
      },
      displacementResult: {
        departureAge,
        departureTime,
        arrivalTime: departureTime + displacement,
        displacement,
        isUpSpan: true,
        isDownSpan: false,
        nextEventFloor: null
      }
    };

    const manifest = generateManifest(state, viewport, interaction);

    // evt-1 is at age 10, before departure age 15 - should NOT be shifted
    const originTime2 = 946684800000;
    const evt1Node = manifest.nodes.find(n => n.id === 'evt-1');
    expect(evt1Node).toBeDefined();

    const unshiftedScreenY = ((originTime2 + 10 * secPerYear * 1000) * TARGET_RATIO * 0.1) + 450;
    expect(evt1Node.y).toBeCloseTo(unshiftedScreenY, 0);
  });
});