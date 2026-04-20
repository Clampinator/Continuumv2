/**
 * Pure logic engine for combat mitigation calculations.
 */
export const MitigationEngine = {
    /**
     * Calculates how much damage passes through armor.
     * @param {number} atkDamage - The raw damage from the weapon.
     * @param {number} defArmor - Total IP protection at hit location.
     * @returns {object} { passedDamage: number, damageType: string, isDegraded: boolean }
     */
    calculateMitigation(atkDamage, defArmor) {
        let passedDamage = 0;
        let damageType = "Lethal"; // Default to weapon's standard
        let isDegraded = false;

        // 1. Armor 0: 100% damage passes
        if (defArmor === 0) {
            passedDamage = atkDamage;
        }
        // 2. Armor >= IP + 3: 0 damage passes, Armor remains intact
        else if (defArmor >= atkDamage + 3) {
            passedDamage = 0;
        }
        // 3. Armor < IP: Damage passed = IP - Armor. Armor is degraded.
        else if (defArmor < atkDamage) {
            passedDamage = Math.max(0, atkDamage - defArmor);
            isDegraded = true;
        }
        // 4. IP <= Armor < IP + 3: 1 Bruise IP passed. Armor is degraded.
        else if (defArmor >= atkDamage && defArmor < atkDamage + 3) {
            passedDamage = 1;
            damageType = "Bruise";
            isDegraded = true;
        }

        return {
            passedDamage,
            damageType,
            isDegraded
        };
    }
};