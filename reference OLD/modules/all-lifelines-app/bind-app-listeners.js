import { initializeSpanGraph } from '../span-graph-container.js';

/**
 * Attaches event listeners and initializes the interactive span graph.
 * @param {Application} app - The application instance.
 * @param {JQuery} html - The application HTML content.
 */
export function bindAppListeners(app, html) {
    // Remove Actor Button
    html.find('.remove-actor').click(ev => {
        const id = ev.currentTarget.dataset.id;
        app.removeActor(id);
    });

    // Initialize the multi-line graph
    initializeSpanGraph(html, app);
}