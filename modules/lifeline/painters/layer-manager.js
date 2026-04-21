import { GridPainter } from '/systems/continuum-v2/modules/lifeline/painters/grid-painter.js';
import { PathPainter } from '/systems/continuum-v2/modules/lifeline/painters/path-painter.js';
import { NodePainter } from '/systems/continuum-v2/modules/lifeline/painters/node-painter.js';
import { SubwayPainter } from '/systems/continuum-v2/modules/lifeline/painters/subway-painter.js';
import { GoalConnectionPainter } from '/systems/continuum-v2/modules/lifeline/painters/goal-connection-painter.js';
import { drawAgeBlocks } from '/systems/continuum-v2/modules/lifeline/painters/draw-age-blocks.js';
import { drawExperienceBlocks } from '/systems/continuum-v2/modules/lifeline/painters/draw-experience-blocks.js';
import { drawEventsAndPaths } from '/systems/continuum-v2/modules/lifeline/painters/draw-events-and-paths.js';
import { drawCreationUI } from '/systems/continuum-v2/modules/lifeline/painters/draw-creation-ui.js';
import { drawDebugNodeLabels } from '/systems/continuum-v2/modules/lifeline/painters/draw-debug-node-labels.js';

export const LayerManager = {
    render(svg, viewState, graphData) {
        const rect = svg.getBoundingClientRect();
        const { width, height } = rect;

        const gridGroup = svg.querySelector('.graph-grid-lines');
        const axisGroup = svg.querySelector('.graph-axis-labels');
        const pathLayer = svg.querySelector('.graph-path-layer');
        const nodesGroup = svg.querySelector('.graph-nodes-group');
        const dragLine = svg.querySelector('.graph-drag-line');
        const agesLayer = svg.querySelector('.graph-ages-layer');
        const experiencesLayer = svg.querySelector('.graph-experiences-layer');
        const creationLayer = svg.querySelector('.graph-creation-layer');
        const hitLayer = svg.querySelector('.graph-hit-layer');

        GridPainter.draw(gridGroup, width, height, viewState);
        GridPainter.updateLabels(axisGroup, width, height, viewState);

        if (graphData.isOrganization) {
            SubwayPainter.render(pathLayer, nodesGroup, viewState, graphData);
        } else {
            // Background Visuals
            drawAgeBlocks(agesLayer, viewState, graphData);
            drawExperienceBlocks(experiencesLayer, viewState, graphData);
            
            // Path and Interaction
            PathPainter.drawLifeline(pathLayer, viewState, graphData);
            drawEventsAndPaths(svg, viewState, graphData, hitLayer);
            
            // Nodes and Goal lines
            GoalConnectionPainter.draw(svg, viewState, graphData);
            NodePainter.update(nodesGroup, viewState, graphData);
            
            // DEBUG OVERLAY: Persistent Data Labels
            //drawDebugNodeLabels(svg, viewState, graphData);
            
            // Bottom Bars
            drawCreationUI(creationLayer, viewState, graphData);
        }

        PathPainter.drawDragLine(dragLine, viewState, graphData);
    }
};
