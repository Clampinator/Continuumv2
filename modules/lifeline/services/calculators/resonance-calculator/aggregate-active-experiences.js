/*
Scans lifeline nodes to build a map of subjective ages for every experience.
Tracks both the earliest and latest node age per experience so the
two-axis bonus calculator can compute duration (endAge - startAge).
*/
export function aggregateActiveExperiences(nodes, actor) {
    const expMap = new Map();

    nodes.forEach(node => {
        if (!node.expId) return;

        const currentData = expMap.get(node.expId) || {
            age: -Infinity,
            startAge: Infinity
        };

        if (node.age > currentData.age) {
            const era = actor.system.eras[node.eraId];
            const exp = era?.experiences[node.expId];
            const name = exp?.name || node.eventTitle || "Unknown Experience";

            expMap.set(node.expId, {
                age: node.age,
                startAge: Math.min(currentData.startAge, node.age),
                name: name,
                isOngoing: !exp?.dateTo || exp.dateTo.trim() === ""
            });
        } else {
            // Track earliest node even if this node isn't the latest
            currentData.startAge = Math.min(currentData.startAge, node.age);
            expMap.set(node.expId, currentData);
        }
    });

    return expMap;
}
