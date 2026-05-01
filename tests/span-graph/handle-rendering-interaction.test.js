import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderViewport } from '../../modules/span-graph/viewport/actions/handle-rendering.js';

describe('renderViewport: Interaction Rendering', () => {
    let mockViewport;
    let mockState;

    beforeEach(() => {
        mockViewport = {
            container: {
                getBoundingClientRect: () => ({ height: 500 })
            },
            viewState: {},
            actor: { system: { spanning: { span: 1 } } },
            gridRenderer: { render: vi.fn() },
            eraRenderer: { render: vi.fn() },
            experienceRenderer: { render: vi.fn() },
            railRenderer: { render: vi.fn() },
            nodeRenderer: { render: vi.fn(), renderGhostNode: vi.fn() },
            axisRenderer: { render: vi.fn() },
            creationRenderer: { render: vi.fn() },
            goalRenderer: { render: vi.fn() },
            _goalState: { goalId: null, goalScreenPos: null, goalImportance: null, isFading: false }
        };
        mockState = {};
    });

    it('should call renderGhostNode with coordinates when interaction.ghost exists', () => {
        const manifest = {
            eras: [],
            interaction: { ghost: { x: 100, y: 200 } },
            hud: { creationStartX: 50 }
        };

        renderViewport(mockViewport, mockState, manifest);

        expect(mockViewport.nodeRenderer.renderGhostNode).toHaveBeenCalledWith({ x: 100, y: 200 });
    });

    it('should call renderGhostNode with null when interaction.ghost is missing', () => {
        const manifest = {
            eras: [],
            interaction: {},
            hud: { creationStartX: 50 }
        };

        renderViewport(mockViewport, mockState, manifest);

        expect(mockViewport.nodeRenderer.renderGhostNode).toHaveBeenCalledWith(null);
    });
});
