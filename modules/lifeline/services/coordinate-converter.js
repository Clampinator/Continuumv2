/**
 * Pure math service for coordinate space conversions.
 */
export const CoordinateConverter = {
    /**
     * Converts screen coordinates to world (Age/Time) values.
     */
    screenToWorld(x, y, viewState) {
        return {
            age: (x - viewState.x) / viewState.scaleX,
            time: (y - viewState.y) / viewState.scaleY
        };
    },

    /**
     * Converts world coordinates to screen pixel positions.
     */
    worldToScreen(age, time, viewState) {
        return {
            x: (age * viewState.scaleX) + viewState.x,
            y: (time * viewState.scaleY) + viewState.y
        };
    },

    /**
     * Calculates distance between two world points.
     */
    getDistance(p1, p2) {
        return Math.hypot(p1.age - p2.age, p1.time - p2.time);
    }
};
