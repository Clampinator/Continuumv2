/**
 * Calculates AP yield and visual feedback for AP-specific rolls.
 * @param {number} delta - The success margin.
 * @returns {object} { ap, text, cssClass }
 */
export function calculateApResult(delta) {
    let ap = 0;
    let cssClass = "";
    
    if (delta >= 4) {
        ap = 3; 
        cssClass = "success";
    } else if (delta >= 2) {
        ap = 2; 
        cssClass = "success";
    } else if (delta >= -5) {
        ap = 1;
        cssClass = "failure"; 
    } else {
        ap = 0;
        cssClass = "critical-failure"; 
    }
    
    const text = ap > 0 ? `Gains ${ap} Action Point${ap > 1 ? 's' : ''}!` : "Botch! No Action Points gained.";
    
    return { ap, text, cssClass };
}
