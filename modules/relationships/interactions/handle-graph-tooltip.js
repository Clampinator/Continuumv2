/**
 * Floating tooltip for the relationship graph.
 * Shows node name/eventNotes/favor on node hover, and relationship type/eventNotes on link hover.
 */
export function handleGraphTooltip(container, nodeSel, linkHit) {
    const wrapperNode = container.node().closest('.org-network-wrapper');

    const tip = document.createElement('div');
    Object.assign(tip.style, {
        position:      'absolute',
        background:    'rgba(8, 8, 18, 0.96)',
        border:        '1px solid #4da6ff44',
        borderRadius:  '6px',
        padding:       '10px 13px',
        color:         '#ddd',
        fontSize:      '12px',
        lineHeight:    '1.6',
        pointerEvents: 'none',
        zIndex:        '100',
        maxWidth:      '230px',
        display:       'none',
        boxShadow:     '0 3px 12px rgba(0,0,0,0.7)',
    });
    wrapperNode.appendChild(tip);

    function show(event, html) {
        tip.innerHTML = html;
        tip.style.display = 'block';
        move(event);
    }

    function move(event) {
        const rect = wrapperNode.getBoundingClientRect();
        let x = event.clientX - rect.left + 14;
        let y = event.clientY - rect.top  - 10;
        // Prevent tooltip from overflowing the right or top edge
        if (x + 250 > wrapperNode.clientWidth) x = event.clientX - rect.left - 250;
        if (y < 5) y = event.clientY - rect.top + 22;
        tip.style.left = x + 'px';
        tip.style.top  = y + 'px';
    }

    function hide() { tip.style.display = 'none'; }

    // --- Node tooltips ---
    nodeSel
        .on('mouseenter.tooltip', (event, d) => {
            if (d.isRoot) return; // PC node needs no tooltip
            let html = `<div style="color:#6dbfff;font-weight:bold;font-size:13px;margin-bottom:4px">${d.name}</div>`;
            if (d.eventNotes) html += `<div style="color:#ccc">${d.eventNotes}</div>`;
            if (d.favor) html += `<div style="color:#ffd700;margin-top:6px">💰 ${d.favor}</div>`;
            if (!d.eventNotes && !d.favor) html += `<div style="color:#555;font-style:italic">No eventNotes</div>`;
            show(event, html);
        })
        .on('mousemove.tooltip',  move)
        .on('mouseleave.tooltip', hide);

    // --- Link tooltips (on the wide invisible hit area) ---
    linkHit
        .on('mouseenter.tooltip', (event, d) => {
            const type   = d.relationshipType || 'Connection';
            const sphere = d.importance || '';
            let html = `<div style="color:#bbb;font-weight:bold;font-size:13px;margin-bottom:4px">${type}</div>`;
            if (sphere) html += `<div style="color:#666;font-size:11px">${sphere} sphere</div>`;
            if (d.eventNotes) html += `<div style="color:#ccc;margin-top:6px">${d.eventNotes}</div>`;
            show(event, html);
        })
        .on('mousemove.tooltip',  move)
        .on('mouseleave.tooltip', hide);
}
