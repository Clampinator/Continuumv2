/**
 * ENGINE UNIT: ANCHOR SEGMENTS
 * Creates virtual arrival anchors and links projected nodes to segments.
 * ENFORCES: Physical continuity across spans.
 */
export function anchorSegments(segments, nodesWithProjection) {
    const projectedSegments = [];

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        let arrivalDirection = null;

        if (i > 0) {
            const prevExitNode = nodesWithProjection.find(n => n.id === segments[i - 1].exitPoint?.id);
            arrivalDirection = prevExitNode?.spanDirection;
        }

        const arrivalNode = {
            id: `arrival-${seg.startX}-${seg.startY}`,
            x: Number(seg.startX),
            y: Number(seg.startY),
            record: { eventTitle: i === 0 ? "Birth" : "Arrival" },
            isVirtual: true,
            isSpanDest: i > 0,
            isBirth: i === 0,
            spanDirection: arrivalDirection
        };

        projectedSegments.push({
            ...seg,
            arrivalNode,
            nodes: seg.nodes.map(sn => nodesWithProjection.find(np => np.id === sn.id))
        });
    }

    return projectedSegments;
}
