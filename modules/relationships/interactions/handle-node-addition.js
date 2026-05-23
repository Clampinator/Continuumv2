import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Binds the Add Node button to create a new entry in the network.
 */
export function handleNodeAddition(sheet) {
    $(sheet.element).find('.network-add-node').off('click').on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const containerId = `#char-relationship-graph-${sheet.actor.id}`;
        const container = d3.select(containerId).node();
        const width = container?.clientWidth || 800;
        const height = container?.clientHeight || 500;

        const newId = foundry.utils.randomID();
        const newNode = {
            id: newId,
            name: "New NPC",
            img: "icons/svg/mystery-man.svg",
            groups: [],
            eventNotes: "",
            favor: "",
            x: (width / 2) + (Math.random() * 50 - 25),
            y: (height / 2) + (Math.random() * 50 - 25)
        };

        await sheet.actor.update({ [`system.network.${newId}`]: newNode });
        ui.notifications.info(game.i18n.localize("CONTINUUM.Notifications.AddedBlankNpcNode"));
    });
}
