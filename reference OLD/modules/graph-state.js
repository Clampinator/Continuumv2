
// continuum/modules/span-graph-state.js

// Fallback registry for cases where an object instance isn't passed (legacy support)
const legacyContexts = {};

function createDefaultContext() {
    return {
        viewState: {
            x: 0,
            y: 0,
            scaleX: 0.000005,
            scaleY: -0.00000000288, 
            isDragging: false,
            interactionMode: 'pan', // 'pan', 'drag-node', 'create-era', 'create-exp', 'dialog-open', 'create-yet', 'drag-yet', 'drag-goal', 'scrub-timeline'
            activeDragType: null,   // 'level', 'span', 'yet', 'goal'
            lastPointerX: 0,
            lastPointerY: 0,
            dragStartScreenX: 0,
            dragStartScreenY: 0,
            dragStartWorld: { age: 0, time: 0 },
            dragDirection: 'level',
            isDragValid: true,
            creationStartAgeSeconds: 0,
            creationCurrentAgeSeconds: 0,
            initialized: false,
            // Pan Threshold Logic
            pointerDownX: 0,
            pointerDownY: 0,
            pointerDownTarget: null, 
            hasMovedSignificantDistance: false,
            // Map Panning Throttling
            pendingMapPanX: 0,
            pendingMapPanY: 0,
            mapPanFrameRequested: false,
            // Insert Node Logic
            hoveredSegment: null,
            // Animation & Optimization
            animationTime: 0,
            lastRenderedView: { x: null, y: null, scaleX: null, scaleY: null },
            // Dragging State
            dragCurrentX: 0,
            dragCurrentY: 0,
            draggedYetId: null,
            draggedGoalId: null, // NEW: Track which goal is being dragged
            // --- GOAL HIGHLIGHT STATE ---
            highlightedGoalId: null,
            hoveredGoalRect: null,
            isGoalLineFading: false,
            goalFadeTimeout: null,
            // Tooltips
            dragTooltip: null, // { visible: boolean, x: number, y: number, content: string }
            // NEW: Scrubber State
            scrubber: {
                active: false,
                x: 0,
                y: 0,
                worldAge: 0,
                worldTime: 0
            },
            // SUBWAY MAP STATE
            activeUnitId: null // The ID of the currently selected Organization Unit
        },
        graphData: {
            dobTimestamp: 0,
            nowNode: { age: 0, time: 0, arrivedVia: 'init', activeYetId: null },
            levelNodes: [],
            ages: [],
            experiences: [],
            experienceSegments: [],
            yetNodes: [], // Stores floating Yet data
            goalNodes: [], // NEW: Stores floating Goal data
            remainingSpanSeconds: 0,
            // SUBWAY MAP DATA
            isOrganization: false,
            tracks: {} // map of unitId -> { color, nodes: [], headNode: {} }
        }
    };
}

export function getSheetContext(sheetOrId) {
    // Preferred: Store context on the sheet object instance itself.
    // This ensures state persists exactly as long as the sheet instance exists.
    if (typeof sheetOrId === 'object' && sheetOrId !== null) {
        if (!sheetOrId._spanGraphContext) {
            sheetOrId._spanGraphContext = createDefaultContext();
        }
        return sheetOrId._spanGraphContext;
    }

    // Fallback: String ID lookup (Legacy)
    const sheetId = sheetOrId;
    if (!legacyContexts[sheetId]) {
        legacyContexts[sheetId] = createDefaultContext();
    }
    return legacyContexts[sheetId];
}

export function deleteSheetContext(sheetOrId) {
    if (typeof sheetOrId === 'object' && sheetOrId !== null) {
        const ctx = sheetOrId._spanGraphContext;
        if (ctx?.viewState?._updateHookId !== undefined) {
            Hooks.off('updateActor', ctx.viewState._updateHookId);
        }
        delete sheetOrId._spanGraphContext;
    } else {
        delete legacyContexts[sheetOrId];
    }
}

export function getGraphDebugData(sheetOrId) {
    const context = getSheetContext(sheetOrId);
    if (!context) return { error: "No graph context found." };
    
    const { viewState, graphData } = context;
    
    // Support dual mode debug
    const nodesDebug = (graphData.levelNodes || []).map((n, i) => ({
        index: i,
        type: n.type,
        world: { age: n.age, time: n.time },
        screen: {
            x: (n.age * viewState.scaleX) + viewState.x,
            y: (n.time * viewState.scaleY) + viewState.y
        }
    }));
    
    const nowScreen = graphData.nowNode ? {
        x: (graphData.nowNode.age * viewState.scaleX) + viewState.x,
        y: (graphData.nowNode.time * viewState.scaleY) + viewState.y
    } : null;

    return {
        description: "Debug Data showing World (Data) vs Screen (Visual) coordinates.",
        viewState: { ...viewState },
        graphData: {
            dobTimestamp: graphData.dobTimestamp,
            dobDate: new Date(graphData.dobTimestamp).toISOString(),
            nowNode: graphData.nowNode ? { ...graphData.nowNode, screen: nowScreen } : null,
            levelNodes: nodesDebug,
            yetNodes: graphData.yetNodes,
            goalNodes: graphData.goalNodes,
            remainingSpanSeconds: graphData.remainingSpanSeconds,
            // Org Data
            isOrganization: graphData.isOrganization,
            tracks: graphData.tracks ? Object.keys(graphData.tracks).length : 0
        }
    };
}