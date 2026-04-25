/**
 * TEMPORAL KERNEL: APPLY COLLISION LAWS
 * Enforces the "Singular Identity" rule: two nodes cannot occupy the 
 * same physical spacetime coordinates without merging.
 * 
 * AUTHORITY: Span destinations (semicircles) "swallow" regular 
 * level nodes (circles) in the physical UI.
 */
export function applyCollisionLaws(physicalNodes, virtualAnchors) {
    const collated = [...physicalNodes];

    for (const anchor of virtualAnchors) {
        // Check for exact physical overlap with 100ms tolerance
        const existing = collated.find(n => 
            Math.abs(n.x - anchor.x) < 0.1 && 
            Math.abs(n.y - anchor.y) < 100
        );

        if (!existing) {
            collated.push(anchor);
        } else {
            // Handshake: If nodes overlap, the Virtual Anchor must imbue the 
            // Physical node with its visual properties (Birth or Semicircle).
            
            // PRIORITY 1: Birth Node Authority
            if (anchor.isBirth) {
                existing.isBirth = true;
            }
            
            // PRIORITY 2: Span Destination (Semicircle) "swallows" others
            if (anchor.isSpanDest) {
                existing.isSpanDest = true;
                existing.spanDirection = anchor.spanDirection;
            }
        }
    }

    return collated;
}
