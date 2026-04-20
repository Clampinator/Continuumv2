import { getDragMode as getMode } from './drag-math/get-drag-mode.js';
import { constrainMovement as constrain } from './drag-math/constrain-movement.js';

/**
 * Pure math service for Lifeline drag constraints.
 * Enforces strict axial locking to align with Continuum physics.
 */
export const DragMath = {
    /**
     * Proxies call to atomic get-drag-mode unit.
     */
    getDragMode(dx, dy) {
        return getMode(dx, dy);
    },

    /**
     * Proxies call to atomic constrain-movement unit.
     */
    constrainMovement(currentWorld, startWorld, mode) {
        return constrain(currentWorld, startWorld, mode);
    }
};