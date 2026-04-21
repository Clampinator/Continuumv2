
// continuum/modules/org-graph.js

import { processOrgData } from './org-data.js';
import { renderOrgGraph } from './org-render.js';
import { attachOrgListeners } from './org-interactions.js';
import { initializeLifelineMap } from '../span-graph-map.js';

// State persistence for Org Sheets
function createOrgContext() {
    return {
        viewState: {
            x: 0,
            y: 0,
            scaleX: 0.000005,
            scaleY: -0.00000000288,
            isDragging: false,
            interactionMode: 'pan',
            activeUnitId: null, // The currently selected subway line
            initialized: false,
            lastRenderedView: {},
            lastPointerX: 0,
            lastPointerY: 0,
            // Creation Drag State
            creationStartAgeSeconds: 0,
            creationCurrentAgeSeconds: 0,
            // Drag offsets
            dragStartScreenX: 0,
            dragStartScreenY: 0,
            dragStartWorld: {}
        },
        graphData: {
            dobTimestamp: 0,
            tracks: {}, // { unitId: { color, nodes: [], headNode: {} } }
            mandates: [],
            nowNode: null, // Pointer to the active head node
            ages: [], // Phase visual data
            operations: [] // Operation visual data
        }
    };
}

export function getOrgContext(sheet) {
    if (!sheet._orgGraphContext) {
        sheet._orgGraphContext = createOrgContext();
    }
    return sheet._orgGraphContext;
}

export function initializeOrgGraph(html, sheet) {
    const svg = html.find('.span-graph-svg')[0];
    if (!svg) return;

    // --- INITIALIZE MAP BACKGROUND ---
    const mapContainer = html.find('#lifeline-map-background')[0];
    if (mapContainer) {
        const hqLat = sheet.actor.system.structure?.headquartersLat;
        const hqLng = sheet.actor.system.structure?.headquartersLng;
        initializeLifelineMap(mapContainer, hqLat || 51.5072, hqLng || 0.1276, sheet.actor.id);
    }

    const { viewState, graphData } = getOrgContext(sheet);

    // 1. Process Data
    processOrgData(sheet, graphData, viewState);

    // 2. Attach Listeners
    attachOrgListeners(svg, sheet, viewState, graphData);

    // 3. Resize Observer for Initial Centering & Responsive Layout
    const resizeObserver = new ResizeObserver((entries) => {
        // Ensure element is connected to DOM
        if (!svg.isConnected) return;

        const entry = entries[0];
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;

        // If hidden, do nothing
        if (width <= 0 || height <= 0) return;

        // --- RE-CENTERING LOGIC ---
        const targetTime = graphData.dobTimestamp || Date.now();
        const activeHead = graphData.nowNode;
        const targetAge = activeHead ? activeHead.age : 0;

        // Detection of "Bad State" (e.g. coordinates 0,0 usually mean it was calculated when width=0)
        const isBadState = (Math.abs(viewState.x) < 1 && Math.abs(viewState.y) < 1);
        
        if (!viewState.initialized || isBadState || Math.abs(viewState.scaleY) < 0.00000000001) {
            
            // Reset Zoom
            viewState.scaleX = 0.000005;
            viewState.scaleY = -0.00000000288;
            
            // Force Center "Now/Head" in middle of screen
            viewState.x = (width / 2) - (targetAge * viewState.scaleX);
            viewState.y = (height / 2) - (targetTime * viewState.scaleY);
            
            // Ensure values are numbers
            if (!Number.isFinite(viewState.x)) viewState.x = width / 2;
            if (!Number.isFinite(viewState.y)) viewState.y = height / 2;

            viewState.initialized = true;
        }

        renderOrgGraph(svg, viewState, graphData);
    });
    
    resizeObserver.observe(svg);
    
    // Attempt one immediate render if visible (to avoid FOUC)
    const rect = svg.getBoundingClientRect();
    if(rect.width > 0 && rect.height > 0) {
         if (!viewState.initialized || (viewState.x === 0 && viewState.y === 0)) {
            const targetTime = graphData.dobTimestamp || Date.now();
            const activeHead = graphData.nowNode;
            const targetAge = activeHead ? activeHead.age : 0;
            
            viewState.scaleX = 0.000005;
            viewState.scaleY = -0.00000000288;
            viewState.x = (rect.width / 2) - (targetAge * viewState.scaleX);
            viewState.y = (rect.height / 2) - (targetTime * viewState.scaleY);
            viewState.initialized = true;
         }
         renderOrgGraph(svg, viewState, graphData);
    }
}
