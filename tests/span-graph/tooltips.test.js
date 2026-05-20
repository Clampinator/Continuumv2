import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipManager } from '../../modules/span-graph/ui/tooltips.js';

describe('TooltipManager', () => {
  let viewport;

  beforeEach(() => {
    // Minimal DOM stubs so TooltipManager can construct its group
    const createEl = () => ({
      setAttribute: vi.fn(),
      style: {},
      appendChild: vi.fn(),
      querySelector: vi.fn(() => null),
      classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
      dataset: {}
    });

    global.document = {
      createElementNS: vi.fn((ns, tag) => {
        const el = createEl();
        el.tagName = tag;
        // foreignObject needs to hold .tooltip-body div
        if (tag === 'foreignObject') {
          el.querySelector = vi.fn((sel) => {
            if (sel === '.tooltip-body') return createEl();
            return null;
          });
        }
        return el;
      }),
      getElementById: vi.fn(() => null),
      head: { appendChild: vi.fn() }
    };

    const parentGroup = createEl();

    viewport = {
      container: { getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600 })) }
    };

    // TooltipManager._createTooltipGroup builds the group internally.
    // The mock createElementNS provides stubs, so construction should succeed.
  });

  it('should construct and default to invisible', () => {
    const parentGroup = { appendChild: vi.fn(), setAttribute: vi.fn(), style: {}, querySelector: vi.fn(() => null) };
    const tm = new TooltipManager(viewport, parentGroup);
    expect(tm).toBeDefined();
    expect(tm.isVisible).toBe(false);
  });

  it('should handle null group gracefully', () => {
    // When document is undefined, _createTooltipGroup returns null
    const origDoc = global.document;
    delete global.document;
    const tm = new TooltipManager(viewport, null);
    // show/hide on null group should not throw
    tm.show([{ label: 'TEST', value: 'data' }], { x: 0, y: 0 });
    tm.hide();
    expect(tm.isVisible).toBe(false);
    global.document = origDoc;
  });
});