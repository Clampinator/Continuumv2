/*
Identifies the Era context (column) for a specific subjective age in seconds.
Returns { eraId } or null.
*/
export function getHitContext(ageSeconds, graphData) {
    if (!graphData.eras) return null;

    // Find the era column where the pointer age falls within visual bounds
    const era = graphData.eras.find(a =>
        ageSeconds >= a.startAgeSeconds &&
        ageSeconds <= a.endAgeSeconds
    );

    return era ? { eraId: era.id, path: era.path } : null;
}