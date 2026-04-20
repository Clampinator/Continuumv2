/**
 * Returns the default configuration options for the AllLifelinesApp.
 * @returns {object}
 */
export function getDefaultOptions() {
    return foundry.utils.mergeObject(Application.defaultOptions, {
        id: "all-lifelines-app",
        title: "Continuum: All Lifelines",
        template: "systems/continuum/templates/apps/all-lifelines.html",
        width: 1000,
        height: 800,
        resizable: true,
        classes: ["continuum", "all-lifelines"],
        dragDrop: [{ dragSelector: null, dropSelector: ".span-graph-wrapper" }]
    });
}