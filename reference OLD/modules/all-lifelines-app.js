import { getDefaultOptions } from './all-lifelines-app/get-default-options.js';
import { getAppData } from './all-lifelines-app/get-app-data.js';
import { bindAppListeners } from './all-lifelines-app/bind-app-listeners.js';
import { handleDrop } from './all-lifelines-app/handle-drop.js';
import { addTrackedActor } from './all-lifelines-app/add-tracked-actor.js';
import { removeTrackedActor } from './all-lifelines-app/remove-tracked-actor.js';
import { getPrimaryActor } from './all-lifelines-app/get-primary-actor.js';
import { getColorPalette } from './all-lifelines-app/get-color-palette.js';

export class AllLifelinesApp extends Application {
    constructor(options = {}) {
        super(options);
        this.trackedActors = [];
        this.actorColors = {};
        
        // Context object for graph processing compatibility
        this._spanGraphContext = null; 
        this.palette = getColorPalette();
    }

    /** @override */
    static get defaultOptions() {
        return getDefaultOptions();
    }

    /** @override */
    getData() {
        return getAppData(this);
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        bindAppListeners(this, html);
    }

    /**
     * Handle dropping an Actor onto the graph
     * @override
     */
    async _onDrop(event) {
        return handleDrop(this, event);
    }

    /**
     * Adds an actor to the tracked list
     * @param {Actor} actor 
     */
    addActor(actor) {
        return addTrackedActor(this, actor);
    }

    /**
     * Removes an actor from the tracked list
     * @param {string} actorId 
     */
    removeActor(actorId) {
        return removeTrackedActor(this, actorId);
    }

    /**
     * Getter to provide a primary reference actor for graph scaling
     */
    get actor() {
        return getPrimaryActor(this);
    }
}