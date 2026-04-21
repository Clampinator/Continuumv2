/**
 * Isolated logic for Organization "Subway" tracks.
 */
export const SubwayGenerator = {
    /**
     * Maps conflict units to track objects.
     * @param {object} actor - The Foundry Actor instance.
     * @returns {object} Map of unitId -> Track configuration.
     */
    generateTracks(actor) {
        if (!actor) return {};
        const tracks = {};
        const conflict = actor.system.conflict || {};
        
        // Track Color Mapping based on London Underground inspiration
        const colors = {
            physical: '#E32017',   // Central Red
            espionage: '#003688',  // Piccadilly Blue
            psyops: '#9B0056',     // Metropolitan Magenta
            online: '#00782A'      // District Green
        };

        ['physical', 'espionage', 'online', 'psyops'].forEach(type => {
            const units = conflict[type] || {};
            Object.entries(units).forEach(([id, unit]) => {
                tracks[id] = {
                    id: id,
                    name: unit.description || "New Unit",
                    type: type,
                    color: colors[type],
                    nodes: [],
                    headNode: null
                };
            });
        });

        return tracks;
    }
};
