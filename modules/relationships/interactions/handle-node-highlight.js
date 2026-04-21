import { updateTimeVisibility } from '../render.js';

/**
 * Click-to-highlight: clicking a node dims everything except that node and
 * its direct connections. Clicking the same node or the background clears.
 */
export function handleNodeHighlight({ svg, nodeSel, linkVisible, linkBadgeSel, groupSel, data, renderRefs, state }) {
    let selectedId = null;

    function applyHighlight(id) {
        selectedId = id;

        // Build the set of nodes directly connected to the selected node
        const connected = new Set([id]);
        data.links.forEach(l => {
            const s = l.source.id ?? l.source;
            const t = l.target.id ?? l.target;
            if (s === id) connected.add(t);
            if (t === id) connected.add(s);
        });

        nodeSel.style("opacity", d => connected.has(d.id) ? 1 : 0.08);

        linkVisible.style("opacity", d => {
            const s = d.source.id ?? d.source;
            const t = d.target.id ?? d.target;
            return (s === id || t === id) ? (d.visualOpacity || 0.6) : 0.04;
        });

        linkBadgeSel.style("opacity", d => {
            const s = d.source.id ?? d.source;
            const t = d.target.id ?? d.target;
            return (s === id || t === id) ? 1 : 0.04;
        });

        groupSel.style("opacity", d => {
            const hasMember = (d.members || []).some(m => connected.has(m.id ?? m));
            return hasMember ? 1 : 0.1;
        });
    }

    function clearHighlight() {
        selectedId = null;
        // Restore time-visibility-driven opacities
        updateTimeVisibility(renderRefs, state.currentTime, data);
        linkBadgeSel.style("opacity", 1);
        groupSel.style("opacity", 1);
    }

    // Node click toggles highlight; stops propagation so the SVG click doesn't fire too
    nodeSel.on("click.highlight", (event, d) => {
        event.stopPropagation();
        if (selectedId === d.id) {
            clearHighlight();
        } else {
            applyHighlight(d.id);
        }
    });

    // Clicking the canvas background clears the highlight
    svg.on("click.highlight", () => {
        if (selectedId !== null) clearHighlight();
    });
}
