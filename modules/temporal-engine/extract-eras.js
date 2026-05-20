/*
 ENGINE UNIT: EXTRACT ERAS
 Formats and sorts era data from the actor for visual rendering.
 Delegates boundary computation to the Kernel layer.

 ENFORCES: ADI (Authoritative Data Isolation).
 Kernel is the single authority for era boundaries and duration.
 */

import { computeEraBoundaries } from '/systems/continuum-v2/modules/temporal-kernel/compute-era-boundaries.js';

export function extractEras(actor) {
    const eras = [];
    if (!actor?.system?.eras) return eras;

    const boundaries = computeEraBoundaries(actor.system.eras);

    boundaries.forEach(era => {
        eras.push({
            id: era.id,
            name: era.name,
            startAge: era.startAge,
            endAge: era.endAge,
            duration: era.computedDuration,
            color: actor.system.eras[era.id]?.color || null
        });
    });

    return eras;
}