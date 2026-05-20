import { formatSubjectiveAge } from '/systems/continuum-v2/modules/temporal-translator/age-converter.js';
import { timestampToDateString } from '/systems/continuum-v2/modules/temporal-translator/coordinate-converter.js';

/*
Computes formatted axis labels for the span-graph HUD.
This is a PROJECTION function - it converts world coordinates
to human-readable strings using TTL. The resulting labels
are passed to the dumb AxisRenderer which does no TTL calls.

Returns { ageLabels: [{screenX, label}], timeLabels: [{screenY, date, time}] }
*/
export function computeAxisLabels(viewport) {
  const rect = viewport.container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const gutterHeight = 35;

  // X-AXIS (Subjective Age)
  const worldLeft = viewport.screenToWorld(0, 0).eventAge;
  const worldRight = viewport.screenToWorld(width, 0).eventAge;
  const ageRange = worldRight - worldLeft;

  const ageLabels = [];
  for (let i = 0; i <= 5; i++) {
    const ratio = i / 5;
    const worldAge = worldLeft + (ageRange * ratio);
    const screenX = viewport.worldToScreen(worldAge, 0).x;
    ageLabels.push({ screenX, label: formatSubjectiveAge(worldAge) });
  }

  // Y-AXIS (Objective Time)
  const topWorld = viewport.screenToWorld(0, 0);
  const bottomWorld = viewport.screenToWorld(0, height - gutterHeight);
  const timeRange = bottomWorld.eventTime - topWorld.eventTime;

  const timeLabels = [];
  for (let i = 0; i <= 5; i++) {
    const ratio = i / 5;
    const currentTime = topWorld.eventTime + (timeRange * ratio);
    const screenY = viewport.worldToScreen(0, currentTime).y;
    const dt = timestampToDateString(currentTime);
    timeLabels.push({ screenY, date: dt.date, time: dt.time });
  }

  return { ageLabels, timeLabels, width, height, gutterHeight };
}