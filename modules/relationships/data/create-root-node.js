/**
 * Creates the root node for the primary character.
 * @param {Actor} actor 
 * @returns {object}
 */
export function createRootNode(actor) {
    const tokenSrc = actor.prototypeToken?.texture?.src;
    const rootImg = (tokenSrc && tokenSrc !== actor.img)
        ? tokenSrc
        : (actor.img || "icons/svg/mystery-man.svg");

    return {
        id: actor.id,
        name: actor.system.personal?.name || actor.name,
        img: rootImg,
        isRoot: true,
        group: "Self",
        fx: null, 
        fy: null
    };
}
