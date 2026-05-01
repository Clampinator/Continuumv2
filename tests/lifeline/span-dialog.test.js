import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openSpanDialog } from '../../modules/lifeline/services/ui/span-dialog/open-span-dialog.js';

describe('openSpanDialog Service', () => {
  let mockSheet;
  let mockActor;

  beforeEach(() => {
    mockActor = {
      id: 'actor1',
      system: {
        eras: {}
      }
    };
    mockSheet = {
      actor: mockActor,
      rendered: true,
      _spanGraphViewport: {
        updateActor: vi.fn(),
        getViewState: vi.fn(() => ({ zoom: 1 }))
      }
    };

    // Mock Foundry globals for V13
    global.foundry = {
        applications: {
            handlebars: {
                renderTemplate: vi.fn().mockResolvedValue('<div>Mock Template</div>')
            }
        }
    };
    
    global.Dialog = class {
      constructor(data) {
        this.data = data;
      }
      render() { return this; }
      setPosition() { return this; }
    };
  });

  it('should initialize and render the span dialog', async () => {
    const params = {
        departure: { age: 0, time: 0 },
        arrival: { age: 0, time: 1000 }
    };

    await openSpanDialog(mockSheet, params);
    
    expect(foundry.applications.handlebars.renderTemplate).toHaveBeenCalledWith(
        "systems/continuum-v2/templates/dialogs/span-result-dialog.html",
        expect.objectContaining({ eventIsSpan: true })
    );
  });
});
