
export async function handleOrgSettingsClick(sheet, event) {
    event.preventDefault();
    const { actor } = sheet;
    
    new Dialog({
      eventTitle: game.i18n.localize("CONTINUUM.Notifications.OrganizationSettings"),
      content: `<p>${game.i18n.localize("CONTINUUM.Notifications.NoOrgSettings")}</p>`,
      buttons: { ok: { label: game.i18n.localize("CONTINUUM.Notifications.Close") } },
      default: "ok"
    }).render(true);
}
