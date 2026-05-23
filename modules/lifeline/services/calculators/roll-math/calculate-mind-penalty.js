
/*
Calculates the penalty to Analyze rolls from running metability applications.

Free capacity: running apps whose total levels fit within (Analyze - 1) run for free.
When total running levels >= Analyze, each app that overflows the free capacity costs -1.

Algorithm: sort running apps by level descending, greedily fill up to (Analyze - 1),
then count remaining apps as the penalty.
*/
export function calculateMindPenalty(actor) {
    const apps = Object.values(
        foundry.utils.getProperty(actor.system, 'metabilities.applications') || {}
    ).filter(a => a.running);
    if (!apps.length) return 0;

    const analyze = Number(
        foundry.utils.getProperty(actor.system, 'attributes.analyze.value')
            || foundry.utils.getProperty(actor.system, 'attributes.mind.value')
    ) || 0;
    const freeCapacity = Math.max(0, analyze - 1);

    // Greedy fill: largest apps first to minimize wasted capacity
    const levels = apps.map(a => Number(a.level) || 1).sort((a, b) => b - a);
    let used = 0;
    let freeCount = 0;
    for (const level of levels) {
        if (used + level <= freeCapacity) { used += level; freeCount++; }
        else break;
    }
    return -(apps.length - freeCount);
}
