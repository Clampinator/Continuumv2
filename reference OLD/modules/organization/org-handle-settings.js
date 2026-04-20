
export async function handleOrgSettingsClick(sheet, event) {
    event.preventDefault();
    const { actor } = sheet;
    
    new Dialog({
      title: "Organization Sheet Settings",
      content: `<p>No specific organization-only settings available at this version.</p>`,
      buttons: { ok: { label: "Close" } },
      default: "ok"
    }).render(true);
}
