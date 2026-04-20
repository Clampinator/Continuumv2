
/**
 * Prepares data for the Location sheet.
 */
export async function prepareLocationData(sheet, context) {
    const actor = sheet.actor;
    const system = actor.system;

    context.actor = actor;
    context.system = system;

    // Ensure aspects are initialized as objects if they don't exist
    if (!system.aspects) system.aspects = {};
    const categories = ["infrastructure", "enterprise", "intellect", "authority"];
    categories.forEach(cat => {
        if (!system.aspects[cat]) system.aspects[cat] = {};
    });

    // Calculate percentages for progress bars if needed (e.g. for attributes 0-10)
    context.attributePercents = {
        scale: (system.attributes.scale.value / 10) * 100,
        output: (system.attributes.output.value / 10) * 100,
        cohesion: (system.attributes.cohesion.value / 10) * 100,
        civics: (system.attributes.civics.value / 10) * 100
    };

    // Handle toggles for section visibility
    context.toggles = sheet.options.checkedToggles || {};

    // GM-only visibility controls
    context.isGM = game.user.isGM;
    context.revealedOnOrgMap = actor.getFlag('continuum', 'revealedOnOrgMap') ?? false;

    return context;
}
