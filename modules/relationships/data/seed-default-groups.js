const DEFAULT_GROUPS = [
    { name: "Family",  color: "#3b82f6" },
    { name: "Friends", color: "#eab308" },
    { name: "Enemies", color: "#ef4444" }
];

/**
 * Seeds Family, Friends, and Enemies groups on first use.
 * Does nothing if the actor already has any groups defined.
 * @param {Actor} actor
 */
export async function seedDefaultGroups(actor) {
    const existing = actor.system.networkGroups || {};
    if (Object.keys(existing).length > 0) return;

    const updates = {};
    for (const group of DEFAULT_GROUPS) {
        const id = foundry.utils.randomID();
        updates[`system.networkGroups.${id}`] = { id, name: group.name, color: group.color };
    }
    await actor.update(updates);
}
