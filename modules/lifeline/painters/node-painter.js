import { createNodeShape } from './node-painter/create-node-shape.js';
import { updateNodes } from './node-painter/update-nodes.js';
import { updateNowNode } from './node-painter/update-now-node.js';
import { updateInsertGhost } from './node-painter/update-insert-ghost.js';

/**
 * Node Painter Domain
 * Orchestrates the rendering of history nodes, the current head, and ghost indicators.
 */
export const NodePainter = {
    createNodeShape,
    update: updateNodes,
    updateNowNode,
    updateInsertGhost
};
