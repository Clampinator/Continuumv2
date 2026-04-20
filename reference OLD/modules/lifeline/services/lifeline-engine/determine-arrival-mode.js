/**
 * Checks the last node in a coordinate collection to see if it was reached via span.
 * @param {Array} levelNodes 
 * @returns {string} 'level' or 'span'
 */
export function determineArrivalMode(levelNodes) {
    let arrivedVia = 'level';
    if (levelNodes.length >= 2) {
        const penultimate = levelNodes[levelNodes.length - 2];
        if (penultimate.outgoingType === 'span') arrivedVia = 'span';
    }
    return arrivedVia;
}