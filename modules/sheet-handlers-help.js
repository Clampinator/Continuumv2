import { HELP_TEXT } from '../helptext.js';

function renderHelpDialog(eventTitle, content) {
    new Dialog({
        eventTitle: eventTitle,
        content: content,
        buttons: {
            ok: { label: "Got it", icon: '<i class="fas fa-check"></i>' }
        },
        default: "ok"
    }, {
        classes: ["continuum-v2", "dialog", "help-dialog"],
        width: "auto",
        height: "auto"
    }).render(true);
}

export function handleSpanGraphHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Span Graph Help", HELP_TEXT.spanGraph);
}

export function handlePersonalHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Personal Information Help", HELP_TEXT.personalInfo);
}

export function handleAttributesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Attributes Help", HELP_TEXT.attributes);
}

export function handleGoalsHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Goals Help", HELP_TEXT.goals);
}

export function handleBackgroundHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Background Help", HELP_TEXT.background);
}

export function handleSpanningHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Spanning Help", HELP_TEXT.spanning);
}

export function handleMetabilitiesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Metabilities Help", HELP_TEXT.metabilities);
}

export function handleExperiencesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Ages & Experiences Help", HELP_TEXT.experiences);
}

export function handleCombatHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Combat Help", HELP_TEXT.combat);
}

export function handleTheYetHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("The Yet Help", HELP_TEXT.theYet);
}

export function handleRelationshipsHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Relationships Help", HELP_TEXT.relationships);
}

export function handleLandVehiclesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Vehicles Help", HELP_TEXT.landVehicles);
}

export function handleAirVehiclesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Air Vehicles Help", HELP_TEXT.airVehicles);
}

export function handleWaterVehiclesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Water Vehicles Help", HELP_TEXT.waterVehicles);
}

export function handleGearHelpClick(event) {
    event.preventDefault();
    renderHelpDialog("Gear Help", HELP_TEXT.gear);
}
