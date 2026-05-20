
// continuum/modules/org-network-graph.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { prepareNetworkData } from './org-network-data.js';
import { setupGraphView, renderElements, updateTimeVisibility, tickSimulation } from './org-network-render.js';
import { setupTimeline } from './org-network-timeline.js';
import { setupInteractions } from './org-network-interactions.js';

export function initializeNetworkGraph(sheet) {
    const containerId = `#org-network-graph-${sheet.actor.id}`;
    const container = d3.select(containerId);
    
    if (container.empty() || !d3) {
        console.error("Continuum Network | D3 not found or container missing.");
        return;
    }

    container.selectAll("*").remove();
    container.style("position", "relative");

    // 1. Prepare Data
    const data = prepareNetworkData(sheet);
    
    // 2. Setup SVG View
    const { svg, g, width, height } = setupGraphView(container);
    
    // 3. Setup Simulation
    // Fix Root position logic
    data.rootNode.fx = width / 2;
    data.rootNode.fy = 60; 

    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(d => Math.max(50, 150 - (d.strength * 20))))
        .force("charge", d3.forceManyBody().strength(-800)) 
        .force("collide", d3.forceCollide().radius(60))
        .force("y", d3.forceY(d => 60 + (d.depth * 120)).strength(1.5)) 
        .force("x", d3.forceX(width / 2).strength(0.1));

    // 4. Render Graph Elements
    const renderRefs = renderElements(g, data); 

    // 5. Wire Simulation Tick
    simulation.on("tick", () => tickSimulation(renderRefs, data));

    // 6. Setup Timeline UI
    setupTimeline({
        container, 
        svg, 
        width: width, 
        height: height,
        data,
        sheet,
        onTimeChange: (time) => updateTimeVisibility(renderRefs, time, data.rootId)
    });

    // 7. Setup Interactions (Drag, Zoom, Context Menus)
    setupInteractions({
        svg, g, 
        sheet, 
        simulation, 
        data, 
        renderRefs
    });
}
