/**
 * Returns the primary actor or a safe dummy object for graph operations.
 * @param {Application} app - The application instance.
 * @returns {object}
 */
export function getPrimaryActor(app) {
    return app.trackedActors[0] || { 
        system: { personal: { dob: "1970-01-01" }, ages: {} }, 
        getFlag: () => {},
        update: () => {} 
    };
}