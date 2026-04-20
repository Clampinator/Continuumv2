/*
Standardized data access for the Continuum system.
Prevents logic duplication when interacting with nested system paths.
*/
export const DataAccessors = {
    getToggle(actor, key) {
        const state = actor.getFlag('continuum', 'sheetState') || {};
        const toggles = state.toggles || {};
        return !!toggles[key];
    },

    async setToggle(actor, key, value) {
        return actor.setFlag('continuum', `sheetState.toggles.${key}`, value);
    },

    getEra(actor, eraId) {
        return actor.system.eras?.[eraId];
    },

    getExperience(actor, eraId, expId) {
        return actor.system.eras?.[eraId]?.experiences?.[expId];
    }
};