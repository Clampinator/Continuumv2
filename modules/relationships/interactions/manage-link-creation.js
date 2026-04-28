import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Attaches the right-drag tool for creating new relationships.
 */
export function manageLinkCreation(svg, g, nodeSel, sheet) {
    let dragSource = null;
    let dragLine = g.append("line")
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .style("opacity", 0);

    nodeSel.on("mousedown", (event, d) => {
        // Start link creation on Right-Click
        if (event.button === 2) {
            event.stopPropagation();
            dragSource = d;
            dragLine.attr("x1", d.x).attr("y1", d.y).attr("x2", d.x).attr("y2", d.y).style("opacity", 1);
        }
    });

    svg.on("mousemove", (event) => {
        if (dragSource) {
            const [mx, my] = d3.pointer(event, g.node());
            dragLine.attr("x2", mx).attr("y2", my);
        }
    });

    nodeSel.on("mouseup", async (event, d) => {
        // Only trigger if we are finishing a Right-Click drag and have a valid source
        if (dragSource && d && dragSource !== d && event.button === 2) {
            event.stopPropagation();
            
            // CAPTURE DATA BEFORE ASYNC: Bubbling or other handlers might nullify dragSource
            const sourceName = dragSource.name;
            const targetName = d.name;
            const sourceId = dragSource.id;
            const targetId = d.id;
            const newId = foundry.utils.randomID();
            
            // Clear visual state immediately
            dragSource = null;
            dragLine.style("opacity", 0);
            
            await sheet.actor.update({
                [`system.networkEdges.${newId}`]: {
                    id: newId,
                    source: sourceId,
                    target: targetId,
                    relationshipType: "Connection",
                    importance: "Professional",
                    eventNotes: ""
                }
            });
            
            ui.notifications.info(`Connected ${sourceName} and ${targetName}.`);
        }
    });

    svg.on("mouseup", (event) => {
        // Global cleanup for "missed" connections or if releasing over empty space
        if (dragSource) {
            dragSource = null;
            dragLine.style("opacity", 0);
        }
    });
}
