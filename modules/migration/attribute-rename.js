/**
 * Attribute Key Migration: body -> force, mind -> analyze, eq -> relate, quick -> react
 *
 * Renames character actor attribute keys from the old names to the new names.
 * Run once when the system detects the old schema version.
 */

const ATTRIBUTE_MAP = {
  body: 'force',
  mind: 'analyze',
  eq: 'relate',
  quick: 'react'
};

/**
 * Migrates a single actor's attribute keys from old to new names.
 * @param {Actor} actor - The Foundry Actor document.
 * @returns {boolean} True if the actor was migrated.
 */
export function migrateActorAttributes(actor) {
  if (actor.type !== 'character') return false;

  const attrs = actor.system?.attributes;
  if (!attrs) return false;

  // Check if migration is needed (has old keys and lacks new keys)
  const needsMigration = Object.keys(ATTRIBUTE_MAP).some(
    old => attrs[old] !== undefined && attrs[ATTRIBUTE_MAP[old]] === undefined
  );
  if (!needsMigration) return false;

  const updateData = {};

  for (const [oldKey, newKey] of Object.entries(ATTRIBUTE_MAP)) {
    if (attrs[oldKey] !== undefined) {
      // Copy old value to new key
      updateData[`system.attributes.${newKey}`] = attrs[oldKey];
      // Delete old key by setting to null
      updateData[`system.attributes.-=${oldKey}`] = null;
    }
  }

  if (Object.keys(updateData).length > 0) {
    actor.update(updateData);
    console.log(`Continuum V2 | Migrated actor ${actor.name} (${actor.id}): renamed attribute keys`);
    return true;
  }

  return false;
}

/**
 * Runs the attribute rename migration for all character actors in the world.
 * Called from the system init hook when templateVersion is below the migration threshold.
 */
export async function migrateAttributeRename() {
  const characters = game.actors.filter(a => a.type === 'character');
  let migrated = 0;

  for (const actor of characters) {
    try {
      if (migrateActorAttributes(actor)) {
        migrated++;
      }
    } catch (err) {
      console.error(`Continuum V2 | Failed to migrate actor ${actor.name} (${actor.id}):`, err);
    }
  }

  if (migrated > 0) {
    console.log(`Continuum V2 | Attribute rename migration complete: ${migrated} actors migrated`);
  } else {
    console.log('Continuum V2 | Attribute rename migration: no actors needed migration');
  }

  return migrated;
}