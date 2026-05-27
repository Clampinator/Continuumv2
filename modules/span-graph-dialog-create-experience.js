import { normalizeDateInput, timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';
import { convertSecondsToDateString } from '/systems/continuum-v2/modules/temporal-translator/duration-converter.js';
import { renderGraph } from './span-graph-render.js';
import { renderDatePicker } from './span-graph-ui-helpers.js';
import { ContextFinder } from './lifeline/services/context-finder.js';
import { activateDatePickers } from './date-picker.js';
import { Sound } from './sound-manager.js';

export function showCreateExperienceDialog(viewState, graphData, sheet, svg, durationSeconds, startAgeSeconds) {
    const dobTs = sheet.actor.system.personal?.dob ? new Date(sheet.actor.system.personal.dob + "T00:00:00").getTime() : Date.now();
    const startStr = convertSecondsToDateString(startAgeSeconds, dobTs);
    const endStr = convertSecondsToDateString(startAgeSeconds + durationSeconds, dobTs);

    // Use service-based hit detection
    const context = ContextFinder.getHitContext(startAgeSeconds, graphData);
    const eraId = context ? context.eraId : null;

    if (!eraId || eraId === 'NEW_ERA') {
        ui.notifications.warn(game.i18n.localize("CONTINUUM.Notifications.CreateEraFirst"));
        viewState.interactionMode = 'pan';
        renderGraph(svg, viewState, graphData);
        return;
    }

    // Aspects available for linking: 4 Attributes + 5 Metabilities
    const attributes = [
        { key: 'force', label: 'Force' },
        { key: 'analyze', label: 'Analyze' },
        { key: 'relate', label: 'Relate' },
        { key: 'react', label: 'React' }
    ];
    const metabilities = [
        { key: 'coercion', label: 'Coercion' },
        { key: 'creativity', label: 'Creativity' },
        { key: 'farsense', label: 'Farsense' },
        { key: 'pk', label: 'PK' },
        { key: 'redaction', label: 'Redaction' }
    ];

    const content = `
        <form style="width: 100%;">
            <style>
                .continuum-dialog-compact { width: 96%; margin: 0 auto; }
                .continuum-dialog-compact .form-group { display: flex; align-items: center; margin-bottom: 8px; }
                .continuum-dialog-compact .form-group label { flex: 0 0 110px; margin-right: 10px; text-align: right; font-size: 0.9em; }
                .continuum-dialog-compact .form-group input { flex: 1; }
                .continuum-dialog-compact .date-picker-container { flex: 1; }
                .ongoing-row { margin-left: 120px; display: flex; align-items: center; gap: 8px; margin-top: 5px; }
                .ongoing-row input { width: 20px; height: 20px; flex: none; cursor: pointer; }
                .ongoing-row label { color: #4a90e2; font-weight: bold; cursor: pointer; }
                .aspect-section { margin-top: 10px; padding-top: 8px; border-top: 1px solid #444; }
                .aspect-section-header { font-size: 0.75em; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 6px; }
                .aspect-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
                .aspect-btn { padding: 4px 10px; border: 1px solid #555; border-radius: 3px; background: #1a1a2e; color: #aaa; cursor: pointer; font-size: 0.85em; transition: all 0.15s; user-select: none; }
                .aspect-btn:hover { border-color: #4a90e2; color: #ddd; }
                .aspect-btn.selected { background: #2a4a7a; border-color: #4a90e2; color: #ffd700; font-weight: bold; }
                .aspect-btn.attr-btn.selected { background: #1a4a3a; border-color: #00e5ff; color: #00e5ff; }
                .aspect-btn.meta-btn.selected { background: #4a2a5a; border-color: #ff00ff; color: #ff00ff; }
            </style>
            <div class="continuum-dialog-compact">
                <div class="form-group"><label>Experience Name</label><input type="text" name="name" value="New Experience" autofocus/></div>
                <div class="form-group"><label>Description</label><input type="text" name="description" value="" placeholder="Optional description" /></div>
                ${renderDatePicker("dateFrom", startStr, "Start Date")}
                <div class="ongoing-row">
                    <input type="checkbox" name="isOngoing" id="create-exp-ongoing" />
                    <label for="create-exp-ongoing">Ongoing (Maintenance)</label>
                </div>
                <div class="exp-end-fields">
                    ${renderDatePicker("dateTo", endStr, "End Date")}
                </div>
                <div class="aspect-section">
                    <div class="aspect-section-header">Link to Attributes</div>
                    <div class="aspect-row">
                        ${attributes.map(a => `<div class="aspect-btn attr-btn" data-aspect="${a.key}">${a.label}</div>`).join('')}
                    </div>
                    <div class="aspect-section-header" style="margin-top: 6px;">Link to Metabilities</div>
                    <div class="aspect-row">
                        ${metabilities.map(m => `<div class="aspect-btn meta-btn" data-aspect="${m.key}">${m.label}</div>`).join('')}
                    </div>
                    <div style="font-size: 0.7em; color: #666; margin-top: 4px;">Linked aspects gain progression credit for this experience's subjective duration.</div>
                </div>
            </div>
        </form>
    `;

    new Dialog({
        eventTitle: "Create New Experience",
        content: content,
        render: (html) => {
            activateDatePickers(html);
            html.find("input[type='text'], input[type='number']").on("focus", event => event.currentTarget.select());
            
            // Aspect link toggle: clicking toggles selected state
            html.find('.aspect-btn').on('click', (e) => {
                e.currentTarget.classList.toggle('selected');
            });

            // Logic: If user picks an end date, turn off ongoing and show end fields
            html.find('input[name="dateTo"]').on('change', (e) => {
                if (e.target.value.trim() !== "") {
                    html.find('input[name="isOngoing"]').prop('checked', false);
                    html.find('.exp-end-fields').show();
                }
            });

            // Logic: If user checks ongoing, clear end date and hide end fields.
            // If user unchecks ongoing, show end fields and default to NOW.
            html.find('input[name="isOngoing"]').on('change', (e) => {
                if (e.target.checked) {
                    html.find('input[name="dateTo"]').val('').trigger('change');
                    html.find('.exp-end-fields').hide();
                } else {
                    const nowNode = sheet._spanGraphViewport?.latestState?.nowNode;
                    const nowTime = nowNode ? (nowNode.time ?? nowNode.y) : null;
                    if (nowTime) {
                        const dt = timestampToDateString(nowTime);
                        html.find('input[name="dateTo"]').val(dt.date).trigger('change');
                    }
                    html.find('.exp-end-fields').show();
                }
            });
        },
        buttons: {
            create: {
                label: "Create",
                icon: '<i class="fas fa-check"></i>',
                callback: async (html) => {
                    const formData = new foundry.applications.ux.FormDataExtended(html.find("form")[0]).object;
                    const newId = foundry.utils.randomID();
                    
                    // Collect selected aspect links from toggle buttons
                    const linkedAspects = [];
                    html.find('.aspect-btn.selected').each(function() {
                        linkedAspects.push($(this).data('aspect') || this.getAttribute('data-aspect'));
                    });

                    const era = sheet.actor.system.eras[eraId];
                    const exps = Object.values(era.experiences || {});
                    let newSort = 0;
                    if (exps.length > 0) {
                        const sorts = exps.map(e => Number(e.sort) || 0);
                        newSort = Math.max(...sorts) + 1000;
                    }

                    await sheet.actor.update({
                        [`system.eras.${eraId}.experiences.${newId}`]: {
                            id: newId,
                            name: formData.name,
                            description: formData.description || '',
                            dateFrom: normalizeDateInput(formData.dateFrom),
                            dateTo: !!formData.isOngoing ? '' : normalizeDateInput(formData.dateTo),
                            isOngoing: !!formData.isOngoing,
                            linkedAspects: linkedAspects,
                            events: {},
                            color: "#2a2a2a",
                            sort: newSort
                        }
                    });

                    Sound.confirm();
                    viewState.interactionMode = 'pan';
                    sheet.render();
                }
            },
            cancel: {
                label: "Cancel",
                callback: () => {
                    viewState.interactionMode = 'pan';
                    renderGraph(svg, viewState, graphData);
                }
            }
        },
        default: "create",
        close: () => {
            if (viewState.interactionMode === 'dialog-open') {
                viewState.interactionMode = 'pan';
                renderGraph(svg, viewState, graphData);
            }
        }
    }, { classes: ["continuum-v2", "dialog"], width: "auto", height: "auto" }).render(true);
}
