/**
 * Removes an actor from the tracked list and cleans up its color state.
 * @param {Application} app - The application instance.
 * @param {string} actorId - ID of the actor to remove.
 */
export function removeTrackedActor(app, actorId) {
    app.trackedActors = app.trackedActors.filter(a => a.id !== actorId);
    delete app.actorColors[actorId];
    app.render(true);
}