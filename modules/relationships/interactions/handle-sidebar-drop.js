/**
 * Enables dropping Foundry actors from the sidebar onto the relationship graph.
 * @param {object} container - D3 selection of the graph container element.
 * @param {ActorSheet} sheet
 */
export function handleSidebarDrop(container, sheet) {
    const el = container.node();

    el.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    });

    el.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        let data;
        try {
            data = JSON.parse(e.dataTransfer.getData("text/plain"));
        } catch {
            return;
        }

        if (data.type !== "Actor") return;

        const droppedActor = await fromUuid(data.uuid);
        if (!droppedActor) return;

        // Prevent dropping the sheet's own actor onto their own map
        if (droppedActor.id === sheet.actor.id) {
            ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.CannotAddOwnMap"));
            return;
        }

        // Prevent duplicates by name
        const existing = Object.values(sheet.actor.system.network || {})
            .find(n => n.name === droppedActor.name);
        if (existing) {
            ui.notifications.warn(game.i18n.format("CONTINUUM.Notifications.AlreadyOnMap", {name: droppedActor.name}));
            return;
        }

        // Translate browser pixel coords to SVG container-relative coords
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newId = foundry.utils.randomID();
        await sheet.actor.update({
            [`system.network.${newId}`]: {
                id: newId,
                name: droppedActor.name,
                img: (() => { const t = droppedActor.prototypeToken?.texture?.src; return (t && t !== droppedActor.img) ? t : (droppedActor.img || "icons/svg/mystery-man.svg"); })(),
                groups: [],
                eventNotes: "",
                favor: "",
                x,
                y
            }
        });

        ui.notifications.info(game.i18n.format("CONTINUUM.Notifications.AddedToMap", {name: droppedActor.name}));
    });
}
