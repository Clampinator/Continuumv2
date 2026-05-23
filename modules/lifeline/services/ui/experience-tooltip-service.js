/*
Service to manage the experience eventTitle hover tooltip.
Handles DOM lifecycle, mouse tracking, data aggregation for locations,
and resonance bonus display.
*/
import { calculateResonanceBonuses } from '../calculators/resonance-calculator/calculate-resonance-bonuses.js';

export const ExperienceTooltipService = {
    show(actor, targetEl, event) {
        this.hide();

        let expId, eraId;

        // Handle Graph SVG Labels and Rects
        if (targetEl.classList.contains('graph-exp-label') || targetEl.classList.contains('graph-experience-rect')) {
            expId = targetEl.getAttribute('data-id');
            eraId = targetEl.getAttribute('data-era-id');
        } else {
            // Handle HTML Sheet Items
            const expItem = targetEl.closest('.experience-item');
            if (!expItem) return;
            expId = expItem.dataset.itemId;
            eraId = expItem.dataset.parentId;
        }

        const expData = actor.system.eras?.[eraId]?.experiences?.[expId];
        if (!expData) return;

        // 1. Determine Date Range
        const start = expData.dateFrom || "???";
        const end = expData.dateTo || game.i18n.localize("CONTINUUM.ExperienceTooltip.OpenLoop");

        // 2. Calculate Most Common Location from Events
        const events = Object.values(expData.events || {});
        const locations = events
            .map(e => e.eventIsSpan ? e.eventSpanFromLocation : e.location)
            .filter(l => typeof l === 'string' && l.trim() !== "");
        
        let primaryLocation = game.i18n.localize("CONTINUUM.ExperienceTooltip.UnknownLocation");
        if (locations.length > 0) {
            const counts = {};
            let maxCount = 0;
            let mode = "";

            for (const loc of locations) {
                const cleanLoc = loc.trim();
                counts[cleanLoc] = (counts[cleanLoc] || 0) + 1;
                if (counts[cleanLoc] > maxCount) {
                    maxCount = counts[cleanLoc];
                    mode = cleanLoc;
                }
            }
            primaryLocation = mode || game.i18n.localize("CONTINUUM.ExperienceTooltip.UnknownLocation");
        }

        // 3. Calculate Resonance Bonus (two-axis: duration + distance)
        let bonusText = '';
        try {
            const allBonuses = calculateResonanceBonuses(actor);
            const matched = allBonuses.find(b => b.name === expData.name);
            if (matched && matched.bonus > 0) {
                bonusText = `<div class="tooltip-row">
                    <i class="fas fa-bolt"></i>
                    <span>${game.i18n.format("CONTINUUM.ExperienceTooltip.ResonanceBonus", {bonus: matched.bonus})}</span>
                </div>`;
            }
        } catch (_) {
            // Resonance calculation may fail if actor data is incomplete
        }

        // 4. Description (optional)
        let descText = '';
        if (expData.description && expData.description.trim()) {
            const shortDesc = expData.description.length > 80
                ? expData.description.substring(0, 80) + '...'
                : expData.description;
            descText = `<div class="tooltip-row tooltip-desc" style="color: #aaa; font-style: italic;">${shortDesc}</div>`;
        }

        // 5. Create Tooltip Element
        const tooltip = document.createElement('div');
        tooltip.className = 'experience-hover-tooltip';
        tooltip.id = 'experience-hover-tooltip-global';
        
        tooltip.innerHTML = `
            <div class="tooltip-header">${expData.name || game.i18n.localize("CONTINUUM.Experiences.ExperienceTitle")}</div>
            ${descText}
            <div class="tooltip-row">
                <i class="fas fa-calendar-alt"></i> 
                <span>${start} to ${end}</span>
            </div>
            <div class="tooltip-row">
                <i class="fas fa-map-marker-alt"></i> 
                <span>${game.i18n.localize("CONTINUUM.ExperienceTooltip.PrimaryLabel")} ${primaryLocation}</span>
            </div>
            ${bonusText}
        `;

        document.body.appendChild(tooltip);
        this.updatePosition(event);
        
        // Small fade in
        requestAnimationFrame(() => tooltip.classList.add('active'));
    },

    updatePosition(event) {
        const tooltip = document.getElementById('experience-hover-tooltip-global');
        if (!tooltip) return;

        const offset = 15;
        let x = event.clientX + offset;
        let y = event.clientY + offset;

        // Prevent overflow
        const rect = tooltip.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) x = event.clientX - rect.width - offset;
        if (y + rect.height > window.innerHeight) y = event.clientY - rect.height - offset;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    },

    hide() {
        const el = document.getElementById('experience-hover-tooltip-global');
        if (el) el.remove();
    }
};
