/**
 * Canonical mapping of gear types to their aspect labels.
 * Used for display in gear sheets, roll dialogs, and character sheet preparation.
 * Single source of truth - all UI code imports from here.
 */
export const GEAR_ASPECT_LABELS = {
  firearm: { aspect1: 'Handling', aspect2: 'Ammo', aspect3: 'Reliability' },
  technology: { aspect1: 'Speed', aspect2: 'Capacity', aspect3: 'Connectivity' },
  tool: { aspect1: 'Quality', aspect2: 'Versatility', aspect3: 'Durability' },
  vehicle: { aspect1: 'Handling', aspect2: 'Acceleration', aspect3: 'Prestige' }
};