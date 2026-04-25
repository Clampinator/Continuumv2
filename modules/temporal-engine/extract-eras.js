/**
 * ENGINE UNIT: EXTRACT ERAS
 * Formats and sorts era data from the actor for visual rendering.
 * ENFORCES: ADI (Authoritative Data Isolation).
 */
export function extractEras(actor) {
    const eras = [];
    if (!actor?.system?.eras) return eras;

    const erasRaw = Object.values(actor.system.eras).sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
    let currentAge = 0;
    
    erasRaw.forEach(era => {
        eras.push({
            name: era.name || 'Unknown Era',
            startAge: currentAge,
            duration: Number(era.duration || 0),
            color: era.color || '#555'
        });
        currentAge += Number(era.duration || 0);
    });

    return eras;
}
