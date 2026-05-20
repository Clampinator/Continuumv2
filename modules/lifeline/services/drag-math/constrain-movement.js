/**
 * Legacy constrain-movement adapter.
 * Maps lifeline { age, time } format to kernel { eventAge, eventTime } format.
 * Delegates to the canonical constrainMovement from the kernel.
 */
import { constrainMovement as kernelConstrain } from '/systems/continuum-v2/modules/temporal-kernel/drag-physics.js';

export function constrainMovement(currentWorld, startWorld, mode) {
    const kernelCurrent = { eventAge: currentWorld.age, eventTime: currentWorld.time };
    const kernelStart = startWorld ? { eventAge: startWorld.age, eventTime: startWorld.time } : null;
    const result = kernelConstrain(kernelCurrent, kernelStart, mode);
    return { age: result.eventAge, time: result.eventTime };
}