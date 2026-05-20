/**
 * HUD: TOOLTIP MANAGER
 * Authoritative display for contextual metadata.
 * Implements "Double-Pass HTML-in-SVG" shrink-wrap measurement.
 * 
 * Mandate: Tooltips must be surgically tight to their content.
 */
export class TooltipManager {
    constructor(viewport, parentGroup) {
        this.viewport = viewport;
        this.group = this._createTooltipGroup(parentGroup);
        this.isVisible = false;
        
        // Styles loaded via span_graph.css - no inline injection needed
    }

    /**
     * Shows a table-based HUD tooltip.
     * @param {Array} rows - [{ label, value, color }]
     * @param {Object} pos - { x, y } screen coordinates.
     */
    show(rows, pos) {
        if (!this.group) return;

        const container = this.group.querySelector('.tooltip-body');
        const fo = this.group.querySelector('foreignObject');
        const bg = this.group.querySelector('rect');
        if (!container || !fo || !bg) return;

        // 1. CONTENT INJECTION (The Table Mandate)
        const html = `
            <table class="tooltip-table">
                ${rows.map(row => `
                    <tr ${row.color ? `style="color: ${row.color}"` : ''}>
                        <td class="label">${row.label}:</td>
                        <td class="value">${row.value}</td>
                    </tr>
                `).join('')}
            </table>
        `;

        // 2. PASS 1: RESET FOR MEASUREMENT
        // We set dimensions to 1x1 to force the HTML to wrap/expand naturally.
        this.group.style.display = 'block';
        fo.setAttribute('width', '1');
        fo.setAttribute('height', '1');
        container.innerHTML = html;

        // 3. PASS 2: SHRINK-WRAP MEASUREMENT
        // We capture the exact offset of the rendered table.
        const table = container.querySelector('.tooltip-table');
        const width = Math.ceil(table.offsetWidth) + 12; // + padding
        const height = Math.ceil(table.offsetHeight) + 12;

        // 4. APPLY AUTHORITATIVE DIMENSIONS
        fo.setAttribute('width', width);
        fo.setAttribute('height', height);
        bg.setAttribute('width', width);
        bg.setAttribute('height', height);

        // 5. CLAMP TO VIEWPORT BOUNDS
        const viewRect = this.viewport.container.getBoundingClientRect();
        let finalX = pos.x + 15;
        let finalY = pos.y + 15;

        if (finalX + width > viewRect.width) finalX = pos.x - width - 10;
        if (finalY + height > viewRect.height) finalY = pos.y - height - 10;

        // Absolute boundaries
        finalX = Math.max(5, Math.min(finalX, viewRect.width - width - 5));
        finalY = Math.max(5, Math.min(finalY, viewRect.height - height - 5));

        this.group.setAttribute('transform', `translate(${finalX}, ${finalY})`);
        this.isVisible = true;
    }

    hide() {
        if (this.group) this.group.style.display = 'none';
        this.isVisible = false;
    }

    _createTooltipGroup(parent) {
        if (typeof document === 'undefined') return null;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'span-graph-tooltip-group');
        g.style.display = 'none';
        g.style.pointerEvents = 'none';

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('rx', '2');
        bg.style.fill = 'rgba(0, 0, 0, 0.95)';
        bg.style.stroke = '#ffd700'; // High-Visibility Gold
        bg.style.strokeWidth = '1';
        g.appendChild(bg);

        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        const body = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
        body.setAttribute('class', 'tooltip-body');
        fo.appendChild(body);
        g.appendChild(fo);

        if (parent) parent.appendChild(g);
        return g;
    }

}
