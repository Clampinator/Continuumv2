/*
Scans lifeline nodes to build a map of subjective ages for every experience.
*/
export function aggregateActiveExperiences(nodes, actor) {
    const expMap = new Map();

    nodes.forEach(node => {
        if (!node.expId) return;

        const currentData = expMap.get(node.expId) || { age: -Infinity };

        if (node.age > currentData.age) {
            const era = actor.system.eras[node.eraId];
            const exp = era?.experiences[node.expId];
            const name = exp?.name || node.eventTitle || "Unknown Experience";

            expMap.set(node.expId, {
                age: node.age,
                name: name,
                isOngoing: !exp?.dateTo || exp.dateTo.trim() === ""
            });
        }
    });

    return expMap;
}
