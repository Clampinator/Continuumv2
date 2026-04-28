
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { normalizeDateInput } from '../span-graph-utils.js';

export function setupInteractions({ svg, g, sheet, simulation, data, renderRefs }) {
    const { nodeSel, linkVisible, linkHit } = renderRefs;
    
    // --- Zoom ---
    const zoom = d3.zoom().scaleExtent([0.1, 4])
        .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom).on("dblclick.zoom", null);

    // --- Drag Linking State ---
    let dragSourceNode = null;
    let isLinkingDrag = false;
    const linkDragLine = g.append("line")
        .attr("class", "network-drag-line").style("opacity", 0);

    // --- Node Dragging ---
    function dragstarted(event, d) {
        if (d.isRoot) return;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) {
        if (d.isRoot) return;
        d.fx = event.x; d.fy = event.y;
    }
    function dragended(event, d) {
        if (d.isRoot) return;
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
    }

    nodeSel.call(d3.drag()
        .filter(event => event.button === 0) 
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // --- Link Creation (Right-Click Drag) ---
    nodeSel.on("mousedown", function(event, d) {
        if (event.button === 2) { 
            event.stopPropagation();
            dragSourceNode = d;
            isLinkingDrag = false;
            linkDragLine.attr("x1", d.x).attr("y1", d.y).attr("x2", d.x).attr("y2", d.y).style("opacity", 1);
        }
    });

    svg.on("mousemove", function(event) {
        if (dragSourceNode) {
            isLinkingDrag = true; 
            const [mx, my] = d3.pointer(event, g.node());
            linkDragLine.attr("x2", mx).attr("y2", my);
        }
    });

    nodeSel.on("mouseup", async function(event, d) {
        if (dragSourceNode && dragSourceNode !== d) {
            const newId = foundry.utils.randomID();
            // Default current view time not passed here, simplified to Date.now() or need refactor to pass time
            const nowStr = d3.timeFormat("%Y-%m-%d")(new Date()); 
            await sheet.actor.update({
                [`system.networkEdges.${newId}`]: {
                    id: newId, source: dragSourceNode.id, target: d.id,
                    relationshipType: "Member", dateFrom: nowStr, strength: 1
                }
            });
            isLinkingDrag = true; 
        }
    });

    svg.on("mouseup", () => {
        if (dragSourceNode) {
            dragSourceNode = null;
            linkDragLine.style("opacity", 0);
            setTimeout(() => { isLinkingDrag = false; }, 50);
        }
    });

    // --- Context Menus ---
    
    // Node Menu
    nodeSel.on("contextmenu", (event, d) => {
        if (isLinkingDrag) { event.preventDefault(); return; }
        event.preventDefault();

        // Find parents
        const parents = data.links.filter(e => e.target.id === d.id || e.target === d.id)
            .map(e => {
                const p = data.nodes.find(n => n.id === (e.source.id || e.source));
                return p ? p.name : null;
            }).filter(x => x);

        let parentOptions = `<option value="">-- None / Custom --</option>`;
        parents.forEach(p => {
            const selected = d.group === p ? "selected" : "";
            parentOptions += `<option value="${p}" ${selected}>${p}</option>`;
        });

        const buttons = {
            update: {
                label: "Update", icon: '<i class="fas fa-edit"></i>',
                callback: async (html) => {
                    const newName = html.find("#node-name-edit").val();
                    let newGroup = html.find("#node-group-select").val() || html.find("#node-group-custom").val();
                    const updates = d.isRoot ? { 'system.structure.orgname': newName } : 
                        { [`system.network.${d.id}.name`]: newName, [`system.network.${d.id}.group`]: newGroup };
                    await sheet.actor.update(updates);
                }
            }
        };

        if (!d.isRoot) {
            buttons.delete = {
                label: "Delete", icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    await sheet.actor.update({ [`system.network.-=${d.id}`]: null });
                    // Cleanup Edges is handled by sheet listeners usually, or we can do it here manually if needed
                }
            };
        }
        buttons.cancel = { label: "Cancel", icon: '<i class="fas fa-times"></i>' };

        new Dialog({
            eventTitle: `Edit ${d.name}`,
            content: `
                <div class="form-group"><label>Name</label><input type="text" id="node-name-edit" value="${d.name}" autofocus/></div>
                ${!d.isRoot ? `<div class="form-group"><label>Parent Group</label><select id="node-group-select" style="width:100%; margin-bottom: 5px;">${parentOptions}</select><input type="text" id="node-group-custom" placeholder="Or type new group name..." value="${d.group || ''}" /></div>` : ''}
            `,
            buttons: buttons, default: "update"
        }).render(true);
    });

    // Link Menu
    const handleLinkContext = (event, d) => {
        event.preventDefault();
        const updateOutput = (val) => ["Very Weak", "Weak", "Moderate", "Strong", "Very Strong"][val-1] || val;

        new Dialog({
            eventTitle: "Edit Connection",
            content: `
                <div class="form-group"><label>Type</label><input type="text" id="link-label-edit" value="${d.relationshipType}"/></div>
                <div class="form-group"><label>Strength: <span id="strength-output">${updateOutput(d.strength)}</span></label><input type="range" id="link-strength" min="1" max="5" value="${d.strength}" style="width:100%"/></div>
                <div class="form-group"><label>Start</label><input type="date" id="link-date-from" value="${d.dateFrom || ''}"/></div>
                <div class="form-group"><label>End</label><input type="date" id="link-date-to" value="${d.dateTo || ''}"/></div>
            `,
            render: (html) => {
                html.find("#link-strength").on("input", function() { html.find("#strength-output").text(updateOutput(this.value)); });
            },
            buttons: {
                save: {
                    label: "Update", icon: '<i class="fas fa-save"></i>',
                    callback: async (html) => {
                        await sheet.actor.update({ 
                            [`system.networkEdges.${d.id}.relationshipType`]: html.find("#link-label-edit").val(),
                            [`system.networkEdges.${d.id}.strength`]: Number(html.find("#link-strength").val()),
                            [`system.networkEdges.${d.id}.dateFrom`]: normalizeDateInput(html.find("#link-date-from").val()),
                            [`system.networkEdges.${d.id}.dateTo`]: normalizeDateInput(html.find("#link-date-to").val())
                        });
                    }
                },
                delete: {
                    label: "Delete", icon: '<i class="fas fa-trash"></i>',
                    callback: async () => await sheet.actor.update({ [`system.networkEdges.-=${d.id}`]: null })
                }
            }
        }).render(true);
    };

    linkHit.on("contextmenu", handleLinkContext);
    linkVisible.on("contextmenu", handleLinkContext);
    
    // Wire up Reset Zoom Button
    $(sheet.element).find('.network-reset-zoom').off('click').on('click', () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });
}
