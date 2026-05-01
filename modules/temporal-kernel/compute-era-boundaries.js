/*
compute-era-boundaries.js
KERNEL: Computes sorted era boundary data from raw actor eras.

Takes the raw `actor.system.eras` object and returns an array of
{ id, name, startAge, endAge } sorted by startAge. This is the single
source of truth for "which era does age X fall into" queries.

@returns {Array<{id: string, name: string, startAge: number, endAge: number}>}
*/
export function computeEraBoundaries(eras) {
  if (!eras || typeof eras !== 'object') return [];

  const SECONDS_IN_YEAR = 31536000;
  const SECONDS_IN_MONTH = 2628000;
  const SECONDS_IN_DAY = 86400;

  const result = Object.entries(eras)
    .map(([id, era]) => {
      const name = era.name || 'Untitled';
      // AUTHORITY: Era start comes from era.age (subjective seconds from birth)
      const startAge = Number(era.age) || 0;
      // Era end: derive from dateTo if present, otherwise estimate from next era
      let endAge = Infinity;
      if (era.dateTo) {
        const endMs = new Date(era.dateTo + 'T00:00:00').getTime();
        const startMs = era.dateFrom
          ? new Date(era.dateFrom + 'T00:00:00').getTime()
          : 0;
        if (!isNaN(endMs) && !isNaN(startMs)) {
          endAge = startAge + ((endMs - startMs) / 1000);
        }
      }
      return { id, name, startAge, endAge };
    })
    .sort((a, b) => a.startAge - b.startAge);

  // Fill in endAge from next era's startAge for eras without dateTo
  for (let i = 0; i < result.length; i++) {
    if (result[i].endAge === Infinity && i + 1 < result.length) {
      result[i].endAge = result[i + 1].startAge;
    }
  }

  return result;
}