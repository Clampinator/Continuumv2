/**
 * TEMPORAL KERNEL: CALCULATE AGE-BAND CREDIT
 *
 * Computes the age-band credit multiplier for a given attribute at a
 * given age. This models the physical reality that different attributes
 * peak at different ages:
 *
 *   - Force peaks early (physical strength, young adult)
 *   - React peaks very early (reflexes, late teens)
 *   - Analyze peaks mid-life (intellectual capacity, mid-30s)
 *   - Relate peaks late (emotional intelligence, mid-40s+)
 *
 * The multiplier is a piecewise-linear ramp-then-decay curve:
 *
 *   Age < rise:   floor (minimal growth)
 *   Rise..peak:    linear ramp from floor to 1.0
 *   Peak..fall:    linear decay from 1.0 back to floor
 *   Age > fall:   floor (minimal growth, never zero)
 *
 * Metabilities get a flat 1.0 — they depend on potential and practice,
 * not physical maturity. A spanner's psychic abilities grow with training
 * regardless of age, but are capped by potential.
 *
 * @param {string} aspectKey - One of the 9 aspect keys
 * @param {number} ageInYears - Character's age at the midpoint of the experience
 * @returns {number} Credit multiplier from 0 to 1.0
 */
export function getAgeBandCredit(aspectKey, ageInYears) {
  // Metabilities: flat 1.0 credit at any age
  const META_KEYS = ['coercion', 'creativity', 'farsense', 'pk', 'redaction'];
  if (META_KEYS.includes(aspectKey)) return 1.0;

  const params = CREDIT_PARAMS[aspectKey];
  if (!params) return 1.0;

  const { rise, peak, fall, floor } = params;

  // Below rise: floor
  if (ageInYears < rise) return floor;

  // Ramp: rise to peak (floor -> 1.0)
  if (ageInYears < peak) {
    return floor + (1.0 - floor) * ((ageInYears - rise) / (peak - rise));
  }

  // Decay: peak to fall (1.0 -> floor)
  if (ageInYears < fall) {
    return 1.0 - (1.0 - floor) * ((ageInYears - peak) / (fall - peak));
  }

  // Beyond fall: floor
  return floor;
}

/**
 * CREDIT PARAMETERS: Rise age, peak age, fall age, and floor value
 * for each attribute. These model the biological reality of human
 * development and aging.
 *
 * Rise:  Age where meaningful growth begins (credit starts rising from floor)
 * Peak:  Age of maximum growth efficiency (credit = 1.0)
 * Fall:  Age where growth returns to floor level
 * Floor: Minimum credit multiplier (never zero — old dogs can still learn)
 */
export const CREDIT_PARAMS = {
  force:    { rise: 10, peak: 25, fall: 70, floor: 0.15 },
  analyze:  { rise: 6,  peak: 35, fall: 80, floor: 0.40 },
  relate:   { rise: 12, peak: 45, fall: 85, floor: 0.50 },
  react:    { rise: 8,  peak: 19, fall: 65, floor: 0.10 }
};