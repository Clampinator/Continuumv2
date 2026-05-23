import { HELP_TEXT } from '../helptext.js';

function renderHelpDialog(eventTitle, content) {
    new Dialog({
        eventTitle: eventTitle,
        content: content,
        buttons: {
            ok: { label: game.i18n.localize("CONTINUUM.HelpDialogs.GotIt"), icon: '<i class="fas fa-check"></i>' }
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
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.SpanGraph"), HELP_TEXT.spanGraph);
}

export function handlePersonalHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.PersonalInfo"), HELP_TEXT.personalInfo);
}

export function handleAttributesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Attributes"), HELP_TEXT.attributes);
}

export function handleGoalsHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Goals"), HELP_TEXT.goals);
}

export function handleBackgroundHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Background"), HELP_TEXT.background);
}

export function handleSpanningHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Spanning"), HELP_TEXT.spanning);
}

export function handleMetabilitiesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Metabilities"), HELP_TEXT.metabilities);
}

export function handleExperiencesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Experiences"), HELP_TEXT.experiences);
}

export function handleCombatHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Combat"), HELP_TEXT.combat);
}

export function handleTheYetHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.TheYet"), HELP_TEXT.theYet);
}

export function handleRelationshipsHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Relationships"), HELP_TEXT.relationships);
}

export function handleLandVehiclesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Vehicles"), HELP_TEXT.landVehicles);
}

export function handleAirVehiclesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.AirVehicles"), HELP_TEXT.airVehicles);
}

export function handleWaterVehiclesHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.WaterVehicles"), HELP_TEXT.waterVehicles);
}

export function handleGearHelpClick(event) {
    event.preventDefault();
    renderHelpDialog(game.i18n.localize("CONTINUUM.HelpDialogs.Gear"), HELP_TEXT.gear);
}
