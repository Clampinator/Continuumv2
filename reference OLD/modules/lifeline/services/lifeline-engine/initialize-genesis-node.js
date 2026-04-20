import { NodeGenerator } from '../../factory/node-generator.js';

/**
 * Creates the genesis (birth) node for the graph.
 * @param {number} dobTs 
 * @returns {object}
 */
export function initializeGenesisNode(dobTs) {
    return NodeGenerator.createNode({
        age: 0,
        time: dobTs,
        type: 'origin',
        outgoingType: 'level',
        eventTitle: 'Origin / Birth',
        eventNotes: 'The beginning of your lifeline.'
    });
}