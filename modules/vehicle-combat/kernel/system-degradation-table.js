/*
System degradation table - maps structureIp percentage to function loss.
When a system block takes damage, it loses function capacity
proportional to its remaining structural integrity.
Pure function.
*/

export const SYSTEM_DEGRADATION_TABLE = [
  { maxPercent: 100, functionLoss: 0,   status: 'operational' },
  { maxPercent: 75,  functionLoss: 0.25, status: 'degraded' },
  { maxPercent: 50,  functionLoss: 0.5,  status: 'damaged' },
  { maxPercent: 25,  functionLoss: 0.75, status: 'critical' },
  { maxPercent: 0,   functionLoss: 1.0,   status: 'destroyed' }
];

/**
 * Calculates system degradation from current structureIp.
 * @param {number} structureIp - Current structural integrity points
 * @param {number} maxStructureIp - Maximum structural integrity points
 * @returns {{ functionLoss: number, function: number, status: string }}
 */
export function calculateSystemDegradation(structureIp, maxStructureIp) {
  if (maxStructureIp <= 0) {
    return { functionLoss: 1, function: 0, status: 'destroyed' };
  }

  const pct = (structureIp / maxStructureIp) * 100;

  // Find the correct tier by descending boundary check
  let result = SYSTEM_DEGRADATION_TABLE[SYSTEM_DEGRADATION_TABLE.length - 1];
  for (const tier of SYSTEM_DEGRADATION_TABLE) {
    if (pct > tier.maxPercent) break;
    result = tier;
  }

  const maxFunction = 10;
  const remainingFunction = Math.floor(maxFunction * (1 - result.functionLoss));

  return {
    functionLoss: result.functionLoss,
    function: remainingFunction,
    status: result.status
  };
}