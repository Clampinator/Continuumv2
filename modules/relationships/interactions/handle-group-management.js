import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Right-clicking empty canvas space opens the group management dialog.
 * @param {object} svg - D3 selection of the SVG element.
 * @param {ActorSheet} sheet
 */
export function handleGroupManagement(svg, sheet) {
    svg.on("contextmenu.groupmgmt", (event) => {
        const tag = event.target.tagName?.toLowerCase();
        // Only fire on blank canvas, not on nodes, links, or group hulls
        if (tag !== "svg") return;
        event.preventDefault();
        openGroupDialog(sheet);
    });
}

function openGroupDialog(sheet) {
    const networkGroups = sheet.actor.system.networkGroups || {};
    const colors = d3.schemeTableau10;

    // Count how many nodes belong to each group
    const allNodes = Object.values(sheet.actor.system.network || {});
    const memberCount = {};
    allNodes.forEach(n => {
        if (Array.isArray(n.groups)) {
            n.groups.forEach(gid => { memberCount[gid] = (memberCount[gid] || 0) + 1; });
        }
    });

    const rowsHtml = Object.values(networkGroups).map(g => makeRow(g.id, g.name, g.color, memberCount[g.id] || 0)).join("");

    new Dialog({
        eventTitle: "Manage Groups",
        content: `
            <style>
                #group-manager { display: flex; flex-direction: column; gap: 6px; }
                .group-row { display: flex; gap: 6px; align-items: center; min-width: 0; }
                .group-row input[type="text"] { flex: 1; min-width: 0; }
                .group-row input[type="color"] { flex-shrink: 0; width: 32px; height: 28px; padding: 2px; cursor: pointer; }
                .group-row .group-delete { flex-shrink: 0; width: 30px; height: 28px; padding: 0; text-align: center; }
                .group-row .group-member-count { flex-shrink: 0; font-size: 11px; color: #aaa; white-space: nowrap; }
                #add-group-btn { margin-top: 4px; }
                .group-hint { font-size: 11px; color: #aaa; margin-top: 6px; }
            </style>
            <div id="group-manager">
                <div id="group-list">${rowsHtml}</div>
                <button id="add-group-btn"><i class="fas fa-plus"></i> Add Group</button>
                <p class="group-hint">Right-click a node to assign it to a group. Right-click empty canvas to return here.</p>
            </div>
        `,
        buttons: {
            save: {
                label: "Save",
                icon: '<i class="fas fa-save"></i>',
                callback: async (html) => {
                    const updates = {};
                    const keptIds = new Set();

                    html.find(".group-row").each((_, row) => {
                        const id = row.dataset.id;
                        const name = $(row).find(".group-name").val().trim();
                        const color = $(row).find(".group-color").val();
                        if (name) {
                            updates[`system.networkGroups.${id}`] = { id, name, color };
                            keptIds.add(id);
                        }
                    });

                    // Only delete groups whose rows were removed from the dialog
                    Object.keys(networkGroups).forEach(id => {
                        if (!keptIds.has(id)) {
                            updates[`system.networkGroups.-=${id}`] = null;
                        }
                    });

                    await sheet.actor.update(updates);
                }
            },
            cancel: { label: "Cancel" }
        },
        render: (html) => {
            html.closest('.window-app').css({ 'width': '460px', 'min-width': '460px', 'height': 'auto' });

            let colorIndex = Object.keys(networkGroups).length;

            html.find("#add-group-btn").on("click", () => {
                const newId = foundry.utils.randomID();
                const color = colors[colorIndex % colors.length];
                colorIndex++;
                // New groups always start empty, so delete is enabled immediately
                const row = $(makeRow(newId, "", color, 0));
                row.find(".group-delete").on("click", () => row.remove());
                html.find("#group-list").append(row);
            });

            html.find(".group-delete").on("click", function () {
                // Button is disabled when members > 0, but guard here too
                if ($(this).prop("disabled")) return;
                $(this).closest(".group-row").remove();
            });
        }
    }).render(true);
}

function makeRow(id, name, color, members = 0) {
    const hasMembers = members > 0;
    const memberLabel = hasMembers ? `${members} member${members !== 1 ? 's' : ''}` : "";
    const deleteTitle = hasMembers
        ? `Cannot delete — remove all ${members} member${members !== 1 ? 's' : ''} from this group first`
        : "Remove group";
    return `
        <div class="group-row" data-id="${id}">
            <input type="color" class="group-color" value="${color}">
            <input type="text" class="group-name" value="${name}" placeholder="Group name (e.g. Family, Enemies)">
            ${hasMembers ? `<span class="group-member-count" eventTitle="${deleteTitle}" style="font-size:11px; color:#aaa; white-space:nowrap;">${memberLabel}</span>` : ""}
            <button class="group-delete" eventTitle="${deleteTitle}" ${hasMembers ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : ""}>
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}
