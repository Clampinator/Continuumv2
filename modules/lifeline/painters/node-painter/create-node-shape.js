const svgNS = "http://www.w3.org/2000/svg";

/**
 * Creates and returns an SVG element matching the node's chronological type.
 * @param {object} nodeData - Standardized node data.
 * @param {number} cx - Calculated Screen X.
 * @param {number} cy - Calculated Screen Y.
 * @returns {SVGElement}
 */
export function createNodeShape(nodeData, cx, cy) {
    let shape;
    if (nodeData.isYetFulfillment) {
        shape = document.createElementNS(svgNS, 'rect');
        shape.setAttribute('width', 10);
        shape.setAttribute('height', 10);
        shape.setAttribute('x', cx - 5);
        shape.setAttribute('y', cy - 5);
        shape.classList.add('graph-node-fulfillment');
        return shape;
    }

    const type = nodeData.type || 'level';
    if (type.startsWith('span-origin')) {
        shape = document.createElementNS(svgNS, 'polygon');
        const r = 5;
        const points = type === 'span-origin-up' 
            ? `${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}`
            : `${cx},${cy + r} ${cx - r},${cy - r} ${cx + r},${cy - r}`;
        shape.setAttribute('points', points);
        shape.classList.add('graph-node-span-origin');
    } else if (type.startsWith('span-dest')) {
        shape = document.createElementNS(svgNS, 'path');
        const r = 4;
        const sweep = type === 'span-dest-down' ? 0 : 1;
        shape.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 ${sweep} ${cx + r} ${cy} Z`);
        shape.classList.add('graph-node-span-dest');
    } else {
        shape = document.createElementNS(svgNS, 'circle');
        shape.setAttribute('cx', cx);
        shape.setAttribute('cy', cy);
        shape.setAttribute('r', 4);
        shape.classList.add('graph-node-level');
        if (nodeData.isRestStart || nodeData.isRestEnd) {
            shape.classList.add('graph-node-rest');
        }
    }
    return shape;
}
