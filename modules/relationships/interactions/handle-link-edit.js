// Grouped relationship types. Values must match RELATIONSHIP_EMOJIS in render-elements.js.
const RELATIONSHIP_GROUPS = [
    {
        label: "— No label —",
        types: [
            { value: "Connection", label: "Connection (unlabelled)" },
            { value: "Acquaintance", label: "Acquaintance" },
        ]
    },
    {
        label: "Close Personal",
        types: [
            { value: "Romantic",    label: "Romantic Partner  ❤" },
            { value: "Spouse",      label: "Spouse / Life Partner  ❤" },
            { value: "BestFriend",  label: "Best Friend  🤝" },
            { value: "Confidant",   label: "Confidant / Trusted Friend  🤝" },
        ]
    },
    {
        label: "Family",
        types: [
            { value: "Family",      label: "Family Member  🏠" },
            { value: "Parent",      label: "Parent  🏠" },
            { value: "Child",       label: "Child  🏠" },
            { value: "Sibling",     label: "Sibling  🏠" },
        ]
    },
    {
        label: "Social",
        types: [
            { value: "Friend",      label: "Friend  🤝" },
            { value: "Ally",        label: "Ally  🤝" },
            { value: "Mentor",      label: "Mentor  🎓" },
            { value: "Student",     label: "Student / Protégé  🎓" },
            { value: "Protector",   label: "Protector / Guardian  🛡" },
            { value: "Informant",   label: "Informant / Source  👁" },
        ]
    },
    {
        label: "Professional",
        types: [
            { value: "Colleague",   label: "Colleague  💼" },
            { value: "Employer",    label: "Employer / Boss  💼" },
            { value: "Employee",    label: "Employee  💼" },
            { value: "Client",      label: "Client / Business  💼" },
        ]
    },
    {
        label: "Antagonistic",
        types: [
            { value: "Rival",       label: "Rival  ⚔" },
            { value: "Enemy",       label: "Enemy  ☠" },
            { value: "Nemesis",     label: "Nemesis  ☠" },
            { value: "Threat",      label: "Threat / Danger  ⚡" },
        ]
    },
];

// Convert a stored date string (any format) to the YYYY-MM-DD value
// required by <input type="date">. Returns '' if empty or invalid.
function toDateInput(val) {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

/**
 * Displays the editor dialog for a relationship link.
 */
export function handleLinkEdit(linkHit, linkVisible, sheet) {
    const openLinkDialog = (event, d) => {
        event.preventDefault();
        const typeOptgroups = RELATIONSHIP_GROUPS.map(group => {
            const options = group.types.map(t =>
                `<option value="${t.value}" ${d.relationshipType === t.value ? 'selected' : ''}>${t.label}</option>`
            ).join("");
            return `<optgroup label="${group.label}">${options}</optgroup>`;
        }).join("");

        new Dialog({
            eventTitle: "Edit Relationship",
            content: `
                <style>
                    .rel-link-edit select, .rel-link-edit input[type="date"] {
                        width: 100%; box-sizing: border-box;
                        background: #1a1a2e; color: #e0e0e0;
                        border: 1px solid #555; padding: 4px; border-radius: 3px;
                    }
                    .rel-link-edit select option { background: #1a1a2e; color: #e0e0e0; }
                    .rel-link-edit select optgroup { background: #0d0d1a; color: #4da6ff; font-weight: bold; }
                    .rel-link-edit label { display: block; font-size: 12px; font-weight: bold; color: #ccc; margin-bottom: 2px; }
                    .rel-link-edit .field-hint { font-size: 10px; color: #777; margin-top: 2px; }
                    .rel-link-edit .field-row { margin-bottom: 8px; }
                    .rel-link-edit .date-row { display: flex; gap: 10px; }
                    .rel-link-edit .date-row .field-row { flex: 1; }
                    .rel-link-edit textarea { width: 100%; box-sizing: border-box; min-height: 80px; resize: vertical; }
                    .rel-link-edit input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
                </style>
                <div class="rel-link-edit">
                    <div class="field-row">
                        <label>Relationship Type</label>
                        <select id="link-type">${typeOptgroups}</select>
                    </div>
                    <div class="field-row">
                        <label>Sphere (closeness)</label>
                        <select id="link-sphere">
                            <option value="Intimate"     ${d.importance === 'Intimate'     ? 'selected' : ''}>Intimate</option>
                            <option value="Personal"     ${d.importance === 'Personal'     ? 'selected' : ''}>Personal</option>
                            <option value="Professional" ${d.importance === 'Professional' ? 'selected' : ''}>Professional</option>
                            <option value="Social"       ${d.importance === 'Social'       ? 'selected' : ''}>Social</option>
                            <option value="Public"       ${d.importance === 'Public'       ? 'selected' : ''}>Public</option>
                        </select>
                    </div>
                    <div class="date-row">
                        <div class="field-row">
                            <label>Began</label>
                            <input type="date" id="link-date-from" value="${toDateInput(d.dateFrom)}"/>
                            <p class="field-hint">Leave blank = always known</p>
                        </div>
                        <div class="field-row">
                            <label>Ended</label>
                            <input type="date" id="link-date-to" value="${toDateInput(d.dateTo)}"/>
                            <p class="field-hint">Leave blank = ongoing</p>
                        </div>
                    </div>
                    <div class="field-row">
                        <label>eventNotes</label>
                        <textarea id="link-eventNotes" placeholder="History, context, or details about this connection...">${d.eventNotes || ''}</textarea>
                    </div>
                </div>
            `,
            buttons: {
                save: {
                    label: "Save", icon: '<i class="fas fa-save"></i>',
                    callback: async (html) => {
                        if (d.isAuto) return ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.AutomatedLinksMustEditInList"));
                        const dateFrom = html.find("#link-date-from").val();
                        const dateTo   = html.find("#link-date-to").val();
                        await sheet.actor.update({
                            [`system.networkEdges.${d.id}.relationshipType`]: html.find("#link-type").val(),
                            [`system.networkEdges.${d.id}.importance`]:       html.find("#link-sphere").val(),
                            [`system.networkEdges.${d.id}.eventNotes`]:            html.find("#link-eventNotes").val(),
                            [`system.networkEdges.${d.id}.dateFrom`]:         dateFrom || null,
                            [`system.networkEdges.${d.id}.dateTo`]:           dateTo   || null,
                        });
                    }
                },
                delete: {
                    label: "Delete", icon: '<i class="fas fa-trash"></i>',
                    callback: async () => {
                        if (d.isAuto) return ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.CannotDeleteAutomatedLinks"));
                        await sheet.actor.update({ [`system.networkEdges.-=${d.id}`]: null });
                    }
                },
                cancel: { label: "Cancel" }
            },
            render: (html) => {
                html.closest('.window-app').css({ 'width': '460px', 'min-width': '460px', 'height': 'auto' });
            }
        }).render(true);
    };

    linkHit.on("contextmenu", openLinkDialog);
    linkVisible.on("contextmenu", openLinkDialog);
}
