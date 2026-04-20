
/**
 * Adjusts visibility and interactivity of nodes and links based on the current scrubber position.
 * @param {object} renderRefs - Visual element references.
 * @param {number} time - The current timestamp from the scrubber.
 * @param {object} data - The complete graph data package.
 */
export function updateTimeVisibility(renderRefs, time, data) {
    const { linkVisible, nodeSel } = renderRefs;
    const activeIds = new Set([data.rootId]);
    
    // Track which nodes have ANY defined links in the system
    const systemLinkedIds = new Set();
    data.links.forEach(l => {
        systemLinkedIds.add(l.source.id || l.source);
        systemLinkedIds.add(l.target.id || l.target);
    });

    linkVisible.style("opacity", d => {
        // A link is active if:
        // 1. It has NO date info (Permanent connection)
        // 2. OR the current scrubber time falls within its bounds
        const isTimeless = (d.startTime === -Infinity && d.endTime === Infinity);
        const isActiveAtTime = (time >= d.startTime && time <= d.endTime);
        const active = isTimeless || isActiveAtTime;

        if (active) {
            activeIds.add(d.source.id || d.source);
            activeIds.add(d.target.id || d.target);
        }
        return active ? (d.visualOpacity || 0.6) : 0;
    });

    nodeSel.style("opacity", d => {
        // A node is visible if:
        // 1. It is the Root (PC)
        // 2. It has an active/timeless connection to the network OR is a floating node
        // AND its own date range (if set) includes the current time
        const isConnectedNow = activeIds.has(d.id);
        const isFloatingNode = !systemLinkedIds.has(d.id);
        if (!isConnectedNow && !isFloatingNode) return 0;

        // Node-level date gate: hide if current time is outside the node's own date window
        const nodeFrom = d.dateFrom ? new Date(d.dateFrom).getTime() : -Infinity;
        const nodeTo   = d.dateTo   ? new Date(d.dateTo).getTime()   :  Infinity;
        const inNodeWindow = time >= nodeFrom && time <= nodeTo;

        return inNodeWindow ? 1 : 0;
    })
    .style("pointer-events", d => {
        const isConnectedNow = activeIds.has(d.id);
        const isFloatingNode = !systemLinkedIds.has(d.id);
        if (!isConnectedNow && !isFloatingNode) return "none";
        const nodeFrom = d.dateFrom ? new Date(d.dateFrom).getTime() : -Infinity;
        const nodeTo   = d.dateTo   ? new Date(d.dateTo).getTime()   :  Infinity;
        return (time >= nodeFrom && time <= nodeTo) ? "all" : "none";
    });
}
