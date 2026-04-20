
import { prepareCharRelationshipData } from '../data.js';
import { setupGraphView, renderElements, updateTimeVisibility, tickSimulation, addArrowMarkers } from '../render.js';
import { setupTimeline } from '../timeline.js';
import { setupInteractions } from '../interactions.js';
import { resetContainer } from './reset-container.js';
import { configureForceSimulation } from './configure-force-simulation.js';
import { seedDefaultGroups } from '../data/seed-default-groups.js';

/**
 * Orchestrates the full initialization process for the freeform Relationship Map.
 * @param {ActorSheet} sheet - The character sheet instance.
 */
export async function initializeCharRelationshipGraph(sheet) {
    // Seed Family/Friends/Enemies groups on first use
    await seedDefaultGroups(sheet.actor);

    const containerId = `#char-relationship-graph-${sheet.actor.id}`;
    const container = resetContainer(containerId);

    if (!container) return;

    // 1. Prepare Data
    const data = prepareCharRelationshipData(sheet);
    
    // 2. Setup SVG View
    const { svg, g, width, height } = setupGraphView(container);
    addArrowMarkers(svg);

    // 3. Setup Physics Simulation
    const simulation = configureForceSimulation(data, width, height);

    // 4. Render Elements
    const renderRefs = renderElements(g, data); 

    // 5. Wire Simulation Lifecycle
    simulation.on("tick", () => tickSimulation(renderRefs, data));

    // 6. Initialize Interactions
    // state.currentTime lets the highlight handler restore time-visibility on clear
    const state = { currentTime: data.currentViewTime };
    setupInteractions({
        svg, g, container, sheet, simulation, data, renderRefs, state
    });

    // 7. Initialize Timeline Scrubber
    setupTimeline({
        container, svg, width, height, data, sheet,
        onTimeChange: (time) => {
            state.currentTime = time;
            updateTimeVisibility(renderRefs, time, data);
        }
    });
}
