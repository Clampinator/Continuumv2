
import { DragMath } from '../../services/drag-math.js';
import { CoordinateConverter } from '../../services/coordinate-converter.js';

/**
 * Translates pointer coordinates into validated, constrained world coordinates.
 * Enforces the "Locked Diagonal" for leveling and pins Y for Levellers.
 */
export function calculateConstrainedPosition(mouseX, mouseY, viewState, graphData) {
    const rawWorld = CoordinateConverter.screenToWorld(mouseX, mouseY, viewState);
    const startWorld = viewState.dragStartWorld;

    // LITERAL STRICTURE: Spanning is prohibited for Levellers (Span Rank 0)
    // We use maxSpanPool to detect Levellers as it is the reliable indicator of rank in graphData.
    const spanningRestricted = graphData.maxSpanPool === 0;

    const dx = mouseX - viewState.dragStartScreenX;
    const dy = mouseY - viewState.dragStartScreenY;
    const dist = Math.hypot(dx, dy);

    // 1. Threshold Locking (20px commitment)
    let mode = viewState.activeDragType;
    if (!mode || dist < 20) {
        if (dist > 5) {
            mode = DragMath.getDragMode(dx, dy);
        }
    }

    // 2. Apply Axis Projection & Hard Block
    let constrained;
    
    // LITERAL STRICTURE: Spanning is prohibited for Levellers (Span Rank 0)
    // If they attempt to span, we nullify the mode to prevent movement.
    if (mode === 'span' && spanningRestricted) {
        mode = null;
    }
    
    if (mode) {
        // Enforce 1s:1000ms rail via DragMath
        constrained = DragMath.constrainMovement(rawWorld, startWorld, mode);
    } else {
        constrained = { ...startWorld };
    }
        
    // 3. Spacetime Validity
    // Movement is invalid if a Leveller is trying to Span
    const isValid = mode !== null && !(mode === 'span' && spanningRestricted);

    return { constrained, mode, isValid, spanningRestricted, dx, dy };
}
