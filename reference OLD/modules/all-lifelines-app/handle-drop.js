/**
 * Processes dropped data to identify and load Actor documents.
 * @param {Application} app - The application instance.
 * @param {DragEvent} event - The drop event.
 */
export async function handleDrop(app, event) {
    const data = TextEditor.getDragEventData(event);
    if (data.type !== "Actor") return;

    // Resolve the Actor document from dropped data
    const cls = getDocumentClass("Actor");
    const actor = await cls.fromDropData(data);
    
    if (actor) {
        app.addActor(actor);
    }
}