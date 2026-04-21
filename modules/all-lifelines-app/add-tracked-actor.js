/**
 * Adds an actor to the tracked list and assigns a visual color.
 * @param {Application} app - The application instance.
 * @param {Actor} actor - The Foundry actor document.
 */
export function addTrackedActor(app, actor) {
    if (app.trackedActors.find(a => a.id === actor.id)) return;
    
    app.trackedActors.push(actor);
    
    // Assign color from palette
    const colorIndex = (app.trackedActors.length - 1) % app.palette.length;
    app.actorColors[actor.id] = app.palette[colorIndex];

    app.render(true);
}
