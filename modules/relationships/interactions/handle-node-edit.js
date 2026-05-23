function toDateInput(val) {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

/**
 * Displays the editor dialog for a node.
 */
export function handleNodeEdit(nodeSel, sheet) {
    nodeSel.on("contextmenu", (event, d) => {
        event.preventDefault();
        if (d.isRoot) return;

        const isAuto = d.isAuto;
        let autoNote = "";
        if (isAuto) {
            const rel = Object.values(sheet.actor.system.relationships || {}).find(r => r.name === d.name);
            autoNote = rel?.eventNotes || "";
        }

        const networkGroups = Object.values(sheet.actor.system.networkGroups || {});
        const nodeGroups = Array.isArray(d.groups) ? d.groups : [];

        const groupsHtml = networkGroups.length
            ? networkGroups.map(g => `
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer;">
                    <input type="checkbox" class="node-group-check" value="${g.id}" ${nodeGroups.includes(g.id) ? "checked" : ""}>
                    <span style="display:inline-block; width:12px; height:12px; background:${g.color}; border-radius:50%;"></span>
                    ${g.name}
                </label>`).join("")
            : `<p style="font-size:11px; color:#aaa; margin:0;">No groups yet — right-click empty canvas to create groups.</p>`;

        new Dialog({
            eventTitle: `Edit ${d.name}`,
            content: `
                <style>
                    .rel-node-edit { display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; width: 100%; }
                    .rel-node-edit .field-row { display: flex; flex-direction: column; gap: 2px; }
                    .rel-node-edit .date-row { display: flex; gap: 10px; }
                    .rel-node-edit .date-row .field-row { flex: 1; }
                    .rel-node-edit label { font-size: 12px; font-weight: bold; color: #ccc; }
                    .rel-node-edit .field-hint { font-size: 10px; color: #777; margin-top: 2px; }
                    .rel-node-edit input[type="text"],
                    .rel-node-edit input[type="date"],
                    .rel-node-edit textarea { box-sizing: border-box; width: 100%; background: #1a1a2e; color: #e0e0e0; border: 1px solid #555; border-radius: 3px; padding: 4px; }
                    .rel-node-edit textarea { min-height: 80px; resize: vertical; }
                    .rel-node-edit input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
                </style>
                <div class="rel-node-edit">
                    <div class="field-row">
                        <label>Name</label>
                        <input type="text" id="node-name" value="${d.name}" ${isAuto ? 'disabled' : ''} autofocus/>
                    </div>
                    <div class="field-row">
                        <label>Groups</label>
                        <div id="node-groups">${groupsHtml}</div>
                    </div>
                    <div class="date-row">
                        <div class="field-row">
                            <label>Known Since</label>
                            <input type="date" id="node-date-from" value="${toDateInput(d.dateFrom)}"/>
                            <p class="field-hint">Leave blank = always known</p>
                        </div>
                        <div class="field-row">
                            <label>Until</label>
                            <input type="date" id="node-date-to" value="${toDateInput(d.dateTo)}"/>
                            <p class="field-hint">Leave blank = still active</p>
                        </div>
                    </div>
                    <div class="field-row">
                        <label>Quick Favor / Debt</label>
                        <input type="text" id="node-favor" value="${d.favor || ''}" placeholder="e.g. Owed a trip to 1920"/>
                    </div>
                    <div class="field-row">
                        <label>eventNotes</label>
                        <textarea id="node-eventNotes">${isAuto ? autoNote : (d.eventNotes || "")}</textarea>
                    </div>
                </div>
            `,
            buttons: {
                save: {
                    label: "Save", icon: '<i class="fas fa-save"></i>',
                    callback: async (html) => {
                        const checkedGroups = html.find(".node-group-check:checked").map((_, el) => el.value).get();
                        const dateFrom = html.find("#node-date-from").val();
                        const dateTo   = html.find("#node-date-to").val();
                        const updates = {
                            [`system.network.${d.id}.groups`]:   checkedGroups,
                            [`system.network.${d.id}.favor`]:    html.find("#node-favor").val(),
                            [`system.network.${d.id}.dateFrom`]: dateFrom || null,
                            [`system.network.${d.id}.dateTo`]:   dateTo   || null,
                        };
                        if (!isAuto) {
                            updates[`system.network.${d.id}.name`]  = html.find("#node-name").val();
                            updates[`system.network.${d.id}.eventNotes`] = html.find("#node-eventNotes").val();
                        }
                        await sheet.actor.update(updates);
                    }
                },
                delete: {
                    label: "Delete", icon: '<i class="fas fa-trash"></i>',
                    callback: async () => {
                        if (isAuto) return ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.CannotDeleteAutomatedEntries"));
                        await sheet.actor.update({ [`system.network.-=${d.id}`]: null });
                    }
                },
                cancel: { label: "Cancel" }
            },
            render: (html) => {
                html.closest('.window-app').css({ 'width': '460px', 'min-width': '460px', 'height': 'auto' });
            }
        }, { width: 460, height: 'auto' }).render(true);
    });
}
