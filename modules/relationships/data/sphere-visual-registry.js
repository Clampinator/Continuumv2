/**
 * Registry for mapping Sphere types to visual and physical properties.
 */
export const SPHERE_MAP = {
    "Intimate":     { distance: 60,  strength: 1.0, width: 6, opacity: 0.9, color: "#ff69b4" },
    "Personal":     { distance: 100, strength: 0.8, width: 4, opacity: 0.7, color: "#4da6ff" },
    "Professional": { distance: 160, strength: 0.6, width: 3, opacity: 0.5, color: "#888888" },
    "Social":       { distance: 220, strength: 0.4, width: 2, opacity: 0.4, color: "#666666" },
    "Public":       { distance: 300, strength: 0.2, width: 1, opacity: 0.2, color: "#444444" },
    "default":      { distance: 160, strength: 0.5, width: 2, opacity: 0.5, color: "#555555" }
};
