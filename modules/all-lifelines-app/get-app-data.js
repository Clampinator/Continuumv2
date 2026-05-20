/**
 * Prepares the rendering context for the All Lifelines template.
 * @param {Application} app - The application instance.
 * @returns {object}
 */
export function getAppData(app) {
    return {
        actors: app.trackedActors.map(a => ({
            id: a.id,
            name: a.name,
            color: app.actorColors[a.id]
        })),
        // Placeholder data to satisfy shared graph templates
        system: { personal: { dob: "1970-01-01" } } 
    };
}
