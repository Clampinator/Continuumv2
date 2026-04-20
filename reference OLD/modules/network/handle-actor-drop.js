/**
 * THE NETWORK INGESTION AUTHORITY: handleActorDrop
 * Intercepts Actor drops from the sidebar and converts them into network nodes.
 * Domain: network
 */
export async function handleActorDrop(event, sheet) {
    const data = TextEditor.getDragEventData(event);
    const actor = sheet.actor;

    // 1. Valid Type Guard: Support both Sidebar drags and Token drags
    if (data.type !== "Actor" && data.type !== "Token") return false;

    // 2. Proximity Guard: Are we dropping into a network visualization container?
    const target = event.target;
    const networkContainer = target.closest(".org-network-container");
    if (!networkContainer) return false;

    // 3. Resolve Dropped Actor Document
    let droppedActor = null;
    try {
        if (data.type === "Actor") {
            droppedActor = await Actor.fromDropData(data);
        } else if (data.type === "Token") {
            const token = fromUuidSync(data.uuid);
            droppedActor = token?.actor;
        }
    } catch (err) {
        console.error("Continuum | Actor Drop Error:", err);
    }

    if (!droppedActor) {
        return (data.type === "Actor" || data.type === "Token");
    }

    // 4. Self-drop Guard
    if (droppedActor.id === actor.id) {
        ui.notifications.warn("You cannot add this character to their own relationship map.");
        return true;
    }

    // 5. Duplicate Guard
    const existing = Object.values(actor.system.network || {}).find(n => n.actorId === droppedActor.id);
    if (existing) {
        ui.notifications.warn(`${droppedActor.name} is already present in this network.`);
        return true;
    }

    // 6. Image Resolution - prefer explicit token image over portrait
    const tokenSrc = droppedActor.prototypeToken?.texture?.src;
    const imageToUse = (tokenSrc && tokenSrc !== droppedActor.img)
        ? tokenSrc
        : (droppedActor.img || "icons/svg/mystery-man.svg");

    const newId = foundry.utils.randomID();
    const newNode = {
        id: newId,
        actorId: droppedActor.id,
        name: droppedActor.name,
        img: imageToUse,
        relationshipType: droppedActor.type === 'organization' ? "Affiliation" : "Contact",
        importance: "Social",
        x: 0, 
        y: 0
    };

    const updates = {};
    updates[`system.network.${newId}`] = newNode;

    // 6. Parent Connection Discovery
    let parentId = null;
    let currentEl = target;
    while (currentEl && currentEl !== networkContainer) {
        if (currentEl.getAttribute && currentEl.getAttribute("data-node-id")) {
            parentId = currentEl.getAttribute("data-node-id");
            break;
        }
        currentEl = currentEl.parentElement;
    }

    if (parentId) {
        const newEdgeId = foundry.utils.randomID();
        updates[`system.networkEdges.${newEdgeId}`] = {
            id: newEdgeId,
            source: parentId,
            target: newId,
            relationshipType: "Member"
        };
    }

    await actor.update(updates);
    ui.notifications.info(`Added ${droppedActor.name} to the network.`);
    return true;
}