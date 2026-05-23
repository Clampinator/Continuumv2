
export async function handleCharacterSettingsClick(sheet, event) {
    event.preventDefault();
    const { actor } = sheet;
    const i18n = game.i18n;
    const playersCanSeeSpan = actor.getFlag('continuum-v2', 'playersCanSeeSpan') ?? false;
    const playersCanSeeNaturalSpan = actor.getFlag('continuum-v2', 'playersCanSeeNaturalSpan') ?? false;
    const playersCanSeeMetabilities = actor.getFlag('continuum-v2', 'playersCanSeeMetabilities') ?? false;
    const showAgesSection = actor.getFlag('continuum-v2', 'showAgesSection') ?? false;
    const showRelationshipsSection = actor.getFlag('continuum-v2', 'showRelationshipsSection') ?? false;
    const showGoalsSection = actor.getFlag('continuum-v2', 'showGoalsSection') ?? false;
    const spaceTimeLinked = actor.getFlag('continuum-v2', 'spaceTimeLinked') ?? false;
    const potentialsLocked = actor.system.metabilities?.potentialsLocked ?? false;

    const content = `
      <style>
        .character-settings-form .form-group {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 15px;
            margin-bottom: 10px;
        }
        .character-settings-form .form-group label {
            flex: 0 0 200px;
            margin: 0;
        }
        .character-settings-form .form-group input[type="checkbox"] {
            margin: 0;
            flex: 0 0 20px;
        }
      </style>
      <form class="character-settings-form">
        <div class="form-group"><label>${i18n.localize("CONTINUUM.CharacterSettings.LetPlayersSeeSpan")}</label><input type="checkbox" name="playersCanSeeSpan" ${playersCanSeeSpan ? 'checked' : ''} /></div>
        <div class="form-group"><label>${i18n.localize("CONTINUUM.CharacterSettings.LetPlayersSeeNaturalSpan")}</label><input type="checkbox" name="playersCanSeeNaturalSpan" ${playersCanSeeNaturalSpan ? 'checked' : ''} /></div>
        <div class="form-group"><label>${i18n.localize("CONTINUUM.CharacterSettings.LetPlayersSeeMetabilities")}</label><input type="checkbox" name="playersCanSeeMetabilities" ${playersCanSeeMetabilities ? 'checked' : ''} /></div>
        <div class="form-group"><label>${i18n.localize("CONTINUUM.CharacterSettings.ShowAgesExperiences")}</label><input type="checkbox" name="showAgesSection" ${showAgesSection ? 'checked' : ''} /></div>
        <div class="form-group"><label>${i18n.localize("CONTINUUM.CharacterSettings.ShowRelationships")}</label><input type="checkbox" name="showRelationshipsSection" ${showRelationshipsSection ? 'checked' : ''} /></div>
        <div class="form-group"><label>${i18n.localize("CONTINUUM.CharacterSettings.ShowGoals")}</label><input type="checkbox" name="showGoalsSection" ${showGoalsSection ? 'checked' : ''} /></div>
        <hr style="margin: 12px 0; border-color: #555;">
        <div class="form-group"><label>${i18n.localize("CONTINUUM.CharacterSettings.LinkLifeline")}</label><input type="checkbox" name="spaceTimeLinked" ${spaceTimeLinked ? 'checked' : ''} /></div>
        <hr style="margin: 12px 0; border-color: #555;">
        <div class="form-group"><label>${i18n.localize("CONTINUUM.CharacterSettings.LockPotentials")}</label><input type="checkbox" name="potentialsLocked" ${potentialsLocked ? 'checked' : ''} eventTitle="${i18n.localize("CONTINUUM.CharacterSettings.LockPotentialsHint")}" /></div>
      </form>
    `;

    new Dialog({
      eventTitle: i18n.localize("CONTINUUM.CharacterSettings.Title"),
      content: content,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: i18n.localize("CONTINUUM.CharacterSettings.SaveChanges"),
          callback: async (html) => {
            const updates = {
                'flags.continuum-v2.playersCanSeeSpan': html.find('input[name="playersCanSeeSpan"]').is(':checked'),
                'flags.continuum-v2.playersCanSeeNaturalSpan': html.find('input[name="playersCanSeeNaturalSpan"]').is(':checked'),
                'flags.continuum-v2.playersCanSeeMetabilities': html.find('input[name="playersCanSeeMetabilities"]').is(':checked'),
                'flags.continuum-v2.showAgesSection': html.find('input[name="showAgesSection"]').is(':checked'),
                'flags.continuum-v2.showRelationshipsSection': html.find('input[name="showRelationshipsSection"]').is(':checked'),
                'flags.continuum-v2.showGoalsSection': html.find('input[name="showGoalsSection"]').is(':checked'),
                'flags.continuum-v2.spaceTimeLinked': html.find('input[name="spaceTimeLinked"]').is(':checked'),
                'system.metabilities.potentialsLocked': html.find('input[name="potentialsLocked"]').is(':checked')
            };
            await actor.update(updates);
          }
        }
      },
      default: "save"
    }, { width: 450 }).render(true);
}
