/**
 * Determines the success level and CSS class for standard task rolls.
 * @param {number} delta - The success margin.
 * @returns {object} { text, cssClass }
 */
export function calculateStandardResult(delta) {
    if (delta >= 6) { 
        return { text: "Critical Success", cssClass: "critical" }; 
    } else if (delta >= 0) { 
        return { text: "Success", cssClass: "success" }; 
    } else if (delta >= -5) { 
        return { text: "Failure", cssClass: "failure" }; 
    } else { 
        return { text: "Botch", cssClass: "critical-failure" }; 
    }
}